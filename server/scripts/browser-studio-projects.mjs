#!/usr/bin/env node
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const front = process.env.STUDIO_BROWSER_BASE_URL || 'http://localhost:5173';
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
    const [rows] = await connection.execute(`SELECT DISTINCT u.id, u.organization_id, u.username FROM users u
      JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND p.code = 'studio.projects.write' LIMIT 1`);
    assert(rows.length, 'No active user has studio.projects.write.');
    return rows[0];
  } finally { await connection.end(); }
}

/** The Studio database may legitimately be empty, so the run seeds and removes its own fixture. */
async function seedFixture(auth) {
  const call = async (method, endpoint, body) => {
    const response = await fetch(`${api}${endpoint}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    assert(response.ok, `${method} ${endpoint} returned ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
    return payload.data;
  };
  const client = await call('POST', '/studio/projects/clients/quick', { display_name: `Klien Uji Browser ${randomBytes(3).toString('hex')}`, party_kind: 'company' });
  const project = await call('POST', '/studio/projects', {
    client_party_id: client.id,
    project_name: 'Kampanye Konten Uji Browser',
    project_type: 'Content Production',
    priority_code: 'high',
    deadline_at: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16),
    services: [{ description: 'Produksi konten 8 aset', quantity: 8, unit_price: 750000 }],
    milestones: [{ title: 'Riset & Konsep' }, { title: 'Produksi' }],
    deliverables: [{ title: 'Paket Aset Final' }],
  });
  await call('POST', `/studio/projects/${project.id}/status`, { status: 'approved' });
  await call('POST', `/studio/projects/${project.id}/status`, { status: 'in_progress' });
  return { client, project };
}

async function cleanFixture(fixture) {
  if (!fixture) return;
  const connection = await database();
  try {
    const { project, client } = fixture;
    for (const statement of [
      'DELETE FROM project_deliverables WHERE project_id = ?',
      'DELETE FROM project_milestones WHERE project_id = ?',
      'DELETE FROM project_external_assignments WHERE project_id = ?',
      'DELETE FROM studio_project_services WHERE project_id = ?',
      'DELETE FROM studio_project_members WHERE project_id = ?',
      'DELETE FROM studio_project_status_history WHERE project_id = ?',
      'DELETE FROM audit_logs WHERE entity_type = \'studio_project\' AND entity_id = ?',
      'DELETE FROM domain_events WHERE entity_type = \'studio_project\' AND entity_id = ?',
      'DELETE FROM studio_projects WHERE id = ?',
    ]) await connection.execute(statement, [project.id]);
    await connection.execute("DELETE FROM audit_logs WHERE entity_type = 'party' AND entity_id = ?", [client.id]);
    await connection.execute('DELETE FROM party_roles WHERE party_id = ?', [client.id]);
    await connection.execute('DELETE FROM parties WHERE id = ?', [client.id]);
  } finally { await connection.end(); }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before starting.`);
    try { const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ }
    await delay(100);
  }
  throw new Error('Chrome DevTools did not start.');
}

function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map(); const events = [];
  socket.addEventListener('message', async event => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
    if (message.id) { const entry = pending.get(message.id); if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result || {}); } }
    else events.push(message);
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true });
  });
  const send = async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); };
  return { socket, send, events };
}

async function run() {
  const user = await getUser();
  const token = tokenFor(user);
  const auth = { Authorization: `Bearer ${token}` };
  let fixture = null;

  try {
    fixture = await seedFixture(auth);
    const { project } = fixture;

    const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-studio-browser-'));
    const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    try {
      const port = await waitPort(profile, child);
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const target = targets.find(entry => entry.type === 'page');
      assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');

      const cdp = connect(target.webSocketDebuggerUrl);
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__studioErrors=[]; window.addEventListener('error', event => window.__studioErrors.push(event.message));`,
      });

      const routes = [
        ['/app/studio/projects', 'Proyek', ['Kampanye Konten Uji Browser', 'Nilai Kontrak', 'Proyek Aktif']],
        ['/app/studio/projects/active', 'Proyek Aktif', ['Sedang Dikerjakan', 'Tinjauan', 'Disetujui']],
        ['/app/studio/projects/new', 'Proyek Baru', ['Identitas Proyek', 'Layanan & Scope', 'Nilai Kontrak']],
        ['/app/studio/projects/milestones', 'Tahapan Proyek', ['Terlambat', 'Mendatang']],
        [`/app/studio/projects/${project.id}`, 'Kampanye Konten Uji Browser', ['Ringkasan', 'Layanan & Scope', 'Tahapan & Deliverable', 'Tim', 'Komersial', 'Aktivitas', 'Nilai Kontrak', 'Biaya Aktual']],
        [`/app/studio/projects/${project.id}/edit`, 'Edit Proyek', ['Jadwal & Prioritas', 'Hanya baca']],
      ];

      const outputDir = path.join(root, 'artifacts', `studio-projects-browser-${Date.now()}-${randomBytes(3).toString('hex')}`);
      await mkdir(outputDir, { recursive: true });

      for (const [route, title, expectations] of routes) {
        await cdp.send('Page.navigate', { url: `${front}${route}` });
        await delay(4_000);
        const state = await cdp.send('Runtime.evaluate', {
          expression: `({ title: Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__studioErrors })`,
          returnByValue: true,
        });
        const result = state.result?.value;
        assert(result?.title === title, `${route} expected '${title}', got '${result?.title}': ${result?.body?.slice(0, 300)}`);
        assert(!result.body.includes('Akses Ditolak'), `${route} rendered forbidden state`);
        assert(!result.body.includes('Dalam Pengembangan'), `${route} fell through to the planned-module placeholder`);
        // Several labels are rendered uppercase by CSS, which innerText reflects.
        const body = result.body.toLowerCase();
        for (const expected of expectations) assert(body.includes(expected.toLowerCase()), `${route} is missing '${expected}'.`);
        assert(!result.errors?.length, `${route} has browser errors: ${result.errors.join('; ')}`);

        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        await writeFile(path.join(outputDir, `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}.png`), Buffer.from(screenshot.data, 'base64'));
      }

      cdp.socket.close();
      console.log(`Studio Projects browser acceptance passed. Screenshots: ${outputDir}`);
    } finally {
      child.kill();
      await delay(750);
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
  } finally {
    await cleanFixture(fixture);
  }
}

run().catch(error => { console.error(error); process.exit(1); });
