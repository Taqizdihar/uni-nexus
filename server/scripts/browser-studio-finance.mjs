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
const frontend = process.env.STUDIO_BROWSER_BASE_URL || 'http://localhost:5173';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const tokenFor = user => {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};
async function user() {
  console.log('Resolving a Studio Finance user…');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await connection.execute(`SELECT DISTINCT u.id,u.organization_id,u.username FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='studio.finance.read' LIMIT 1`);
    console.log(`Found ${rows.length} Studio Finance user(s).`);
    assert(rows.length, 'No active user has studio.finance.read.'); return rows[0];
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

async function run() {
  console.log('Starting Studio Finance browser acceptance…');
  const token = tokenFor(await user()); let child; let profile; let keepAlive;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-studio-finance-'));
    console.log('Starting headless Chrome…');
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    console.log('Connecting to Chrome DevTools…');
    keepAlive = setInterval(() => {}, 1000);
    const cdp = connect(target.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__financeErrors=[]; window.addEventListener('error', event => window.__financeErrors.push(event.message));` });
    const routes = [
      ['/app/studio/finance', 'Keuangan'], ['/app/studio/finance/transactions', 'Transaksi'], ['/app/studio/finance/treasury', 'Kas & Bank'], ['/app/studio/finance/income', 'Pendapatan'], ['/app/studio/finance/expenses', 'Pengeluaran'], ['/app/studio/finance/receivables', 'Piutang Klien'], ['/app/studio/finance/payables', 'Kewajiban Vendor / Freelancer'], ['/app/studio/finance/profitability', 'Profitabilitas Proyek'], ['/app/studio/finance/cash-flow', 'Arus Kas'], ['/app/studio/finance/budgets', 'Anggaran'], ['/app/studio/finance/accounting', 'Jurnal & Periode'],
    ];
    for (const [route, title] of routes) {
      await cdp.send('Page.navigate', { url: `${frontend}${route}` }); await delay(3000);
      const state = await cdp.send('Runtime.evaluate', { expression: '({title:Array.from(document.querySelectorAll("h1")).at(-1)?.textContent?.trim(),body:document.body.innerText,errors:window.__financeErrors||[]})', returnByValue: true }); const page = state.result?.value;
      assert(page?.title === title, `${route} expected '${title}', got '${page?.title}'. ${page?.body?.slice(0, 800)}`);
      assert(!page.body.includes('Dalam Pengembangan') && !page.body.includes('Akses Ditolak'), `${route} rendered a placeholder or access-denied state.`);
      assert(!page.errors?.length, `${route} raised browser errors: ${page.errors.join('; ')}`);
    }
    cdp.socket.close(); console.log('Studio Finance browser acceptance passed.');
  } finally { if (keepAlive) clearInterval(keepAlive); if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } }
}
run().catch(error => { console.error(error); process.exit(1); });
