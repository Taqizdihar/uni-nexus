import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import app from '../src/app';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { notificationService } from '../src/shared/notifications/notification.service';
import { systemNotificationService } from '../src/shared/notifications/system-notification.service';
import { automationActionRegistry } from '../src/shared/automation/automation-action-registry';

type FixtureUser = { id: number; username: string; organizationId: number };
const tokenFor = (user: FixtureUser) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, organization_id: user.organizationId, username: user.username, iat: now, exp: now + 300 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
};

async function main() {
  const suffix = randomUUID().slice(0, 10);
  const userIds: number[] = []; let roleId = 0; let server: Server | undefined; let baseUrl = ''; const legacyIds: number[] = [];
  const createUser = async (label: string, status = 'active', approval = 'approved'): Promise<FixtureUser> => {
    const username = `smokenotif_${label}_${suffix}`;
    const [result]: any = await pool.execute(
      `INSERT INTO users (organization_id,full_name,username,email,password_hash,status_code,approval_status_code,registration_source,default_workspace_code,approval_requested_at,deleted_at)
       VALUES (1,?,?,?,?,?,?, 'legacy','craft',CURRENT_TIMESTAMP(3),?)`,
      [`Smoke Notification ${label}`, username, `${username}@example.invalid`, '$2b$10$fixturehashonlyneverused', status, approval, label === 'deleted' ? new Date() : null],
    );
    const user = { id: Number(result.insertId), username, organizationId: 1 }; userIds.push(user.id); return user;
  };
  const request = async (token: string, path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { response, json: await response.json() as any };
  };

  try {
    const [columns]: any = await pool.query('SHOW COLUMNS FROM notifications');
    const actual = new Set(columns.map((column: any) => column.Field));
    for (const column of ['module_code', 'dedupe_key']) assert(actual.has(column), `notifications.${column} is missing; apply the schema manually before smoke testing.`);
    const [units]: any = await pool.execute(`SELECT id,code FROM business_units WHERE code IN ('CRAFT','STUDIO') AND is_active=1`);
    const craftId = Number(units.find((unit: any) => unit.code === 'CRAFT')?.id); const studioId = Number(units.find((unit: any) => unit.code === 'STUDIO')?.id);
    assert(craftId && studioId, 'Craft and Studio business units are required.');
    const [permissionRows]: any = await pool.execute(`SELECT id FROM permissions WHERE code='craft.orders.read' LIMIT 1`);
    assert(permissionRows.length, 'craft.orders.read permission is required.');
    const [roleResult]: any = await pool.execute(`INSERT INTO roles (organization_id,code,name,scope_code,is_system,is_active) VALUES (1,?,?, 'global',0,1)`, [`SMOKE_NOTIF_${suffix}`.toUpperCase(), `Smoke notifications ${suffix}`]);
    roleId = Number(roleResult.insertId);
    await pool.execute('INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?)', [roleId, permissionRows[0].id]);

    const primary = await createUser('primary'); const peer = await createUser('peer'); const noPermission = await createUser('no_permission');
    const noAccess = await createUser('no_access'); const inactive = await createUser('inactive', 'inactive'); const pending = await createUser('pending', 'inactive', 'pending'); const deleted = await createUser('deleted');
    for (const id of [primary.id, peer.id, noAccess.id, inactive.id, pending.id, deleted.id]) await pool.execute('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)', [id, roleId]);
    for (const id of [primary.id, peer.id, noPermission.id, inactive.id, pending.id, deleted.id]) await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?,?,1)', [id, craftId]);
    await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?,?,1)', [noAccess.id, studioId]);

    const direct = await notificationService.createForUser(primary.id, { organizationId: 1, notificationType: 'smoke', moduleCode: 'users', severityCode: 'info', title: `Direct ${suffix}`, message: 'Direct notification fixture', actionUrl: 'javascript:alert(1)' });
    assert.equal(direct.status, 'created');
    const [directRows]: any = await pool.execute('SELECT action_url,user_id FROM notifications WHERE id=?', [direct.id]);
    assert.equal(directRows[0].action_url, null, 'unsafe action URL was retained'); assert.equal(Number(directRows[0].user_id), primary.id);

    const workspaceRows = await notificationService.createForWorkspace({ organizationId: 1, businessUnitId: craftId, notificationType: 'smoke', moduleCode: 'craft_orders', severityCode: 'warning', title: `Workspace ${suffix}`, message: 'Permission filtered workspace delivery' }, { businessUnitId: craftId, permissionCode: 'craft.orders.read' });
    assert(workspaceRows.filter((row) => row.status === 'created').length >= 2, 'workspace delivery did not materialize eligible recipients');
    const [workspaceRecipients]: any = await pool.execute('SELECT user_id FROM notifications WHERE title=? ORDER BY user_id', [`Workspace ${suffix}`]);
    const workspaceRecipientIds = workspaceRecipients.map((row: any) => Number(row.user_id));
    assert(workspaceRecipientIds.includes(primary.id) && workspaceRecipientIds.includes(peer.id), 'eligible recipients did not receive workspace notifications');
    for (const excluded of [noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id]) assert(!workspaceRecipientIds.includes(excluded), 'ineligible recipient received a workspace notification');

    const event = { id: 9_000_000 + Math.floor(Math.random() * 100_000), organization_id: 1, business_unit_id: craftId };
    const systemInput = { organizationId: 1, businessUnitId: craftId, notificationType: 'system', moduleCode: 'craft_orders', severityCode: 'info' as const, title: `System ${suffix}`, message: 'Retry-safe delivery', actionUrl: '/app/craft/orders', entityType: 'craft_order', entityId: 12345 };
    await notificationService.createFromSystemEvent(event, 'smoke-order-created', systemInput, { businessUnitId: craftId, permissionCode: 'craft.orders.read', excludeUserId: primary.id });
    await notificationService.createFromSystemEvent(event, 'smoke-order-created', systemInput, { businessUnitId: craftId, permissionCode: 'craft.orders.read', excludeUserId: primary.id });
    const [deduped]: any = await pool.execute('SELECT COUNT(*) AS count, COUNT(DISTINCT user_id) AS recipients FROM notifications WHERE title=?', [`System ${suffix}`]);
    assert.equal(Number(deduped[0].count), Number(deduped[0].recipients), 'same system event retry created a duplicate');
    const [peerSystemRows]: any = await pool.execute('SELECT COUNT(*) AS count FROM notifications WHERE title=? AND user_id=?', [`System ${suffix}`, peer.id]);
    assert.equal(Number(peerSystemRows[0].count), 1, 'legitimate eligible recipient did not receive exactly one retry-safe system notification');
    const policyEvent = { id: event.id + 1, organization_id: 1, business_unit_id: craftId, event_name: 'order.created', entity_type: 'craft_order', entity_id: 12346, actor_user_id: primary.id, payload_json: JSON.stringify({ context: { order: { order_code: `SYS-${suffix}` } } }) };
    await systemNotificationService.dispatch(policyEvent); await systemNotificationService.dispatch(policyEvent);
    const [policyRows]: any = await pool.execute('SELECT COUNT(*) AS count FROM notifications WHERE title=? AND user_id=?', [`Pesanan baru SYS-${suffix}`, peer.id]);
    assert.equal(Number(policyRows[0].count), 1, 'order.created system policy is not retry-safe or did not target an eligible recipient');

    const runId = 8_000_000 + Math.floor(Math.random() * 100_000);
    const automation = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'workspace_broadcast', severity: 'info', title_template: `Automation ${suffix}`, message_template: 'Automation notification' } }, { rule: { trigger_event: 'order.created', action_json: { actions: [] }, created_by: primary.id }, run: { id: runId }, event: { entity_id: 12345, entity_type: 'craft_order' }, input: { order: { id: 12345, order_code: 'SMOKE' } }, organizationId: 1, businessUnitId: craftId, businessUnitCode: 'CRAFT', actorUserId: primary.id, actionIndex: 0 });
    assert.equal(automation.status, 'success');
    const [automationRows]: any = await pool.execute('SELECT COUNT(*) AS count, COALESCE(SUM(user_id IS NULL),0) AS null_count FROM notifications WHERE title=?', [`Automation ${suffix}`]);
    const [automationFixtures]: any = await pool.execute(`SELECT user_id FROM notifications WHERE title=? AND user_id IN (${[primary.id, peer.id, noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id].map(() => '?').join(',')})`, [`Automation ${suffix}`, primary.id, peer.id, noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id]);
    assert.deepEqual(automationFixtures.map((row: any) => Number(row.user_id)).sort((a: number, b: number) => a - b), [primary.id, peer.id, noPermission.id].sort((a, b) => a - b), 'automation broadcast did not respect account and workspace eligibility');
    assert(Number(automationRows[0].count) >= 3 && Number(automationRows[0].null_count) === 0, 'automation created a shared NULL recipient row');

    // Controlled legacy fixture: personal endpoints must ignore and never mutate old broadcast rows.
    const [legacy]: any = await pool.execute(`INSERT INTO notifications (organization_id,business_unit_id,user_id,notification_type,module_code,severity_code,title,message,is_read) VALUES (?,?,NULL,'legacy','craft_orders','info',?,'legacy broadcast fixture',0)`, [1, craftId, `Legacy ${suffix}`]);
    legacyIds.push(Number(legacy.insertId));

    server = createServer(app); await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert(address && typeof address !== 'string'); baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
    const token = tokenFor(primary);
    const summary = await request(token, '/notifications/summary'); assert.equal(summary.response.status, 200, JSON.stringify(summary.json)); assert(Number(summary.json.data.unread_count) >= 1);
    const defaults = await request(token, '/notifications'); assert.equal(defaults.response.status, 200, JSON.stringify(defaults.json)); assert.equal(defaults.json.data.pagination.page, 1, 'default inbox query did not normalize filters');
    const list = await request(token, `/notifications?status=unread&workspace=craft&severity=warning&module=craft_orders&q=Workspace&page=1&limit=1`);
    assert.equal(list.response.status, 200, JSON.stringify(list.json)); assert.equal(list.json.data.pagination.limit, 1); assert.equal(list.json.data.pagination.total, 1);
    const ownId = Number(list.json.data.items[0].id);
    assert.equal((await request(token, `/notifications/${ownId}/read`, 'PATCH', {})).response.status, 200);
    assert.equal((await request(token, `/notifications/${ownId}/read`, 'PATCH', {})).response.status, 200, 'mark-read is not idempotent');
    assert.equal((await request(token, `/notifications/${ownId}/unread`, 'PATCH', {})).response.status, 200);
    const peerNotification = await notificationService.createForUser(peer.id, { organizationId: 1, notificationType: 'smoke', severityCode: 'info', title: `Peer ${suffix}`, message: 'horizontal access fixture' });
    assert.equal(peerNotification.status, 'created');
    assert.equal((await request(token, `/notifications/${peerNotification.id}/read`, 'PATCH', {})).response.status, 404, 'another user mutated a notification');
    assert.equal((await request(token, `/notifications/${legacyIds[0]}/read`, 'PATCH', {})).response.status, 404, 'legacy broadcast row was mutated as a personal row');
    const allRead = await request(token, '/notifications/mark-all-read', 'POST', {}); assert.equal(allRead.response.status, 200); assert(Number(allRead.json.data.affected_count) >= 1);
    console.log('Notifications smoke: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (userIds.length) {
      const placeholders = userIds.map(() => '?').join(',');
      await pool.execute(`DELETE FROM notifications WHERE user_id IN (${placeholders})`, userIds);
      if (legacyIds.length) await pool.execute(`DELETE FROM notifications WHERE id IN (${legacyIds.map(() => '?').join(',')})`, legacyIds);
      await pool.execute(`DELETE FROM user_business_units WHERE user_id IN (${placeholders})`, userIds);
      await pool.execute(`DELETE FROM user_roles WHERE user_id IN (${placeholders})`, userIds);
      await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, userIds);
    }
    if (roleId) { await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [roleId]); await pool.execute('DELETE FROM roles WHERE id=?', [roleId]); }
    await pool.end();
  }
}

main().catch((error) => { console.error('Notifications smoke: FAIL', error); process.exitCode = 1; });
