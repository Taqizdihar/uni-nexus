import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { domainEvents } from '../src/shared/automation/domain-event-outbox.service';
import { automationActionRegistry } from '../src/shared/automation/automation-action-registry';
import { automationEventRegistry } from '../src/shared/automation/automation-event-registry';
import { AutomationWorker } from '../src/workers/automation.worker';

async function main() {
  let ruleId: number | null = null; let eventId: number | null = null;
  try {
    const [permissions]: any = await pool.execute(`SELECT code FROM permissions WHERE code IN ('studio.automations.read','studio.automations.write','studio.automations.run')`);
    if (permissions.length !== 3) throw new Error('Studio Automation permissions are incomplete.');
    if (automationActionRegistry.all('STUDIO').some(action => action.scope === 'craft') || automationEventRegistry.all('STUDIO').some(event => event.scope === 'craft')) throw new Error('Craft catalog entry leaked into Studio catalog.');
    const [studioRows]: any = await pool.execute(`SELECT id,organization_id FROM business_units WHERE code='STUDIO' AND is_active=1 LIMIT 1`);
    if (!studioRows.length) throw new Error('Studio business unit is unavailable.');
    const studio = studioRows[0];
    const [users]: any = await pool.execute(`SELECT DISTINCT u.id FROM users u JOIN user_business_units ubu ON ubu.user_id=u.id AND ubu.business_unit_id=? AND ubu.can_access=1 JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.status_code='active' AND u.approval_status_code='approved' AND u.deleted_at IS NULL AND p.code='studio.automations.write' LIMIT 1`, [studio.id]);
    if (!users.length) throw new Error('No active Studio Automation writer is available.');
    const userId = Number(users[0].id);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [inserted]: any = await connection.execute(`INSERT INTO automation_rules (organization_id,business_unit_id,rule_code,name,module_code,trigger_type,trigger_event,condition_json,action_json,status_code,priority,cooldown_seconds,max_retries,created_by,updated_by) VALUES (?,?,?,'Studio Automation smoke condition skip','studio_automations','event','studio.project.created',?,?,'active',100,0,0,?,?)`, [studio.organization_id, studio.id, `SMOKE-${randomUUID()}`, JSON.stringify({ logic: 'all', conditions: [{ field: 'project.status_code', operator: 'eq', value: '__never__' }] }), JSON.stringify({ version: 1, actions: [{ type: 'notification.create', config: { severity: 'info', title_template: 'Smoke', message_template: 'This must not be created.' } }] }), userId, userId]);
      ruleId = Number(inserted.insertId); await connection.execute('UPDATE automation_rules SET rule_code=? WHERE id=?', [`AUT-${String(ruleId).padStart(6, '0')}`, ruleId]);
      const event = await domainEvents.publish(connection, { eventName: 'studio.project.created', moduleCode: 'studio_projects', organizationId: Number(studio.organization_id), businessUnitId: Number(studio.id), entityType: 'studio_project', entityId: 999999999, entityCode: 'SMOKE', actorUserId: userId, eventKey: `studio-automation-smoke:${randomUUID()}`, payload: { context: { project: { id: 999999999, project_code: 'SMOKE', project_name: 'Smoke', status_code: 'lead', priority_code: 'normal', contract_value: 0 } } } });
      eventId = event.id; await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    const worker = new AutomationWorker(); const [eventRows]: any = await pool.execute('SELECT * FROM domain_events WHERE id=?', [eventId]);
    await pool.execute(`UPDATE domain_events SET status_code='processing',locked_by=?,locked_at=UTC_TIMESTAMP(3) WHERE id=?`, [worker.id, eventId]); await worker.dispatchEvent({ ...eventRows[0], status_code: 'processing', locked_by: worker.id });
    const [queued]: any = await pool.execute('SELECT id FROM automation_runs WHERE rule_id=?', [ruleId]); await worker.runs.execute(Number(queued[0].id));
    const [runs]: any = await pool.execute('SELECT status_code,result_json FROM automation_runs WHERE rule_id=?', [ruleId]); if (runs.length !== 1 || runs[0].status_code !== 'skipped') throw new Error(`Expected one skipped Studio run, got ${JSON.stringify(runs)}`);
    const [events]: any = await pool.execute('SELECT status_code FROM domain_events WHERE id=?', [eventId]); if (events[0]?.status_code !== 'processed') throw new Error('Studio outbox event was not processed by unified worker.');
    console.log('Studio Automations smoke passed: permissions, Studio catalog isolation, shared outbox, unified worker, and condition-safe dry execution.');
  } finally {
    if (ruleId) await pool.execute('DELETE FROM automation_runs WHERE rule_id=?', [ruleId]); if (eventId) await pool.execute('DELETE FROM domain_events WHERE id=?', [eventId]); if (ruleId) await pool.execute('DELETE FROM automation_rules WHERE id=?', [ruleId]); await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
