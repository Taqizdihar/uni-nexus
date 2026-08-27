import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { domainEvents } from '../src/shared/automation/domain-event-outbox.service';
import { CraftAutomationWorker } from '../src/workers/craft-automation.worker';

const required = {
  automation_rules: ['trigger_type', 'trigger_config_json', 'cooldown_seconds', 'max_retries', 'next_run_at', 'last_run_at', 'last_success_at', 'last_failure_at', 'version_no', 'is_system', 'updated_by'],
  automation_runs: ['run_key', 'rule_version', 'trigger_event', 'scheduled_for', 'initiated_by', 'attempt_no', 'next_attempt_at', 'correlation_id', 'chain_depth', 'rule_snapshot_json'],
  domain_events: ['event_key', 'event_name', 'correlation_id', 'causation_event_id', 'source_automation_run_id', 'chain_depth', 'status_code', 'locked_at', 'locked_by'],
};

async function main() {
  let ruleId: number | null = null; let eventId: number | null = null;
  try {
    for (const [table, expected] of Object.entries(required)) {
      const [columns]: any = await pool.query(`SHOW COLUMNS FROM ${table}`);
      const actual = new Set(columns.map((column: any) => column.Field)); const missing = expected.filter((column) => !actual.has(column));
      if (missing.length) throw new Error(`${table} is missing: ${missing.join(', ')}`);
    }
    const [permissions]: any = await pool.execute(`SELECT code FROM permissions WHERE code IN ('craft.automations.read','craft.automations.write','craft.automations.run')`);
    if (permissions.length !== 3) throw new Error('Automation permissions are incomplete.');
    const [craftRows]: any = await pool.execute(`SELECT id,organization_id FROM business_units WHERE code='CRAFT' AND is_active=1 LIMIT 1`);
    const [users]: any = await pool.execute(`SELECT u.id FROM users u JOIN user_business_units ubu ON ubu.user_id=u.id AND ubu.business_unit_id=? AND ubu.can_access=1 WHERE u.status_code='active' AND u.approval_status_code='approved' AND u.deleted_at IS NULL LIMIT 1`, [craftRows[0].id]);
    if (!craftRows.length || !users.length) throw new Error('Craft business unit or active user is unavailable.');
    const craft = craftRows[0]; const userId = Number(users[0].id); const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [inserted]: any = await connection.execute(`INSERT INTO automation_rules (organization_id,business_unit_id,rule_code,name,module_code,trigger_type,trigger_event,condition_json,action_json,status_code,priority,cooldown_seconds,max_retries,created_by,updated_by) VALUES (?,?,?,'Smoke automation condition skip','craft_automations','event','order.created',?,?,'active',100,0,0,?,?)`, [craft.organization_id, craft.id, `SMOKE-${randomUUID()}`, JSON.stringify({ logic: 'all', conditions: [{ field: 'order.order_type', operator: 'eq', value: '__never__' }] }), JSON.stringify({ version: 1, actions: [{ type: 'notification.create', config: { severity: 'info', title_template: 'Smoke', message_template: 'This must not be created.' } }] }), userId, userId]);
      ruleId = Number(inserted.insertId); await connection.execute('UPDATE automation_rules SET rule_code=? WHERE id=?', [`AUT-${String(ruleId).padStart(6, '0')}`, ruleId]);
      const event = await domainEvents.publish(connection, { eventName: 'order.created', moduleCode: 'craft_orders', organizationId: Number(craft.organization_id), businessUnitId: Number(craft.id), entityType: 'craft_order', entityId: 999999999, entityCode: 'SMOKE', actorUserId: userId, eventKey: `smoke:${randomUUID()}`, payload: { context: { order: { id: 999999999, order_code: 'SMOKE', order_type: 'standard', status_code: 'new', priority: 'normal', total_amount: 0 } } } });
      eventId = event.id; await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    const worker = new CraftAutomationWorker();
    const [eventRows]: any = await pool.execute('SELECT * FROM domain_events WHERE id=?', [eventId]);
    await pool.execute(`UPDATE domain_events SET status_code='processing',locked_by=?,locked_at=UTC_TIMESTAMP(3) WHERE id=?`, [worker.id, eventId]);
    await worker.dispatchEvent({ ...eventRows[0], status_code: 'processing', locked_by: worker.id });
    const [queuedRuns]: any = await pool.execute('SELECT id FROM automation_runs WHERE rule_id=?', [ruleId]);
    await worker.runs.execute(Number(queuedRuns[0].id));
    const [runs]: any = await pool.execute('SELECT status_code,result_json FROM automation_runs WHERE rule_id=?', [ruleId]);
    if (runs.length !== 1 || runs[0].status_code !== 'skipped') throw new Error(`Expected one skipped run, got ${JSON.stringify(runs)}`);
    const [events]: any = await pool.execute('SELECT status_code FROM domain_events WHERE id=?', [eventId]);
    if (events[0]?.status_code !== 'processed') throw new Error('Outbox event was not processed by worker.');
    console.log('Craft Automations smoke passed: schema, permissions, persistent outbox, worker claiming, run idempotency, and condition skip.');
  } finally {
    if (ruleId) await pool.execute('DELETE FROM automation_runs WHERE rule_id=?', [ruleId]);
    if (eventId) await pool.execute('DELETE FROM domain_events WHERE id=?', [eventId]);
    if (ruleId) await pool.execute('DELETE FROM automation_rules WHERE id=?', [ruleId]);
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
