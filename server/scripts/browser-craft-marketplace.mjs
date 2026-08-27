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
const front = process.env.MARKETPLACE_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.MARKETPLACE_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
async function getUser() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await db.execute(`SELECT DISTINCT u.id,u.organization_id,u.username FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='craft.marketplace.read' LIMIT 1`);
    assert(rows.length, 'No active user has craft.marketplace.read.'); return rows[0];
  } finally { await db.end(); }
}
async function waitPort(profile, child) { const file = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome stopped before starting (${child.exitCode}).`); try { const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); } throw new Error('Chrome DevTools did not start.'); }
function connect(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener('message', async (event) => { const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (data.id) { const promise = pending.get(data.id); if (promise) { pending.delete(data.id); data.error ? promise.reject(new Error(data.error.message)) : promise.resolve(data.result || {}); } } }); const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Chrome DevTools connection failed.')), { once: true }); }); return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } }; }

async function run() {
  const user = await getUser(); const token = tokenFor(user);
  const response = await fetch(`${api}/craft/marketplace/overview`, { headers: { Authorization: `Bearer ${token}` } });
  assert(response.ok, `Marketplace overview API returned ${response.status}.`);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-marketplace-browser-'));
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
  try {
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const page = targets.find((target) => target.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No browser page is available.');
    const cdp = connect(page.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__marketplaceErrors=[]; window.addEventListener('error', event => window.__marketplaceErrors.push(event.message));` });
    const routes = [['/app/craft/marketplace', 'Marketplace & Kanal Penjualan'], ['/app/craft/marketplace/channels', 'Kanal Penjualan'], ['/app/craft/marketplace/import', 'Impor Pesanan'], ['/app/craft/marketplace/products', 'Pemetaan Produk'], ['/app/craft/marketplace/fees', 'Aturan Biaya Marketplace'], ['/app/craft/marketplace/settlements', 'Settlement Marketplace'], ['/app/craft/marketplace/integrations', 'Integrasi Marketplace'], ['/app/craft/marketplace/sync-history', 'Riwayat Sinkronisasi']];
    for (const [route, title] of routes) { await cdp.send('Page.navigate', { url: `${front}${route}` }); await delay(2200); const state = await cdp.send('Runtime.evaluate', { expression: `({ title: Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__marketplaceErrors })`, returnByValue: true }); const value = state.result?.value; assert(value?.title === title, `${route} expected '${title}', got '${value?.title}': ${value?.body?.slice(0, 300)}`); assert(!value.body.includes('Akses Ditolak'), `${route} rendered forbidden state.`); assert(!value.errors?.length, `${route} has browser errors: ${value.errors.join('; ')}`); }
    cdp.socket.close(); console.log('Craft Marketplace browser acceptance passed.');
  } finally { child.kill(); await delay(500); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
}
run().catch((error) => { console.error(error); process.exit(1); });
