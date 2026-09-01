#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const frontend = process.env.SETTINGS_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.SETTINGS_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (value, message) => { if (!value) throw new Error(message); };
const database = () => mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const tokenFor = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};

async function settingsActor() {
  const connection = await database();
  try {
    const [rows] = await connection.execute(`SELECT u.id, u.organization_id FROM users u WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='settings.manage') AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.organization_id=u.organization_id AND bu.code='CRAFT') LIMIT 1`);
    assert(rows.length, 'No active actor has settings.manage and Craft access.');
    return rows[0];
  } finally { await connection.end(); }
}

async function chromePort(profile, child) {
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}).`);
    try { return Number((await readFile(activePort, 'utf8')).trim().split(/\r?\n/)[0]); } catch { await delay(100); }
  }
  throw new Error('Chrome DevTools did not start.');
}

function cdpClient(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', async ({ data }) => {
    const message = JSON.parse(typeof data === 'string' ? data : await data.text());
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result || {});
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true });
  });
  return {
    socket,
    async send(method, params = {}) {
      await ready;
      const id = ++nextId;
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return Promise.race([response, delay(10_000).then(() => { pending.delete(id); throw new Error(`${method} timed out.`); })]);
    },
  };
}

const evaluate = async (cdp, expression) => (await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
async function waitFor(cdp, expression, failure) {
  for (let attempt = 0; attempt < 45; attempt += 1) { if (await evaluate(cdp, expression)) return; await delay(250); }
  throw new Error(failure);
}

async function run() {
  const user = await settingsActor(); const token = tokenFor(user);
  let profile; let child;
  try {
    profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-settings-'));
    child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-allow-origins=*', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true });
    const port = await chromePort(profile, child);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((item) => item.type === 'page'); assert(page?.webSocketDebuggerUrl, 'No Chrome page target.');
    const cdp = cdpClient(page.webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__settingsErrors=[];window.__settingsDialogs=[];for(const n of ['alert','confirm','prompt'])window[n]=()=>{window.__settingsDialogs.push(n);return false};window.addEventListener('error',e=>window.__settingsErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.__settingsErrors.push(String(e.reason)));localStorage.setItem('token',${JSON.stringify(token)});` });
    await cdp.send('Page.navigate', { url: frontend }); await delay(700);
    await evaluate(cdp, `localStorage.setItem('token',${JSON.stringify(token)})`);
    const authStatus = await evaluate(cdp, `(async()=>{const r=await fetch(${JSON.stringify(`${api}/auth/me`)},{headers:{Authorization:'Bearer '+localStorage.token}});return r.status})()`);
    assert(authStatus === 200, `Browser auth probe failed: ${authStatus}`);
    await cdp.send('Page.navigate', { url: `${frontend}/app/settings` });
    await waitFor(cdp, `Array.from(document.querySelectorAll('h1')).some(n=>n.textContent==='Pengaturan')`, 'Settings heading did not render.');
    await waitFor(cdp, `document.querySelector('aside')?.innerText.includes('Pengaturan')`, 'Authorized sidebar did not show Pengaturan.');
    await waitFor(cdp, `document.body.innerText.includes('Organisasi & Branding')&&document.body.innerText.includes('Hari awal minggu')`, 'Settings API truth did not render.');
    const startsWithoutLogo = await evaluate(cdp, `document.body.innerText.includes('Belum ada logo')`);
    if (startsWithoutLogo) {
      await evaluate(cdp, `(()=>{const bytes=Uint8Array.from(atob('UklGRkAAAABXRUJQVlA4IDQAAADQAQCdASoCAAIAAMAWJaACdLoB+AADsAD++fED/71lfesr71lf98gf/tLP1LP1LP8VAAAA'),c=>c.charCodeAt(0));const file=new File([bytes],'logo.webp',{type:'image/webp'});const input=document.querySelector('input[type=file]');const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return 'sent';})()`);
      await waitFor(cdp, `document.body.innerText.includes('Logo organisasi disimpan secara privat.')`, 'Logo upload did not complete.');
      await waitFor(cdp, `document.querySelector('img[alt="Logo organisasi"]')?.src.startsWith('blob:')`, 'Private logo preview did not render.');
      await evaluate(cdp, `Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Hapus')?.click()`);
      await waitFor(cdp, `document.querySelector('[role="dialog"]')`, 'Logo deletion confirmation did not render.');
      await evaluate(cdp, `Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent?.trim()==='Hapus Logo')?.click()`);
      await waitFor(cdp, `document.body.innerText.includes('Logo organisasi dihapus.')`, 'Logo deletion did not complete.');
    }
    await evaluate(cdp, `(()=>{const s=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='monday'));s.value='sunday';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await evaluate(cdp, `Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.includes('Simpan Sistem'))?.click()`);
    await waitFor(cdp, `document.body.innerText.includes('Sistem tersimpan.')`, 'Week-start save did not complete.');
    await evaluate(cdp, `document.querySelector('button[title="Reset ke default"]')?.click()`);
    await waitFor(cdp, `document.body.innerText.includes('dikembalikan ke default.')`, 'Week-start reset did not complete.');
    await evaluate(cdp, `document.querySelector('[data-testid="workspace-switch"]')?.click()`);
    await waitFor(cdp, `location.pathname==='/app/settings'`, 'Workspace switch navigated away from Settings.');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(300);
    const state = await evaluate(cdp, `({overflow:document.documentElement.scrollWidth>innerWidth,dialogs:window.__settingsDialogs,errors:window.__settingsErrors})`);
    assert(!state.overflow, 'Settings has mobile horizontal overflow.'); assert(!state.dialogs.length, `Native dialog used: ${state.dialogs.join(', ')}`); assert(!state.errors.length, `Browser errors: ${state.errors.join('; ')}`);
    cdp.socket.close(); console.log('Settings browser acceptance passed.');
  } finally {
    if (child) child.kill(); if (profile) { await delay(300); await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
    const cleanup = await database();
    try { await cleanup.execute("DELETE FROM system_settings WHERE organization_id=? AND business_unit_id IS NULL AND setting_group='general' AND setting_key='week_start'", [user.organization_id]); } finally { await cleanup.end(); }
  }
}

run().catch((error) => { console.error(error); process.exit(1); });
