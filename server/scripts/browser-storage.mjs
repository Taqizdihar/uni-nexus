#!/usr/bin/env node
import { createHmac, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const api = process.env.STORAGE_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const frontend = process.env.STORAGE_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const withTimeout = async (promise, message, timeoutMs = 15_000) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const tokenFor = user => { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; };
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

async function createFixture() {
  const connection = await database();
  try {
    const username = `browserstorage${randomUUID().slice(0, 12)}`;
    const [result] = await connection.execute(
      `INSERT INTO users (organization_id, full_name, username, email, password_hash, status_code, approval_status_code, registration_source, default_workspace_code, approval_requested_at)
       VALUES (1, 'Storage Browser Smoke', ?, ?, '$2b$10$fixturehashonlyneverused', 'active', 'approved', 'legacy', 'craft', CURRENT_TIMESTAMP(3))`,
      [username, `${username}@example.invalid`],
    );
    return { id: Number(result.insertId), organization_id: 1, username };
  } finally { await connection.end(); }
}

async function cleanupFixture(userId) {
  if (!userId) return;
  const connection = await database();
  try {
    await connection.execute('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_presence_sessions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_business_units WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_deletion_requests WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_reactivation_requests WHERE deleted_user_id = ?', [userId]);
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
  } finally { await connection.end(); }
}

async function waitPort(profile, child) {
  const marker = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`); try { const [port] = (await readFile(marker, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch {} await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result || {}); } }); const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); }); return { socket, send: async (method, params = {}) => { await withTimeout(ready, `Chrome DevTools did not connect for ${method}.`); return withTimeout(new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }), `Chrome DevTools did not respond to ${method}.`); } }; }

async function upload(token, label) {
  const form = new FormData(); form.set('avatar', new Blob([png], { type: 'image/png' }), `${label}.png`);
  const response = await fetch(`${api}/profile/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = await response.json(); assert(response.ok, `Avatar upload returned ${response.status}: ${JSON.stringify(body)}`);
  const key = body?.data?.avatar_path; assert(/^avatars\/[0-9a-f-]+\.png$/i.test(key), `Avatar key is not canonical: ${key}`); return key;
}
async function deleteAvatar(token) { const response = await fetch(`${api}/profile/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const body = await response.json(); assert(response.ok && body?.data?.avatar_path === null, `Avatar delete returned ${response.status}`); }
const publicUrl = key => `${api.replace(/\/api\/v1$/, '')}/uploads/${key}`;
const removeGenerated = async key => { if (!key || !/^avatars\/[0-9a-f-]+\.png$/i.test(key)) return; await rm(path.join(root, 'server', 'uploads', ...key.split('/')), { force: true }); };

async function run() {
  let user; let token; let first; let second; let child; let profile;
  try {
    user = await createFixture(); token = tokenFor(user);
    const privateResponse = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/documents/guessed-private.pdf`, { signal: AbortSignal.timeout(10_000) });
    assert(privateResponse.status !== 200, 'A guessed private /uploads URL was publicly accessible.');
    first = await upload(token, 'storage-browser-a');
    const firstResponse = await fetch(publicUrl(first), { signal: AbortSignal.timeout(10_000) }); assert(firstResponse.ok && firstResponse.headers.get('content-type')?.startsWith('image/png'), 'Approved avatar static URL is not available.');
    second = await upload(token, 'storage-browser-b');
    assert((await fetch(publicUrl(first), { signal: AbortSignal.timeout(10_000) })).status !== 200, 'Replaced avatar remains publicly available.');

    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-storage-browser-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1280,960', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10_000) })).json(); const page = targets.find(target => target.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(page.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__storageErrors=[]; window.addEventListener('error', event => window.__storageErrors.push(event.message));` });
    await cdp.send('Page.navigate', { url: `${frontend}/app/profile` }); await delay(1600);
    let state = await cdp.send('Runtime.evaluate', { expression: '({avatar:document.querySelector("img[src*=\\"/uploads/avatars/\\"]")?.getAttribute("src"),errors:window.__storageErrors})', returnByValue: true });
    assert(state.result?.value?.avatar?.includes('/uploads/avatars/'), 'Profile did not render the updated public avatar.'); assert(!state.result?.value?.errors?.length, `Profile raised browser errors: ${state.result?.value?.errors?.join('; ')}`);
    await deleteAvatar(token); assert((await fetch(publicUrl(second), { signal: AbortSignal.timeout(10_000) })).status !== 200, 'Deleted avatar remains publicly available.');
    await cdp.send('Page.reload'); await delay(900); state = await cdp.send('Runtime.evaluate', { expression: 'document.querySelector("img[src*=\\"/uploads/avatars/\\"]") === null', returnByValue: true }); assert(state.result?.value, 'Profile did not return to avatar initials fallback after deletion.'); cdp.socket.close();
    console.log('Storage browser acceptance passed.');
  } finally {
    try { await deleteAvatar(token); } catch {}
    await removeGenerated(first); await removeGenerated(second);
    await cleanupFixture(user?.id);
    if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
  }
}

const keepAlive = setInterval(() => undefined, 1_000);
try { await run(); }
catch (error) { console.error(error); process.exitCode = 1; }
finally { clearInterval(keepAlive); }
