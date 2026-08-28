import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { storageService } from '../src/shared/storage';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const tokenFor = (user: { id: number; organization_id: number; username: string }) => { const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 300 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`; };
const api = `http://localhost:${env.PORT}/api/v1`;

async function upload(token: string, name: string) {
  const form = new FormData(); form.set('avatar', new Blob([png], { type: 'image/png' }), name);
  const response = await fetch(`${api}/profile/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(10_000) });
  // Avatars are always normalized to WEBP (512x512 via sharp) regardless of the uploaded format.
  const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); assert.match(body.data.avatar_path, /^avatars\/[0-9a-f-]+\.webp$/i); return String(body.data.avatar_path);
}

async function main() {
  const [users]: any = await pool.execute(`SELECT id,organization_id,username FROM users WHERE deleted_at IS NULL AND status_code='active' AND approval_status_code='approved' AND avatar_path IS NULL LIMIT 1`);
  assert(users.length, 'No active avatar-free user is available for the smoke fixture.');
  const token = tokenFor(users[0]); let first = ''; let second = '';
  try {
    first = await upload(token, 'avatar-smoke-a.png'); assert(await storageService.exists(first));
    second = await upload(token, 'avatar-smoke-b.png'); assert(await storageService.exists(second)); assert.equal(await storageService.exists(first), false, 'replacement did not remove the old avatar');
    const publicResponse = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/${second}`, { signal: AbortSignal.timeout(10_000) }); assert.equal(publicResponse.status, 200, 'approved public avatar was not served');
    const privateResponse = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/documents/guessed-private.pdf`, { signal: AbortSignal.timeout(10_000) }); assert.notEqual(privateResponse.status, 200, 'guessed private storage URL was publicly served');
    const deleted = await fetch(`${api}/profile/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }); const body = await deleted.json(); assert.equal(deleted.status, 200, JSON.stringify(body)); assert.equal(body.data.avatar_path, null); assert.equal(await storageService.exists(second), false, 'delete did not remove the avatar object');
    console.log('Profile avatar smoke: PASS');
  } finally {
    await pool.execute('UPDATE users SET avatar_path = NULL WHERE avatar_path IN (?,?)', [first || null, second || null]);
    await storageService.delete(first); await storageService.delete(second); await pool.end();
  }
}

main().catch(async error => { console.error('Profile avatar smoke: FAIL', error); await pool.end(); process.exitCode = 1; });
