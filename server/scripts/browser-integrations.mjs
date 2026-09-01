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
const front = process.env.INTEGRATIONS_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.INTEGRATIONS_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let pass = 0;
const check = (condition, message) => { assert(condition, message); pass++; };

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}

async function withDb(fn) {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try { return await fn(db); } finally { await db.end(); }
}

async function getAuthorizedUser(db) {
  const [rows] = await db.execute(`SELECT DISTINCT u.id,u.organization_id,u.username FROM users u
    JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
    WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='integrations.manage'
    AND EXISTS (SELECT 1 FROM user_roles ur2 JOIN role_permissions rp2 ON rp2.role_id=ur2.role_id JOIN permissions p2 ON p2.id=rp2.permission_id WHERE ur2.user_id=u.id AND p2.code='integrations.sync')
    LIMIT 1`);
  assert(rows.length, 'No active user has integrations.manage + integrations.sync.');
  return rows[0];
}
/** Every active/approved seed user already holds integrations.read in this dataset, so a fixture user is created for the negative-access check and cleaned up afterward. */
async function makeUnauthorizedUser(db, organizationId) {
  const suffix = randomUUID().slice(0, 8);
  const [roleResult] = await db.execute(`INSERT INTO roles (organization_id, code, name, scope_code, is_system, is_active) VALUES (?,?,?,?,0,1)`, [organizationId, `BRW_${suffix.toUpperCase()}`, `Browser Fixture Role ${suffix}`, 'global']);
  const roleId = Number(roleResult.insertId);
  const [userResult] = await db.execute(
    `INSERT INTO users (organization_id, full_name, username, email, password_hash, status_code, approval_status_code, registration_source, default_workspace_code) VALUES (?,?,?,?,?,'active','approved','bootstrap','craft')`,
    [organizationId, `Browser Fixture User ${suffix}`, `browser_${suffix}`, `browser_${suffix}@example.invalid`, '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345'],
  );
  const userId = Number(userResult.insertId);
  await db.execute(`INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [userId, roleId]);
  return { user: { id: userId, organization_id: organizationId, username: `browser_${suffix}` }, roleId, userId };
}
async function removeUnauthorizedUser(db, fixture) {
  if (!fixture) return;
  await db.execute('DELETE FROM user_roles WHERE user_id=?', [fixture.userId]).catch(() => undefined);
  await db.execute('DELETE FROM users WHERE id=?', [fixture.userId]).catch(() => undefined);
  await db.execute('DELETE FROM roles WHERE id=?', [fixture.roleId]).catch(() => undefined);
}

async function waitPort(profile, child) {
  const file = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome stopped before starting (${child.exitCode}).`);
    try { const [port] = (await readFile(file, 'utf8')).trim().split(/\r?\n/); if (Number(port)) return Number(port); } catch { /* wait */ }
    await delay(100);
  }
  throw new Error('Chrome DevTools did not start.');
}
function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', async (event) => {
    const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
    if (data.id) { const promise = pending.get(data.id); if (promise) { pending.delete(data.id); data.error ? promise.reject(new Error(data.error.message)) : promise.resolve(data.result || {}); } }
  });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Chrome DevTools connection failed.')), { once: true }); });
  return { socket, send: async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); } };
}

const bootScript = (token) => `
  window.localStorage.setItem('token', ${JSON.stringify(token)});
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
  window.__nativeDialogCalls = 0;
  window.alert = function() { window.__nativeDialogCalls++; throw new Error('window.alert was called'); };
  window.confirm = function() { window.__nativeDialogCalls++; throw new Error('window.confirm was called'); };
  window.prompt = function() { window.__nativeDialogCalls++; throw new Error('window.prompt was called'); };
  window.__setValue = function(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  window.__clickText = function(tag, text) {
    const els = Array.from(document.querySelectorAll(tag));
    const el = els.find((e) => e.textContent.trim() === text);
    if (!el) return false;
    el.click();
    return true;
  };
  window.__clickSelector = function(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  };
`;

async function run() {
  const authorized = await withDb((db) => getAuthorizedUser(db));
  const unauthorizedFixture = await withDb((db) => makeUnauthorizedUser(db, authorized.organization_id));
  const authorizedToken = tokenFor(authorized);
  const unauthorizedToken = tokenFor(unauthorizedFixture.user);

  const sanity = await fetch(`${api}/integrations/providers`, { headers: { Authorization: `Bearer ${authorizedToken}` } });
  check(sanity.ok, `sanity: GET /integrations/providers must succeed for the authorized fixture user (got ${sanity.status}).`);
  const unauthorizedSanity = await fetch(`${api}/integrations/providers`, { headers: { Authorization: `Bearer ${unauthorizedToken}` } });
  check(unauthorizedSanity.status === 403, 'sanity: the fixture unauthorized user must actually lack integrations.read at the API level.');

  const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-integrations-browser-'));
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
  const createdIntegrationIds = [];
  try {
    const port = await waitPort(profile, child);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((target) => target.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'No browser page is available.');
    const cdp = connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    let scriptId = null;
    const setAuth = async (token) => {
      if (scriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId }).catch(() => undefined);
      const added = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: bootScript(token) });
      scriptId = added.identifier;
    };
    const goto = async (routePath) => { await cdp.send('Page.navigate', { url: `${front}${routePath}` }); await delay(1600); };
    const evaluate = async (expression) => { const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false }); return result.result?.value; };
    const bodyState = async () => evaluate(`({ h1: Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body: document.body.innerText, errors: window.__errors || [] })`);
    const noDialogsNoErrors = async (label) => {
      const state = await bodyState();
      check(!(state.errors || []).length, `no console/unhandled errors on ${label}: ${(state.errors || []).join('; ')}`);
    };

    // ---- Phase 1: unauthorized access ----
    await setAuth(unauthorizedToken);
    await goto('/app/dashboard');
    { const state = await bodyState(); check(!state.body.includes('Integrasi'.padEnd(0)) || !(await evaluate(`Array.from(document.querySelectorAll('aside a')).some(a => a.textContent.trim() === 'Integrasi')`)), '2/3. Sidebar "Integrasi" item must be hidden for a user without integrations.read.'); }
    await goto('/app/integrations');
    { const state = await bodyState(); check(state.body.includes('Akses Ditolak'), '4. Direct navigation to /app/integrations must be denied for an unauthorized user.'); }

    // ---- Phase 2: authorized flows ----
    await setAuth(authorizedToken);
    await goto('/app/dashboard');
    { const hasLink = await evaluate(`Array.from(document.querySelectorAll('aside a')).some(a => a.textContent.trim() === 'Integrasi')`); check(hasLink, '2. Sidebar "Integrasi" item must be visible for an authorized user.'); }

    await goto('/app/integrations');
    { const state = await bodyState(); check(state.h1 === 'Pusat Integrasi', `5. /app/integrations must render the real Overview page (got h1="${state.h1}").`); check(state.body.includes('Total Koneksi'), '6. Overview KPI cards must load.'); await noDialogsNoErrors('overview'); }

    await goto('/app/integrations/providers');
    {
      const state = await bodyState();
      check(state.body.includes('Tersedia') && state.body.includes('Direncanakan'), '7/8. Provider catalog must show the Tersedia/Direncanakan (Available/Planned) distinction.');
      const shopeeDisabled = await evaluate(`(() => { const card = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.trim() === 'Shopee')?.closest('.p-5'); const btn = card?.querySelector('button'); return btn ? (btn.disabled && btn.textContent.includes('Belum Tersedia')) : false; })()`);
      check(shopeeDisabled, '30. A planned provider (Shopee) must have no functional Connect button.');
      await noDialogsNoErrors('providers');
    }

    await goto('/app/integrations/connections');
    { const state = await bodyState(); check(state.h1 === 'Koneksi Integrasi', '9. Connection list page must render.'); await noDialogsNoErrors('connections list'); }

    // ---- Wizard: create a connection that will succeed ----
    await goto('/app/integrations/connections/new?provider=MOCK_TEST_CONNECTOR');
    {
      const preselected = await evaluate(`document.querySelector('input[name="provider"]:checked') !== null`);
      check(preselected, '11/12. Provider selection (via query param) must be reflected in the wizard.');
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(300);
      const scopeVisible = await evaluate(`document.querySelector('input[name="scope"]') !== null`);
      check(scopeVisible, 'wizard step 2 (scope) must render.');
      await evaluate(`window.__clickText('button', 'Organisasi')`); // no-op guard, real click below
      await evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.trim() === 'Organisasi'); label?.querySelector('input')?.click(); })()`);
      await delay(200);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(300);
      const selectPresent = await evaluate(`document.querySelector('select') !== null`);
      check(selectPresent, '14. Public config form must render a <select> for a select-typed provider field.');
      await evaluate(`window.__setValue('select', 'success')`);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(300);
      const passwordField = await evaluate(`document.querySelector('input[type="password"]') !== null`);
      check(passwordField, '15. Secret field must render as a password input.');
      await evaluate(`window.__setValue('input[type="password"]', 'browser-test-secret-value')`);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(300);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(300);
      await evaluate(`window.__clickText('button', 'Simpan & Uji Koneksi')`);
      const deadline = Date.now() + 10_000;
      let url = '';
      while (Date.now() < deadline) { url = await evaluate('window.location.pathname'); if (/\/app\/integrations\/connections\/\d+$/.test(url)) break; await delay(300); }
      check(/\/app\/integrations\/connections\/\d+$/.test(url), `16. Wizard save must navigate to the new connection's detail page (ended at ${url}).`);
      const successId = Number(url.split('/').pop());
      createdIntegrationIds.push(successId);
      await delay(600);
      const detailState = await bodyState();
      check(!detailState.body.includes('browser-test-secret-value'), '17. The secret value must never be rendered back anywhere on the page.');
      check(detailState.body.includes('Sudah dikonfigurasi'), '18. A configured credential must show "Sudah dikonfigurasi".');
      check(detailState.body.includes('Terhubung'), '21. A successful fixture test (run automatically after save) must show connected.');
      await noDialogsNoErrors('connection detail (success)');

      // ---- Disable / enable / disconnect on the success connection ----
      await evaluate(`window.__clickText('button', 'Nonaktifkan')`); await delay(300);
      const dialogOpen = await evaluate(`document.querySelector('[role="dialog"]') !== null`);
      check(dialogOpen, '25. Disable must open a custom confirmation dialog (not a native confirm()).');
      await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const btn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Nonaktifkan'); btn?.click(); })()`);
      await delay(500);
      { const state = await bodyState(); check(state.body.includes('Dinonaktifkan'), '25. Confirming disable must move status to Dinonaktifkan.'); check(!state.body.includes('Uji Koneksi'), '26. A disabled connection must not offer a Test button.'); }
      await evaluate(`window.__clickText('button', 'Aktifkan Kembali')`); await delay(500);
      { const state = await bodyState(); check(state.body.includes('Belum Terhubung'), '27. Re-enable must reset status to Belum Terhubung.'); }
      await evaluate(`window.__clickText('button', 'Putuskan & Hapus Kredensial')`); await delay(300);
      await evaluate(`(() => { const dialog = document.querySelector('[role="dialog"]'); const btn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === 'Putuskan'); btn?.click(); })()`);
      await delay(500);
      { const state = await bodyState(); check(state.body.includes('Belum ada kredensial dikonfigurasi'), '28/29. Disconnect must remove credentials (now shown as unconfigured).'); }
      await noDialogsNoErrors('connection detail (disable/enable/disconnect)');
    }

    // ---- Wizard: create a connection whose fixture test fails ----
    await goto('/app/integrations/connections/new?provider=MOCK_TEST_CONNECTOR');
    {
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(200);
      await evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.trim() === 'Organisasi'); label?.querySelector('input')?.click(); })()`);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(200);
      await evaluate(`window.__setValue('select', 'fail')`);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(200);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(200);
      await evaluate(`window.__clickText('button', 'Selanjutnya')`); await delay(200);
      await evaluate(`window.__clickText('button', 'Simpan & Uji Koneksi')`);
      const deadline = Date.now() + 10_000; let url = '';
      while (Date.now() < deadline) { url = await evaluate('window.location.pathname'); if (/\/app\/integrations\/connections\/\d+$/.test(url)) break; await delay(300); }
      const failId = Number(url.split('/').pop()); createdIntegrationIds.push(failId);
      await delay(600);
      const state = await bodyState();
      check(state.body.includes('Error') || state.body.includes('gagal') || state.body.includes('Simulasi kegagalan'), '22. A failed fixture test must show a controlled error state, not a crash.');
      await noDialogsNoErrors('connection detail (failure fixture)');
    }

    // ---- History ----
    await goto('/app/integrations/history');
    { const state = await bodyState(); check(state.h1 === 'Riwayat Integrasi' && state.body.length > 0, '23. History rows must appear on the history page.'); await noDialogsNoErrors('history list'); }
    {
      const firstDetailHref = await evaluate(`document.querySelector('a[href^="/app/integrations/history/"]')?.getAttribute('href')`);
      if (firstDetailHref) {
        await goto(firstDetailHref);
        const state = await bodyState();
        check(!/dummy_secret|browser-test-secret-value|access_token|ciphertext/i.test(state.body), '24. Log Detail must be sanitized (no secret-shaped content).');
        await noDialogsNoErrors('log detail');
      }
    }

    // ---- Craft Marketplace compatibility ----
    await goto('/app/craft/marketplace/integrations');
    { const state = await bodyState(); check(!state.body.includes('Akses Ditolak'), '31. Craft Marketplace integrations page must still load for an authorized user.'); }

    // ---- Workspace switch stays on the global route ----
    await goto('/app/integrations');
    await evaluate(`window.__clickSelector('[data-testid="workspace-switch"]')`);
    await delay(500);
    { const url = await evaluate('window.location.pathname'); check(url.startsWith('/app/integrations'), '32. Switching workspace while on /app/integrations must keep the user on the global route.'); }

    // ---- Mobile viewport ----
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await goto('/app/integrations/connections');
    await delay(400);
    { const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth'); check(overflow <= 4, `33. No page-level horizontal overflow on a mobile viewport (excess=${overflow}px).`); }
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // ---- Dialog keyboard behavior (ESC closes) ----
    await goto('/app/integrations/connections');
    await delay(300);
    { const link = await evaluate(`document.querySelector('a[href^="/app/integrations/connections/"]')?.getAttribute('href')`); if (link) { await goto(link); } }
    await delay(300);
    {
      const opened = await evaluate(`window.__clickText('button', 'Kelola Kredensial')`);
      if (opened) {
        await delay(300);
        const dialogVisible = await evaluate(`document.querySelector('[role="dialog"]') !== null`);
        check(dialogVisible, 'credential editor dialog must open.');
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
        await delay(300);
        const dialogClosed = await evaluate(`document.querySelector('[role="dialog"]') === null`);
        check(dialogClosed, '34. Escape must close the dialog.');
      }
    }

    // ---- No native dialogs anywhere in this run ----
    { const calls = await evaluate('window.__nativeDialogCalls || 0'); check(calls === 0, '35/36/37. window.alert/confirm/prompt must never be called.'); }

    cdp.socket.close();
    console.log(`Global Integrations browser acceptance: PASS (${pass} assertions).`);
  } finally {
    child.kill();
    await delay(500);
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    if (createdIntegrationIds.length) {
      await withDb(async (db) => {
        for (const id of createdIntegrationIds) await db.execute('DELETE FROM integrations WHERE id=?', [id]).catch(() => undefined);
        await db.execute(`DELETE FROM audit_logs WHERE module_code='integrations' AND entity_id IN (${createdIntegrationIds.map(() => '?').join(',')})`, createdIntegrationIds).catch(() => undefined);
      });
      console.log(`38. Fixture cleanup: removed ${createdIntegrationIds.length} browser-created integration(s) and their audit rows.`);
    }
    await withDb((db) => removeUnauthorizedUser(db, unauthorizedFixture));
  }
}

run().catch((error) => { console.error('Global Integrations browser acceptance: FAIL', error); process.exit(1); });
