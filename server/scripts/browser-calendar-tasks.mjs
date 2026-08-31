#!/usr/bin/env node
// Real Chrome/CDP acceptance coverage for the Calendar & Tasks workspace.
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const front = process.env.CALENDAR_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const db = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const tokenFor = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};

async function fixtureUser() {
  const connection = await db();
  try {
    const [rows] = await connection.execute(`SELECT u.id,u.organization_id,u.username,bu.id AS business_unit_id FROM users u JOIN user_business_units ubu ON ubu.user_id=u.id AND ubu.can_access=1 JOIN business_units bu ON bu.id=ubu.business_unit_id AND bu.code='CRAFT' JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.is_active=1 JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code IN ('calendar.read','calendar.write','tasks.read','tasks.write') GROUP BY u.id,bu.id HAVING COUNT(DISTINCT p.code)=4 LIMIT 1`);
    assert(rows.length, 'No active Craft user has calendar/tasks read+write permissions.');
    return rows[0];
  } finally { await connection.end(); }
}

async function chromePort(profile, child) {
  const activePort = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`);
    try { const [port] = (await readFile(activePort, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* Chrome is still starting. */ }
    await delay(100);
  }
  throw new Error('Chrome DevTools did not start.');
}

function cdpConnect(url) {
  const socket = new WebSocket(url); const pending = new Map(); let id = 0;
  socket.addEventListener('message', async (event) => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); const request = pending.get(message.id); if (!request) return; pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {}); });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return { socket, async send(method, params = {}) { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}

const evaluate = async (cdp, expression) => (await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
async function waitFor(cdp, expression, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) { if (await evaluate(cdp, expression)) return; await delay(200); }
  const state = await evaluate(cdp, '({url:location.href,title:document.title,body:document.body.innerText.slice(0,1200)})');
  throw new Error(`${description}: ${JSON.stringify(state)}`);
}
const click = (label) => `(()=>{const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Button not found: ${label}');button.click();})()`;
const setValue = (selector, value) => `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing ${selector}');const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`;
const setWorkspace = (id) => `(()=>{const modal=document.querySelector('[role=dialog]');const el=[...modal.querySelectorAll('select')].find((item)=>[...item.options].some((option)=>option.value===${JSON.stringify(String(id))}));if(!el)throw new Error('Workspace selector not found');el.value=${JSON.stringify(String(id))};el.dispatchEvent(new Event('change',{bubbles:true}));})()`;
const setDatetimes = `(()=>{const value=new Date(Date.now()+86400000).toISOString().slice(0,16);for(const el of document.querySelectorAll('[role=dialog] input[type=datetime-local]')){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}})()`;

let browser; let profile; let cdp; let eventId; let taskId; let sourceId;
try {
  const user = await fixtureUser(); const token = tokenFor(user); const suffix = randomBytes(4).toString('hex'); const eventTitle = `Browser acara ${suffix}`; const taskTitle = `Browser tugas ${suffix}`;
  const connection = await db();
  try { const [result] = await connection.execute(`INSERT INTO calendar_events (organization_id,business_unit_id,event_code,title,event_type,source_module_code,start_at,all_day,status_code,source_type,source_id,source_code,source_key,created_by,updated_by) VALUES (?,?,?,?,?,'craft_orders',UTC_TIMESTAMP(3),0,'scheduled','craft_order',?,?,?,?,?)`, [user.organization_id, user.business_unit_id, `SRC-${suffix.toUpperCase()}`, `Source ${suffix}`, 'order_deadline', 900000000 + Number.parseInt(suffix.slice(0, 4), 16), 'BROWSER', `browser-source:${suffix}`, user.id, user.id]); sourceId = Number(result.insertId); } finally { await connection.end(); }
  profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-calendar-browser-')); browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
  const port = await chromePort(profile, browser); await delay(400); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const page = targets.find((target) => target.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No Chrome page target available.');
  cdp = cdpConnect(page.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token',${JSON.stringify(token)});window.__calendarErrors=[];window.addEventListener('error',(event)=>window.__calendarErrors.push(event.message));` });
  await cdp.send('Page.navigate', { url: `${front}/app/calendar` }); await waitFor(cdp, `document.body.innerText.includes('Kalender & Tugas')`, 'Calendar page failed to load');
  assert(await evaluate(cdp, `document.body.innerText.includes('Kalender')&&document.body.innerText.includes('Tugas')`), 'Calendar and Task tabs are missing.'); assert(await evaluate(cdp, `document.querySelectorAll('.grid.grid-cols-7 > div').length>=7`), 'Month view weekday grid is missing.');
  await evaluate(cdp, click('Minggu')); await waitFor(cdp, `Array.from(document.querySelectorAll('[class*="min-w-"]')).some((item)=>item.children.length===7&&item.innerText.includes('Sen'))`, 'Week view did not render seven columns'); await evaluate(cdp, click('Agenda')); await waitFor(cdp, `Boolean(document.querySelector('section'))||document.body.innerText.includes('Tidak ada jadwal')`, 'Agenda view did not render');
  await evaluate(cdp, click('Tambah Acara')); await waitFor(cdp, `Boolean(document.querySelector('[role=dialog]'))`, 'Event form did not open'); await evaluate(cdp, setValue('input[placeholder="Judul"]', eventTitle)); await evaluate(cdp, setDatetimes); await evaluate(cdp, setWorkspace(user.business_unit_id)); await evaluate(cdp, click('Simpan')); await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(eventTitle)})`, 'Event was not created through the UI');
  await evaluate(cdp, click('Tambah Tugas')); await waitFor(cdp, `Boolean(document.querySelector('[role=dialog]'))`, 'Task form did not open'); await evaluate(cdp, setValue('input[placeholder="Judul tugas"]', taskTitle)); await evaluate(cdp, setDatetimes); await evaluate(cdp, setWorkspace(user.business_unit_id)); await evaluate(cdp, click('Simpan Tugas')); await evaluate(cdp, click('Tugas')); await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(taskTitle)})`, 'Task was not created through the UI');
  await evaluate(cdp, `(()=>{const select=[...document.querySelectorAll('select[aria-label^="Status "]')].find((item)=>item.getAttribute('aria-label')!=='Status tugas');if(!select)throw new Error('Task status selector not found');select.value='in_progress';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(400); assert(await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(taskTitle)})`), 'Task disappeared after status update.');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 800, deviceScaleFactor: 1, mobile: true }); await delay(200); const viewport = await evaluate(cdp, `({scroll:document.documentElement.scrollWidth,view:innerWidth,errors:window.__calendarErrors})`); assert(viewport.scroll <= viewport.view + 1, `Mobile overflow: ${viewport.scroll}/${viewport.view}`); assert(!viewport.errors.length, `Browser errors: ${viewport.errors.join('; ')}`);
  const cleanup = await db(); try { const [events] = await cleanup.execute('SELECT id FROM calendar_events WHERE title=? AND organization_id=? LIMIT 1', [eventTitle, user.organization_id]); const [tasks] = await cleanup.execute('SELECT id FROM tasks WHERE title=? AND organization_id=? LIMIT 1', [taskTitle, user.organization_id]); eventId = events[0]?.id; taskId = tasks[0]?.id; } finally { await cleanup.end(); } assert(eventId && taskId, 'Could not identify UI fixtures for cleanup.');
  console.log('Calendar & Tasks browser acceptance: PASS (real Chrome DOM/UI interaction).');
} catch (error) { console.error('Calendar & Tasks browser acceptance: FAIL', error); process.exitCode = 1; } finally {
  if (cdp) cdp.socket.close(); if (browser) browser.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
  const connection = await db().catch(() => null); if (connection) { try { if (eventId) await connection.execute('DELETE FROM calendar_events WHERE id=?', [eventId]); if (taskId) { await connection.execute('DELETE FROM task_assignees WHERE task_id=?', [taskId]); await connection.execute('DELETE FROM tasks WHERE id=?', [taskId]); } if (sourceId) await connection.execute('DELETE FROM calendar_events WHERE id=?', [sourceId]); } finally { await connection.end(); } }
}
