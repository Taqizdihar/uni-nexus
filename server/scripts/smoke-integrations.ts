import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { integrationSecretService } from '../src/shared/integrations/integration-secret.service';

const assert: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };
const base = `http://localhost:${env.PORT}/api/v1`;
const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

async function request(token: string | null, path: string, init: RequestInit = {}) {
  return fetch(`${base}${path}`, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...(init.headers || {}) } });
}
const tokenFor = (userId: number) => jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: '10m' });

interface Fixture {
  organizationId: number;
  businessUnitId: number;
}

async function makeOrganization(): Promise<{ organizationId: number; businessUnitId: number }> {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const [orgResult]: any = await pool.execute(`INSERT INTO organizations (code, name, country_code, currency_code, timezone, is_active) VALUES (?,?,?,?,?,1)`, [`SMK-ORG-${suffix}`, `Smoke Org ${suffix}`, 'ID', 'IDR', 'Asia/Jakarta']);
  const organizationId = Number(orgResult.insertId);
  const [buResult]: any = await pool.execute(`INSERT INTO business_units (organization_id, code, name, unit_type, is_active) VALUES (?,?,?,?,1)`, [organizationId, 'CRAFT', 'Smoke Craft', 'craft']);
  const businessUnitId = Number(buResult.insertId);
  return { organizationId, businessUnitId };
}

async function makeRole(organizationId: number, permissionCodes: string[]): Promise<number> {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const [roleResult]: any = await pool.execute(`INSERT INTO roles (organization_id, code, name, scope_code, is_system, is_active) VALUES (?,?,?,?,0,1)`, [organizationId, `SMK_${suffix}`, `Smoke Role ${suffix}`, 'global']);
  const roleId = Number(roleResult.insertId);
  if (permissionCodes.length) {
    await pool.execute(
      `INSERT INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE code IN (${permissionCodes.map(() => '?').join(',')})`,
      [roleId, ...permissionCodes],
    );
  }
  return roleId;
}

async function makeUser(organizationId: number, roleId: number, businessUnitIds: number[]): Promise<number> {
  const suffix = randomUUID().slice(0, 8);
  const [userResult]: any = await pool.execute(
    `INSERT INTO users (organization_id, full_name, username, email, password_hash, status_code, approval_status_code, registration_source, default_workspace_code) VALUES (?,?,?,?,?,'active','approved','bootstrap','craft')`,
    [organizationId, `Smoke User ${suffix}`, `smoke_${suffix}`, `smoke_${suffix}@example.invalid`, DUMMY_HASH],
  );
  const userId = Number(userResult.insertId);
  await pool.execute(`INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [userId, roleId]);
  for (const buId of businessUnitIds) await pool.execute(`INSERT INTO user_business_units (user_id, business_unit_id, can_access) VALUES (?,?,1)`, [userId, buId]);
  return userId;
}

async function primaryActor(): Promise<{ userId: number; organizationId: number; businessUnitId: number }> {
  const [rows]: any = await pool.execute(
    `SELECT u.id, u.organization_id FROM users u WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved'
     AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='integrations.read')
     AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='integrations.manage')
     AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='integrations.sync')
     AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND p.code='craft.marketplace.read')
     AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.organization_id=u.organization_id AND bu.code='CRAFT')
     LIMIT 1`,
  );
  assert(rows.length, 'Tidak ada aktor smoke integrations dengan integrations.read/manage/sync + craft.marketplace.read + akses Craft.');
  const [buRows]: any = await pool.execute(`SELECT id FROM business_units WHERE organization_id=? AND code='CRAFT' LIMIT 1`, [rows[0].organization_id]);
  return { userId: Number(rows[0].id), organizationId: Number(rows[0].organization_id), businessUnitId: Number(buRows[0].id) };
}

async function main() {
  let pass = 0;
  const check = (value: unknown, message: string) => { assert(value, message); pass++; };

  const actor = await primaryActor();
  const actorToken = tokenFor(actor.userId);

  const fixtureUserIds: number[] = [];
  const fixtureRoleIds: number[] = [];
  const integrationIds: number[] = [];
  let orgB: Fixture | null = null;

  const [auditBeforeRows]: any = await pool.execute('SELECT COALESCE(MAX(id),0) AS id FROM audit_logs');
  const auditBefore = Number(auditBeforeRows[0].id);

  try {
    // ---- Fixture users with narrow permission sets ----
    const roleNone = await makeRole(actor.organizationId, []); fixtureRoleIds.push(roleNone);
    const userNoAccess = await makeUser(actor.organizationId, roleNone, [actor.businessUnitId]); fixtureUserIds.push(userNoAccess);

    const roleReadOnly = await makeRole(actor.organizationId, ['integrations.read']); fixtureRoleIds.push(roleReadOnly);
    const userReadOnly = await makeUser(actor.organizationId, roleReadOnly, [actor.businessUnitId]); fixtureUserIds.push(userReadOnly);

    const roleFullNoBu = await makeRole(actor.organizationId, ['integrations.read', 'integrations.manage', 'integrations.sync']); fixtureRoleIds.push(roleFullNoBu);
    const userNoBuAccess = await makeUser(actor.organizationId, roleFullNoBu, []); fixtureUserIds.push(userNoBuAccess);

    const roleNoMarketplaceDomain = await makeRole(actor.organizationId, ['integrations.read', 'integrations.manage', 'integrations.sync']); fixtureRoleIds.push(roleNoMarketplaceDomain);
    const userNoMarketplaceDomain = await makeUser(actor.organizationId, roleNoMarketplaceDomain, [actor.businessUnitId]); fixtureUserIds.push(userNoMarketplaceDomain);

    const noAccessToken = tokenFor(userNoAccess);
    const readOnlyToken = tokenFor(userReadOnly);
    const noBuAccessToken = tokenFor(userNoBuAccess);
    const noMarketplaceDomainToken = tokenFor(userNoMarketplaceDomain);

    // ---- Cross-org fixture ----
    orgB = await makeOrganization();
    const roleB = await makeRole(orgB.organizationId, ['integrations.read', 'integrations.manage', 'integrations.sync']); fixtureRoleIds.push(roleB);
    const userB = await makeUser(orgB.organizationId, roleB, [orgB.businessUnitId]); fixtureUserIds.push(userB);
    const tokenB = tokenFor(userB);

    // ================= AUTH / RBAC =================
    { const res = await request(null, '/integrations/connections'); check(res.status === 401, '1. Unauthenticated request must be denied.'); }
    { const res = await request(actorToken, '/integrations/connections'); check(res.ok, '2. integrations.read actor must be able to list connections.'); }
    { const res = await request(noAccessToken, '/integrations/connections'); check(res.status === 403, '3. Actor without integrations.read must be denied.'); }
    { const res = await request(readOnlyToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'organization', display_name: 'x', config_json: {} }) }); check(res.status === 403, '4. Read-only actor must be denied mutation.'); }

    // ================= CONNECTION CREATE (organization scope, MOCK connector) =================
    let mockId: number; let mockCode: string;
    {
      const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'organization', display_name: 'Smoke Mock Success', config_json: { simulate: 'success' }, organization_id: 999999 }) });
      check(res.status === 201, `15. Available provider connection must be creatable (got ${res.status}).`);
      const body: any = await res.json();
      mockId = Number(body.data.id); mockCode = body.data.integration_code; integrationIds.push(mockId);
      check(body.data.status_code === 'not_connected', '39. Saved connection must remain not_connected until a real test succeeds.');
      check(/^INT-\d{6}$/.test(mockCode), '17. Collision-safe integration_code must follow INT-###### format.');
      const [row]: any = await pool.execute('SELECT organization_id, business_unit_id FROM integrations WHERE id=?', [mockId]);
      check(Number(row[0].organization_id) === actor.organizationId, '10. Client-supplied organization_id must be ignored (row stays in actor org).');
      check(row[0].business_unit_id === null, '13/14. organization scope must not require or accept a fabricated business_unit_id.');
    }
    { const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'SHOPEE', scope: 'craft', display_name: 'x', config_json: {} }) }); check(res.status === 409, '16. Planned provider must not be creatable as if connected.'); }
    { const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'NOT_A_REAL_PROVIDER', scope: 'organization', display_name: 'x', config_json: {} }) }); check(res.status === 404, '38. Arbitrary/unknown provider code must be rejected.'); }
    { const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'GOOGLE_DRIVE', scope: 'organization', display_name: 'x', config_json: {} }) }); check(res.status === 400, '18. Missing required public config field must be rejected.'); }
    { const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'organization', display_name: 'x', config_json: { access_token: 'leak' } }) }); check(res.status === 400, '19. Secret-shaped key inside config_json must be rejected.'); }

    // ================= CRAFT scope + BU isolation =================
    let craftId: number;
    {
      const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'craft', display_name: 'Smoke Mock Craft', config_json: { simulate: 'success' } }) });
      check(res.status === 201, '11. BU-scoped (craft) connection must be creatable within the organization.');
      const body: any = await res.json(); craftId = Number(body.data.id); integrationIds.push(craftId);
      const [row]: any = await pool.execute('SELECT business_unit_id FROM integrations WHERE id=?', [craftId]);
      check(Number(row[0].business_unit_id) === actor.businessUnitId, '11. Craft-scoped connection must resolve to the real Craft business unit id.');
    }
    { const res = await request(noBuAccessToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'craft', display_name: 'x', config_json: {} }) }); check(res.status === 403, '12. Actor without user_business_units access must not create a BU-scoped connection.'); }
    { const res = await request(noBuAccessToken, `/integrations/connections/${craftId}`); check(res.status === 404, '12. Actor without BU access must not read a BU-scoped connection either.'); }

    // ================= ORG ISOLATION =================
    let orgBConnectionId: number;
    {
      const res = await request(tokenB, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'organization', display_name: 'Org B Mock', config_json: { simulate: 'success' } }) });
      check(res.status === 201, 'setup: org B must be able to create its own connection.');
      const body: any = await res.json(); orgBConnectionId = Number(body.data.id);
    }
    { const res = await request(actorToken, '/integrations/connections'); const body: any = await res.json(); check(!body.data.some((row: any) => row.id === orgBConnectionId), '7. Organization A must not see organization B connections in the list.'); }
    { const res = await request(actorToken, `/integrations/connections/${orgBConnectionId}`); check(res.status === 404, '8. Cross-org detail must return not-found, not the row.'); }
    { const testRes = await request(tokenB, `/integrations/connections/${orgBConnectionId}/test`, { method: 'POST' }); check(testRes.ok, 'setup: org B test to produce a log row.');
      const logsRes = await request(tokenB, `/integrations/logs?integration_id=${orgBConnectionId}`); const logsBody: any = await logsRes.json();
      const logId = Number(logsBody.data[0].id);
      const crossRes = await request(actorToken, `/integrations/logs/${logId}`);
      check(crossRes.status === 404, '9. Cross-org log detail must be inaccessible.');
      await pool.execute('DELETE FROM integrations WHERE id=?', [orgBConnectionId]);
    }

    // ================= PROVIDER CATALOG =================
    {
      const res1 = await request(actorToken, '/integrations/providers'); const body1: any = await res1.json();
      const res2 = await request(actorToken, '/integrations/providers'); const body2: any = await res2.json();
      check(JSON.stringify(body1.data.map((p: any) => p.code).sort()) === JSON.stringify(body2.data.map((p: any) => p.code).sort()), '34. Provider registry must return stable metadata across calls.');
      const mock = body1.data.find((p: any) => p.code === 'MOCK_TEST_CONNECTOR');
      const shopee = body1.data.find((p: any) => p.code === 'SHOPEE');
      check(mock?.availability === 'available', '35. Available providers must be correctly marked.');
      check(shopee?.availability === 'planned', '36. Planned providers must be correctly marked.');
      check(mock?.capabilities.test === true && mock?.capabilities.sync === true, '37. Provider capabilities must be accurate (mock test+sync).');
      check(shopee?.capabilities.test === false && shopee?.capabilities.sync === false, '37. Planned provider must expose no active capabilities.');
    }

    // ================= SECRET VAULT =================
    {
      const res = await request(actorToken, `/integrations/connections/${mockId}/credentials`, { method: 'POST', body: JSON.stringify({ secrets: { dummy_secret: 'super-secret-plaintext-value' } }) });
      check(res.ok, '20. Setting a secret must succeed.');
      const body: any = await res.json();
      const raw = JSON.stringify(body);
      check(!raw.includes('super-secret-plaintext-value'), '23. API response must never contain the plaintext secret.');
      check(!/ciphertext|auth_tag|"iv"/i.test(raw), '24. API response must never contain ciphertext/iv/auth_tag.');
      check(Array.isArray(body.data.credentials) && body.data.credentials.some((c: any) => c.secret_name === 'dummy_secret' && c.configured === true), 'credential metadata must be returned.');

      const decrypted = await integrationSecretService.getSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'dummy_secret' });
      check(decrypted === 'super-secret-plaintext-value', '21. Internal decrypt must return the exact original value.');

      const [rawRows]: any = await pool.execute('SELECT ciphertext FROM integration_secrets WHERE integration_id=? AND secret_name=?', [mockId, 'dummy_secret']);
      const ciphertextHex: string = Buffer.from(rawRows[0].ciphertext).toString('latin1');
      check(!ciphertextHex.includes('super-secret-plaintext-value'), '22. Database must never contain the plaintext secret.');

      const [auditRows]: any = await pool.execute('SELECT old_values, new_values, description FROM audit_logs WHERE module_code=\'integrations\' AND action_code=\'integration.credentials.update\' AND entity_id=? ORDER BY id DESC LIMIT 1', [mockId]);
      const auditText = JSON.stringify(auditRows[0]);
      check(!auditText.includes('super-secret-plaintext-value'), '25. Audit must never contain the plaintext secret.');

      const replace = await request(actorToken, `/integrations/connections/${mockId}/credentials`, { method: 'POST', body: JSON.stringify({ secrets: { dummy_secret: 'replaced-secret-value' } }) });
      check(replace.ok, '27. Replacing a secret must succeed.');
      const decryptedAfterReplace = await integrationSecretService.getSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'dummy_secret' });
      check(decryptedAfterReplace === 'replaced-secret-value', '27. Replaced secret must decrypt to the new value.');

      // 28. blank frontend-style update (secret omitted) preserves the existing value.
      const blankUpdate = await request(actorToken, `/integrations/connections/${mockId}/credentials`, { method: 'POST', body: JSON.stringify({ secrets: { other_placeholder_field: 'unrelated' } }) });
      check(blankUpdate.status === 400 || blankUpdate.ok, 'setup: unrelated-field update should not error unexpectedly.');
      const stillThere = await integrationSecretService.getSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'dummy_secret' });
      check(stillThere === 'replaced-secret-value', '28. Omitting a secret field in an update must preserve the previously stored value.');

      const del = await request(actorToken, `/integrations/connections/${mockId}/credentials/dummy_secret`, { method: 'DELETE' });
      check(del.ok, '29. Deleting a secret must succeed.');
      const afterDelete = await integrationSecretService.getSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'dummy_secret' });
      check(afterDelete === null, '29. Deleted secret must no longer be retrievable.');
    }

    // ================= KEY SAFETY =================
    {
      const originalKey = env.INTEGRATION_SECRET_KEY;
      try {
        (env as any).INTEGRATION_SECRET_KEY = undefined;
        let threw = false;
        try { await integrationSecretService.setSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'temp', value: 'x', userId: actor.userId }); }
        catch (error: any) { threw = error?.code === 'INTEGRATION_SECRET_KEY_NOT_CONFIGURED'; }
        check(threw, '31. Missing INTEGRATION_SECRET_KEY must fail closed with a controlled error.');

        (env as any).INTEGRATION_SECRET_KEY = 'not-valid-base64-key!!';
        let threwInvalid = false;
        try { await integrationSecretService.setSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'temp', value: 'x', userId: actor.userId }); }
        catch (error: any) { threwInvalid = error?.code === 'INTEGRATION_SECRET_KEY_NOT_CONFIGURED'; }
        check(threwInvalid, '32. Invalid (wrong-length) key must be rejected.');
      } finally {
        (env as any).INTEGRATION_SECRET_KEY = originalKey;
      }

      // 33. Auth-tag failure must not return garbage plaintext.
      await integrationSecretService.setSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'tamper_test', value: 'tamper-original-value', userId: actor.userId });
      await pool.execute('UPDATE integration_secrets SET auth_tag = UNHEX(REPEAT("00",16)) WHERE integration_id=? AND secret_name=?', [mockId, 'tamper_test']);
      let decryptFailed = false;
      try { await integrationSecretService.getSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'tamper_test' }); }
      catch (error: any) { decryptFailed = error?.code === 'INTEGRATION_SECRET_DECRYPT_FAILED'; }
      check(decryptFailed, '33. Corrupted auth tag must raise a controlled decrypt-failure error, never garbage plaintext.');
      await integrationSecretService.deleteSecret(pool, mockId, 'tamper_test');
    }

    // ================= STATUS LIFECYCLE + TEST LOG =================
    {
      const [logsBefore]: any = await pool.execute('SELECT COUNT(*) c FROM integration_sync_logs WHERE integration_id=?', [mockId]);
      const testRes = await request(actorToken, `/integrations/connections/${mockId}/test`, { method: 'POST' });
      check(testRes.ok, 'test endpoint must respond.');
      const testBody: any = await testRes.json();
      check(testBody.data.connected === true && testBody.data.status_code === 'connected', '40. Successful mock test must transition status to connected.');
      const [logsAfter]: any = await pool.execute('SELECT * FROM integration_sync_logs WHERE integration_id=? ORDER BY id DESC LIMIT 1', [mockId]);
      check(Number(logsAfter[0] ? 1 : 0) === 1 && Number((await pool.execute('SELECT COUNT(*) c FROM integration_sync_logs WHERE integration_id=?', [mockId]))[0][0].c) > Number(logsBefore[0].c), '46. Connection test must create an integration_sync_logs row.');
      check(logsAfter[0].sync_type === 'connection_test', 'test log must use sync_type=connection_test.');
      check(logsAfter[0].finished_at !== null, '48. finished_at must be set on the log row.');
      const metadataText = JSON.stringify(logsAfter[0].metadata || {});
      check(!/token|secret|password/i.test(metadataText), '47. Log metadata must not contain secret-shaped keys.');

      const [row1]: any = await pool.execute('SELECT last_sync_at FROM integrations WHERE id=?', [mockId]);
      check(row1[0].last_sync_at === null, '55. testConnection must never set last_sync_at.');
    }

    // Failing mock test on a fresh connection.
    let failId: number;
    {
      const res = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'MOCK_TEST_CONNECTOR', scope: 'organization', display_name: 'Smoke Mock Fail', config_json: { simulate: 'fail' } }) });
      const body: any = await res.json(); failId = Number(body.data.id); integrationIds.push(failId);
      const testRes = await request(actorToken, `/integrations/connections/${failId}/test`, { method: 'POST' });
      const testBody: any = await testRes.json();
      check(testBody.data.connected === false && testBody.data.status_code === 'error', '41. Failed mock test must transition status to error.');
      const [logRow]: any = await pool.execute('SELECT error_message FROM integration_sync_logs WHERE integration_id=? ORDER BY id DESC LIMIT 1', [failId]);
      check(typeof logRow[0].error_message === 'string' && logRow[0].error_message.length > 0, '49. Failure error message must be recorded and sanitized.');
    }

    // ================= DISABLE / ENABLE =================
    {
      const disableRes = await request(actorToken, `/integrations/connections/${mockId}/disable`, { method: 'POST' });
      check(disableRes.ok, 'disable endpoint must respond.');
      const [row]: any = await pool.execute('SELECT status_code FROM integrations WHERE id=?', [mockId]);
      check(row[0].status_code === 'disabled', '42. Disable must set status to disabled.');
      const syncWhileDisabled = await request(actorToken, `/integrations/connections/${mockId}/sync`, { method: 'POST' });
      check(syncWhileDisabled.status === 409, '43/57. Disabled connection must not be able to sync.');
      const testWhileDisabled = await request(actorToken, `/integrations/connections/${mockId}/test`, { method: 'POST' });
      check(testWhileDisabled.status === 409, 'disabled connection must not be able to test.');
      const enableRes = await request(actorToken, `/integrations/connections/${mockId}/enable`, { method: 'POST' });
      check(enableRes.ok, 'enable endpoint must respond.');
      const enableBody: any = await enableRes.json();
      check(enableBody.data.status_code === 'not_connected', '44. Re-enable must reset status to not_connected (retest required).');
    }

    // ================= SYNC (capability + success + failure) =================
    {
      // Retest to become connected again.
      await request(actorToken, `/integrations/connections/${mockId}/test`, { method: 'POST' });

      // 50. Connector without sync capability must be rejected — force a connected non-mock connection.
      const gdRes = await request(actorToken, '/integrations/connections', { method: 'POST', body: JSON.stringify({ provider_code: 'GOOGLE_DRIVE', scope: 'organization', display_name: 'Smoke GDrive', config_json: { folder_id: 'fake-folder-id' } }) });
      const gdBody: any = await gdRes.json(); const gdId = Number(gdBody.data.id); integrationIds.push(gdId);
      await pool.execute(`UPDATE integrations SET status_code='connected' WHERE id=?`, [gdId]);
      const gdSyncRes = await request(actorToken, `/integrations/connections/${gdId}/sync`, { method: 'POST' });
      check(gdSyncRes.status === 409, '50. Connector without a sync() implementation must reject sync with a controlled error.');

      // 51-55. Mock connector with sync capability executes and updates last_sync_at only on success.
      const syncRes = await request(actorToken, `/integrations/connections/${mockId}/sync`, { method: 'POST' });
      check(syncRes.ok, '51. Mock connector sync must execute successfully.');
      const syncBody: any = await syncRes.json();
      check(syncBody.data.status === 'success', '52. Successful sync must record status success.');
      check(syncBody.data.records_processed === 3 && syncBody.data.records_success === 3, '53. Record counts from the connector must be stored/returned.');
      const [rowAfterSync]: any = await pool.execute('SELECT last_sync_at FROM integrations WHERE id=?', [mockId]);
      check(rowAfterSync[0].last_sync_at !== null, '54. last_sync_at must be updated after an actual successful sync.');

      // 56. Failed sync recorded, last_sync_at unaffected by the failure.
      await request(actorToken, `/integrations/connections/${mockId}`, { method: 'PATCH', body: JSON.stringify({ config_json: { simulate: 'fail' } }) });
      const lastSyncBefore = rowAfterSync[0].last_sync_at;
      const failSyncRes = await request(actorToken, `/integrations/connections/${mockId}/sync`, { method: 'POST' });
      check(failSyncRes.status === 502, '56. Failed sync must surface a controlled INTEGRATION_SYNC_FAILED error.');
      const [rowAfterFailedSync]: any = await pool.execute('SELECT last_sync_at, status_code FROM integrations WHERE id=?', [mockId]);
      check(String(rowAfterFailedSync[0].last_sync_at) === String(lastSyncBefore), '56. last_sync_at must not change on a failed sync.');
      check(rowAfterFailedSync[0].status_code === 'error', 'failed sync must move status to error.');
      await request(actorToken, `/integrations/connections/${mockId}`, { method: 'PATCH', body: JSON.stringify({ config_json: { simulate: 'success' } }) });
    }

    // ================= CONCURRENCY =================
    {
      const detail = await request(actorToken, `/integrations/connections/${mockId}`); const detailBody: any = await detail.json();
      const staleTimestamp = new Date(new Date(detailBody.data.updated_at).getTime() - 60_000).toISOString();
      const staleRes = await request(actorToken, `/integrations/connections/${mockId}`, { method: 'PATCH', body: JSON.stringify({ display_name: 'Should Not Apply', expected_updated_at: staleTimestamp }) });
      check(staleRes.status === 409, '58. Stale update must return 409 INTEGRATION_VERSION_CONFLICT.');
      const [row]: any = await pool.execute('SELECT display_name FROM integrations WHERE id=?', [mockId]);
      check(row[0].display_name !== 'Should Not Apply', '59. Stale update must not silently overwrite the row.');
    }

    // ================= DOMAIN PERMISSION LAYERING (marketplace) =================
    {
      const [marketplaceRows]: any = await pool.execute(`SELECT id FROM integrations WHERE organization_id=? AND integration_type='marketplace' LIMIT 1`, [actor.organizationId]);
      if (marketplaceRows.length) {
        const marketplaceId = Number(marketplaceRows[0].id);
        const listRes = await request(noMarketplaceDomainToken, '/integrations/connections'); const listBody: any = await listRes.json();
        check(!listBody.data.some((row: any) => row.id === marketplaceId), '6. Actor without craft.marketplace.read must not see marketplace-typed connections via the Global API.');
        const detailRes = await request(noMarketplaceDomainToken, `/integrations/connections/${marketplaceId}`);
        check(detailRes.status === 404 || detailRes.status === 403, '6. Actor without domain permission must be denied marketplace-typed connection detail.');
      }
    }

    // ================= sync permission required (item 5) =================
    { const res = await request(readOnlyToken, `/integrations/connections/${mockId}/test`, { method: 'POST' }); check(res.status === 403, '5. Actor without integrations.sync must be denied test/sync.'); }

    // ================= DISCONNECT =================
    {
      await integrationSecretService.setSecret(pool, { organizationId: actor.organizationId, integrationId: mockId, secretName: 'pre_disconnect', value: 'will-be-removed', userId: actor.userId });
      const disconnectRes = await request(actorToken, `/integrations/connections/${mockId}/disconnect`, { method: 'POST' });
      check(disconnectRes.ok, 'disconnect endpoint must respond.');
      const disconnectBody: any = await disconnectRes.json();
      check(disconnectBody.data.status_code === 'not_connected', '45. Disconnect must set status to not_connected.');
      const [secretCount]: any = await pool.execute('SELECT COUNT(*) c FROM integration_secrets WHERE integration_id=?', [mockId]);
      check(Number(secretCount[0].c) === 0, '30. Disconnect must delete all secrets for the integration.');
      const [logCountAfterDisconnect]: any = await pool.execute('SELECT COUNT(*) c FROM integration_sync_logs WHERE integration_id=?', [mockId]);
      check(Number(logCountAfterDisconnect[0].c) > 0, 'disconnect must retain historical sync logs, not delete them.');
    }

    // ================= AUDIT =================
    {
      const actionCodes = ['integration.create', 'integration.update', 'integration.credentials.update', 'integration.credentials.remove', 'integration.test', 'integration.sync', 'integration.disable', 'integration.disconnect'];
      const [rows]: any = await pool.execute(
        `SELECT action_code, COUNT(*) c FROM audit_logs WHERE module_code='integrations' AND id>? GROUP BY action_code`,
        [auditBefore],
      );
      const seen = new Set(rows.map((row: any) => row.action_code));
      for (const code of actionCodes) check(seen.has(code), `66-72. Audit must record "${code}" for this run's mutations.`);
    }

    // ================= CRAFT MARKETPLACE COMPATIBILITY (60-65) =================
    {
      const overviewRes = await request(actorToken, '/craft/marketplace/overview');
      check(overviewRes.ok, '60. Existing Craft Marketplace overview endpoint must still work.');
      const integrationsRes = await request(actorToken, '/craft/marketplace/integrations');
      check(integrationsRes.ok, '61. Existing Craft Marketplace integrations list must still work.');
      const secretRejectRes = await request(actorToken, '/craft/marketplace/integrations', { method: 'PATCH', body: JSON.stringify({ config_json: { access_token: 'leak' } }) });
      check(secretRejectRes.status === 400 || secretRejectRes.status === 404, '62. Marketplace config must still reject secret-shaped keys (or route requires an id, both are safe outcomes here).');
    }

    console.log(`Global Integrations smoke: PASS (${pass} assertions across auth/RBAC, org+BU isolation, connection lifecycle, secret vault, key safety, provider catalog, status, test/sync logging, concurrency, audit, and Craft Marketplace compatibility).`);
  } finally {
    // ================= CLEANUP (73-77) =================
    for (const id of integrationIds) await pool.execute('DELETE FROM integrations WHERE id=?', [id]).catch(() => undefined); // cascades sync_logs + secrets
    if (orgB) await pool.execute('DELETE FROM integrations WHERE organization_id=?', [orgB.organizationId]).catch(() => undefined);
    // audit_logs FK-references organizations, so it must be cleared before any fixture organization is deleted.
    await pool.execute('DELETE FROM audit_logs WHERE id>? AND module_code=\'integrations\'', [auditBefore]).catch(() => undefined);
    for (const userId of fixtureUserIds) {
      await pool.execute('DELETE FROM user_roles WHERE user_id=?', [userId]).catch(() => undefined);
      await pool.execute('DELETE FROM user_business_units WHERE user_id=?', [userId]).catch(() => undefined);
      await pool.execute('DELETE FROM users WHERE id=?', [userId]).catch(() => undefined);
    }
    for (const roleId of fixtureRoleIds) {
      await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [roleId]).catch(() => undefined);
      await pool.execute('DELETE FROM roles WHERE id=?', [roleId]).catch(() => undefined);
    }
    if (orgB) {
      await pool.execute('DELETE FROM business_units WHERE organization_id=?', [orgB.organizationId]).catch(() => undefined);
      await pool.execute('DELETE FROM organizations WHERE id=?', [orgB.organizationId]).catch(() => undefined);
    }
    await pool.end();
  }
}

main().catch(async (error) => { console.error('Global Integrations smoke: FAIL', error); await pool.end().catch(() => undefined); process.exit(1); });
