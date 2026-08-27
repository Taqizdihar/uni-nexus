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
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const days = offset => { const date = new Date(`${today}T00:00:00`); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };

function tokenFor(user) { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; }
async function getUser() { const connection = await database(); try { const [rows] = await connection.execute(`SELECT DISTINCT u.id, u.organization_id, u.username FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'studio.billing.write' LIMIT 1`); assert(rows.length, 'No active user has studio.billing.write.'); return rows[0]; } finally { await connection.end(); } }
async function call(auth, method, endpoint, body) { const response = await fetch(`${api}${endpoint}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const payload = await response.json().catch(() => ({})); assert(response.ok, `${method} ${endpoint}: ${response.status} ${JSON.stringify(payload).slice(0, 400)}`); return payload.data; }

async function seed(auth) {
  const connection = await database(); const suffix = randomBytes(3).toString('hex').toUpperCase(); let fixture;
  try {
    const [units] = await connection.execute(`SELECT id, organization_id FROM business_units WHERE code = 'STUDIO' AND is_active = 1 LIMIT 1`); assert(units.length, 'STUDIO business unit is unavailable.'); const studio = units[0];
    await connection.beginTransaction();
    const [party] = await connection.execute(`INSERT INTO parties (organization_id, code, party_kind, display_name, status_code) VALUES (?, ?, 'company', ?, 'active')`, [studio.organization_id, `CLI-BRW-${suffix}`, `Klien Billing Browser ${suffix}`]); const partyId = Number(party.insertId);
    await connection.execute(`INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, 'studio_client', 1)`, [partyId, studio.id]);
    const [service] = await connection.execute(`INSERT INTO studio_services (business_unit_id, code, name, pricing_model, base_price, unit_label, is_active) VALUES (?, ?, ?, 'fixed', 500000, 'paket', 1)`, [studio.id, `SVC-BRW-${suffix}`, `Layanan Billing Browser ${suffix}`]); const serviceId = Number(service.insertId);
    const [project] = await connection.execute(`INSERT INTO studio_projects (business_unit_id, project_code, client_party_id, project_name, status_code, priority_code, currency_code, contract_value) VALUES (?, ?, ?, ?, 'lead', 'normal', 'IDR', 500000)`, [studio.id, `PRJ-BRW-${suffix}`, partyId, `Proyek Billing Browser ${suffix}`]); const projectId = Number(project.insertId);
    await connection.execute(`INSERT INTO studio_project_services (project_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 1, 500000, 500000)`, [projectId, serviceId, 'Layanan Billing Browser']); await connection.commit();
    fixture = { partyId, serviceId, projectId, quoteId: 0, invoiceId: 0, studio };
  } catch (error) { await connection.rollback(); throw error; } finally { await connection.end(); }
  const quote = await call(auth, 'POST', '/studio/billing/quotations', { party_id: fixture.partyId, project_id: fixture.projectId, issue_date: today, valid_until: days(14), items: [{ service_id: fixture.serviceId, description: 'Layanan Billing Browser', quantity: 1, unit_price: 500000, discount_amount: 0 }] }); fixture.quoteId = quote.id;
  await call(auth, 'POST', `/studio/billing/quotations/${fixture.quoteId}/send`); await call(auth, 'POST', `/studio/billing/quotations/${fixture.quoteId}/accept`); const invoice = await call(auth, 'POST', `/studio/billing/quotations/${fixture.quoteId}/invoice`, { due_date: days(14) }); fixture.invoiceId = invoice.id; await call(auth, 'POST', `/studio/billing/invoices/${fixture.invoiceId}/issue`); return fixture;
}
async function clean(fixture) {
  if (!fixture) return;
  const documentPaths = [];
  const connection = await database();
  try {
    await connection.beginTransaction();
    for (const [entityType, entityId] of [['invoice', fixture.invoiceId], ['quotation', fixture.quoteId]]) {
      if (!entityId) continue;
      const [documents] = await connection.execute('SELECT storage_path FROM documents WHERE entity_type = ? AND entity_id = ?', [entityType, entityId]);
      documentPaths.push(...documents.map(document => document.storage_path));
    }
    if (fixture.invoiceId) {
      await connection.execute('DELETE FROM invoice_payment_schedules WHERE invoice_id = ?', [fixture.invoiceId]);
      await connection.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [fixture.invoiceId]);
      await connection.execute(`DELETE FROM documents WHERE entity_type = 'invoice' AND entity_id = ?`, [fixture.invoiceId]);
      await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_billing' AND entity_type = 'invoice' AND entity_id = ?`, [fixture.invoiceId]);
      await connection.execute(`DELETE FROM domain_events WHERE module_code = 'studio_billing' AND entity_type = 'invoice' AND entity_id = ?`, [fixture.invoiceId]);
      await connection.execute('DELETE FROM invoices WHERE id = ?', [fixture.invoiceId]);
    }
    if (fixture.quoteId) {
      await connection.execute('DELETE FROM quotation_items WHERE quotation_id = ?', [fixture.quoteId]);
      await connection.execute(`DELETE FROM documents WHERE entity_type = 'quotation' AND entity_id = ?`, [fixture.quoteId]);
      await connection.execute(`DELETE FROM audit_logs WHERE module_code = 'studio_billing' AND entity_type = 'quotation' AND entity_id = ?`, [fixture.quoteId]);
      await connection.execute(`DELETE FROM domain_events WHERE module_code = 'studio_billing' AND entity_type = 'quotation' AND entity_id = ?`, [fixture.quoteId]);
      await connection.execute('DELETE FROM quotations WHERE id = ?', [fixture.quoteId]);
    }
    await connection.execute('DELETE FROM studio_project_services WHERE project_id = ?', [fixture.projectId]);
    await connection.execute('DELETE FROM studio_project_status_history WHERE project_id = ?', [fixture.projectId]);
    await connection.execute(`DELETE FROM audit_logs WHERE entity_type = 'studio_project' AND entity_id = ?`, [fixture.projectId]);
    await connection.execute(`DELETE FROM domain_events WHERE entity_type = 'studio_project' AND entity_id = ?`, [fixture.projectId]);
    await connection.execute('DELETE FROM studio_projects WHERE id = ?', [fixture.projectId]);
    await connection.execute('DELETE FROM studio_services WHERE id = ?', [fixture.serviceId]);
    await connection.execute('DELETE FROM party_roles WHERE party_id = ?', [fixture.partyId]);
    await connection.execute('DELETE FROM parties WHERE id = ?', [fixture.partyId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
  const storageRoot = path.resolve(root, 'server', 'storage');
  await Promise.all(documentPaths.map(async storagePath => {
    const target = path.resolve(storageRoot, storagePath);
    if (target.startsWith(`${storageRoot}${path.sep}`)) await rm(target, { force: true });
  }));
}
async function waitPort(profile, child) { const portFile = path.join(profile, 'DevToolsActivePort'); const deadline = Date.now() + 20000; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before startup.`); try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ } await delay(100); } throw new Error('Chrome DevTools did not start.'); }
function connect(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener('message', async event => { const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (message.id && pending.has(message.id)) { const pendingItem = pending.get(message.id); pending.delete(message.id); message.error ? pendingItem.reject(new Error(message.error.message)) : pendingItem.resolve(message.result || {}); } }); const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); }); return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } }; }

async function run() { const user = await getUser(); const token = tokenFor(user); const auth = { Authorization: `Bearer ${token}` }; let fixture = null; let child = null; let profile = null; try { fixture = await seed(auth); profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-studio-billing-')); child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true }); const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.'); const cdp = connect(target.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__billingErrors=[]; window.addEventListener('error', event => window.__billingErrors.push(event.message));` }); const routes = [['/app/studio/billing', 'Penawaran & Penagihan', ['Penawaran Draft', 'Total Outstanding']], ['/app/studio/billing/quotations', 'Penawaran', [fixture.quoteId ? 'QTN-' : '']], ['/app/studio/billing/quotations/new', 'Buat Penawaran', ['Klien Studio', 'Layanan / Scope']], [`/app/studio/billing/quotations/${fixture.quoteId}`, 'Detail Penawaran', ['Scope Penawaran', 'Diterima']], ['/app/studio/billing/quotation-templates', 'Template Penawaran', ['Belum ada template']], ['/app/studio/billing/invoices', 'Invoice', ['INV-']], ['/app/studio/billing/invoices/new', 'Buat Invoice', ['Klien Studio', 'Termin Pembayaran']], [`/app/studio/billing/invoices/${fixture.invoiceId}`, 'Detail Invoice', ['Item Invoice', 'Termin Pembayaran', 'Pembayaran Terkonfirmasi']], ['/app/studio/billing/outstanding', 'Tagihan Belum Dibayar', ['Total Outstanding', 'INV-']]]; for (const [route, title, expectations] of routes) { await cdp.send('Page.navigate', { url: `${frontend}${route}` }); await delay(4500); const state = await cdp.send('Runtime.evaluate', { expression: '({ title: Array.from(document.querySelectorAll("h1")).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__billingErrors || [] })', returnByValue: true }); const page = state.result?.value; assert(page?.title === title, `${route} expected '${title}', got '${page?.title}'. ${page?.body?.slice(0, 900)}`); assert(!page.body.includes('Dalam Pengembangan') && !page.body.includes('Akses Ditolak'), `${route} rendered a placeholder or forbidden state.`); for (const expected of expectations) if (expected) assert(page.body.toLowerCase().includes(expected.toLowerCase()), `${route} is missing '${expected}'. ${page.body.slice(0, 900)}`); assert(!page.errors?.length, `${route} has browser errors: ${page.errors.join('; ')}`); } cdp.socket.close(); console.log('Studio Billing browser acceptance passed.'); } finally { if (child) child.kill(); if (profile) { await delay(400); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } await clean(fixture); } }
run().catch(error => { console.error(error); process.exit(1); });
