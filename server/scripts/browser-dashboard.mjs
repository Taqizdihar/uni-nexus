#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.DASHBOARD_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tokenFor = user => { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; };

async function dashboardUser() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try { const [rows] = await connection.execute(`SELECT DISTINCT u.id,u.organization_id,u.username FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='dashboard.read' LIMIT 1`); assert(rows.length, 'No active user has dashboard.read.'); return rows[0]; } finally { await connection.end(); }
}
async function waitPort(profile, child) { const file = path.join(profile, 'DevToolsActivePort'); const until = Date.now() + 20000; while (Date.now() < until) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`); try { const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch {} await delay(100); } throw new Error('Chrome DevTools did not start.'); }
function connect(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {}); } }); const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); }); return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } }; }

async function evaluate(cdp, expression) { const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return result.result?.value; }
async function run() {
  let child; let profile;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-dashboard-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const page = targets.find(item => item.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(page.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(tokenFor(await dashboardUser()))}); window.__dashboardErrors=[]; window.addEventListener('error', event => window.__dashboardErrors.push(event.message));` });
    await cdp.send('Page.navigate', { url: `${frontend}/app/dashboard` }); await delay(2200);
    let state = await evaluate(cdp, `({title:document.querySelector('h1')?.textContent, body:document.body.innerText, errors:window.__dashboardErrors, order:(()=>{const a=document.querySelector('[data-testid=active-users-presence]'),b=document.querySelector('[data-testid=workspace-switch]');return !!a&&!!b&&Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)})(), width:document.documentElement.scrollWidth, viewport:innerWidth})`);
    assert(state.title === 'Dasbor Global', `Dashboard title mismatch: ${state.title}`); assert(!state.body.includes('Akses Ditolak') && !state.body.includes('NX-102'), 'Dashboard rendered a forbidden or historical mock state.'); assert(state.order, 'Active users control is not immediately before workspace switch.'); assert(!state.errors.length, `Dashboard raised browser errors: ${state.errors.join('; ')}`);
    await evaluate(cdp, `(()=>{const select=[...document.querySelectorAll('select')].find(item=>item.value==='month');select.value='today';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(900);
    await evaluate(cdp, `(()=>{const select=[...document.querySelectorAll('select')].find(item=>item.value==='today');select.value='custom';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(250);
    await evaluate(cdp, `(()=>{const inputs=[...document.querySelectorAll('input[type=date]')];const today=new Date().toISOString().slice(0,10);inputs.forEach(input=>{input.value=today;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});})()`); await delay(900);
    await evaluate(cdp, `document.querySelector('[data-testid=active-users-presence] button').click()`); await delay(100); assert(await evaluate(cdp, `document.body.innerText.includes('Pengguna Aktif')`), 'Presence popover did not open.'); await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await delay(100);
    for (const width of [1440, 1024, 768]) { await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await delay(150); state = await evaluate(cdp, '({width:document.documentElement.scrollWidth,viewport:innerWidth})'); assert(state.width <= state.viewport + 1, `Dashboard/header overflow at ${width}px.`); }
    cdp.socket.close(); console.log('Dashboard browser acceptance passed.');
  } finally { if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } }
}
run().catch(error => { console.error(error); process.exit(1); });
