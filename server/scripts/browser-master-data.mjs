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
const frontend = process.env.MASTER_DATA_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.MASTER_DATA_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const suffix = randomBytes(4).toString('hex').toUpperCase();
const fixture = { code: `BROWSER_DM_${suffix}`, name: `Satuan Browser ${suffix}` };

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

async function userWithAccess() {
  const permissions = ['master_data.read', 'master_data.manage', 'craft.products.read', 'craft.products.write', 'craft.materials.read', 'craft.materials.write', 'craft.marketplace.read', 'craft.marketplace.write', 'studio.services.read', 'studio.services.write', 'craft.finance.read', 'craft.finance.write', 'studio.finance.read', 'studio.finance.write', 'finance.read', 'finance.manage', 'reports.export'];
  const connection = await database();
  try {
    const [rows] = await connection.execute(`SELECT u.id,u.organization_id,u.username FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='CRAFT' AND bu.is_active=1) AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='STUDIO' AND bu.is_active=1) AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='SHARED' AND bu.is_active=1) GROUP BY u.id,u.organization_id,u.username HAVING ${permissions.map(() => 'SUM(p.code = ?) > 0').join(' AND ')} LIMIT 1`, permissions);
    assert(rows.length, 'No browser fixture actor has complete Data Master access.'); return rows[0];
  } finally { await connection.end(); }
}
async function clean() {
  const connection = await database();
  try { await connection.beginTransaction(); await connection.execute("DELETE FROM audit_logs WHERE module_code='master_data' AND entity_code=?", [fixture.code]); await connection.execute('DELETE FROM units_of_measure WHERE code=?', [fixture.code]); await connection.commit(); }
  catch (error) { await connection.rollback(); throw error; } finally { await connection.end(); }
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
const pageValue = async (cdp, expression) => (await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
const waitFor = async (cdp, expression, message) => { for (let attempt = 0; attempt < 30; attempt += 1) { if (await pageValue(cdp, expression)) return; await delay(300); } throw new Error(message); };

async function run() {
  const user = await userWithAccess(); const token = tokenFor(user); let profile; let child;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-master-data-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
    const port = await waitPort(profile, child); const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const target = targets.find(item => item.type === 'page'); assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(target.webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__masterDataErrors=[]; window.__nativeDialogs=[]; for (const name of ['alert','confirm','prompt']) window[name]=(...args)=>{window.__nativeDialogs.push(name); return name==='confirm'?false:undefined;}; window.addEventListener('error', event=>window.__masterDataErrors.push(event.message)); window.addEventListener('unhandledrejection', event=>window.__masterDataErrors.push(String(event.reason)));` });
    // Establish the token on the Vite origin first, then probe the real auth
    // endpoint before navigating into the protected UI.
    await cdp.send('Page.navigate', { url: frontend }); await delay(800); await cdp.send('Runtime.evaluate', { expression: `localStorage.setItem('token', ${JSON.stringify(token)});` });
    const authProbe = await pageValue(cdp, `(async()=>{const response=await fetch(${JSON.stringify(`${api}/auth/me`)},{headers:{Authorization:'Bearer '+localStorage.getItem('token')}});return {status:response.status,body:await response.text()};})()`);
    assert(authProbe?.status === 200, `Browser authentication probe failed: ${JSON.stringify(authProbe).slice(0, 800)}`);
    await cdp.send('Page.navigate', { url: `${frontend}/app/master-data` });
    await waitFor(cdp, `document.body.innerText.includes('Data Master')`, 'Data Master heading did not render.'); await waitFor(cdp, `document.body.innerText.includes('Satuan')`, 'Overview dataset cards did not render.');
    const initial = await pageValue(cdp, `({body:document.body.innerText, sidebar:Boolean(document.querySelector('aside')?.innerText.includes('Data Master')), errors:window.__masterDataErrors, url:location.pathname})`);
    assert(initial.url === '/app/master-data' && initial.sidebar && initial.body.toLowerCase().includes('dataset tersedia'), `Data Master route/sidebar/overview did not render for authorized user: ${JSON.stringify(initial).slice(0, 1500)}`);
    // The browser uses real click and input events through the UI modal, not fetch navigation.
    await pageValue(cdp, `Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.includes('Tambah Data'))?.click()`);
    await waitFor(cdp, `Boolean(document.querySelector('[role="dialog"]'))`, 'Create modal did not open.');
    const fill = `(input,value)=>{if(!input)throw new Error('Input not found');const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');descriptor.set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}`;
    await pageValue(cdp, `(()=>{const inputs=document.querySelector('[role="dialog"] form').querySelectorAll('input');const setValue=${fill};setValue(inputs[0],${JSON.stringify(fixture.code)});setValue(inputs[1],${JSON.stringify(fixture.name)});setValue(inputs[2],'br');})()`);
    await pageValue(cdp, `document.querySelector('[role="dialog"] form')?.requestSubmit()`);
    try { await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(fixture.name)}) && !document.querySelector('[role="dialog"]')`, 'Fixture unit did not appear after modal submission.'); }
    catch (error) { throw new Error(`${error.message} ${JSON.stringify(await pageValue(cdp, `({body:document.body.innerText.slice(-1200),dialog:document.querySelector('[role="dialog"]')?.innerText,errors:window.__masterDataErrors})`)).slice(0, 1600)}`); }
    const rowState = await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));return {row:Boolean(row),text:row?.innerText||'',codeInputs:Array.from(document.querySelectorAll('input')).map(i=>i.value)}})()`);
    assert(rowState.row && rowState.text.includes('Aktif'), 'Created unit did not appear as active in the real table.');
    await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));Array.from(row.querySelectorAll('button')).find(button=>button.textContent?.includes('Edit'))?.click()})()`);
    await waitFor(cdp, `document.querySelector('[role="dialog"]')?.textContent?.includes('Kode')`, 'Edit modal did not open.');
    const codeLocked = await pageValue(cdp, `!Array.from(document.querySelectorAll('[role="dialog"] input')).some(input=>input.value===${JSON.stringify(fixture.code)})`); assert(codeLocked, 'Reference code is editable in the Data Master UI.');
    await pageValue(cdp, `(()=>{const inputs=document.querySelector('[role="dialog"] form').querySelectorAll('input');const setValue=${fill};setValue(inputs[0],${JSON.stringify(`${fixture.name} Edit`)});document.querySelector('[role="dialog"] form')?.requestSubmit();})()`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(`${fixture.name} Edit`)}) && !document.querySelector('[role="dialog"]')`, 'Edited unit name did not render.');
    await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));Array.from(row.querySelectorAll('button')).find(button=>button.textContent?.includes('Penggunaan'))?.click()})()`);
    await waitFor(cdp, `document.querySelector('[role="dialog"]')?.textContent?.includes('Belum digunakan')`, 'Usage details did not open through the UI.'); await pageValue(cdp, `document.querySelector('[role="dialog"] button[aria-label="Tutup"]')?.click()`);
    await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));Array.from(row.querySelectorAll('button')).find(button=>button.textContent?.includes('Nonaktifkan'))?.click()})()`);
    await waitFor(cdp, `document.body.innerText.includes('Riwayat tetap tersimpan')`, 'Custom deactivation confirmation did not show the safety warning.');
    await pageValue(cdp, `Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.trim()==='Nonaktifkan')?.click()`);
    await waitFor(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));return row?.innerText.includes('Nonaktif')})()`, 'Unit was not deactivated through the confirmation dialog.');
    await pageValue(cdp, `(()=>{const select=Array.from(document.querySelectorAll('select')).find(select=>Array.from(select.options).some(option=>option.value==='inactive')&&Array.from(select.options).some(option=>option.textContent==='Semua Status'));const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');descriptor.set.call(select,'inactive');select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(`${fixture.name} Edit`)})`, 'Inactive status filter did not retain the fixture row.');
    await pageValue(cdp, `(()=>{const select=Array.from(document.querySelectorAll('select')).find(select=>Array.from(select.options).some(option=>option.value==='inactive')&&Array.from(select.options).some(option=>option.textContent==='Semua Status'));const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');descriptor.set.call(select,'all');select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(`${fixture.name} Edit`)})`, 'Fixture row was not retained after returning to all statuses.');
    await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));Array.from(row.querySelectorAll('button')).find(button=>button.textContent?.includes('Aktifkan'))?.click()})()`);
    await waitFor(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));return row?.innerText.includes('Aktif')})()`, 'Unit reactivation did not complete.');
    await pageValue(cdp, `(()=>{const row=Array.from(document.querySelectorAll('tr')).find(row=>row.innerText.includes(${JSON.stringify(fixture.code)}));Array.from(row.querySelectorAll('button')).find(button=>button.textContent?.includes('Penggunaan'))?.click()})()`);
    await waitFor(cdp, `Boolean(document.querySelector('[role="dialog"]'))`, 'Usage dialog did not reopen for Escape behavior.'); await pageValue(cdp, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`); await waitFor(cdp, `!document.querySelector('[role="dialog"]')`, 'Escape did not close the custom usage dialog.');
    for (const label of ['Kategori Produk', 'Kategori Material', 'Sales Channel', 'Kategori Layanan', 'Kategori Transaksi', 'Metode Pembayaran', 'Satuan']) {
      await pageValue(cdp, `Array.from(document.querySelectorAll('button')).find(button=>button.querySelector('h3')?.textContent?.trim()===${JSON.stringify(label)})?.click()`);
      await waitFor(cdp, `Array.from(document.querySelectorAll('h2')).some(heading=>heading.textContent?.trim()===${JSON.stringify(label)})`, `${label} dataset did not load through its browser navigation card.`);
    }
    await pageValue(cdp, `document.querySelector('[data-testid="workspace-switch"]')?.click()`);
    await waitFor(cdp, `location.pathname==='/app/master-data'`, 'Workspace switch navigated away from global Data Master.');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(400);
    const mobile = await pageValue(cdp, `({overflow:document.documentElement.scrollWidth>window.innerWidth, native:window.__nativeDialogs, errors:window.__masterDataErrors})`);
    assert(!mobile.overflow, 'Data Master has page-level horizontal overflow at mobile width.'); assert(!mobile.native.length, `Native dialogs were called: ${mobile.native.join(', ')}`); assert(!mobile.errors.length, `Browser console errors: ${mobile.errors.join('; ')}`);
    cdp.socket.close(); console.log('Master Data browser acceptance passed with genuine DOM clicks, form input, modal lifecycle, and responsive interaction.');
  } finally {
    if (child) { child.kill(); await delay(500); }
    if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    await clean();
  }
}

run().catch(error => { console.error(error); process.exit(1); });
