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
const frontend = process.env.WORKSPACE_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const tokenFor = user => {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};

async function userWithDefaultWorkspace(workspace) {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await connection.execute(
      `SELECT u.id, u.organization_id, u.username FROM users u
       JOIN user_business_units ubu ON ubu.user_id = u.id AND ubu.can_access = 1
       JOIN business_units bu ON bu.id = ubu.business_unit_id AND bu.code = ?
       WHERE u.default_workspace_code = ? AND u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved'
       LIMIT 1`,
      [workspace.toUpperCase(), workspace],
    );
    return rows[0] || null;
  } finally { await connection.end(); }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {}); } });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}

async function checkWorkspaceLabel(cdp, token, expectedLabel) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.clear(); localStorage.setItem('token', ${JSON.stringify(token)});` });
  await cdp.send('Page.navigate', { url: `${frontend}/app/dashboard` });
  const evalPage = () => cdp.send('Runtime.evaluate', { expression: '({toggle:document.querySelector("[data-testid=\\"workspace-switch\\"]")?.textContent||null})', returnByValue: true }).then(r => r.result?.value || {});
  let page = await evalPage(); const deadline = Date.now() + 15000;
  while (!page.toggle && Date.now() < deadline) { await delay(250); page = await evalPage(); }
  assert(page.toggle, 'Workspace toggle did not render in time.');
  assert(page.toggle.includes(expectedLabel), `Expected the workspace toggle to show '${expectedLabel}' on first load, got: ${page.toggle}`);
}

async function run() {
  console.log('Starting default workspace browser acceptance…');
  const studioUser = await userWithDefaultWorkspace('studio');
  const craftUser = await userWithDefaultWorkspace('craft');
  if (!studioUser && !craftUser) { console.warn('Skipped: no user in this database has a default_workspace_code matching an accessible business unit. Nothing to verify.'); return; }
  let child; let profile; let keepAlive;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-default-workspace-'));
    console.log('Starting headless Chrome…');
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    keepAlive = setInterval(() => {}, 1000);
    const cdp = connect(target.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');

    if (studioUser) { console.log(`Verifying default_workspace_code='studio' is honored for ${studioUser.username}…`); await checkWorkspaceLabel(cdp, tokenFor(studioUser), 'Uni-Inside Studio'); }
    else console.warn('Skipped the Studio-default case: no active user with default_workspace_code=studio and Studio access.');
    if (craftUser) { console.log(`Verifying default_workspace_code='craft' is honored for ${craftUser.username}…`); await checkWorkspaceLabel(cdp, tokenFor(craftUser), 'Uni-Inside Craft'); }
    else console.warn('Skipped the Craft-default case: no active user with default_workspace_code=craft and Craft access.');

    cdp.socket.close(); console.log('Default workspace browser acceptance passed.');
  } finally { if (keepAlive) clearInterval(keepAlive); if (child) child.kill(); if (profile) { await delay(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(cleanupError => console.warn(`Warning: could not fully clean up ${profile}: ${cleanupError.message}`)); } }
}
run().catch(error => { console.error(error); process.exit(1); });
