import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { storageService } from '../src/shared/storage';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const tokenFor = (user: { id: number; organization_id: number; username: string }) => {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 300 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};
const api = `http://localhost:${env.PORT}/api/v1`;

async function upload(token: string, name: string) {
  const form = new FormData(); form.set('avatar', new Blob([png], { type: 'image/png' }), name);
  const response = await fetch(`${api}/profile/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(10_000) });
  const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); assert.match(body.data.avatar_path, /^avatars\/[0-9a-f-]+\.png$/i); return String(body.data.avatar_path);
}

async function main() {
  const suffix = randomUUID().slice(0, 12); const username = `smokeavatar${suffix}`; const email = `${username}@example.invalid`;
  let fixtureId = 0; let first = ''; let second = '';
  try {
    const [created]: any = await pool.execute(
      `INSERT INTO users (organization_id, full_name, username, email, password_hash, status_code, approval_status_code, registration_source, default_workspace_code, approval_requested_at)
       VALUES (1, 'Profile Avatar Smoke', ?, ?, '$2b$10$fixturehashonlyneverused', 'active', 'approved', 'legacy', 'craft', CURRENT_TIMESTAMP(3))`, [username, email],
    );
    fixtureId = Number(created.insertId); const token = tokenFor({ id: fixtureId, organization_id: 1, username });
    first = await upload(token, 'avatar-smoke-a.png'); assert(await storageService.exists(first));
    second = await upload(token, 'avatar-smoke-b.png'); assert(await storageService.exists(second)); assert.equal(await storageService.exists(first), false, 'replacement did not remove the old avatar');
    const publicResponse = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/${second}`, { signal: AbortSignal.timeout(10_000) }); assert.equal(publicResponse.status, 200, 'approved public avatar was not served');
    const privateResponse = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/documents/guessed-private.pdf`, { signal: AbortSignal.timeout(10_000) }); assert.notEqual(privateResponse.status, 200, 'guessed private storage URL was publicly served');
    const deleted = await fetch(`${api}/profile/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }); const body = await deleted.json();
    assert.equal(deleted.status, 200, JSON.stringify(body)); assert.equal(body.data.avatar_path, null); assert.equal(await storageService.exists(second), false, 'delete did not remove the avatar object');
    console.log('Profile avatar smoke: PASS');
  } finally {
    if (fixtureId) {
      await pool.execute('DELETE FROM user_presence_sessions WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_business_units WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_roles WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_deletion_requests WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_reactivation_requests WHERE deleted_user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM audit_logs WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM users WHERE id = ?', [fixtureId]);
    }
    await storageService.delete(first); await storageService.delete(second); await pool.end();
  }
}

main().catch(error => { console.error('Profile avatar smoke: FAIL', error); process.exitCode = 1; });
