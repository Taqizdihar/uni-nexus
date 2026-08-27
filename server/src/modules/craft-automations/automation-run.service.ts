import { pool } from '../../config/database';
import { automationActionRegistry } from '../../shared/automation/automation-action-registry';
import { automationConditionEngine } from '../../shared/automation/automation-condition-engine';
import { domainEventContext, parseJson } from '../../shared/automation/automation-context';
import { AutomationSkippedError, sanitizeAutomationError } from '../../shared/automation/automation-errors';
import { automationEventRegistry } from '../../shared/automation/automation-event-registry';
import { MAX_AUTOMATION_CHAIN_DEPTH } from '../../shared/automation/domain-event-outbox.service';
import { normalizeRule, normalizeRun } from './craft-automations.repository';

const snapshot = (rule: any) => ({ version: rule.version_no, trigger: { type: rule.trigger_type, event: rule.trigger_event, config: rule.trigger_config_json, timezone: rule.schedule_timezone }, conditions: rule.condition_json, actions: rule.action_json, reliability: { cooldown_seconds: Number(rule.cooldown_seconds || 0), max_retries: Number(rule.max_retries || 0), priority: Number(rule.priority || 100) } });
const retryDelayMinutes = (attempt: number) => [1, 5, 15][Math.min(Math.max(0, attempt - 1), 2)];

export class AutomationRunService {
  async queue(rule: any, details: { runKey: string; triggerEvent?: string | null; entityType?: string | null; entityId?: number | null; scheduledFor?: Date | string | null; initiatedBy?: number | null; correlationId?: string | null; chainDepth?: number; input?: Record<string, unknown> }) {
    const [inserted]: any = await pool.execute(`INSERT IGNORE INTO automation_runs (rule_id,run_key,rule_version,trigger_event,trigger_entity_type,trigger_entity_id,scheduled_for,initiated_by,attempt_no,next_attempt_at,correlation_id,chain_depth,status_code,input_json,rule_snapshot_json) VALUES (?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(3),?,?, 'queued',?,?)`, [rule.id, details.runKey, rule.version_no, details.triggerEvent || rule.trigger_event, details.entityType || null, details.entityId || null, details.scheduledFor || null, details.initiatedBy || null, details.correlationId || null, Number(details.chainDepth || 0), JSON.stringify(details.input || {}), JSON.stringify(snapshot(rule))]);
    const [rows]: any = await pool.execute('SELECT * FROM automation_runs WHERE run_key=? LIMIT 1', [details.runKey]);
    return { created: Boolean(inserted.affectedRows), run: normalizeRun(rows[0]) };
  }

  async queueFromEvent(rule: any, event: any) {
    const input = domainEventContext(event);
    return this.queue(rule, { runKey: `${rule.id}:event:${event.id}`, triggerEvent: event.event_name, entityType: event.entity_type, entityId: event.entity_id === null ? null : Number(event.entity_id), correlationId: event.correlation_id || null, chainDepth: Number(event.chain_depth || 0), input: { ...input, _automation_event_id: Number(event.id) } });
  }

  async claim(batchSize: number, workerId: string) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(`SELECT ar.* FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.status_code IN ('active','paused','disabled') AND ar.status_code='queued' AND (ar.next_attempt_at IS NULL OR ar.next_attempt_at<=UTC_TIMESTAMP(3)) ORDER BY ar.next_attempt_at,ar.id LIMIT ${Math.max(1, Math.min(batchSize, 50))} FOR UPDATE SKIP LOCKED`);
      const ids = rows.map((row: any) => Number(row.id));
      if (ids.length) await connection.execute(`UPDATE automation_runs SET status_code='running',started_at=UTC_TIMESTAMP(3),error_message=NULL WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      await connection.commit(); return ids;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  private async finish(run: any, rule: any, status: 'success' | 'failed' | 'skipped', result: Record<string, unknown>, errorMessage: string | null = null) {
    await pool.execute(`UPDATE automation_runs SET status_code=?,finished_at=UTC_TIMESTAMP(3),result_json=?,error_message=?,next_attempt_at=NULL WHERE id=?`, [status, JSON.stringify(result), errorMessage, run.id]);
    const timestampColumn = status === 'success' ? 'last_success_at' : status === 'failed' ? 'last_failure_at' : null;
    await pool.execute(`UPDATE automation_rules SET last_run_at=UTC_TIMESTAMP(3)${timestampColumn ? `,${timestampColumn}=UTC_TIMESTAMP(3)` : ''} WHERE id=?`, [rule.id]);
  }

  private async retry(run: any, rule: any, result: Record<string, unknown>, error: unknown) {
    const retryAt = new Date(Date.now() + retryDelayMinutes(Number(run.attempt_no || 1)) * 60_000);
    await pool.execute(`UPDATE automation_runs SET status_code='queued',attempt_no=attempt_no+1,next_attempt_at=?,result_json=?,error_message=? WHERE id=?`, [retryAt, JSON.stringify(result), sanitizeAutomationError(error), run.id]);
    await pool.execute('UPDATE automation_rules SET last_run_at=UTC_TIMESTAMP(3),last_failure_at=UTC_TIMESTAMP(3) WHERE id=?', [rule.id]);
  }

  async execute(id: number) {
    const [runRows]: any = await pool.execute('SELECT * FROM automation_runs WHERE id=?', [id]);
    if (!runRows.length) return null;
    const run = normalizeRun(runRows[0]);
    const [ruleRows]: any = await pool.execute('SELECT * FROM automation_rules WHERE id=?', [run.rule_id]);
    if (!ruleRows.length) return null;
    const rule = normalizeRule(ruleRows[0]);
    const ruleSnapshot: any = parseJson(run.rule_snapshot_json, snapshot(rule));
    const actions = ruleSnapshot.actions?.actions || rule.action_json.actions || [];
    const triggerEvent = run.trigger_event || rule.trigger_event;
    const input = parseJson<Record<string, any>>(run.input_json, {});
    const eventId = Number(input._automation_event_id || 0);
    let event: any = null;
    if (eventId) { const [events]: any = await pool.execute('SELECT * FROM domain_events WHERE id=?', [eventId]); event = events[0] || null; }

    if (rule.status_code !== 'active') { await this.finish(run, rule, 'skipped', { reason: 'RULE_NOT_ACTIVE', rule_status: rule.status_code }); return { status: 'skipped' }; }
    if (Number(run.chain_depth || 0) > MAX_AUTOMATION_CHAIN_DEPTH) { await this.finish(run, rule, 'skipped', { reason: 'AUTOMATION_CHAIN_LIMIT', chain_depth: run.chain_depth }); return { status: 'skipped' }; }
    if (Number(rule.cooldown_seconds || 0) > 0 && run.trigger_entity_id) {
      const [recent]: any = await pool.execute(`SELECT id FROM automation_runs WHERE rule_id=? AND trigger_entity_type <=> ? AND trigger_entity_id=? AND status_code='success' AND id<>? AND started_at>=DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND) LIMIT 1`, [rule.id, run.trigger_entity_type || null, run.trigger_entity_id, run.id, Number(rule.cooldown_seconds)]);
      if (recent.length) { await this.finish(run, rule, 'skipped', { reason: 'COOLDOWN_ACTIVE', cooldown_seconds: Number(rule.cooldown_seconds), previous_run_id: Number(recent[0].id) }); return { status: 'skipped' }; }
    }
    const condition = automationEventRegistry.get(triggerEvent) ? automationConditionEngine.evaluate(triggerEvent, ruleSnapshot.conditions || null, input) : { matched: true, evaluations: [] };
    if (!condition.matched) { await this.finish(run, rule, 'skipped', { reason: 'CONDITIONS_NOT_MET', conditions_matched: false, evaluations: condition.evaluations }); return { status: 'skipped' }; }

    const results: any[] = [];
    try {
      for (const action of actions) {
        const definition = automationActionRegistry.get(action.type);
        try {
          const result = await automationActionRegistry.execute(action, { rule, run, event, input, organizationId: Number(rule.organization_id), businessUnitId: Number(rule.business_unit_id), actorUserId: rule.created_by === null ? null : Number(rule.created_by) });
          results.push({ type: action.type, status: result.status || 'success', ...result });
        } catch (error) {
          if (error instanceof AutomationSkippedError) { results.push({ type: action.type, status: 'skipped', reason: error.code, message: error.message }); if (!action.continue_on_error) break; continue; }
          results.push({ type: action.type, status: 'failed', error: sanitizeAutomationError(error) });
          const retrySafe = Boolean(definition?.retrySafe);
          if (!action.continue_on_error) {
            const result = { conditions_matched: true, evaluations: condition.evaluations, actions: results };
            if (retrySafe && Number(run.attempt_no || 1) <= Number(rule.max_retries || 0)) await this.retry(run, rule, result, error);
            else await this.finish(run, rule, 'failed', result, sanitizeAutomationError(error));
            return { status: 'failed' };
          }
        }
      }
      const allSkipped = results.length > 0 && results.every((result) => result.status === 'skipped');
      await this.finish(run, rule, allSkipped ? 'skipped' : 'success', { conditions_matched: true, evaluations: condition.evaluations, actions: results });
      return { status: allSkipped ? 'skipped' : 'success' };
    } catch (error) {
      await this.finish(run, rule, 'failed', { conditions_matched: true, evaluations: condition.evaluations, actions: results }, sanitizeAutomationError(error));
      return { status: 'failed' };
    }
  }
}
