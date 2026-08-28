#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.DASHBOARD_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tokenFor = user => { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; };

function dashboardUser() {
  const query = `SELECT DISTINCT u.id, u.organization_id, u.username FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id JOIN role_permissions rp ON rp.role_id = r.id JOIN permissions p ON p.id = rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND r.code = 'SPECIALIST_STAFF' AND r.is_active = 1 AND p.code = 'dashboard.read' LIMIT 1`;
  const output = execFileSync(process.env.MYSQL_BIN || 'mysql', [
    '-h', process.env.DB_HOST || '127.0.0.1', '-P', process.env.DB_PORT || '3306', '-u', process.env.DB_USER || 'root',
    `--database=${process.env.DB_NAME}`, '--batch', '--raw', '--skip-column-names', '-e', query,
  ], { encoding: 'utf8', timeout: 10_000, windowsHide: true });
  const [id, organizationId, username] = output.trim().split('\t');
  assert(id && organizationId && username, 'No active Specialist Staff user has dashboard.read.');
  return { id: Number(id), organization_id: Number(organizationId), username };
}

async function waitPort(profile, child) {
  const file = path.join(profile, 'DevToolsActivePort');
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`);
    try { const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch {}
    await delay(100);
  }
  throw new Error('Chrome DevTools did not start.');
}

function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {}); } });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
}

async function run() {
  let child; let profile;
  try {
    const user = await dashboardUser();
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-dashboard-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10_000) })).json();
    const page = targets.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(tokenFor(user))}); window.__dashboardErrors=[]; window.addEventListener('error', event => window.__dashboardErrors.push(event.message));` });
    await cdp.send('Page.navigate', { url: `${frontend}/app/dashboard` });
    await delay(2200);

    let state = await evaluate(cdp, `({title:document.querySelector('h1')?.textContent, body:document.body.innerText, errors:window.__dashboardErrors, order:(()=>{const a=document.querySelector('[data-testid=active-users-presence]'),b=document.querySelector('[data-testid=workspace-switch]');return !!a&&!!b&&Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)})(), kpis:[...document.querySelectorAll('[data-testid=dashboard-kpi-grid]')].map(node=>node.innerText), refresh:(()=>{const button=document.querySelector('button[aria-label="Muat ulang dasbor"]');return button?{text:button.innerText,title:button.title,aria:button.getAttribute('aria-label'),svg:!!button.querySelector('svg')}:null})(), quick:[...document.querySelectorAll('[data-testid^="quick-access-"]')].map(node=>node.getAttribute('data-testid'))})`);
    assert(state.title === 'Dasbor Global', `Dashboard title mismatch: ${state.title}`);
    assert(!state.body.includes('Akses Ditolak') && !state.body.includes('Tidak diizinkan'), 'Dashboard rendered a permission-lock state.');
    for (const label of ['Total Kas', 'Pendapatan Kotor', 'Total Pengeluaran', 'Pendapatan Bersih']) assert(state.kpis.join(' ').includes(label), `Missing financial KPI: ${label}`);
    assert(state.refresh?.aria === 'Muat ulang dasbor' && state.refresh?.title === 'Muat ulang dasbor' && state.refresh?.svg && !state.refresh?.text.trim(), 'Dashboard refresh control is not an accessible icon-only button.');
    assert(state.quick.length === 2 && state.quick.includes('quick-access-studio') && state.quick.includes('quick-access-craft'), 'Dashboard must render exactly the Studio and Craft Quick Access controls.');
    assert(state.order, 'Active users control is not immediately before workspace switch.');
    assert(!state.errors.length, `Dashboard raised browser errors: ${state.errors.join('; ')}`);

    await evaluate(cdp, `document.querySelector('[data-testid=quick-access-studio]').click()`); await delay(120);
    state = await evaluate(cdp, `({count:document.querySelectorAll('[data-testid=quick-access-overlay]').length,logo:document.querySelector('[data-testid=quick-access-overlay] img')?.alt,studio:document.querySelector('[data-testid=quick-access-studio]')?.getAttribute('aria-expanded')})`);
    assert(state.count === 1 && state.logo === 'Uni-Inside Studio' && state.studio === 'true', 'Studio Quick Access did not open a single Studio overlay.');
    let geometry = await evaluate(cdp, `(()=>{const rect=value=>value?{left:value.left,right:value.right,top:value.top,bottom:value.bottom}:null;return {overlay:rect(document.querySelector('[data-testid=quick-access-overlay]')?.getBoundingClientRect()),kpis:rect(document.querySelector('[data-testid=dashboard-kpi-grid]')?.getBoundingClientRect()),charts:rect(document.querySelector('[data-testid=dashboard-charts]')?.getBoundingClientRect())};})()`);
    assert(geometry.overlay.left <= geometry.kpis.left + 2 && geometry.overlay.right >= geometry.kpis.right - 2 && geometry.overlay.top <= geometry.kpis.top + 2 && geometry.overlay.bottom >= geometry.kpis.bottom - 2, 'Quick Access overlay does not cover the full KPI grid.');
    assert(geometry.overlay.bottom <= geometry.charts.top + 2, 'Quick Access overlay extends into the charts section.');

    await evaluate(cdp, `document.querySelector('[data-testid=quick-access-craft]').click()`); await delay(120);
    state = await evaluate(cdp, `({count:document.querySelectorAll('[data-testid=quick-access-overlay]').length,logo:document.querySelector('[data-testid=quick-access-overlay] img')?.alt,studio:document.querySelector('[data-testid=quick-access-studio]')?.getAttribute('aria-expanded'),craft:document.querySelector('[data-testid=quick-access-craft]')?.getAttribute('aria-expanded')})`);
    assert(state.count === 1 && state.logo === 'Uni-Inside Craft' && state.studio === 'false' && state.craft === 'true', 'Craft Quick Access did not replace the Studio overlay.');
    await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await delay(120);
    assert(await evaluate(cdp, `document.querySelectorAll('[data-testid=quick-access-overlay]').length === 0`), 'Escape did not close Quick Access.');
    await evaluate(cdp, `document.querySelector('[data-testid=quick-access-studio]').click()`); await delay(80); await evaluate(cdp, `document.querySelector('h1').click()`); await delay(120);
    assert(await evaluate(cdp, `document.querySelectorAll('[data-testid=quick-access-overlay]').length === 0`), 'Clicking outside Quick Access did not close it.');

    const beforeWorkspaceKpis = await evaluate(cdp, `[...document.querySelectorAll('[data-testid=dashboard-kpi-grid]')].map(node=>node.innerText).join('|')`);
    const beforeWorkspace = await evaluate(cdp, `document.querySelector('[data-testid=workspace-switch]')?.innerText`);
    await evaluate(cdp, `document.querySelector('[data-testid=workspace-switch]').click()`); await delay(180);
    const afterWorkspace = await evaluate(cdp, `document.querySelector('[data-testid=workspace-switch]')?.innerText`);
    const afterWorkspaceKpis = await evaluate(cdp, `[...document.querySelectorAll('[data-testid=dashboard-kpi-grid]')].map(node=>node.innerText).join('|')`);
    assert(beforeWorkspace !== afterWorkspace, 'Workspace switch did not change Craft ↔ Studio.');
    assert(beforeWorkspaceKpis === afterWorkspaceKpis, 'Global Dashboard figures changed after workspace switch.');

    await evaluate(cdp, `(()=>{const select=[...document.querySelectorAll('select')].find(item=>item.value==='month');select.value='today';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(900);
    for (const width of [1440, 1366, 1280, 1024, 768]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await delay(160);
      state = await evaluate(cdp, '({width:document.documentElement.scrollWidth,viewport:innerWidth})');
      assert(state.width <= state.viewport + 1, `Dashboard/header overflow at ${width}px.`);
    }
    cdp.socket.close();
    console.log('Dashboard browser acceptance passed.');
  } finally {
    if (child) child.kill();
    if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
  }
}

const keepAlive = setInterval(() => undefined, 1_000);
try {
  await run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  clearInterval(keepAlive);
}
