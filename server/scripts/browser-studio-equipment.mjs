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
const frontend = process.env.STUDIO_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.STUDIO_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
async function getUser() {
  const connection = await database();
  try {
    const [rows] = await connection.execute(`SELECT DISTINCT u.id, u.organization_id, u.username FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'studio.equipment.write' LIMIT 1`);
    assert(rows.length, 'No active user has studio.equipment.write.'); return rows[0];
  } finally { await connection.end(); }
}
async function call(auth, method, endpoint, body) {
  const response = await fetch(`${api}${endpoint}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json(); assert(response.ok, `${method} ${endpoint}: ${response.status} ${JSON.stringify(payload).slice(0, 400)}`); return payload.data;
}
async function seed(auth) {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  const asset = await call(auth, 'POST', '/studio/equipment/assets', { name: `Camera Browser ${suffix}`, category: 'Kamera', brand: 'Sony', model: 'A7 IV', serial_number: `BR-${suffix}`, location_name: 'Studio Browser', purchase_cost: 35000000, depreciation_method: 'straight_line', purchase_date: '2025-01-01', useful_life_months: 36 });
  await call(auth, 'POST', `/studio/equipment/assets/${asset.id}/maintenance/records`, { maintenance_type: 'Pembersihan Lensa', performed_at: new Date(Date.now() - 86400000).toISOString(), cost: 250000, next_due_at: new Date(Date.now() + 86400000 * 30).toISOString(), notes: 'Fixture browser.' });
  return { ...asset, name: `Camera Browser ${suffix}` };
}
async function clean(asset) {
  if (!asset?.id) return; const connection = await database();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM asset_project_assignments WHERE asset_id = ?', [asset.id]);
    await connection.execute('DELETE FROM asset_maintenance_records WHERE asset_id = ?', [asset.id]);
    await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_equipment' AND entity_type = 'asset' AND entity_id = ?", [asset.id]);
    await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_equipment' AND entity_type = 'asset' AND entity_id = ?", [asset.id]);
    await connection.execute('DELETE FROM assets WHERE id = ?', [asset.id]); await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { await connection.end(); }
}
async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result || {}); } });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}
async function run() {
  const user = await getUser(); const token = tokenFor(user); const auth = { Authorization: `Bearer ${token}` }; let asset = null; let profile = null; let child = null;
  try {
    asset = await seed(auth); profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-studio-equipment-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.'); const cdp = connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__equipmentErrors=[]; window.addEventListener('error', event => window.__equipmentErrors.push(event.message));` });
    await cdp.send('Page.navigate', { url: frontend }); await delay(800); await cdp.send('Runtime.evaluate', { expression: `localStorage.setItem('token', ${JSON.stringify(token)});` });
    const routes = [
      ['/app/studio/equipment', 'Peralatan & Aset', ['Total Aset Aktif']],
      ['/app/studio/equipment/assets', 'Daftar Peralatan & Aset', [asset.name]],
      ['/app/studio/equipment/assets/new', 'Tambah Aset', ['Nomor Serial']],
      [`/app/studio/equipment/assets/${asset.id}`, asset.name, ['Penggunaan Proyek', 'Perawatan']],
      [`/app/studio/equipment/assets/${asset.id}/edit`, 'Edit Aset', ['Nilai Buku Tercatat']],
      ['/app/studio/equipment/assignments', 'Jadwal Penggunaan', ['Cek Ketersediaan']],
      ['/app/studio/equipment/maintenance', 'Perawatan', [asset.name]],
    ];
    for (const [route, title, expectations] of routes) {
      await cdp.send('Page.navigate', { url: `${frontend}${route}` }); await delay(2200);
      const state = await cdp.send('Runtime.evaluate', { expression: '({ title: Array.from(document.querySelectorAll("h1")).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__equipmentErrors || [] })', returnByValue: true }); const page = state.result?.value;
      assert(page?.title === title, `${route} expected '${title}', got '${page?.title}'. ${page?.body?.slice(0, 900)}`); assert(!page.body.includes('Dalam Pengembangan') && !page.body.includes('Akses Ditolak'), `${route} rendered an unavailable placeholder.`); for (const expected of expectations) assert(page.body.toLowerCase().includes(expected.toLowerCase()), `${route} is missing '${expected}'. ${page.body.slice(0, 900)}`); assert(!page.errors?.length, `${route} has browser errors: ${page.errors.join('; ')}`);
    }
    cdp.socket.close(); console.log('Studio Equipment browser acceptance passed.');
  } finally { if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } await clean(asset); }
}
run().catch(error => { console.error(error); process.exit(1); });
