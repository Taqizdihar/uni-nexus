import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import app from '../src/app';
import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { notificationService } from '../src/shared/notifications/notification.service';
import { systemNotificationService } from '../src/shared/notifications/system-notification.service';
import { systemNotificationSensorService } from '../src/shared/notifications/system-notification-sensor.service';
import { formatSensorCurrency } from '../src/shared/notifications/system-notification-sensor.service';
import { automationSensorService } from '../src/shared/automation/automation-sensor.service';
import { automationActionRegistry, automationNotificationSourceFor } from '../src/shared/automation/automation-action-registry';
import { AutomationWorker } from '../src/workers/automation.worker';
import { jakartaBusinessDate, jakartaDayStartUtc } from '../src/shared/notifications/notification-time';

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
  const orderIds: number[] = []; const studioProjectIds: number[] = []; const eventIds: number[] = []; let automationRuleId = 0; let sensorDedupeLike = ''; let utcNotificationId = 0;
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
    const [permissionRows]: any = await pool.execute(`SELECT id,code FROM permissions WHERE code IN ('craft.orders.read','craft.automations.read','craft.printers.read')`);
    const permissionIds = new Map<string, number>(permissionRows.map((row: any) => [String(row.code), Number(row.id)] as [string, number]));
    for (const code of ['craft.orders.read', 'craft.automations.read', 'craft.printers.read']) assert(permissionIds.has(code), `${code} permission is required.`);
    const [roleResult]: any = await pool.execute(`INSERT INTO roles (organization_id,code,name,scope_code,is_system,is_active) VALUES (1,?,?, 'global',0,1)`, [`SMOKE_NOTIF_${suffix}`.toUpperCase(), `Smoke notifications ${suffix}`]);
    roleId = Number(roleResult.insertId);
    for (const code of permissionIds.keys()) await pool.execute('INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?)', [roleId, permissionIds.get(code)]);

    const primary = await createUser('primary'); const peer = await createUser('peer'); const noPermission = await createUser('no_permission');
    const noAccess = await createUser('no_access'); const inactive = await createUser('inactive', 'inactive'); const pending = await createUser('pending', 'inactive', 'pending'); const deleted = await createUser('deleted');
    for (const id of [primary.id, peer.id, noAccess.id, inactive.id, pending.id, deleted.id]) await pool.execute('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)', [id, roleId]);
    for (const id of [primary.id, peer.id, noPermission.id, inactive.id, pending.id, deleted.id]) await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?,?,1)', [id, craftId]);
    await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?,?,1)', [noAccess.id, studioId]);
    await pool.execute('INSERT INTO user_business_units (user_id,business_unit_id,can_access) VALUES (?,?,1)', [noPermission.id, studioId]);

    const direct = await notificationService.createForUser(primary.id, { organizationId: 1, notificationType: 'smoke', moduleCode: 'users', severityCode: 'info', title: `Direct ${suffix}`, message: 'Direct notification fixture', actionUrl: 'javascript:alert(1)' });
    assert.equal(direct.status, 'created');
    const [directRows]: any = await pool.execute('SELECT action_url,user_id FROM notifications WHERE id=?', [direct.id]);
    assert.equal(directRows[0].action_url, null, 'unsafe action URL was retained'); assert.equal(Number(directRows[0].user_id), primary.id);

    const utcConnection = await pool.getConnection();
    let originalTimeZone = 'SYSTEM';
    try {
      const [timeZoneRows]: any = await utcConnection.query('SELECT @@session.time_zone AS value');
      originalTimeZone = String(timeZoneRows[0]?.value || 'SYSTEM');
      await utcConnection.query("SET time_zone = '+07:00'");
      const utcCreated = await notificationService.createForUser(primary.id, { organizationId: 1, notificationType: 'smoke', moduleCode: 'users', severityCode: 'info', title: `UTC ${suffix}`, message: 'UTC connection session fixture' }, {}, utcConnection);
      assert.equal(utcCreated.status, 'created'); utcNotificationId = Number(utcCreated.id);
      const [timestampRows]: any = await utcConnection.execute(`SELECT ABS(TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP(3))) AS utc_delta, TIMESTAMPDIFF(HOUR, CURRENT_TIMESTAMP(3), UTC_TIMESTAMP(3)) AS session_offset FROM notifications WHERE id=?`, [utcNotificationId]);
      assert(Number(timestampRows[0]?.utc_delta) <= 5, 'created_at followed the +07:00 session instead of UTC_TIMESTAMP(3)');
      assert(Math.abs(Number(timestampRows[0]?.session_offset)) >= 6, 'UTC regression connection did not use a distinct +07:00 session');
    } finally {
      await utcConnection.query(`SET time_zone = '${originalTimeZone.replace(/'/g, "''")}'`);
      utcConnection.release();
    }

    await notificationService.createForUser(primary.id, { organizationId: 1, notificationType: 'smoke', moduleCode: `smoke_meta_old_${suffix.slice(0, 4)}`, severityCode: 'info', title: `Metadata old ${suffix}`, message: 'Metadata pagination fixture' });
    await notificationService.createForUser(primary.id, { organizationId: 1, notificationType: 'smoke', moduleCode: `smoke_meta_new_${suffix.slice(0, 4)}`, severityCode: 'info', title: `Metadata new ${suffix}`, message: 'Metadata pagination fixture' });

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
    assert.deepEqual(automationNotificationSourceFor('event', 'order.created', 'CRAFT'), { moduleCode: 'craft_orders', permissionCode: 'craft.orders.read' });
    assert.deepEqual(automationNotificationSourceFor('sensor', 'studio.invoice.overdue', 'STUDIO'), { moduleCode: 'studio_billing', permissionCode: 'studio.billing.read' });
    assert.deepEqual(automationNotificationSourceFor('manual', 'order.created', 'CRAFT'), { moduleCode: 'automations', permissionCode: 'craft.automations.read' });
    const automation = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'workspace_broadcast', module_code: 'users', severity: 'info', title_template: `Automation ${suffix}`, message_template: 'Automation notification' } }, { rule: { trigger_type: 'event', trigger_event: 'order.created', action_json: { actions: [] }, created_by: primary.id }, run: { id: runId }, event: { entity_id: 12345, entity_type: 'craft_order' }, input: { order: { id: 12345, order_code: 'SMOKE' } }, organizationId: 1, businessUnitId: craftId, businessUnitCode: 'CRAFT', actorUserId: primary.id, actionIndex: 0 });
    assert.equal(automation.status, 'success');
    const [automationRows]: any = await pool.execute('SELECT COUNT(*) AS count, COALESCE(SUM(user_id IS NULL),0) AS null_count FROM notifications WHERE title=?', [`Automation ${suffix}`]);
    const [automationFixtures]: any = await pool.execute(`SELECT user_id FROM notifications WHERE title=? AND user_id IN (${[primary.id, peer.id, noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id].map(() => '?').join(',')})`, [`Automation ${suffix}`, primary.id, peer.id, noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id]);
    assert.deepEqual(automationFixtures.map((row: any) => Number(row.user_id)).sort((a: number, b: number) => a - b), [primary.id, peer.id].sort((a, b) => a - b), 'automation broadcast leaked to a workspace user without source permission');
    const [automationModuleRows]: any = await pool.execute('SELECT DISTINCT module_code FROM notifications WHERE title=?', [`Automation ${suffix}`]);
    assert.deepEqual(automationModuleRows.map((row: any) => row.module_code), ['craft_orders'], 'config.module_code bypassed the canonical event source module');
    assert(Number(automationRows[0].count) >= 2 && Number(automationRows[0].null_count) === 0, 'automation created a shared NULL recipient row');

    const unauthorizedSpecific = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'specific_user', user_id: noPermission.id, module_code: 'users', severity: 'info', title_template: `Specific blocked ${suffix}`, message_template: 'Must not be delivered' } }, { rule: { trigger_type: 'event', trigger_event: 'order.created' }, run: { id: runId + 1 }, event: { entity_id: 12345, entity_type: 'craft_order' }, input: { order: { id: 12345, order_code: 'SMOKE' } }, organizationId: 1, businessUnitId: craftId, businessUnitCode: 'CRAFT', actorUserId: primary.id, actionIndex: 0 });
    assert.deepEqual(unauthorizedSpecific, { status: 'skipped', reason: 'RECIPIENT_INELIGIBLE' }, 'specific_user without source permission was not skipped');

    const [parties]: any = await pool.execute('SELECT id FROM parties WHERE organization_id=1 ORDER BY id LIMIT 1');
    assert(parties.length, 'An existing party is required for the isolated Studio project fixture.');
    const [projectResult]: any = await pool.execute(`INSERT INTO studio_projects (business_unit_id,project_code,client_party_id,project_name,status_code,priority_code,currency_code,contract_value,project_manager_user_id,created_by) VALUES (?,?,? ,?,'lead','normal','IDR',0,?,?)`, [studioId, `SMOKE-NOTIF-${suffix}`, Number(parties[0].id), `Notification PM ${suffix}`, noPermission.id, primary.id]);
    const projectId = Number(projectResult.insertId); studioProjectIds.push(projectId);
    const unauthorizedManager = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'project_manager', module_code: 'users', severity: 'info', title_template: `PM blocked ${suffix}`, message_template: 'Must not be delivered' } }, { rule: { trigger_type: 'event', trigger_event: 'studio.project.created' }, run: { id: runId + 2 }, event: { entity_id: projectId, entity_type: 'studio_project' }, input: { project: { id: projectId, project_code: `SMOKE-NOTIF-${suffix}`, project_name: `Notification PM ${suffix}` } }, organizationId: 1, businessUnitId: studioId, businessUnitCode: 'STUDIO', actorUserId: primary.id, actionIndex: 0 });
    assert.deepEqual(unauthorizedManager, { status: 'skipped', reason: 'RECIPIENT_INELIGIBLE' }, 'project manager without source permission was not skipped');

    const manualNotification = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'specific_user', user_id: primary.id, module_code: 'craft_orders', severity: 'info', title_template: `Manual automation ${suffix}`, message_template: 'Automation-source authorization' } }, { rule: { trigger_type: 'manual', trigger_event: 'order.created' }, run: { id: runId + 3 }, event: null, input: {}, organizationId: 1, businessUnitId: craftId, businessUnitCode: 'CRAFT', actorUserId: primary.id, actionIndex: 0 });
    assert.equal(manualNotification.status, 'success');
    const scheduledNotification = await automationActionRegistry.execute({ type: 'notification.create', config: { recipient_scope: 'specific_user', user_id: primary.id, module_code: 'craft_orders', severity: 'info', title_template: `Scheduled automation ${suffix}`, message_template: 'Automation-source authorization' } }, { rule: { trigger_type: 'schedule', trigger_event: 'schedule' }, run: { id: runId + 4 }, event: null, input: {}, organizationId: 1, businessUnitId: craftId, businessUnitCode: 'CRAFT', actorUserId: primary.id, actionIndex: 0 });
    assert.equal(scheduledNotification.status, 'success');
    const [automationSourceRows]: any = await pool.execute(`SELECT DISTINCT module_code FROM notifications WHERE title IN (?,?) ORDER BY module_code`, [`Manual automation ${suffix}`, `Scheduled automation ${suffix}`]);
    assert.deepEqual(automationSourceRows.map((row: any) => row.module_code), ['automations'], 'manual/scheduled notification spoofed a domain module');

    // Built-in state notifications use the canonical sensor query, but do not
    // require a matching user-created automation rule.
    const sensorOrderCode = `SMOKE-SENSOR-${suffix}`;
    const sensorDeadline = new Date(Date.now() + 60 * 60 * 1000);
    const [sensorOrder]: any = await pool.execute(`INSERT INTO craft_orders
      (business_unit_id,order_code,customer_party_id,sales_channel_id,order_type,order_date,deadline_at,priority_code,status_code,payment_status_code,currency_code,subtotal,discount_amount,shipping_amount,marketplace_fee_amount,tax_amount,total_amount,paid_amount,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [craftId, sensorOrderCode, 1, 1, 'standard', new Date(), sensorDeadline, 'normal', 'new', 'unpaid', 'IDR', 0, 0, 0, 0, 0, 0, 0, primary.id]);
    const sensorOrderId = Number(sensorOrder.insertId); orderIds.push(sensorOrderId);
    sensorDedupeLike = `system:sensor:order.deadline_approaching:${craftId}:craft_order:${sensorOrderId}:%`;
    const canonicalCandidates = await automationSensorService.candidates('order.deadline_approaching', craftId);
    assert(canonicalCandidates.some((candidate) => candidate.entityId === sensorOrderId), 'canonical deadline sensor did not find the fixture');
    const originalCandidates = automationSensorService.candidates;
    automationSensorService.candidates = async (eventName, businessUnitId) => eventName === 'order.deadline_approaching' && businessUnitId === craftId ? canonicalCandidates : [];
    try {
      const firstSensorPass = await systemNotificationSensorService.runOnce(new Date('2026-08-30T10:00:00.000Z'));
      const secondSensorPass = await systemNotificationSensorService.runOnce(new Date('2026-08-30T10:00:01.000Z'));
      assert.equal(firstSensorPass.candidates, 1, 'built-in sensor pass did not inspect the isolated candidate');
      assert.equal(secondSensorPass.created, 0, 'repeated built-in sensor pass created a duplicate');
    } finally { automationSensorService.candidates = originalCandidates; }
    const [sensorRows]: any = await pool.execute(`SELECT user_id,dedupe_key FROM notifications WHERE dedupe_key LIKE ? ORDER BY user_id`, [sensorDedupeLike]);
    const sensorRecipientIds = sensorRows.map((row: any) => Number(row.user_id));
    assert(sensorRecipientIds.includes(primary.id) && sensorRecipientIds.includes(peer.id), 'eligible users did not receive the sensor notification');
    assert.equal(new Set(sensorRows.map((row: any) => row.dedupe_key)).size, sensorRows.length, 'sensor dedupe keys were not recipient-specific');
    for (const excluded of [noPermission.id, noAccess.id, inactive.id, pending.id, deleted.id]) assert(!sensorRows.some((row: any) => Number(row.user_id) === excluded), 'excluded user received a sensor notification');

    const originalCandidatesForIsolation = automationSensorService.candidates;
    const attemptedPolicyEvents: string[] = [];
    const printerCandidate = { entityType: 'printer', entityId: 777001, entityCode: 'SMOKE-PRINTER', context: { printer: { id: 777001, name: 'Smoke printer', status_code: 'error' } } };
    automationSensorService.candidates = (async (eventName, businessUnitId) => {
      if (businessUnitId !== craftId) return [];
      attemptedPolicyEvents.push(eventName);
      if (eventName === 'order.deadline_approaching') throw new Error('controlled sensor policy failure');
      return eventName === 'printer.maintenance_due' ? [printerCandidate] : [];
    }) as typeof automationSensorService.candidates;
    try {
      const isolatedPass = await systemNotificationSensorService.runOnce(new Date('2026-08-30T11:00:00.000Z'));
      assert(attemptedPolicyEvents.includes('printer.maintenance_due'), 'sensor policy loop stopped after an earlier query failure');
      assert.equal(isolatedPass.failedPolicies, 1, 'sensor policy failure was not observable');
      assert(isolatedPass.created >= 2, 'a valid later sensor policy did not deliver notifications');
    } finally { automationSensorService.candidates = originalCandidatesForIsolation; }

    const originalCreateForWorkspace = notificationService.createForWorkspace;
    let candidateDeliveryAttempts = 0;
    const secondPrinterCandidate = { entityType: 'printer', entityId: 777002, entityCode: 'SMOKE-PRINTER-2', context: { printer: { id: 777002, name: 'Smoke printer 2', status_code: 'error' } } };
    automationSensorService.candidates = (async (eventName, businessUnitId) => eventName === 'printer.maintenance_due' && businessUnitId === craftId ? [printerCandidate, secondPrinterCandidate] : []) as typeof automationSensorService.candidates;
    notificationService.createForWorkspace = (async (input, options, connection) => {
      candidateDeliveryAttempts += 1;
      if (candidateDeliveryAttempts === 1) throw new Error('controlled candidate delivery failure');
      return originalCreateForWorkspace.call(notificationService, input, options, connection);
    }) as typeof notificationService.createForWorkspace;
    try {
      const candidateIsolationPass = await systemNotificationSensorService.runOnce(new Date('2026-08-30T12:00:00.000Z'));
      assert.equal(candidateIsolationPass.failedCandidates, 1, 'bad sensor candidate was not counted');
      assert(candidateDeliveryAttempts >= 2 && candidateIsolationPass.created >= 2, 'a bad sensor candidate stopped the next candidate delivery');
    } finally {
      automationSensorService.candidates = originalCandidatesForIsolation;
      notificationService.createForWorkspace = originalCreateForWorkspace;
    }

    // The worker invokes the pass once at startup and then throttles it.
    const originalSensorPass = systemNotificationSensorService.runOnce;
    let sensorInvocationCount = 0;
    systemNotificationSensorService.runOnce = async () => { sensorInvocationCount += 1; return { businessUnits: 0, policiesChecked: 0, candidates: 0, created: 0, failedPolicies: 0, failedCandidates: 0, bucket: '2026-08-30' }; };
    try {
      const worker = new AutomationWorker();
      assert.equal((await worker.runBuiltInNotificationSensors(new Date('2026-08-30T10:00:00.000Z'))).status, 'ran');
      assert.equal((await worker.runBuiltInNotificationSensors(new Date('2026-08-30T10:00:01.000Z'))).status, 'throttled');
      assert.equal(sensorInvocationCount, 1, 'built-in sensor pass was not throttled');
    } finally { systemNotificationSensorService.runOnce = originalSensorPass; }

    let fatalSensorInvocations = 0;
    systemNotificationSensorService.runOnce = async () => {
      fatalSensorInvocations += 1;
      if (fatalSensorInvocations === 1) throw new Error('controlled fatal sensor pass failure');
      return { businessUnits: 0, policiesChecked: 0, candidates: 0, created: 0, failedPolicies: 0, failedCandidates: 0, bucket: '2026-08-30' };
    };
    try {
      const retryWorker = new AutomationWorker();
      await assert.rejects(() => retryWorker.runBuiltInNotificationSensors(new Date('2026-08-30T13:00:00.000Z')));
      assert.equal((await retryWorker.runBuiltInNotificationSensors(new Date('2026-08-30T13:00:01.000Z'))).status, 'throttled');
      assert.equal((await retryWorker.runBuiltInNotificationSensors(new Date('2026-08-30T13:01:01.000Z'))).status, 'ran');
      assert.equal(fatalSensorInvocations, 2, 'fatal sensor failure caused a one-second retry storm or did not retry');
    } finally { systemNotificationSensorService.runOnce = originalSensorPass; }

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
    const metadata = await request(token, '/notifications/meta'); assert.equal(metadata.response.status, 200, JSON.stringify(metadata.json));
    const metadataCodes = metadata.json.data.modules.map((item: { code: string }) => item.code);
    assert(metadataCodes.some((code: string) => code.startsWith('smoke_meta_old_')) && metadataCodes.some((code: string) => code.startsWith('smoke_meta_new_')), 'metadata did not include all accessible modules');
    const smallPage = await request(token, '/notifications?status=all&workspace=all&severity=all&page=1&limit=1');
    assert(metadataCodes.some((code: string) => !smallPage.json.data.items.some((item: any) => item.module_code === code)), 'metadata appears to be derived only from the current page');
    assert.equal((await request(token, `/notifications/${ownId}/read`, 'PATCH', {})).response.status, 200);
    assert.equal((await request(token, `/notifications/${ownId}/read`, 'PATCH', {})).response.status, 200, 'mark-read is not idempotent');
    assert.equal((await request(token, `/notifications/${ownId}/unread`, 'PATCH', {})).response.status, 200);
    const peerNotification = await notificationService.createForUser(peer.id, { organizationId: 1, notificationType: 'smoke', severityCode: 'info', title: `Peer ${suffix}`, message: 'horizontal access fixture' });
    assert.equal(peerNotification.status, 'created');
    assert.equal((await request(token, `/notifications/${peerNotification.id}/read`, 'PATCH', {})).response.status, 404, 'another user mutated a notification');
    assert.equal((await request(token, `/notifications/${legacyIds[0]}/read`, 'PATCH', {})).response.status, 404, 'legacy broadcast row was mutated as a personal row');
    const allRead = await request(token, '/notifications/mark-all-read', 'POST', {}); assert.equal(allRead.response.status, 200); assert(Number(allRead.json.data.affected_count) >= 1);
    assert.equal((await request(token, `/notifications/${utcNotificationId}/unread`, 'PATCH', {})).response.status, 200);
    assert.equal((await request(token, `/notifications/${utcNotificationId}/read`, 'PATCH', {})).response.status, 200);
    const [readTimestampRows]: any = await pool.execute('SELECT read_at, ABS(TIMESTAMPDIFF(SECOND, read_at, UTC_TIMESTAMP(3))) AS utc_delta FROM notifications WHERE id=?', [utcNotificationId]);
    assert(readTimestampRows[0]?.read_at && Number(readTimestampRows[0]?.utc_delta) <= 5, 'read_at was not written as a UTC instant');

    // A system-notification failure must not prevent the configured rule from
    // being queued or the source event from being marked processed.
    const failureRuleCode = `SMOKE_FAILURE_${suffix}`.toUpperCase();
    const [failureRule]: any = await pool.execute(`INSERT INTO automation_rules
      (organization_id,business_unit_id,rule_code,name,module_code,trigger_type,trigger_event,action_json,status_code,created_by)
      VALUES (?,?,?,?,?,'event',?,?, 'active',?)`, [1, craftId, failureRuleCode, `Notification failure ${suffix}`, 'craft_automations', 'material.low_stock', JSON.stringify({ actions: [] }), primary.id]);
    automationRuleId = Number(failureRule.insertId);
    const [failureEvent]: any = await pool.execute(`INSERT INTO domain_events
      (organization_id,business_unit_id,event_key,event_name,module_code,entity_type,entity_id,actor_user_id,status_code,locked_at,locked_by,payload_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [1, craftId, randomUUID(), 'material.low_stock', 'craft_materials', 'material', 987654, primary.id, 'processing', new Date(), '', JSON.stringify({ context: { material: { name: 'failure fixture' } } })]);
    // The insert above intentionally uses the worker lock in a follow-up update
    // so the worker's ownership predicate remains exercised.
    const failureEventId = Number(failureEvent.insertId); eventIds.push(failureEventId);
    const failureWorker = new AutomationWorker();
    await pool.execute('UPDATE domain_events SET locked_by=? WHERE id=?', [failureWorker.id, failureEventId]);
    const originalDispatch = systemNotificationService.dispatch;
    let configuredRuleQueued = false;
    const originalQueueFromEvent = failureWorker.runs.queueFromEvent;
    systemNotificationService.dispatch = async () => { throw new Error('controlled notification rendering failure'); };
    failureWorker.runs.queueFromEvent = async () => { configuredRuleQueued = true; return { created: true, run: null as any }; };
    try {
      await failureWorker.dispatchEvent({ id: failureEventId, organization_id: 1, business_unit_id: craftId, event_name: 'material.low_stock', entity_type: 'material', entity_id: 987654, actor_user_id: primary.id, payload_json: '{}' });
    } finally {
      systemNotificationService.dispatch = originalDispatch;
      failureWorker.runs.queueFromEvent = originalQueueFromEvent;
    }
    const [failureState]: any = await pool.execute('SELECT status_code FROM domain_events WHERE id=?', [failureEventId]);
    assert(configuredRuleQueued && failureState[0]?.status_code === 'processed', 'system notification failure blocked configured automation processing');

    assert.equal(jakartaBusinessDate(new Date('2026-08-30T16:59:00.000Z')), '2026-08-30');
    assert.equal(jakartaBusinessDate(new Date('2026-08-30T17:00:00.000Z')), '2026-08-31');
    assert.equal(jakartaDayStartUtc(new Date('2026-08-30T16:59:00.000Z')).toISOString(), '2026-08-29T17:00:00.000Z');
    assert.equal(jakartaDayStartUtc(new Date('2026-08-30T17:00:00.000Z')).toISOString(), '2026-08-30T17:00:00.000Z');
    assert.equal(formatSensorCurrency(1_000_000, 'IDR'), new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(1_000_000));
    assert.equal(formatSensorCurrency(1_000_000, 'USD'), new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'USD' }).format(1_000_000));
    assert(!formatSensorCurrency(1_000_000, 'not-a-currency').includes('Rp'), 'unknown currency was falsely labeled as Rupiah');
    console.log('Notifications smoke: PASS');
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (sensorDedupeLike) await pool.execute('DELETE FROM notifications WHERE dedupe_key LIKE ?', [sensorDedupeLike]);
    if (userIds.length) {
      const placeholders = userIds.map(() => '?').join(',');
      await pool.execute(`DELETE FROM notifications WHERE user_id IN (${placeholders})`, userIds);
      if (legacyIds.length) await pool.execute(`DELETE FROM notifications WHERE id IN (${legacyIds.map(() => '?').join(',')})`, legacyIds);
      if (orderIds.length) await pool.execute(`DELETE FROM craft_orders WHERE id IN (${orderIds.map(() => '?').join(',')})`, orderIds);
      if (studioProjectIds.length) await pool.execute(`DELETE FROM studio_projects WHERE id IN (${studioProjectIds.map(() => '?').join(',')})`, studioProjectIds);
      if (eventIds.length) await pool.execute(`DELETE FROM domain_events WHERE id IN (${eventIds.map(() => '?').join(',')})`, eventIds);
      if (automationRuleId) await pool.execute('DELETE FROM automation_rules WHERE id=?', [automationRuleId]);
      await pool.execute(`DELETE FROM user_business_units WHERE user_id IN (${placeholders})`, userIds);
      await pool.execute(`DELETE FROM user_roles WHERE user_id IN (${placeholders})`, userIds);
      await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, userIds);
    }
    if (roleId) { await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [roleId]); await pool.execute('DELETE FROM roles WHERE id=?', [roleId]); }
    await pool.end();
  }
}

main().catch((error) => { console.error('Notifications smoke: FAIL', error); process.exitCode = 1; });
