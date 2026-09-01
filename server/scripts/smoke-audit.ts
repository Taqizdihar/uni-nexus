const assert: (actual: unknown, expected: unknown, message?: string) => void = (actual, expected, message) => { if (actual !== expected) throw new Error(message || `Expected ${String(expected)}, received ${String(actual)}.`); };
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { pool } from '../src/config/database';
import { AuditService } from '../src/shared/audit/audit.service';
import { UsersService } from '../src/modules/users/users.service';

const assertOk: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };

async function main() {
  const suffix = randomUUID().slice(0, 8); const username = `audit_smoke_${suffix}`; const noPermissionUsername = `audit_none_${suffix}`; const noExportUsername = `audit_view_${suffix}`;
  const password = `AuditSmoke-${suffix}`; const hash = await bcrypt.hash(password, 10);
  const userIds: number[] = []; let roleId = 0; let viewRoleId = 0; let server: ReturnType<typeof app.listen> | null = null; const auditIds: number[] = [];
  try {
    const [workspaces]: any = await pool.execute("SELECT id,code FROM business_units WHERE LOWER(code) IN ('craft','studio') AND is_active=1");
    const craftId = Number(workspaces.find((row: any) => String(row.code).toLowerCase() === 'craft')?.id); const studioId = Number(workspaces.find((row: any) => String(row.code).toLowerCase() === 'studio')?.id);
    assertOk(craftId && studioId, 'Craft and Studio fixtures require active business units.');
    const [permissions]: any = await pool.execute("SELECT id,code FROM permissions WHERE code IN ('audit.read','reports.export')");
    const auditPermissionId = Number(permissions.find((row: any) => row.code === 'audit.read')?.id); const exportPermissionId = Number(permissions.find((row: any) => row.code === 'reports.export')?.id);
    assertOk(auditPermissionId && exportPermissionId, 'audit.read and reports.export must exist.');
    const [role]: any = await pool.execute('INSERT INTO roles (organization_id,code,name,scope_code,is_system,is_active) VALUES (1,?,?,\'global\',0,1)', [`AUDIT_SMOKE_${suffix}`.toUpperCase(), `Audit smoke ${suffix}`]); roleId = Number(role.insertId);
    const [viewRole]: any = await pool.execute('INSERT INTO roles (organization_id,code,name,scope_code,is_system,is_active) VALUES (1,?,?,\'global\',0,1)', [`AUDIT_VIEW_${suffix}`.toUpperCase(), `Audit view ${suffix}`]); viewRoleId = Number(viewRole.insertId);
    await pool.execute('INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?),(?,?),(?,?)', [roleId, auditPermissionId, roleId, exportPermissionId, viewRoleId, auditPermissionId]);
    const makeUser = async (name: string, handle: string) => { const [result]: any = await pool.execute(`INSERT INTO users (organization_id,full_name,username,email,password_hash,status_code,approval_status_code,registration_source,default_workspace_code,approval_requested_at) VALUES (1,?,?,?,?,?,?,'smoke','craft',UTC_TIMESTAMP(3))`, [name, handle, `${handle}@example.invalid`, hash, 'active', 'approved']); userIds.push(Number(result.insertId)); return Number(result.insertId); };
    const auditorId = await makeUser('Audit Smoke Auditor', username); const deniedId = await makeUser('Audit Smoke Denied', noPermissionUsername); const viewOnlyId = await makeUser('Audit Smoke Viewer', noExportUsername);
    await pool.execute('INSERT INTO user_roles (user_id,role_id) VALUES (?,?),(?,?)', [auditorId, roleId, viewOnlyId, viewRoleId]);
    await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?, ?, 1),(?, ?, 0),(?, ?, 1),(?, ?, 0)', [auditorId, craftId, auditorId, studioId, viewOnlyId, craftId, viewOnlyId, studioId]);

    auditIds.push(Number(await AuditService.write({ organizationId: 1, userId: auditorId, moduleCode: 'smoke_global', actionCode: 'fixture.create', entityType: 'fixture', entityCode: `GLOBAL-${suffix}`, description: `Audit global fixture ${suffix}`, newValues: { fixture: true } }) || 0));
    auditIds.push(Number(await AuditService.write({ organizationId: 1, businessUnitId: craftId, userId: auditorId, moduleCode: 'smoke_craft', actionCode: 'fixture.update', entityType: 'fixture', entityCode: `CRAFT-${suffix}`, description: `Audit craft fixture ${suffix}`, newValues: { status: 'craft' } }) || 0));
    auditIds.push(Number(await AuditService.write({ organizationId: 1, businessUnitId: studioId, userId: auditorId, moduleCode: 'smoke_studio', actionCode: 'fixture.update', entityType: 'fixture', entityCode: `STUDIO-${suffix}`, description: `Audit studio fixture ${suffix}`, newValues: { status: 'studio' } }) || 0));
    auditIds.push(Number(await AuditService.write({ organizationId: 1, userId: auditorId, moduleCode: 'smoke_secret', actionCode: 'fixture.update', entityType: 'fixture', entityCode: `SECRET-${suffix}`, description: `Audit redaction fixture ${suffix}`, newValues: { password: 'never-return-this', access_token: 'also-never-return-this', nested: { api_key: 'nope' } } }) || 0));
    const [legacy]: any = await pool.execute(`INSERT INTO audit_logs (organization_id,user_id,module_code,action_code,entity_type,entity_code,description,new_values,created_at) VALUES (?,?, 'smoke_legacy','fixture.update','fixture',?, ?, JSON_OBJECT('password_hash','legacy-secret','credentials',JSON_OBJECT('token','legacy-token')), UTC_TIMESTAMP(3))`, [1, auditorId, `LEGACY-${suffix}`, `Legacy redaction fixture ${suffix}`]); auditIds.push(Number(legacy.insertId));

    server = app.listen(0); await new Promise<void>(resolve => server!.once('listening', resolve));
    const address = server.address(); const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api/v1`;
    const request = async (path: string, options: RequestInit = {}) => { const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'User-Agent': 'uni-nexus-audit-smoke', ...(options.headers || {}) } }); const text = await response.text(); let body: any = null; try { body = JSON.parse(text); } catch { /* Binary exports are intentionally not JSON. */ } return { response, body, text }; };
    const login = async (handle: string) => { const { response, body } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ usernameOrEmail: handle, password }) }); assert(response.status, 200, `Login failed for ${handle}: ${body?.error?.message || ''}`); return String(body.data.token); };
    const token = await login(username); const deniedToken = await login(noPermissionUsername); const viewToken = await login(noExportUsername); const auth = (value: string) => ({ Authorization: `Bearer ${value}` });

    let result = await request(`/audit?q=${encodeURIComponent(suffix)}`, { headers: auth(token) }); assert(result.response.status, 200); assertOk(result.body.data.items.some((item: any) => item.entity?.code === `GLOBAL-${suffix}`), 'Global Audit row is not visible.'); assertOk(result.body.data.items.some((item: any) => item.entity?.code === `CRAFT-${suffix}`), 'Craft Audit row is not visible.'); assertOk(!result.body.data.items.some((item: any) => item.entity?.code === `STUDIO-${suffix}`), 'Studio Audit row leaked to Craft-only user.');
    result = await request('/audit', { headers: auth(deniedToken) }); assert(result.response.status, 403, 'User without audit.read was allowed to list Audit.');
    result = await request(`/audit?workspace=craft&module=smoke_craft&action=fixture.update&action_group=update&entity_type=fixture&user_id=${auditorId}&q=${encodeURIComponent(`CRAFT-${suffix}`)}&from=2020-01-01&to=2099-01-01`, { headers: auth(token) }); assert(result.response.status, 200); assert(result.body.data.items.length, 1, 'Scoped Audit filters did not yield the Craft fixture.');
    result = await request('/audit/meta?workspace=all', { headers: auth(token) }); assert(result.response.status, 200); assertOk(!result.body.data.modules.some((item: any) => item.code === 'smoke_studio'), 'Metadata leaked inaccessible Studio rows.');
    result = await request('/audit/summary?workspace=all', { headers: auth(token) }); assert(result.response.status, 200); assertOk(result.body.data.total_in_range >= 4, 'Audit summary did not count accessible rows.');
    result = await request(`/audit/${auditIds[2]}`, { headers: auth(token) }); assert(result.response.status, 404, 'Inaccessible Audit detail did not return 404.');
    result = await request(`/audit/${auditIds[3]}`, { headers: auth(token) }); assert(result.response.status, 200); const secretText = JSON.stringify(result.body.data); assertOk(secretText.includes('[REDACTED]') && !secretText.includes('never-return-this') && !secretText.includes('also-never-return-this'), 'New Audit write redaction failed.');
    result = await request(`/audit/${auditIds[4]}`, { headers: auth(token) }); assert(result.response.status, 200); const legacyText = JSON.stringify(result.body.data); assertOk(legacyText.includes('[REDACTED]') && !legacyText.includes('legacy-secret') && !legacyText.includes('legacy-token'), 'Legacy Audit read redaction failed.');
    result = await request('/audit/export?format=csv', { headers: auth(viewToken) }); assert(result.response.status, 403, 'Export did not require reports.export.');
    result = await request(`/audit/export?format=csv&q=${encodeURIComponent(suffix)}`, { headers: auth(token) }); assert(result.response.status, 200); assertOk(result.text.includes('[REDACTED]') && !result.text.includes('never-return-this'), 'CSV Audit export was not redacted.');
    result = await request(`/audit/export?format=xlsx&q=${encodeURIComponent(suffix)}`, { headers: auth(token) }); assert(result.response.status, 200); assertOk(result.response.headers.get('content-type')?.includes('spreadsheetml'), 'XLSX Audit export failed.');
    result = await request('/audit/1', { method: 'DELETE', headers: auth(token) }); assert(result.response.status, 404, 'Audit API exposed a mutation route.');
    const sessionKey = randomUUID(); result = await request('/presence/heartbeat', { method: 'POST', headers: auth(token), body: JSON.stringify({ session_key: sessionKey, workspace_code: 'craft' }) }); assert(result.response.status, 200); result = await request('/auth/logout', { method: 'POST', headers: auth(token), body: JSON.stringify({ session_key: sessionKey }) }); assert(result.response.status, 200);
    const [presence]: any = await pool.execute('SELECT left_at FROM user_presence_sessions WHERE user_id=? AND session_key=?', [auditorId, sessionKey]); assertOk(presence[0]?.left_at, 'Logout did not leave its supplied presence session.');
    const [authLogs]: any = await pool.execute("SELECT action_code,ip_address,user_agent FROM audit_logs WHERE user_id=? AND module_code='auth' ORDER BY id", [auditorId]); assertOk(authLogs.some((row: any) => row.action_code === 'login' && row.user_agent === 'uni-nexus-audit-smoke'), 'Login Audit request metadata is missing.'); assertOk(authLogs.some((row: any) => row.action_code === 'logout'), 'Explicit logout Audit row is missing.');
    await UsersService.updateStatus(deniedId, 'suspended', auditorId); const [statusAudit]: any = await pool.execute("SELECT entity_type,entity_id,old_values,new_values FROM audit_logs WHERE user_id=? AND action_code='status_change' ORDER BY id DESC LIMIT 1", [auditorId]); assert(Number(statusAudit[0].entity_id), deniedId); assert(statusAudit[0].entity_type, 'user'); assertOk(JSON.stringify(statusAudit[0].old_values).includes('active') && JSON.stringify(statusAudit[0].new_values).includes('suspended'), 'User status Audit lacks useful change values.');
    console.log('Audit smoke: PASS');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (userIds.length) { const slots = userIds.map(() => '?').join(','); await pool.execute(`DELETE FROM audit_logs WHERE user_id IN (${slots})`, userIds); await pool.execute(`DELETE FROM user_presence_sessions WHERE user_id IN (${slots})`, userIds); await pool.execute(`DELETE FROM user_business_units WHERE user_id IN (${slots})`, userIds); await pool.execute(`DELETE FROM user_roles WHERE user_id IN (${slots})`, userIds); await pool.execute(`DELETE FROM users WHERE id IN (${slots})`, userIds); }
    if (roleId) { await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [roleId]); await pool.execute('DELETE FROM roles WHERE id=?', [roleId]); }
    if (viewRoleId) { await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [viewRoleId]); await pool.execute('DELETE FROM roles WHERE id=?', [viewRoleId]); }
    await pool.end();
  }
}

main().catch(error => { console.error('Audit smoke: FAIL', error); process.exitCode = 1; });
