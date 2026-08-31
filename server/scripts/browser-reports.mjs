#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.REPORTS_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.REPORTS_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const startedAt = new Date().toISOString().slice(0, 23).replace('T', ' ');
const assert = (value, message) => { if (!value) throw new Error(message); };
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
async function browserActor() {
  const required = ['reports.read', 'reports.export', 'craft.analytics.read', 'craft.analytics.export', 'studio.analytics.read', 'studio.analytics.export', 'finance.read', 'dashboard.read'];
  const connection = await database();
  try {
    const [rows] = await connection.execute(`SELECT u.id,u.organization_id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' GROUP BY u.id,u.organization_id HAVING ${required.map(() => 'SUM(p.code=?)>0').join(' AND ')} LIMIT 1`, required);
    assert(rows.length, 'No browser actor has complete Reports access.'); return rows[0];
  } finally { await connection.end(); }
}
async function cleanup(actor) {
  const connection = await database();
  try {
    const [rows] = await connection.execute('SELECT id,storage_path FROM report_exports WHERE organization_id=? AND generated_by=? AND generated_at>=?', [actor.organization_id, actor.id, startedAt]);
    const ids = rows.map(row => Number(row.id));
    if (ids.length) {
      const marks = ids.map(() => '?').join(','); await connection.beginTransaction();
      await connection.execute(`DELETE FROM documents WHERE entity_type='report_export' AND entity_id IN (${marks})`, ids);
      await connection.execute(`DELETE FROM audit_logs WHERE module_code='reports' AND action_code='reports.export' AND entity_id IN (${marks})`, ids);
      await connection.execute(`DELETE FROM report_exports WHERE id IN (${marks})`, ids); await connection.commit();
    }
  } catch (error) { await connection.rollback(); throw error; } finally { await connection.end(); }
}
async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch {} await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result || {}); } });
  const opened = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  const ready = Promise.race([opened, delay(8_000).then(() => { throw new Error(`Chrome DevTools did not accept a WebSocket connection: ${url}`); })]);
  return { socket, send: async (method, params = {}) => { await ready; const requestId = ++id; const response = new Promise((resolve, reject) => { pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); }); return Promise.race([response, delay(8_000).then(() => { pending.delete(requestId); throw new Error(`Chrome DevTools did not respond to ${method}.`); })]); } };
}
const evaluate = async (cdp, expression) => (await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
async function waitFor(cdp, expression, message) { for (let attempt = 0; attempt < 40; attempt += 1) { if (await evaluate(cdp, expression)) return; await delay(300); } throw new Error(message); }

async function run() {
  const keepAlive = setInterval(() => {}, 1_000); const actor = await browserActor(); console.log('Reports browser actor resolved.'); const token = tokenFor(actor); let profile; let child;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-reports-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-allow-origins=*', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); console.log('Reports browser Chrome started.'); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const debugUrl = target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1'); let cdp; let lastConnectionError;
    for (let attempt = 0; attempt < 5; attempt += 1) { try { cdp = connect(debugUrl); await cdp.send('Browser.getVersion'); break; } catch (error) { lastConnectionError = error; cdp?.socket.close(); cdp = undefined; await delay(500); } }
    if (!cdp) throw lastConnectionError || new Error('Chrome DevTools is unavailable.');
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__reportsErrors=[];window.__reportsDialogs=[];for(const name of ['alert','confirm','prompt'])window[name]=()=>{window.__reportsDialogs.push(name);return false};window.addEventListener('error',event=>window.__reportsErrors.push(event.message));window.addEventListener('unhandledrejection',event=>window.__reportsErrors.push(String(event.reason)));localStorage.setItem('token',${JSON.stringify(token)});` });
    await cdp.send('Page.navigate', { url: frontend }); await delay(700); await evaluate(cdp, `localStorage.setItem('token', ${JSON.stringify(token)})`);
    const auth = await evaluate(cdp, `(async()=>{const response=await fetch(${JSON.stringify(`${api}/auth/me`)},{headers:{Authorization:'Bearer '+localStorage.getItem('token')}});return response.status})()`); assert(auth === 200, `Browser authentication probe failed: ${auth}`);
    await cdp.send('Page.navigate', { url: `${frontend}/app/reports` });
    await waitFor(cdp, `document.body.innerText.includes('Pusat Laporan')`, 'Pusat Laporan heading did not render.');
    await waitFor(cdp, `document.querySelector('aside')?.innerText.includes('Pusat Laporan')`, 'Authorized sidebar did not show Pusat Laporan.');
    await waitFor(cdp, `Array.from(document.querySelectorAll('button')).some(button=>button.textContent?.includes('Lihat Laporan'))`, 'Report catalog cards did not render.');
    await evaluate(cdp, `Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.includes('Lihat Laporan'))?.click()`);
    await waitFor(cdp, `document.querySelector('#report-viewer')?.innerText.includes('Data Laporan')`, 'Report viewer did not render a data table.');
    await evaluate(cdp, `Array.from(document.querySelectorAll('#report-viewer button')).find(button=>button.textContent?.includes('Ekspor Laporan'))?.click()`);
    await waitFor(cdp, `Boolean(document.querySelector('[role="dialog"]'))`, 'Export dialog did not open.');
    await evaluate(cdp, `Array.from(document.querySelectorAll('[role="dialog"] label')).find(label=>label.textContent?.includes('CSV'))?.click();Array.from(document.querySelectorAll('[role="dialog"] button')).find(button=>button.textContent?.includes('Buat & Unduh'))?.click()`);
    await waitFor(cdp, `!document.querySelector('[role="dialog"]')`, 'Export dialog did not close after generation.');
    await evaluate(cdp, `document.querySelector('[data-testid="workspace-switch"]')?.click()`); await waitFor(cdp, `location.pathname==='/app/reports'`, 'Workspace switch navigated away from Reports.');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(400);
    const state = await evaluate(cdp, `({overflow:document.documentElement.scrollWidth>window.innerWidth,native:window.__reportsDialogs,errors:window.__reportsErrors})`);
    assert(!state.overflow, 'Reports page has mobile horizontal overflow.'); assert(!state.native.length, `Native dialogs were called: ${state.native.join(', ')}`); assert(!state.errors.length, `Browser errors: ${state.errors.join('; ')}`);
    cdp.socket.close(); console.log('Reports browser acceptance passed with genuine DOM clicks, preview, export modal, download trigger, workspace switch, and mobile layout.');
  } finally { clearInterval(keepAlive); if (child) { child.kill(); await delay(500); } if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); await cleanup(actor); }
}
console.log('Reports browser acceptance starting.');
run().catch(error => { console.error(error); process.exit(1); });
