#!/usr/bin/env node
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env') });
const front = process.env.MATERIAL_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.MATERIAL_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const routes = [
  ['/app/craft/materials/filament', 'Inventaris Material'], ['/app/craft/materials/spools', 'Spool Filament'],
  ['/app/craft/materials/movements', 'Pergerakan Stok'], ['/app/craft/materials/low-stock', 'Stok Menipis'],
  ['/app/craft/materials/waste', 'Limbah Filament'],
];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}

async function getUser() {
  const database = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await database.execute(`SELECT DISTINCT u.id, u.organization_id, u.username
      FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'craft.materials.read' LIMIT 1`);
    assert(rows.length, 'No active user has craft.materials.read.'); return rows[0];
  } finally { await database.end(); }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before starting.`);
    try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ }
    await delay(100);
  } throw new Error('Chrome DevTools did not start.');
}

function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map(); const events = [];
  socket.addEventListener('message', async (event) => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id) { const entry = pending.get(message.id); if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result || {}); } } else events.push(message); });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  const send = async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { const messageId = ++id; pending.set(messageId, { resolve, reject }); socket.send(JSON.stringify({ id: messageId, method, params })); }); };
  return { socket, send, events };
}

async function run() {
  const user = await getUser(); const token = tokenFor(user);
  const auth = { Authorization: `Bearer ${token}` };
  for (const endpoint of ['/craft/materials', '/craft/materials/categories', '/craft/materials/spools', '/craft/materials/movements', '/craft/materials/low-stock', '/craft/materials/waste']) {
    const response = await fetch(`${api}${endpoint}`, { headers: auth });
    const responseBody = await response.text();
    assert(response.ok, `${endpoint} returned ${response.status}: ${responseBody.slice(0, 500)}`);
  }
  const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-material-browser-'));
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
  try {
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find((entry) => entry.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(target.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__materialErrors=[]; window.addEventListener('error', event => window.__materialErrors.push(event.message));` });
    const outputDir = path.join(root, 'artifacts', `craft-materials-browser-${Date.now()}-${randomBytes(3).toString('hex')}`);
    await (await import('node:fs/promises')).mkdir(outputDir, { recursive: true });
    for (const [route, title] of routes) {
      await cdp.send('Page.navigate', { url: `${front}${route}` });
      let result;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        await delay(200);
        const state = await cdp.send('Runtime.evaluate', { expression: `({ title: Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__materialErrors })`, returnByValue: true });
        result = state.result?.value;
        if (result?.title === title) break;
      }
      assert(result?.title === title, `${route} expected '${title}', got '${result?.title}': ${result?.body?.slice(0, 300)}`); assert(!result.body.includes('FORBIDDEN'), `${route} rendered forbidden state`); assert(!result.errors?.length, `${route} has browser errors: ${result.errors.join('; ')}`);
      const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(path.join(outputDir, `${title.replace(/\s+/g, '-').toLowerCase()}.png`), Buffer.from(image.data, 'base64'));
    }
    cdp.socket.close(); console.log(`Craft Materials browser acceptance passed. Screenshots: ${outputDir}`);
  } finally {
    child.kill();
    await delay(750);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
}
run().catch((error) => { console.error(error); process.exit(1); });
