import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { AuthService } from '../src/modules/auth/auth.service';
import { AccountLifecycleService } from '../src/modules/users/account-lifecycle.service';
import { storageService } from '../src/shared/storage';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const api = `http://localhost:${env.PORT}/api/v1`;
const tokenFor = (user: { id: number; organization_id: number; username: string }) => {
  const now = Math.floor(Date.now() / 1000); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organization_id, username: user.username, iat: now, exp: now + 300 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};
const request = async <T>(token: string, endpoint: string, method = 'GET', body?: unknown) => {
  const response = await fetch(`${api}${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  const json = await response.json(); return { response, json: json as { data: T; error?: { code: string; message: string } } };
};
const upload = async (token: string, field: 'avatar' | 'banner', endpoint: string, name: string) => {
  const form = new FormData(); form.set(field, new Blob([png], { type: 'image/png' }), name);
  const { response, json } = await request<{ avatar_path: string | null; profile_banner_path: string | null }>(token, endpoint, 'POST', form);
  assert.equal(response.status, 200, JSON.stringify(json)); return field === 'avatar' ? String(json.data.avatar_path) : String(json.data.profile_banner_path);
};

async function main() {
  const suffix = randomUUID().slice(0, 12); const username = `smokev2${suffix}`; const email = `${username}@example.invalid`;
  let fixtureId = 0; const cleanupKeys: string[] = []; const auditRequestIds: number[] = [];
  try {
    const [created]: any = await pool.execute(
      `INSERT INTO users (organization_id, full_name, username, email, password_hash, status_code, approval_status_code, registration_source, default_workspace_code, approval_requested_at)
       VALUES (1, 'Profile V2 Smoke', ?, ?, '$2b$10$fixturehashonlyneverused', 'active', 'approved', 'legacy', 'studio', CURRENT_TIMESTAMP(3))`, [username, email],
    );
    fixtureId = Number(created.insertId); const token = tokenFor({ id: fixtureId, organization_id: 1, username });

    const profilePatch = await request<{ default_workspace_code: string }>(token, '/profile', 'PATCH', { full_name: 'Profile V2 Smoke Updated' });
    assert.equal(profilePatch.response.status, 200, JSON.stringify(profilePatch.json)); assert.equal(profilePatch.json.data.default_workspace_code, 'studio', 'partial profile update reset workspace');
    for (const status of ['busy', 'sick', 'leave', 'default']) {
      const result = await request<{ profile_status_code: string }>(token, '/profile/status', 'PATCH', { profile_status_code: status });
      assert.equal(result.response.status, 200, JSON.stringify(result.json)); assert.equal(result.json.data.profile_status_code, status);
    }
    const invalidStatus = await request<unknown>(token, '/profile/status', 'PATCH', { profile_status_code: 'active' });
    assert.equal(invalidStatus.response.status, 400, 'invalid profile status was accepted');

    const firstBanner = await upload(token, 'banner', '/profile/banner', 'profile-v2-a.png'); cleanupKeys.push(firstBanner); assert.match(firstBanner, /^profile-banners\/[0-9a-f-]+\.png$/i);
    const secondBanner = await upload(token, 'banner', '/profile/banner', 'profile-v2-b.png'); cleanupKeys.push(secondBanner); assert.equal(await storageService.exists(firstBanner), false, 'old banner was not cleaned after replacement');
    const publicBanner = await fetch(`${api.replace(/\/api\/v1$/, '')}/uploads/${secondBanner}`, { signal: AbortSignal.timeout(10_000) }); assert.equal(publicBanner.status, 200, 'profile banner is not publicly available');
    const deleteBanner = await request<{ profile_banner_path: null }>(token, '/profile/banner', 'DELETE'); assert.equal(deleteBanner.response.status, 200, JSON.stringify(deleteBanner.json)); assert.equal(await storageService.exists(secondBanner), false, 'deleted banner object remains');

    const createDeletion = await request<{ id: number }>(token, '/profile/deletion-request', 'POST', { reason: 'fixture lifecycle verification' });
    assert.equal(createDeletion.response.status, 201, JSON.stringify(createDeletion.json)); auditRequestIds.push(createDeletion.json.data.id);
    const duplicateDeletion = await request<unknown>(token, '/profile/deletion-request', 'POST', {}); assert.equal(duplicateDeletion.response.status, 409, 'duplicate deletion request was accepted');
    const revoke = await request<{ status_code: string }>(token, '/profile/deletion-request/revoke', 'POST', {}); assert.equal(revoke.response.status, 200, JSON.stringify(revoke.json)); assert.equal(revoke.json.data.status_code, 'revoked');
    const pendingDeletion = await request<{ id: number }>(token, '/profile/deletion-request', 'POST', {}); assert.equal(pendingDeletion.response.status, 201, JSON.stringify(pendingDeletion.json)); auditRequestIds.push(pendingDeletion.json.data.id);
    const unauthorizedReview = await request<unknown>(token, `/users/deletion-requests/${pendingDeletion.json.data.id}/approve`, 'POST', {}); assert.equal(unauthorizedReview.response.status, 403, 'ordinary user reviewed a deletion request');

    const [reviewers] = await pool.execute<any[]>(
      `SELECT u.id, u.organization_id, r.code FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
       WHERE r.code IN ('CEO','COO','CTO') AND u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved' LIMIT 1`,
    );
    assert(reviewers.length, 'No active executive reviewer is available for isolated lifecycle smoke coverage.');
    const reviewer = { id: Number(reviewers[0].id), organization_id: Number(reviewers[0].organization_id), role: { code: String(reviewers[0].code) } };
    await AccountLifecycleService.reviewDeletionRequest(reviewer, pendingDeletion.json.data.id, 'approve', 'fixture approved');
    const [archived] = await pool.execute<any[]>('SELECT id, status_code, deleted_at, avatar_path, profile_banner_path FROM users WHERE id = ?', [fixtureId]);
    assert.equal(archived[0].status_code, 'inactive'); assert.notEqual(archived[0].deleted_at, null); assert.equal(archived[0].avatar_path, null); assert.equal(archived[0].profile_banner_path, null);

    const firstReactivation: any = await AuthService.register({ full_name: 'Profile V2 Return', username, email, password: 'profile-v2-smoke', phone: '', default_workspace_code: 'studio' });
    assert.equal(firstReactivation.code, 'ACCOUNT_REACTIVATION_REQUESTED');
    const [rejectionRows] = await pool.execute<any[]>('SELECT id FROM user_reactivation_requests WHERE deleted_user_id = ? AND status_code = "pending"', [fixtureId]); auditRequestIds.push(Number(rejectionRows[0].id));
    await AccountLifecycleService.reviewReactivationRequest(reviewer, Number(rejectionRows[0].id), 'reject', undefined, 'fixture rejected');
    const [rejected] = await pool.execute<any[]>('SELECT status_code, requested_password_hash FROM user_reactivation_requests WHERE id = ?', [rejectionRows[0].id]);
    assert.equal(rejected[0].status_code, 'rejected'); assert.equal(rejected[0].requested_password_hash, null, 'rejected request retained password hash');

    const secondReactivation: any = await AuthService.register({ full_name: 'Profile V2 Return', username, email, password: 'profile-v2-smoke', phone: '', default_workspace_code: 'studio' });
    assert.equal(secondReactivation.code, 'ACCOUNT_REACTIVATION_REQUESTED');
    const [approvalRows] = await pool.execute<any[]>('SELECT id FROM user_reactivation_requests WHERE deleted_user_id = ? AND status_code = "pending"', [fixtureId]); auditRequestIds.push(Number(approvalRows[0].id));
    const [roles] = await pool.execute<any[]>('SELECT code FROM roles WHERE is_active = 1 AND code NOT IN ("CEO", "COO", "CTO") LIMIT 1'); assert(roles.length, 'No non-singleton role is available for reactivation smoke coverage.');
    await AccountLifecycleService.reviewReactivationRequest(reviewer, Number(approvalRows[0].id), 'approve', String(roles[0].code), 'fixture approved');
    const [restored] = await pool.execute<any[]>('SELECT id, status_code, approval_status_code, deleted_at, registration_source, profile_status_code, default_workspace_code FROM users WHERE id = ?', [fixtureId]);
    assert.equal(Number(restored[0].id), fixtureId); assert.equal(restored[0].status_code, 'active'); assert.equal(restored[0].approval_status_code, 'approved'); assert.equal(restored[0].deleted_at, null); assert.equal(restored[0].registration_source, 'reactivation'); assert.equal(restored[0].profile_status_code, 'default'); assert.equal(restored[0].default_workspace_code, 'studio');
    const [consumed] = await pool.execute<any[]>('SELECT requested_password_hash FROM user_reactivation_requests WHERE id = ?', [approvalRows[0].id]); assert.equal(consumed[0].requested_password_hash, null, 'approved request retained password hash');
    console.log('Profile V2 smoke: PASS');
  } finally {
    for (const key of cleanupKeys) await storageService.delete(key);
    if (fixtureId) {
      if (auditRequestIds.length) await pool.execute(`DELETE FROM audit_logs WHERE entity_id IN (${auditRequestIds.map(() => '?').join(',')}) AND entity_type IN ('user_deletion_request', 'user_reactivation_request')`, auditRequestIds);
      await pool.execute('DELETE FROM audit_logs WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_presence_sessions WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_business_units WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_roles WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_deletion_requests WHERE user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM user_reactivation_requests WHERE deleted_user_id = ?', [fixtureId]);
      await pool.execute('DELETE FROM users WHERE id = ?', [fixtureId]);
    }
    await pool.end();
  }
}

main().catch(error => { console.error('Profile V2 smoke: FAIL', error); process.exitCode = 1; });
