import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { automationActionRegistry } from '../../shared/automation/automation-action-registry';
import { automationOperators } from '../../shared/automation/automation-condition-engine';
import { domainEventContext } from '../../shared/automation/automation-context';
import { automationEventRegistry } from '../../shared/automation/automation-event-registry';
import type { AutomationActor } from './craft-automations.types';
import { AutomationRunService } from './automation-run.service';
import { AutomationRuleService } from './automation-rule.service';

export class CraftAutomationsService {
  readonly rules = new AutomationRuleService();
  readonly runs = new AutomationRunService();

  async overview(businessUnitId: number) {
    const [summaryRows, recent, healthRows]: any = await Promise.all([
      pool.execute(`SELECT
        SUM(status_code='active') active_rules,SUM(status_code='paused') paused_rules
       FROM automation_rules WHERE business_unit_id=?`, [businessUnitId]).then(([rows]: any) => rows),
      pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? ORDER BY ar.started_at DESC LIMIT 10`, [businessUnitId]).then(([rows]: any) => rows),
      pool.execute(`SELECT
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? AND DATE(ar.started_at)=UTC_DATE()) runs_today,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? AND DATE(ar.started_at)=UTC_DATE() AND ar.status_code='failed') failed_today,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? AND DATE(ar.started_at)=UTC_DATE() AND ar.status_code='success') success_today,
        (SELECT COUNT(*) FROM domain_events WHERE business_unit_id=? AND status_code='pending') pending_events,
        (SELECT MIN(created_at) FROM domain_events WHERE business_unit_id=? AND status_code='pending') oldest_pending_event,
        (SELECT MAX(started_at) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=?) last_run,
        (SELECT MAX(finished_at) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? AND ar.status_code='success') last_success,
        (SELECT MAX(finished_at) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.business_unit_id=? AND ar.status_code='failed') last_failure`, [businessUnitId, businessUnitId, businessUnitId, businessUnitId, businessUnitId, businessUnitId, businessUnitId, businessUnitId]).then(([rows]: any) => rows),
    ]);
    const summary = summaryRows[0] || {}; const health = healthRows[0] || {}; const success = Number(health.success_today || 0); const failed = Number(health.failed_today || 0);
    return { active_rules: Number(summary.active_rules || 0), paused_rules: Number(summary.paused_rules || 0), runs_today: Number(health.runs_today || 0), success_rate: success + failed ? Number((success / (success + failed) * 100).toFixed(1)) : null, failed_today: failed, pending_events: Number(health.pending_events || 0), health: { last_run: health.last_run || null, last_success: health.last_success || null, last_failure: health.last_failure || null, oldest_pending_event: health.oldest_pending_event || null, worker_warning: health.oldest_pending_event ? 'Event pending terdeteksi; worker mungkin tidak berjalan.' : null }, recent_runs: recent };
  }

  async catalog(businessUnitCode: 'CRAFT' | 'STUDIO' = 'CRAFT') {
    const triggers = automationEventRegistry.all(businessUnitCode);
    const actions = automationActionRegistry.all(businessUnitCode);
    return { triggers, actions, operators: automationOperators, modules: [...new Set(triggers.map((event) => event.module).concat(actions.map((action) => action.module)))] };
  }

  async queueManualRun(ruleId: number, body: { event_id?: number; input?: Record<string, unknown> }, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) {
    const rule = await this.rules.get(ruleId, context.businessUnitId);
    if (rule.status_code !== 'active') throw new AppError(409, 'RULE_NOT_ACTIVE', 'Hanya aturan aktif yang dapat dijalankan.');
    const businessUnitCode = context.businessUnitId === (await (await import('../studio-projects/studio-projects.helpers')).getStudioBusinessUnit()).id ? 'STUDIO' : 'CRAFT';
    const required = automationActionRegistry.requiredPermissions(rule.action_json.actions, businessUnitCode);
    const missing = required.filter((permission) => !actor.permissions.includes(permission));
    if (missing.length) throw new AppError(403, 'AUTOMATION_ACTION_PERMISSION_REQUIRED', 'Izin aksi otomasi belum lengkap.', { missing_permissions: missing });
    let input = body.input || {}; let event: any = null;
    if (body.event_id) {
      const [events]: any = await pool.execute('SELECT * FROM domain_events WHERE id=? AND business_unit_id=?', [body.event_id, context.businessUnitId]);
      if (!events.length) throw new NotFoundError('Event domain tidak ditemukan.');
      event = events[0]; input = { ...domainEventContext(event), ...input, _automation_event_id: Number(event.id) };
    }
    const queued = await this.runs.queue(rule, { runKey: `${rule.id}:manual:${randomUUID()}`, triggerEvent: rule.trigger_event, entityType: event?.entity_type || null, entityId: event?.entity_id ? Number(event.entity_id) : null, initiatedBy: actor.id, correlationId: event?.correlation_id || randomUUID(), chainDepth: Number(event?.chain_depth || 0), input });
    return { ...queued, message: 'Eksekusi manual telah masuk antrean worker.' };
  }
}
