#!/usr/bin/env node
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.NOTIFICATIONS_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tokenFor = (user) => { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 900 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; };
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
async function waitPort(profile, child) { const file = path.join(profile, 'DevToolsActivePort'); const until = Date.now() + 20_000; while (Date.now() < until) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`); try { const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch {} await delay(100); } throw new Error('Chrome DevTools did not start.'); }
function connect(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const pendingRequest = pending.get(message.id); pending.delete(message.id); message.error ? pendingRequest.reject(new Error(message.error.message)) : pendingRequest.resolve(message.result || {}); } }); const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); }); return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } }; }
const evaluate = async (cdp, expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

async function run() {
  const suffix = randomBytes(5).toString('hex'); const username = `browser_notif_${suffix}`; const title = `Notifikasi Browser ${suffix}`;
  const db = await database(); let userId = 0; let notificationId = 0; let child; let profile;
  try {
    const [created] = await db.execute(`INSERT INTO users (organization_id,full_name,username,email,password_hash,status_code,approval_status_code,registration_source,default_workspace_code,approval_requested_at) VALUES (1,?,?,?,?,?,?, 'legacy','craft',CURRENT_TIMESTAMP(3))`, [`Browser Notifications`, username, `${username}@example.invalid`, '$2b$10$fixturehashonlyneverused', 'active', 'approved']);
    userId = Number(created.insertId);
    const [notification] = await db.execute(`INSERT INTO notifications (organization_id,user_id,notification_type,module_code,severity_code,title,message,action_url,is_read) VALUES (?,?, 'smoke','users','critical',?,'Browser fixture notification','/app/notifications',0)`, [1, userId, title]);
    notificationId = Number(notification.insertId);
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-notifications-browser-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const page = targets.find(target => target.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No browser page is available.');
    const cdp = connect(page.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(tokenFor({ id: userId, organization_id: 1, username }))}); window.__notificationErrors=[]; window.addEventListener('error', event => window.__notificationErrors.push(event.message));` });
    await cdp.send('Page.navigate', { url: `${frontend}/app/notifications` }); await delay(2_500);
    let state = await evaluate(cdp, `({title:document.querySelector('h1')?.textContent?.trim(),body:document.body.innerText,errors:window.__notificationErrors,badge:document.querySelector('button[aria-label="Buka notifikasi"] span')?.textContent})`);
    assert(state.title === 'Notifikasi', `Notification Center title mismatch: ${state.title}`); assert(state.body.includes(title), 'Notification fixture is missing from Notification Center.'); assert(state.badge === '1', `Unread badge mismatch: ${state.badge}`); assert(!state.errors.length, `Notification Center browser errors: ${state.errors.join('; ')}`);
    await evaluate(cdp, `document.querySelector('button[aria-label="Buka notifikasi"]').click()`); await delay(150);
    state = await evaluate(cdp, `({open:!!document.querySelector('[role=dialog][aria-label="Notifikasi terbaru"]'),body:document.body.innerText})`); assert(state.open && state.body.includes(title), 'Bell did not open the latest-notifications popover.');
    await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await delay(100); assert(await evaluate(cdp, `!document.querySelector('[role=dialog][aria-label="Notifikasi terbaru"]')`), 'Escape did not close the notification popover.');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 800, deviceScaleFactor: 1, mobile: true }); await delay(120); state = await evaluate(cdp, `({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth})`); assert(state.scrollWidth <= state.viewport + 1, 'Notification Center overflows on mobile.');
    cdp.socket.close(); console.log('Notifications browser acceptance: PASS');
  } finally {
    if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
    if (notificationId) await db.execute('DELETE FROM notifications WHERE id=?', [notificationId]);
    if (userId) await db.execute('DELETE FROM users WHERE id=?', [userId]);
    await db.end();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
