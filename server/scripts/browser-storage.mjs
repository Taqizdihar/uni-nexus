#!/usr/bin/env node
// Browser + API acceptance for the local storage infrastructure: profile avatar upload/render/
// delete end-to-end, and confirmation that no private category is reachable through a guessed
// `/uploads/...` URL. Requires the real dev stack running (client + server + a live MySQL with at
// least one active, approved user) — see README/CLAUDE notes for `npm run dev`.
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(import.meta.dirname, '..', '..');
dotenv.config({ path: path.join(root, 'server', '.env'), quiet: true });
const front = process.env.STORAGE_BROWSER_BASE_URL || 'http://localhost:5173';
const api = process.env.STORAGE_BROWSER_API_URL || 'http://localhost:3001/api/v1';
const apiOrigin = api.replace(/\/api\/v1\/?$/, '');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// 1x1 red PNG — a real, decodable image so avatar normalization (sharp) succeeds.
const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6360f8cfc0c00000030101002423b40a0000000049454e44ae426082',
  'hex',
);

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 1800 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}

async function getUser() {
  const database = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await database.execute(`SELECT id, organization_id, username, avatar_path FROM users
      WHERE deleted_at IS NULL AND status_code = 'active' AND approval_status_code = 'approved' LIMIT 1`);
    assert(rows.length, 'No active, approved user exists to test the Profile Avatar flow.');
    return rows[0];
  } finally {
    await database.end();
  }
}

async function waitPort(profile, child) {
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome exited (${child.exitCode}) before starting.`);
    try {
      const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/);
      if (Number(port)) return Number(port);
    } catch { /* wait */ }
    await delay(100);
  }
  throw new Error('Chrome DevTools did not start.');
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener('message', async event => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
    if (message.id) {
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result || {}); }
    } else events.push(message);
  });
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Cannot connect to Chrome DevTools.')), { once: true }); });
  const send = async (method, params = {}) => { await ready; return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); };
  return { socket, send, events };
}

async function run() {
  const user = await getUser();
  const token = tokenFor(user);
  const auth = { Authorization: `Bearer ${token}` };

  // --- API: upload avatar ---
  const form = new FormData();
  form.set('avatar', new Blob([PNG_1PX], { type: 'image/png' }), 'avatar.png');
  const uploadResponse = await fetch(`${api}/profile/avatar`, { method: 'POST', headers: auth, body: form });
  const uploadBody = await uploadResponse.json();
  assert(uploadResponse.ok, `Avatar upload returned ${uploadResponse.status}: ${JSON.stringify(uploadBody)}`);
  const avatarKey = uploadBody.data?.avatar_path;
  assert(typeof avatarKey === 'string' && avatarKey.startsWith('avatars/') && avatarKey.endsWith('.webp'), `Unexpected avatar_path: ${avatarKey}`);

  const meAfterUpload = await (await fetch(`${api}/auth/me`, { headers: auth })).json();
  assert(meAfterUpload.data?.avatar_path === avatarKey, '/auth/me did not reflect the newly uploaded avatar.');

  const publicAvatarResponse = await fetch(`${apiOrigin}/uploads/${avatarKey}`);
  assert(publicAvatarResponse.ok, `Public avatar URL returned ${publicAvatarResponse.status}.`);
  console.log('API: avatar upload, /auth/me refresh, and public avatar URL all passed.');

  // --- API: replace avatar, then delete ---
  const form2 = new FormData();
  form2.set('avatar', new Blob([PNG_1PX], { type: 'image/png' }), 'avatar-2.png');
  const replaceResponse = await fetch(`${api}/profile/avatar`, { method: 'POST', headers: auth, body: form2 });
  const replaceBody = await replaceResponse.json();
  assert(replaceResponse.ok, `Avatar replace returned ${replaceResponse.status}`);
  const newAvatarKey = replaceBody.data?.avatar_path;
  assert(newAvatarKey !== avatarKey, 'Replacing the avatar did not produce a new storage key.');
  const oldAvatarStillPublic = await fetch(`${apiOrigin}/uploads/${avatarKey}`);
  assert(!oldAvatarStillPublic.ok, 'Old avatar file was not removed after replacement.');
  console.log('API: avatar replace removed the old file and kept the new one.');

  // --- Private category is never statically reachable, regardless of DB state ---
  const guessedPrivate = await fetch(`${apiOrigin}/uploads/products/1/guess.jpg`);
  assert(!guessedPrivate.ok, `A private category responded ${guessedPrivate.status} to a guessed URL — blanket static exposure regressed.`);
  console.log('API: guessed private /uploads URL correctly returns non-200.');

  // --- Browser: Profile page renders the avatar, header/presence pick it up ---
  const profile = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-storage-browser-'));
  const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { windowsHide: true });
  try {
    const port = await waitPort(profile, child);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(entry => entry.type === 'page');
    assert(target?.webSocketDebuggerUrl, 'No Chrome page target is available.');
    const cdp = connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__storageErrors=[]; window.addEventListener('error', event => window.__storageErrors.push(event.message));` });

    const outputDir = path.join(root, 'artifacts', `storage-browser-${Date.now()}-${randomBytes(3).toString('hex')}`);
    await (await import('node:fs/promises')).mkdir(outputDir, { recursive: true });

    await cdp.send('Page.navigate', { url: `${front}/app/profile` });
    await delay(2_000);
    const profileState = await cdp.send('Runtime.evaluate', {
      expression: `({ avatarImg: document.querySelector('img[src*="/uploads/avatars/"]')?.getAttribute('src') || null, body: document.body.innerText, errors: window.__storageErrors })`,
      returnByValue: true,
    });
    const profileResult = profileState.result?.value;
    assert(profileResult?.avatarImg, `Profile page did not render an <img> pointing at /uploads/avatars/. Body: ${profileResult?.body?.slice(0, 300)}`);
    assert(!profileResult.errors?.length, `Profile page has browser errors: ${profileResult.errors.join('; ')}`);
    await writeFile(path.join(outputDir, 'profile-avatar.png'), Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    console.log('Browser: Profile page renders the uploaded avatar.');

    const headerState = await cdp.send('Runtime.evaluate', {
      expression: `({ headerAvatar: !!document.querySelector('header img[src*="/uploads/avatars/"]') })`,
      returnByValue: true,
    });
    assert(headerState.result?.value?.headerAvatar, 'Header avatar did not pick up the uploaded avatar without a fresh login.');
    console.log('Browser: Header avatar reflects the same avatar without re-login.');

    // --- Delete avatar; UI should fall back to initials ---
    const deleteResponse = await fetch(`${api}/profile/avatar`, { method: 'DELETE', headers: auth });
    assert(deleteResponse.ok, `Avatar delete returned ${deleteResponse.status}`);
    const meAfterDelete = await (await fetch(`${api}/auth/me`, { headers: auth })).json();
    assert(meAfterDelete.data?.avatar_path === null, '/auth/me still reports an avatar_path after delete.');
    const deletedStillPublic = await fetch(`${apiOrigin}/uploads/${newAvatarKey}`);
    assert(!deletedStillPublic.ok, 'Deleted avatar file is still publicly reachable.');
    console.log('API: avatar delete cleared avatar_path and removed the physical file.');

    cdp.socket.close();
    console.log(`\nStorage browser acceptance passed. Screenshots: ${outputDir}`);
  } finally {
    child.kill();
    await delay(750);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
}

run().catch(error => { console.error(error); process.exit(1); });
