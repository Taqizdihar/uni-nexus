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

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

async function getUser() {
  const connection = await database();
  try {
    const [rows] = await connection.execute(`SELECT u.id, u.organization_id, u.username FROM users u
      WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved'
        AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id WHERE ur.user_id = u.id AND p.code = 'studio.services.write')
      LIMIT 1`);
    assert(rows.length, 'No active user has studio.services.write.'); return rows[0];
  } finally { await connection.end(); }
}

async function seed(auth) {
  const call = async (method, endpoint, body) => {
    const response = await fetch(`${api}${endpoint}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json(); assert(response.ok, `${method} ${endpoint}: ${response.status} ${JSON.stringify(payload).slice(0, 300)}`); return payload.data;
  };
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  const categoryName = `Kategori Browser ${suffix}`; const serviceName = `Video Editing Browser ${suffix}`; const packageName = `Paket Browser ${suffix}`;
  const category = { ...await call('POST', '/studio/services/categories', { name: categoryName, code: `BROWSER_SERVICE_${suffix}` }), name: categoryName };
  const service = { ...await call('POST', '/studio/services', { name: serviceName, category_id: category.id, description: 'Fixture browser Studio Services.', pricing_model: 'hourly', base_price: 250000, unit_label: 'jam' }), name: serviceName };
  const servicePackage = { ...await call('POST', '/studio/services/packages', { name: packageName, description: 'Fixture browser.', package_price: 225000, items: [{ service_id: service.id, quantity: 1, notes: null }] }), name: packageName };
  return { category, service, servicePackage };
}

async function clean(fixture) {
  if (!fixture) return;
  const connection = await database();
  try {
    const { category, service, servicePackage } = fixture;
    await connection.beginTransaction();
    await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'service_package' AND entity_id = ?", [servicePackage.id]);
    await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_services' AND entity_type = 'service_package' AND entity_id = ?", [servicePackage.id]);
    await connection.execute('DELETE FROM service_packages WHERE id = ?', [servicePackage.id]);
    await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'studio_service' AND entity_id = ?", [service.id]);
    await connection.execute("DELETE FROM domain_events WHERE module_code = 'studio_services' AND entity_type = 'studio_service' AND entity_id = ?", [service.id]);
    await connection.execute('DELETE FROM studio_services WHERE id = ?', [service.id]);
    await connection.execute("DELETE FROM audit_logs WHERE module_code = 'studio_services' AND entity_type = 'studio_service_category' AND entity_id = ?", [category.id]);
    await connection.execute('DELETE FROM studio_service_categories WHERE id = ?', [category.id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { await connection.end(); }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id) { const item = pending.get(message.id); if (item) { pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result || {}); } } });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}

async function run() {
  const user = await getUser(); const token = tokenFor(user); let fixture = null;
  try {
    fixture = await seed({ Authorization: `Bearer ${token}` });
    const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-studio-services-')); const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    try {
      const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.'); const cdp = connect(target.webSocketDebuggerUrl);
      await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__studioServiceErrors=[]; window.addEventListener('error', event => window.__studioServiceErrors.push(event.message));` });
      // Set the token once on the Vite origin as well; this keeps the check robust on browsers that begin on about:blank.
      await cdp.send('Page.navigate', { url: frontend }); await delay(800);
      await cdp.send('Runtime.evaluate', { expression: `localStorage.setItem('token', ${JSON.stringify(token)});` });
      const authProbe = await cdp.send('Runtime.evaluate', { expression: `(async () => { const token = localStorage.getItem('token'); const response = await fetch(${JSON.stringify(`${api}/auth/me`)}, { headers: { Authorization: 'Bearer ' + token } }); return { token: Boolean(token), status: response.status, body: await response.text() }; })()`, awaitPromise: true, returnByValue: true });
      assert(authProbe.result?.value?.status === 200, `Browser API authentication probe failed: ${JSON.stringify(authProbe).slice(0, 900)}`);
      const routes = [
        ['/app/studio/services', 'Layanan', [fixture.service.name, 'Layanan Aktif']],
        ['/app/studio/services/new', 'Tambah Layanan', ['Model Harga', 'Harga Dasar']],
        ['/app/studio/services/categories', 'Kategori Layanan', [fixture.category.name]],
        ['/app/studio/services/packages', 'Paket Layanan', [fixture.servicePackage.name]],
        ['/app/studio/services/packages/new', 'Tambah Paket Layanan', ['Komposisi Layanan']],
        [`/app/studio/services/${fixture.service.id}`, fixture.service.name, ['Ringkasan', 'Paket', 'Proyek', 'Penggunaan Komersial']],
        [`/app/studio/services/${fixture.service.id}/edit`, 'Edit Layanan', ['Harga Dasar']],
        [`/app/studio/services/packages/${fixture.servicePackage.id}`, fixture.servicePackage.name, ['Komposisi Layanan', 'Harga Paket']],
        [`/app/studio/services/packages/${fixture.servicePackage.id}/edit`, 'Edit Paket Layanan', ['Nilai Referensi Layanan']],
      ];
      for (const [route, title, expectations] of routes) {
        await cdp.send('Page.navigate', { url: `${frontend}${route}` }); await delay(2500);
        const state = await cdp.send('Runtime.evaluate', { expression: `({ title: Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body: document.body.innerText, url: location.href, ready: document.readyState, errors: window.__studioServiceErrors })`, returnByValue: true }); const result = state.result?.value;
        assert(result?.title === title, `${route} expected '${title}', got '${result?.title}': ${JSON.stringify(result).slice(0, 800)}`); assert(!result.body.includes('Akses Ditolak'), `${route} rendered forbidden state.`); assert(!result.body.includes('Dalam Pengembangan'), `${route} rendered a placeholder.`); assert(!result.body.includes('Model Skala Arsitektur'), `${route} leaked legacy mock data.`);
        for (const expected of expectations) assert(result.body.toLowerCase().includes(expected.toLowerCase()), `${route} is missing '${expected}'.`); assert(!result.errors?.length, `${route} has browser errors: ${result.errors.join('; ')}`);
      }
      cdp.socket.close(); console.log('Studio Services browser acceptance passed.');
    } finally { child.kill(); await delay(600); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  } finally { await clean(fixture); }
}
run().catch(error => { console.error(error); process.exit(1); });
