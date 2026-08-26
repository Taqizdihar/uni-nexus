#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Dependency-free Craft Production browser acceptance harness.
 *
 * Requirements:
 * - Node.js 24+ (built-in fetch, AbortSignal.timeout, and WebSocket)
 * - a running frontend at http://localhost:5173
 * - a running backend at http://localhost:3001/api/v1
 * - the existing MySQL CLI and system Google Chrome installation
 *
 * This script does not start or stop either app server. It performs only
 * authenticated GET/browser navigation. Authentication is injected into a
 * fresh Chrome profile with a short-lived local JWT, so /auth/login is not
 * called and no login audit row is created.
 *
 * Run from the repository root after both app servers are ready:
 *   node server/scripts/browser-craft-production.mjs
 *   node server/scripts/browser-craft-production.mjs --output-dir E:\artifacts\craft-production
 */

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '..', '..');
const SERVER_ENV_PATH = path.join(REPOSITORY_ROOT, 'server', '.env');
const CHROME_PROFILE_PREFIX = 'uni-nexus-craft-browser-';
const execFileAsync = promisify(execFile);
let interruptedExitCode;

const PRODUCTION_ROUTES = [
  {
    key: 'board',
    path: '/app/craft/production',
    expectedTitle: 'Papan Produksi',
    screenshot: '01-papan-produksi.png',
  },
  {
    key: 'active',
    path: '/app/craft/production/active',
    expectedTitle: 'Produksi Aktif',
    screenshot: '02-produksi-aktif.png',
  },
  {
    key: 'queue',
    path: '/app/craft/production/queue',
    expectedTitle: 'Antrean Cetak',
    screenshot: '03-antrean-cetak.png',
  },
  {
    key: 'jobs',
    path: '/app/craft/production/jobs',
    expectedTitle: 'Pekerjaan Cetak',
    screenshot: '04-pekerjaan-cetak.png',
  },
  {
    key: 'failures',
    path: '/app/craft/production/failures',
    expectedTitle: 'Cetak Gagal',
    screenshot: '05-cetak-gagal.png',
  },
  {
    key: 'qc',
    path: '/app/craft/production/qc',
    expectedTitle: 'Kontrol Kualitas',
    screenshot: '06-kontrol-kualitas.png',
  },
  {
    key: 'calendar',
    path: '/app/craft/production/calendar',
    expectedTitle: 'Kalender Produksi',
    screenshot: '07-kalender-produksi.png',
  },
];

const FORBIDDEN_VISIBLE_MARKERS = ['NX-102', 'NX-103', 'Budi Santoso', 'Dikemas'];

class CdpClient {
  constructor(webSocketUrl, timeoutMs) {
    this.webSocketUrl = webSocketUrl;
    this.timeoutMs = timeoutMs;
    this.socket = undefined;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    assert.equal(typeof WebSocket, 'function', 'Node 24+ global WebSocket is required');
    const socket = new WebSocket(this.webSocketUrl);
    this.socket = socket;

    socket.addEventListener('message', (event) => {
      void this.#handleMessage(event.data);
    });
    socket.addEventListener('close', () => {
      this.#rejectPending(new Error('Chrome DevTools WebSocket closed'));
    });
    socket.addEventListener('error', () => {
      this.#rejectPending(new Error('Chrome DevTools WebSocket failed'));
    });

    await Promise.race([
      once(socket, 'open'),
      delay(this.timeoutMs).then(() => {
        throw new Error('Timed out connecting to Chrome DevTools');
      }),
    ]);
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }

  async send(method, params = {}) {
    const socket = this.socket;
    assert(socket, 'Chrome DevTools WebSocket is not connected');
    assert.equal(socket.readyState, WebSocket.OPEN, 'Chrome DevTools WebSocket is not open');

    const id = this.nextId++;
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for CDP command ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
    });

    socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  close() {
    if (!this.socket) return;
    if (
      this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      this.socket.close();
    }
    this.#rejectPending(new Error('Chrome DevTools client closed'));
  }

  async #handleMessage(data) {
    let text;
    if (typeof data === 'string') {
      text = data;
    } else if (typeof Blob === 'function' && data instanceof Blob) {
      text = await data.text();
    } else if (data instanceof ArrayBuffer) {
      text = Buffer.from(data).toString('utf8');
    } else if (ArrayBuffer.isView(data)) {
      text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
    } else {
      text = String(data);
    }

    const message = JSON.parse(text);
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) {
        pending.reject(
          new Error(
            `CDP ${pending.method} failed: ${message.error.message ?? JSON.stringify(message.error)}`,
          ),
        );
      } else {
        pending.resolve(message.result ?? {});
      }
      return;
    }

    const listeners = this.listeners.get(message.method);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(message.params ?? {});
      } catch (error) {
        console.error(`[browser] CDP event listener failed for ${message.method}`, error);
      }
    }
  }

  #rejectPending(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function parseArguments(argv) {
  const options = {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3001/api/v1',
    outputDirectory: undefined,
    chromePath: undefined,
    mysqlPath: undefined,
    timeoutMs: 20_000,
    help: false,
  };

  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    assert(value && !value.startsWith('--'), `${flag} requires a value`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--base-url':
        options.baseUrl = takeValue(index, argument);
        index += 1;
        break;
      case '--api-url':
        options.apiUrl = takeValue(index, argument);
        index += 1;
        break;
      case '--output-dir':
        options.outputDirectory = takeValue(index, argument);
        index += 1;
        break;
      case '--chrome':
        options.chromePath = takeValue(index, argument);
        index += 1;
        break;
      case '--mysql':
        options.mysqlPath = takeValue(index, argument);
        index += 1;
        break;
      case '--timeout-ms':
        options.timeoutMs = Number(takeValue(index, argument));
        assert(
          Number.isInteger(options.timeoutMs) && options.timeoutMs >= 5_000,
          '--timeout-ms must be an integer of at least 5000',
        );
        index += 1;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  options.baseUrl = normalizeHttpBase(options.baseUrl, '--base-url');
  options.apiUrl = normalizeHttpBase(options.apiUrl, '--api-url');
  return options;
}

function normalizeHttpBase(value, label) {
  const parsed = new URL(value);
  assert(['http:', 'https:'].includes(parsed.protocol), `${label} must use http or https`);
  parsed.pathname = parsed.pathname.replace(/\/$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function helpText() {
  return `Craft Production browser acceptance

Usage:
  node server/scripts/browser-craft-production.mjs [options]

Options:
  --output-dir <exact-path>  Screenshot/summary directory. Existing files are never overwritten.
  --base-url <url>           Frontend origin (default: http://localhost:5173).
  --api-url <url>            API base (default: http://localhost:3001/api/v1).
  --chrome <exact-path>      System Chrome executable override.
  --mysql <exact-path>       MySQL CLI executable override.
  --timeout-ms <number>      Navigation/CDP timeout (default: 20000).
  -h, --help                 Show this help.
`;
}

function timestampForPath(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function defaultOutputDirectory() {
  const suffix = randomBytes(3).toString('hex');
  return path.join(
    REPOSITORY_ROOT,
    'artifacts',
    `craft-production-browser-${timestampForPath()}-${process.pid}-${suffix}`,
  );
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeExclusive(filePath, data) {
  await writeFile(filePath, data, { flag: 'wx' });
}

async function parseEnvironmentFile(filePath) {
  const text = await readFile(filePath, 'utf8');
  const values = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key] = match;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[key] = value;
  }

  return values;
}

function requiredConfiguration(configuration, key) {
  const value = configuration[key];
  assert(value !== undefined && String(value).trim(), `Missing ${key} in server/.env/environment`);
  return String(value);
}

async function resolveChromePath(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe')
      : undefined,
    process.env['ProgramFiles(x86)']
      ? path.join(
          process.env['ProgramFiles(x86)'],
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        )
      : undefined,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
      : undefined,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await pathExists(resolved)) return resolved;
  }
  throw new Error(
    `System Google Chrome was not found. Pass --chrome with its exact path. Checked: ${candidates.join(', ')}`,
  );
}

async function executableOnPath(name) {
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
    : [''];

  for (const entry of pathEntries) {
    for (const extension of extensions) {
      const candidate = path.join(entry, process.platform === 'win32' ? `${name}${extension}` : name);
      if (await pathExists(candidate)) return path.resolve(candidate);
    }
  }
  return undefined;
}

async function laragonMysqlCandidates() {
  if (process.platform !== 'win32') return [];
  const root = 'C:\\laragon\\bin\\mysql';
  if (!(await pathExists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, 'bin', 'mysql.exe'))
    .sort()
    .reverse();
}

async function resolveMysqlPath(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.MYSQL_BIN,
    await executableOnPath('mysql'),
    ...(await laragonMysqlCandidates()),
    process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysql.exe' : undefined,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await pathExists(resolved)) return resolved;
  }
  throw new Error(
    'MySQL CLI was not found. Pass --mysql with its exact path; no package will be installed.',
  );
}

async function discoverAuthorizedUser(mysqlPath, configuration) {
  const sql = [
    'SET SESSION TRANSACTION READ ONLY',
    'START TRANSACTION READ ONLY',
    `SELECT DISTINCT u.id, u.organization_id, u.username
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE u.deleted_at IS NULL
        AND u.status_code = 'active'
        AND u.approval_status_code = 'approved'
        AND p.code = 'craft.production.read'
      ORDER BY u.id
      LIMIT 1`,
    'COMMIT',
  ].join('; ');

  const { stdout, stderr } = await execFileAsync(
    mysqlPath,
    [
      `--host=${requiredConfiguration(configuration, 'DB_HOST')}`,
      `--port=${requiredConfiguration(configuration, 'DB_PORT')}`,
      `--user=${requiredConfiguration(configuration, 'DB_USER')}`,
      `--database=${requiredConfiguration(configuration, 'DB_NAME')}`,
      '--batch',
      '--skip-column-names',
      '--raw',
      '--connect-timeout=5',
      `--execute=${sql}`,
    ],
    {
      env: {
        ...process.env,
        MYSQL_PWD: configuration.DB_PASSWORD ?? '',
      },
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    const meaningful = stderr
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.includes('Using a password on the command line'));
    if (meaningful.length) {
      throw new Error(`MySQL read-only user discovery failed: ${meaningful.join(' ')}`);
    }
  }

  const resultLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  assert(resultLine, 'No active user has craft.production.read');
  const [idText, organizationIdText, username] = resultLine.split('\t');
  const id = Number(idText);
  const organizationId = Number(organizationIdText);
  assert(Number.isInteger(id) && id > 0, 'MySQL returned an invalid user ID');
  assert(
    Number.isInteger(organizationId) && organizationId > 0,
    'MySQL returned an invalid organization ID',
  );
  assert(username, 'MySQL returned an empty username');
  return { id, organizationId, username };
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function mintJwt(user, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({
    id: user.id,
    organization_id: user.organizationId,
    username: user.username,
    iat: now,
    exp: now + 30 * 60,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function assertRunningServers(baseUrl, apiUrl, token, timeoutMs) {
  const frontend = await fetch(baseUrl, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert(frontend.ok, `Frontend ${baseUrl} returned HTTP ${frontend.status}`);

  const me = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const meText = await me.text();
  assert(me.ok, `/auth/me returned HTTP ${me.status}: ${meText.slice(0, 500)}`);
  const meBody = JSON.parse(meText);
  const principal = Object.prototype.hasOwnProperty.call(meBody, 'data') ? meBody.data : meBody;
  assert(
    Array.isArray(principal?.permissions) &&
      principal.permissions.includes('craft.production.read'),
    'Authenticated principal lacks craft.production.read',
  );
}

function launchChrome(chromePath, profileDirectory) {
  const stderrChunks = [];
  const stdoutChunks = [];
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-sync',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
      '--remote-debugging-port=0',
      '--window-size=1440,1100',
      `--user-data-dir=${profileDirectory}`,
      'about:blank',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  const retain = (chunks, data) => {
    chunks.push(Buffer.from(data));
    while (Buffer.concat(chunks).length > 32 * 1024) chunks.shift();
  };
  child.stderr.on('data', (data) => retain(stderrChunks, data));
  child.stdout.on('data', (data) => retain(stdoutChunks, data));
  child.on('error', () => undefined);

  return {
    child,
    stderr: () => Buffer.concat(stderrChunks).toString('utf8'),
    stdout: () => Buffer.concat(stdoutChunks).toString('utf8'),
  };
}

async function waitForDevTools(profileDirectory, chromeProcess, timeoutMs) {
  const activePortFile = path.join(profileDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (chromeProcess.child.exitCode !== null) {
      throw new Error(
        `Chrome exited before DevTools was ready (code ${chromeProcess.child.exitCode}): ` +
          chromeProcess.stderr().slice(-2_000),
      );
    }
    try {
      const content = await readFile(activePortFile, 'utf8');
      const [portText] = content.trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Chrome creates this file after its isolated profile is initialized.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${activePortFile}`);
}

async function pageWebSocketUrl(debugPort, timeoutMs) {
  const listResponse = await fetch(`http://127.0.0.1:${debugPort}/json/list`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert(listResponse.ok, `Chrome /json/list returned HTTP ${listResponse.status}`);
  const targets = await listResponse.json();
  let pageTarget = targets.find(
    (target) => target.type === 'page' && typeof target.webSocketDebuggerUrl === 'string',
  );

  if (!pageTarget) {
    const createResponse = await fetch(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`,
      { method: 'PUT', signal: AbortSignal.timeout(timeoutMs) },
    );
    assert(createResponse.ok, `Chrome /json/new returned HTTP ${createResponse.status}`);
    pageTarget = await createResponse.json();
  }

  assert(pageTarget.webSocketDebuggerUrl, 'Chrome page target lacks a DevTools WebSocket URL');
  return pageTarget.webSocketDebuggerUrl;
}

function remoteValueText(argument) {
  if (Object.prototype.hasOwnProperty.call(argument, 'value')) {
    if (typeof argument.value === 'string') return argument.value;
    try {
      return JSON.stringify(argument.value);
    } catch {
      return String(argument.value);
    }
  }
  return argument.description ?? argument.unserializableValue ?? argument.type ?? '';
}

function runtimeExceptionText(details) {
  const exception = details.exception?.description ?? details.exception?.value;
  const stack = details.stackTrace?.callFrames
    ?.slice(0, 5)
    .map((frame) => `${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber + 1})`)
    .join(' <- ');
  return [exception ?? details.text ?? 'Uncaught runtime exception', stack].filter(Boolean).join(' | ');
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(runtimeExceptionText(result.exceptionDetails));
  }
  return result.result?.value;
}

async function waitForExpectedTitle(cdp, expectedTitle, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastState = {};
  while (Date.now() < deadline) {
    try {
      lastState = await evaluate(
        cdp,
        `(() => ({
          href: location.href,
          heading: document.querySelector('h1.production-page-title')?.textContent?.trim() ?? null,
          body: document.body?.innerText?.slice(0, 500) ?? ''
        }))()`,
      );
      if (lastState.heading === expectedTitle) return lastState;
    } catch {
      // Navigation can briefly destroy the execution context; retry it.
    }
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for page title ${JSON.stringify(expectedTitle)}; last state: ${JSON.stringify(lastState)}`,
  );
}

async function waitForNetworkIdle(pendingRequests, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let idleSince = null;
  while (Date.now() < deadline) {
    if (pendingRequests.size === 0) {
      idleSince ??= Date.now();
      if (Date.now() - idleSince >= 500) return;
    } else {
      idleSince = null;
    }
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for network idle; pending request IDs: ${[...pendingRequests].join(', ')}`,
  );
}

async function captureFullPage(cdp) {
  const metrics = await cdp.send('Page.getLayoutMetrics');
  const content = metrics.cssContentSize ?? metrics.contentSize;
  const width = Math.min(2_400, Math.max(1_440, Math.ceil(content?.width ?? 1_440)));
  const height = Math.min(16_000, Math.max(1_100, Math.ceil(content?.height ?? 1_100)));
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  assert(screenshot.data, 'Chrome returned an empty screenshot');
  return Buffer.from(screenshot.data, 'base64');
}

async function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return Promise.race([
    once(child, 'exit').then(() => true),
    delay(timeoutMs).then(() => false),
  ]);
}

async function stopChrome(chromeProcess, cdp) {
  if (cdp) {
    try {
      await cdp.send('Browser.close');
    } catch {
      // The browser may close the socket before acknowledging Browser.close.
    }
    cdp.close();
  }
  if (!chromeProcess) return;
  if (await waitForProcessExit(chromeProcess.child, 5_000)) return;
  chromeProcess.child.kill('SIGTERM');
  if (await waitForProcessExit(chromeProcess.child, 5_000)) return;
  chromeProcess.child.kill('SIGKILL');
  await waitForProcessExit(chromeProcess.child, 2_000);
}

async function removeVerifiedChromeProfile(profileDirectory) {
  if (!profileDirectory) return;
  const resolvedTempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  const relative = path.relative(resolvedTempRoot, resolvedProfile);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  assert(path.basename(resolvedProfile).startsWith(CHROME_PROFILE_PREFIX));
  await rm(resolvedProfile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 250,
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(helpText());
    return;
  }

  assert.equal(
    new Set(PRODUCTION_ROUTES.map((route) => route.expectedTitle)).size,
    PRODUCTION_ROUTES.length,
    'Each production route must have a distinct expected title',
  );

  const outputDirectory = path.resolve(options.outputDirectory ?? defaultOutputDirectory());
  await mkdir(outputDirectory, { recursive: true });

  const fileEnvironment = await parseEnvironmentFile(SERVER_ENV_PATH);
  const configuration = { ...fileEnvironment, ...process.env };
  const jwtSecret = requiredConfiguration(configuration, 'JWT_SECRET');
  const chromePath = await resolveChromePath(options.chromePath);
  const mysqlPath = await resolveMysqlPath(options.mysqlPath);

  console.log('[browser] discovering an authorized user with a read-only SQL query');
  const user = await discoverAuthorizedUser(mysqlPath, configuration);
  const token = mintJwt(user, jwtSecret);

  console.log('[browser] checking existing frontend/backend servers');
  await assertRunningServers(options.baseUrl, options.apiUrl, token, options.timeoutMs);

  let chromeProfile;
  let chromeProcess;
  let cdp;
  const diagnostics = [];
  const routeResults = [];
  const failures = [];
  let activeRoute = 'bootstrap';
  let cleanupPromise;

  const cleanup = () => {
    cleanupPromise ??= (async () => {
      await stopChrome(chromeProcess, cdp);
      await removeVerifiedChromeProfile(chromeProfile);
    })();
    return cleanupPromise;
  };
  const signalHandlers = new Map();
  for (const [signal, exitCode] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ]) {
    const handler = () => {
      interruptedExitCode = exitCode;
      console.error(`[browser] received ${signal}; closing isolated Chrome`);
      void cleanup().catch((error) => console.error('[browser] signal cleanup failed', error));
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  try {
    chromeProfile = await mkdtemp(path.join(os.tmpdir(), CHROME_PROFILE_PREFIX));
    chromeProcess = launchChrome(chromePath, chromeProfile);
    const debugPort = await waitForDevTools(chromeProfile, chromeProcess, options.timeoutMs);
    const webSocketUrl = await pageWebSocketUrl(debugPort, options.timeoutMs);
    cdp = new CdpClient(webSocketUrl, options.timeoutMs);
    await cdp.connect();

    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Log.enable'),
      cdp.send('Network.enable'),
      cdp.send('DOM.enable'),
    ]);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1_440,
      height: 1_100,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const pendingNetworkRequests = new Set();
    const requestTypes = new Map();
    const relevantNetworkTypes = new Set(['Document', 'Fetch', 'XHR']);

    cdp.on('Network.requestWillBeSent', (event) => {
      requestTypes.set(event.requestId, event.type);
      if (relevantNetworkTypes.has(event.type)) pendingNetworkRequests.add(event.requestId);
    });
    cdp.on('Network.loadingFinished', (event) => {
      pendingNetworkRequests.delete(event.requestId);
      requestTypes.delete(event.requestId);
    });
    cdp.on('Network.loadingFailed', (event) => {
      const type = requestTypes.get(event.requestId);
      pendingNetworkRequests.delete(event.requestId);
      requestTypes.delete(event.requestId);
      if (
        relevantNetworkTypes.has(type) &&
        !event.canceled &&
        event.errorText !== 'net::ERR_ABORTED'
      ) {
        diagnostics.push({
          route: activeRoute,
          source: 'network',
          level: 'error',
          message: `${type} request failed: ${event.errorText}`,
        });
      }
    });
    cdp.on('Network.responseReceived', (event) => {
      if (relevantNetworkTypes.has(event.type) && event.response?.status >= 400) {
        diagnostics.push({
          route: activeRoute,
          source: 'network',
          level: 'error',
          message: `HTTP ${event.response.status} ${event.response.url}`,
        });
      }
    });
    cdp.on('Runtime.consoleAPICalled', (event) => {
      const level = ['error', 'assert'].includes(event.type)
        ? 'error'
        : event.type === 'warning'
          ? 'warning'
          : 'info';
      diagnostics.push({
        route: activeRoute,
        source: 'console',
        level,
        message: (event.args ?? []).map(remoteValueText).join(' '),
      });
    });
    cdp.on('Runtime.exceptionThrown', (event) => {
      diagnostics.push({
        route: activeRoute,
        source: 'runtime',
        level: 'error',
        message: runtimeExceptionText(event.exceptionDetails ?? {}),
      });
    });
    cdp.on('Log.entryAdded', (event) => {
      const entry = event.entry ?? {};
      if (!['error', 'warning'].includes(entry.level)) return;
      diagnostics.push({
        route: activeRoute,
        source: entry.source ?? 'log',
        level: entry.level,
        message: entry.text ?? 'Chrome log entry',
        url: entry.url,
      });
    });

    const frontendOrigin = new URL(options.baseUrl).origin;
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        if (window.location.origin === ${JSON.stringify(frontendOrigin)}) {
          window.localStorage.setItem('token', ${JSON.stringify(token)});
        }
      })();`,
    });

    for (const route of PRODUCTION_ROUTES) {
      activeRoute = route.key;
      const diagnosticStart = diagnostics.length;
      const routeFailures = [];
      const targetUrl = new URL(route.path, `${options.baseUrl}/`).toString();
      let state = { href: targetUrl, heading: null, bodyText: '' };
      let screenshotPath;

      console.log(`[browser] ${route.path} -> ${route.expectedTitle}`);
      pendingNetworkRequests.clear();
      requestTypes.clear();

      try {
        await cdp.send('Page.navigate', { url: targetUrl });
        await waitForExpectedTitle(cdp, route.expectedTitle, options.timeoutMs);
        await waitForNetworkIdle(pendingNetworkRequests, options.timeoutMs);
        await delay(250);

        state = await evaluate(
          cdp,
          `(() => ({
            href: location.href,
            heading: document.querySelector('h1.production-page-title')?.textContent?.trim() ?? null,
            bodyText: document.body?.innerText ?? ''
          }))()`,
        );

        if (state.heading !== route.expectedTitle) {
          routeFailures.push(
            `expected title ${JSON.stringify(route.expectedTitle)}, received ${JSON.stringify(state.heading)}`,
          );
        }
        if (new URL(state.href).pathname !== route.path) {
          routeFailures.push(`unexpected final URL ${state.href}`);
        }
        for (const marker of FORBIDDEN_VISIBLE_MARKERS) {
          if (state.bodyText.includes(marker)) {
            routeFailures.push(`forbidden visible marker ${JSON.stringify(marker)} was rendered`);
          }
        }
      } catch (error) {
        routeFailures.push(error instanceof Error ? error.message : String(error));
      }

      try {
        screenshotPath = path.join(outputDirectory, route.screenshot);
        const png = await captureFullPage(cdp);
        await writeExclusive(screenshotPath, png);
      } catch (error) {
        routeFailures.push(
          `screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const routeDiagnostics = diagnostics.slice(diagnosticStart);
      const routeErrors = routeDiagnostics.filter((entry) => entry.level === 'error');
      for (const diagnostic of routeErrors) {
        routeFailures.push(`${diagnostic.source}: ${diagnostic.message}`);
      }
      failures.push(...routeFailures.map((message) => `${route.path}: ${message}`));
      routeResults.push({
        key: route.key,
        path: route.path,
        expectedTitle: route.expectedTitle,
        actualTitle: state.heading,
        finalUrl: state.href,
        screenshot: screenshotPath ? path.relative(outputDirectory, screenshotPath) : null,
        forbiddenMarkers: FORBIDDEN_VISIBLE_MARKERS.filter((marker) =>
          state.bodyText?.includes(marker),
        ),
        diagnostics: routeDiagnostics,
        failures: routeFailures,
        passed: routeFailures.length === 0,
      });
    }

    const bootstrapErrors = diagnostics.filter(
      (entry) => entry.route === 'bootstrap' && entry.level === 'error',
    );
    failures.push(...bootstrapErrors.map((entry) => `bootstrap ${entry.source}: ${entry.message}`));

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl: options.baseUrl,
      apiUrl: options.apiUrl,
      outputDirectory,
      chromePath,
      authenticatedUserId: user.id,
      forbiddenVisibleMarkers: FORBIDDEN_VISIBLE_MARKERS,
      routes: routeResults,
      diagnostics,
      passed: failures.length === 0,
      failures,
    };
    await writeExclusive(
      path.join(outputDirectory, 'acceptance-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
    );

    assert.equal(
      failures.length,
      0,
      `Browser acceptance failed:\n- ${failures.join('\n- ')}\nArtifacts: ${outputDirectory}`,
    );
    console.log(`[browser] all seven routes passed; screenshots: ${outputDirectory}`);
  } finally {
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
    await cleanup();
  }
}

main().catch((error) => {
  console.error('[browser] FAILED');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = interruptedExitCode ?? 1;
});
