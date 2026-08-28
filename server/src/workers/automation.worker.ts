import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import { sanitizeAutomationError } from '../shared/automation/automation-errors';
import { automationScheduleService } from '../shared/automation/automation-schedule.service';
import { automationSensorService } from '../shared/automation/automation-sensor.service';
import { normalizeRule } from '../shared/automation/automation-repository';
import { AutomationRunService } from '../shared/automation/automation-run.service';

const limit = (value: number) => Math.max(1, Math.min(value, 50));
const ruleSnapshot = (rule: any) => ({ version: rule.version_no, trigger: { type: rule.trigger_type, event: rule.trigger_event, config: rule.trigger_config_json, timezone: rule.schedule_timezone }, conditions: rule.condition_json, actions: rule.action_json, reliability: { cooldown_seconds: Number(rule.cooldown_seconds || 0), max_retries: Number(rule.max_retries || 0), priority: Number(rule.priority || 100) } });

/** The only worker that claims the shared outbox and shared automation run queue. */
export class AutomationWorker {
  readonly id = `automation-${process.pid}-${randomUUID().slice(0, 8)}`;
  readonly runs = new AutomationRunService();

  async recoverStaleLocks() {
    await Promise.all([
      pool.execute(`UPDATE domain_events SET status_code=IF(attempt_count>=5,'failed','pending'),locked_at=NULL,locked_by=NULL,attempt_count=attempt_count+1,last_error=IF(attempt_count>=5,'Event lock became stale too many times.',last_error) WHERE status_code='processing' AND locked_at<DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE)`),
      pool.execute(`UPDATE automation_runs SET status_code='queued',next_attempt_at=UTC_TIMESTAMP(3),error_message='Recovered stale automation run.' WHERE status_code='running' AND started_at<DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE)`),
    ]);
  }

  async claimEvents(batchSize = 10) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(`SELECT * FROM domain_events WHERE status_code='pending' AND available_at<=UTC_TIMESTAMP(3) ORDER BY id LIMIT ${limit(batchSize)} FOR UPDATE SKIP LOCKED`);
      const ids = rows.map((row: any) => Number(row.id));
      if (ids.length) await connection.execute(`UPDATE domain_events SET status_code='processing',locked_at=UTC_TIMESTAMP(3),locked_by=? WHERE id IN (${ids.map(() => '?').join(',')})`, [this.id, ...ids]);
      await connection.commit(); return rows;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async dispatchEvent(event: any) {
    try {
      const [rules]: any = await pool.execute(`SELECT * FROM automation_rules WHERE business_unit_id=? AND trigger_type='event' AND trigger_event=? AND status_code='active' ORDER BY priority,id`, [event.business_unit_id, event.event_name]);
      for (const item of rules) await this.runs.queueFromEvent(normalizeRule(item), event);
      await pool.execute(`UPDATE domain_events SET status_code='processed',processed_at=UTC_TIMESTAMP(3),locked_at=NULL,locked_by=NULL,last_error=NULL WHERE id=? AND status_code='processing' AND locked_by=?`, [event.id, this.id]);
    } catch (error) {
      await pool.execute(`UPDATE domain_events SET status_code=IF(attempt_count>=4,'failed','pending'),available_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 MINUTE),locked_at=NULL,locked_by=NULL,attempt_count=attempt_count+1,last_error=? WHERE id=? AND locked_by=?`, [sanitizeAutomationError(error), event.id, this.id]);
    }
  }

  async claimDueSchedules(batchSize = 10) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(`SELECT * FROM automation_rules WHERE status_code='active' AND trigger_type IN ('schedule','sensor') AND next_run_at IS NOT NULL AND next_run_at<=UTC_TIMESTAMP(3) ORDER BY next_run_at,id LIMIT ${limit(batchSize)} FOR UPDATE SKIP LOCKED`);
      for (const row of rows) {
        const rule = normalizeRule(row); const scheduledFor = new Date(row.next_run_at); const next = automationScheduleService.nextRun(rule.trigger_config_json, rule.schedule_timezone, scheduledFor);
        await connection.execute('UPDATE automation_rules SET next_run_at=? WHERE id=?', [next, rule.id]);
        const candidates = rule.trigger_type === 'sensor' ? await automationSensorService.candidates(rule.trigger_event, Number(rule.business_unit_id), connection) : [{ entityType: null, entityId: null, entityCode: null, context: {} }];
        for (const candidate of candidates) {
          const identifier = candidate.entityId || 'schedule'; const runKey = `${rule.id}:${rule.trigger_type}:${identifier}:${scheduledFor.toISOString()}`;
          await connection.execute(`INSERT IGNORE INTO automation_runs (rule_id,run_key,rule_version,trigger_event,trigger_entity_type,trigger_entity_id,scheduled_for,initiated_by,attempt_no,next_attempt_at,correlation_id,chain_depth,status_code,input_json,rule_snapshot_json) VALUES (?,?,?,?,?,?,?,NULL,1,UTC_TIMESTAMP(3),?,0,'queued',?,?)`, [rule.id, runKey, rule.version_no, rule.trigger_event, candidate.entityType, candidate.entityId, scheduledFor, randomUUID(), JSON.stringify(candidate.context), JSON.stringify(ruleSnapshot(rule))]);
        }
      }
      await connection.commit(); return rows.length;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async processRuns(batchSize = 10) { const ids = await this.runs.claim(limit(batchSize), this.id); for (const id of ids) await this.runs.execute(id); return ids.length; }
  async processOnce() { await this.recoverStaleLocks(); const events = await this.claimEvents(); for (const event of events) await this.dispatchEvent(event); const schedules = await this.claimDueSchedules(); const runs = await this.processRuns(); return { events: events.length, schedules, runs }; }
}

if (require.main === module) {
  const worker = new AutomationWorker(); let stopping = false;
  const stop = () => { stopping = true; };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  (async () => {
    console.log(`[automation] worker ${worker.id} started`);
    while (!stopping) {
      try { await worker.processOnce(); } catch (error) { console.error('[automation] cycle failed:', sanitizeAutomationError(error)); }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await pool.end();
  })().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
}
