import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { automationActionRegistry } from '../../shared/automation/automation-action-registry';
import { automationEventRegistry } from '../../shared/automation/automation-event-registry';
import { organizationBusinessDate, organizationDayStartUtc } from '../../shared/time/organization-time';
import { getBusinessUnitByCodeForOrganization } from '../../shared/utils/business-unit';
import { AutomationRuleService } from '../../shared/automation/automation-rule.service';
import { CraftAutomationsService } from '../craft-automations/craft-automations.service';
import { StudioAutomationsService } from '../studio-automations/studio-automations.service';
import type { AutomationActor, AutomationCapability, AutomationWorkspace } from './automations.types';
import { workspaceCode, workspacePermission } from './automations.types';

type Page = { page: number; limit: number; total: number; total_pages: number };
const workspaces: AutomationWorkspace[] = ['craft', 'studio'];
const safeNumber = (value: unknown, fallback: number) => Number.isInteger(Number(value)) ? Number(value) : fallback;
const boundedPage = (filters: Record<string, unknown>) => ({ page: Math.max(1, safeNumber(filters.page, 1)), limit: Math.min(100, Math.max(1, safeNumber(filters.limit, 25))) });
const pageResult = <T>(items: T[], total: number, page: number, limit: number): Page & { items: T[] } => ({ items, page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) });

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return '[ringkasan dibatasi]';
  if (typeof value === 'string') return value.length > 8_000 ? `${value.slice(0, 8_000)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const next = /password|token|secret|authorization|credential/i.test(key) ? '[disamarkan]' : sanitize(item, depth + 1);
      return [key, next] as const;
    });
    return Object.fromEntries(entries);
  }
  return value;
};

export class GlobalAutomationsService {
  private craft = new CraftAutomationsService();
  private studio = new StudioAutomationsService();

  private async organizationTimezone(organizationId: number) {
    const [rows]: any = await pool.execute('SELECT timezone FROM organizations WHERE id=? LIMIT 1', [organizationId]);
    return String(rows[0]?.timezone || 'Asia/Jakarta');
  }

  async capabilities(actor: AutomationActor): Promise<Record<AutomationWorkspace, AutomationCapability>> {
    const entries = await Promise.all(workspaces.map(async workspace => {
      const code = workspaceCode(workspace);
      const unit = await getBusinessUnitByCodeForOrganization(Number(actor.organization_id), code).catch(() => null);
      let accessible = false;
      if (unit) {
        const [access]: any = await pool.execute('SELECT 1 FROM user_business_units WHERE user_id=? AND business_unit_id=? AND can_access=1 LIMIT 1', [actor.id, unit.id]);
        accessible = access.length > 0;
      }
      const permissions = Array.isArray(actor.permissions) ? actor.permissions : [];
      return [workspace, {
        accessible,
        read: accessible && permissions.includes(workspacePermission(workspace, 'read')),
        write: accessible && permissions.includes(workspacePermission(workspace, 'write')),
        run: accessible && permissions.includes(workspacePermission(workspace, 'run')),
        businessUnitId: unit?.id || null,
        label: workspace === 'craft' ? 'Uni-Inside Craft' : 'Uni-Inside Studio',
      }] as const;
    }));
    return Object.fromEntries(entries) as Record<AutomationWorkspace, AutomationCapability>;
  }

  async meta(actor: AutomationActor) {
    const [capabilities, timezone] = await Promise.all([this.capabilities(actor), this.organizationTimezone(actor.organization_id)]);
    return { capabilities, timezone, workspaces: workspaces.filter(workspace => capabilities[workspace].read) };
  }

  private async requireWorkspace(actor: AutomationActor, workspace: AutomationWorkspace, operation: 'read' | 'write' | 'run') {
    const capabilities = await this.capabilities(actor);
    const capability = capabilities[workspace];
    if (!capability?.accessible || !capability[operation]) throw new AppError(403, 'AUTOMATION_WORKSPACE_FORBIDDEN', 'Anda tidak memiliki akses otomasi pada workspace ini.');
    if (!capability.businessUnitId) throw new AppError(404, 'AUTOMATION_WORKSPACE_NOT_FOUND', 'Workspace otomasi tidak ditemukan.');
    return capability;
  }

  private async readableScopes(actor: AutomationActor, requested?: unknown) {
    const caps = await this.capabilities(actor);
    const selected = requested && requested !== 'all' ? [String(requested) as AutomationWorkspace] : workspaces;
    if (selected.some(workspace => !workspaces.includes(workspace))) throw new AppError(400, 'AUTOMATION_WORKSPACE_INVALID', 'Workspace otomasi tidak valid.');
    const scopes = selected.filter(workspace => caps[workspace].read).map(workspace => ({ workspace, businessUnitId: caps[workspace].businessUnitId! }));
    if (!scopes.length) throw new AppError(403, 'AUTOMATION_WORKSPACE_FORBIDDEN', 'Tidak ada workspace otomasi yang dapat dilihat.');
    return scopes;
  }

  private services(workspace: AutomationWorkspace): AutomationRuleService { return workspace === 'craft' ? this.craft.rules : this.studio.rules; }
  private workspaceOf(code: string): AutomationWorkspace { return code.toLowerCase() === 'craft' ? 'craft' : 'studio'; }
  private ids(scopes: Array<{ businessUnitId: number }>) { return scopes.map(scope => scope.businessUnitId); }
  private placeholders(ids: number[]) { return ids.map(() => '?').join(','); }

  private ruleWhere(actor: AutomationActor, scopes: Array<{ businessUnitId: number }>, filters: Record<string, unknown>) {
    const ids = this.ids(scopes); const where = [`r.organization_id=?`, `r.business_unit_id IN (${this.placeholders(ids)})`]; const params: unknown[] = [actor.organization_id, ...ids];
    if (filters.status) { where.push('r.status_code=?'); params.push(String(filters.status)); }
    if (filters.module) { where.push('r.module_code=?'); params.push(String(filters.module)); }
    if (filters.trigger) { where.push('r.trigger_event=?'); params.push(String(filters.trigger)); }
    if (filters.trigger_type) { where.push('r.trigger_type=?'); params.push(String(filters.trigger_type)); }
    if (filters.search) { where.push('(r.rule_code LIKE ? OR r.name LIKE ? OR r.description LIKE ?)'); params.push(...Array(3).fill(`%${String(filters.search).slice(0, 120)}%`)); }
    return { where, params };
  }

  async overview(actor: AutomationActor, filters: Record<string, unknown>) {
    const [scopes, timezone] = await Promise.all([this.readableScopes(actor, filters.workspace), this.organizationTimezone(actor.organization_id)]);
    const ids = this.ids(scopes); const markers = this.placeholders(ids); const date = organizationBusinessDate(new Date(), timezone); const start = organizationDayStartUtc(date, timezone); const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const [summaryRows, healthRows, recentRuns, upcomingRows]: any = await Promise.all([
      pool.execute(`SELECT bu.code workspace, SUM(r.status_code='active') active_rules, SUM(r.status_code='paused') paused_rules, COUNT(*) rules_total FROM automation_rules r JOIN business_units bu ON bu.id=r.business_unit_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) GROUP BY bu.code`, [actor.organization_id, ...ids]).then(([rows]: any) => rows),
      pool.execute(`SELECT
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND ar.started_at>=? AND ar.started_at<?) runs_today,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND ar.started_at>=? AND ar.started_at<? AND ar.status_code='success') success_today,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND ar.started_at>=? AND ar.started_at<? AND ar.status_code='failed') failed_today,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND ar.status_code='queued') queued_runs,
        (SELECT COUNT(*) FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND ar.status_code='running') running_runs,
        (SELECT COUNT(*) FROM domain_events WHERE organization_id=? AND business_unit_id IN (${markers}) AND status_code='pending') pending_events,
        (SELECT COUNT(*) FROM domain_events WHERE organization_id=? AND business_unit_id IN (${markers}) AND status_code='processing') processing_events,
        (SELECT COUNT(*) FROM domain_events WHERE organization_id=? AND business_unit_id IN (${markers}) AND status_code='failed') failed_events,
        (SELECT MIN(created_at) FROM domain_events WHERE organization_id=? AND business_unit_id IN (${markers}) AND status_code='pending') oldest_pending_event,
        (SELECT COUNT(*) FROM automation_rules WHERE organization_id=? AND business_unit_id IN (${markers}) AND status_code='active' AND next_run_at IS NOT NULL AND next_run_at<UTC_TIMESTAMP(3)) overdue_schedules`, [
          actor.organization_id, ...ids, start, end, actor.organization_id, ...ids, start, end, actor.organization_id, ...ids, start, end,
          actor.organization_id, ...ids, actor.organization_id, ...ids, actor.organization_id, ...ids, actor.organization_id, ...ids, actor.organization_id, ...ids, actor.organization_id, ...ids, actor.organization_id, ...ids,
        ]).then(([rows]: any) => rows[0] || {}),
      pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code,LOWER(bu.code) workspace FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id JOIN business_units bu ON bu.id=r.business_unit_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) ORDER BY ar.started_at DESC,ar.id DESC LIMIT 10`, [actor.organization_id, ...ids]).then(([rows]: any) => rows),
      pool.execute(`SELECT r.id,r.rule_code,r.name,r.next_run_at,LOWER(bu.code) workspace FROM automation_rules r JOIN business_units bu ON bu.id=r.business_unit_id WHERE r.organization_id=? AND r.business_unit_id IN (${markers}) AND r.status_code='active' AND r.next_run_at IS NOT NULL ORDER BY r.next_run_at ASC LIMIT 8`, [actor.organization_id, ...ids]).then(([rows]: any) => rows),
    ]);
    const summary = summaryRows.reduce((all: any, row: any) => ({ ...all, [String(row.workspace).toLowerCase()]: { active_rules: Number(row.active_rules || 0), paused_rules: Number(row.paused_rules || 0), rules_total: Number(row.rules_total || 0) } }), {});
    const oldest = healthRows.oldest_pending_event ? Date.now() - new Date(healthRows.oldest_pending_event).getTime() : 0;
    const critical = Number(healthRows.failed_events || 0) > 0 || Number(healthRows.running_runs || 0) > 0 || Number(healthRows.overdue_schedules || 0) > 0;
    const warning = oldest > 5 * 60_000 || Number(healthRows.queued_runs || 0) > 20;
    return {
      workspace_summary: summary,
      metrics: Object.fromEntries(['runs_today', 'success_today', 'failed_today', 'queued_runs', 'running_runs', 'pending_events', 'processing_events', 'failed_events', 'overdue_schedules'].map(key => [key, Number(healthRows[key] || 0)])),
      queue_health: { level: critical ? 'critical' : warning ? 'warning' : 'healthy', label: critical ? 'Perlu perhatian' : warning ? 'Perlu dipantau' : 'Normal', oldest_pending_event: healthRows.oldest_pending_event || null, recent_activity_at: recentRuns[0]?.started_at || null, note: 'Kesehatan antrean dihitung dari data tersimpan; bukan status proses worker langsung.' },
      recent_runs: recentRuns.map((row: any) => sanitize(row)), upcoming_schedules: upcomingRows.map((row: any) => sanitize(row)), timezone,
    };
  }

  async catalog(actor: AutomationActor, filters: Record<string, unknown>) {
    const scopes = await this.readableScopes(actor, filters.workspace);
    return scopes.map(({ workspace }) => {
      const code = workspaceCode(workspace);
      return { workspace, triggers: automationEventRegistry.all(code), actions: automationActionRegistry.all(code), operators: ['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'is_null', 'not_null', 'before', 'after', 'within_hours', 'changed_from', 'changed_to'] };
    });
  }

  async templates(actor: AutomationActor, filters: Record<string, unknown>) {
    const scopes = await this.readableScopes(actor, filters.workspace);
    return scopes.flatMap(({ workspace }) => this.services(workspace).templates.list().map(template => ({ ...template, workspace, actions: template.rule.action_json.actions.map((action: any) => automationActionRegistry.get(action.type)).filter(Boolean) })));
  }

  async rules(actor: AutomationActor, filters: Record<string, unknown>) {
    const scopes = await this.readableScopes(actor, filters.workspace); const { page, limit } = boundedPage(filters); const { where, params } = this.ruleWhere(actor, scopes, filters);
    const select = `SELECT r.*,LOWER(bu.code) workspace,(SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id) total_runs,(SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id AND ar.status_code='success') success_runs,(SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id AND ar.status_code='failed') failed_runs FROM automation_rules r JOIN business_units bu ON bu.id=r.business_unit_id WHERE ${where.join(' AND ')}`;
    // MySQL prepared statements in the deployed driver do not accept LIMIT/OFFSET placeholders.
    // Both values are parsed, integer-bounded server-side before this query is composed.
    const [[countRows], [rows]]: any = await Promise.all([pool.execute(`SELECT COUNT(*) total FROM automation_rules r WHERE ${where.join(' AND ')}`, params as any[]), pool.execute(`${select} ORDER BY r.priority,r.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params as any[])]);
    return pageResult(rows.map((row: any) => sanitize({ ...row, id: Number(row.id), version_no: Number(row.version_no), is_system: Boolean(row.is_system), action_json: typeof row.action_json === 'string' ? JSON.parse(row.action_json) : row.action_json, condition_json: typeof row.condition_json === 'string' ? JSON.parse(row.condition_json) : row.condition_json, trigger_config_json: typeof row.trigger_config_json === 'string' ? JSON.parse(row.trigger_config_json) : row.trigger_config_json })), Number(countRows[0]?.total || 0), page, limit);
  }

  private async ruleFor(actor: AutomationActor, id: number, operation: 'read' | 'write' | 'run') {
    const [rows]: any = await pool.execute(`SELECT r.*,LOWER(bu.code) workspace FROM automation_rules r JOIN business_units bu ON bu.id=r.business_unit_id WHERE r.id=? AND r.organization_id=? LIMIT 1`, [id, actor.organization_id]);
    if (!rows.length) throw new NotFoundError('Aturan otomasi tidak ditemukan.');
    const row = rows[0]; const workspace = this.workspaceOf(row.workspace);
    const capability = await this.requireWorkspace(actor, workspace, operation);
    if (capability.businessUnitId !== Number(row.business_unit_id)) throw new AppError(403, 'AUTOMATION_WORKSPACE_FORBIDDEN', 'Aturan tidak berada pada workspace yang diizinkan.');
    return { ...row, id: Number(row.id), workspace, businessUnitId: Number(row.business_unit_id) };
  }

  async rule(actor: AutomationActor, id: number) { const rule = await this.ruleFor(actor, id, 'read'); return sanitize({ ...rule, action_json: typeof rule.action_json === 'string' ? JSON.parse(rule.action_json) : rule.action_json, condition_json: typeof rule.condition_json === 'string' ? JSON.parse(rule.condition_json) : rule.condition_json, trigger_config_json: typeof rule.trigger_config_json === 'string' ? JSON.parse(rule.trigger_config_json) : rule.trigger_config_json }); }

  async create(actor: AutomationActor, workspace: AutomationWorkspace, payload: any) {
    const cap = await this.requireWorkspace(actor, workspace, 'write'); const timezone = await this.organizationTimezone(actor.organization_id);
    const value = { ...payload, status_code: 'draft', schedule_timezone: payload.schedule_timezone || (['schedule', 'sensor'].includes(payload.trigger_type) ? timezone : null) };
    if (value.trigger_config_json?.schedule && !value.trigger_config_json.schedule.timezone) value.trigger_config_json.schedule.timezone = value.schedule_timezone;
    return this.services(workspace).create(value, { id: actor.id, permissions: actor.permissions }, { organizationId: actor.organization_id, businessUnitId: cap.businessUnitId! });
  }

  async update(actor: AutomationActor, id: number, payload: any) {
    const rule = await this.ruleFor(actor, id, 'write');
    if (!Number.isInteger(Number(payload.expected_version))) throw new AppError(400, 'AUTOMATION_VERSION_REQUIRED', 'Versi aturan diperlukan untuk menyimpan perubahan.');
    return this.services(rule.workspace).update(id, payload, { id: actor.id, permissions: actor.permissions }, { organizationId: actor.organization_id, businessUnitId: rule.businessUnitId });
  }

  async status(actor: AutomationActor, id: number, action: 'activate' | 'pause' | 'resume' | 'disable') {
    const rule = await this.ruleFor(actor, id, 'write'); const service = this.services(rule.workspace); const context = { organizationId: actor.organization_id, businessUnitId: rule.businessUnitId }; const principal = { id: actor.id, permissions: actor.permissions };
    return action === 'activate' ? service.activate(id, principal, context) : action === 'pause' ? service.pause(id, principal, context) : action === 'resume' ? service.resume(id, principal, context) : service.disable(id, principal, context);
  }

  async duplicate(actor: AutomationActor, id: number) { const rule = await this.ruleFor(actor, id, 'write'); return this.services(rule.workspace).duplicate(id, { id: actor.id, permissions: actor.permissions }, { organizationId: actor.organization_id, businessUnitId: rule.businessUnitId }); }
  async test(actor: AutomationActor, id: number, payload: any) { const rule = await this.ruleFor(actor, id, 'run'); return this.services(rule.workspace).test(id, payload, rule.businessUnitId, actor.organization_id); }
  async run(actor: AutomationActor, id: number, payload: any) { const rule = await this.ruleFor(actor, id, 'run'); return (rule.workspace === 'craft' ? this.craft : this.studio).queueManualRun(id, payload, { id: actor.id, permissions: actor.permissions }, { organizationId: actor.organization_id, businessUnitId: rule.businessUnitId }); }
  async useTemplate(actor: AutomationActor, workspace: AutomationWorkspace, code: string) { const cap = await this.requireWorkspace(actor, workspace, 'write'); return this.services(workspace).useTemplate(code, { id: actor.id, permissions: actor.permissions }, { organizationId: actor.organization_id, businessUnitId: cap.businessUnitId! }); }

  async runs(actor: AutomationActor, filters: Record<string, unknown>) {
    const scopes = await this.readableScopes(actor, filters.workspace); const ids = this.ids(scopes); const { page, limit } = boundedPage(filters); const where = ['r.organization_id=?', `r.business_unit_id IN (${this.placeholders(ids)})`]; const params: unknown[] = [actor.organization_id, ...ids];
    if (filters.status) { where.push('ar.status_code=?'); params.push(String(filters.status)); } if (filters.rule_id) { where.push('ar.rule_id=?'); params.push(Number(filters.rule_id)); } if (filters.module) { where.push('r.module_code=?'); params.push(String(filters.module)); } if (filters.trigger) { where.push('ar.trigger_event=?'); params.push(String(filters.trigger)); }
    if (filters.from) { where.push('ar.started_at>=?'); params.push(String(filters.from)); } if (filters.to) { where.push('ar.started_at<?'); params.push(String(filters.to)); }
    if (filters.search) { where.push('(r.rule_code LIKE ? OR r.name LIKE ? OR ar.correlation_id LIKE ?)'); params.push(...Array(3).fill(`%${String(filters.search).slice(0, 120)}%`)); }
    const clause = where.join(' AND '); const [[countRows], [rows]]: any = await Promise.all([pool.execute(`SELECT COUNT(*) total FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE ${clause}`, params as any[]), pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code,LOWER(bu.code) workspace FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id JOIN business_units bu ON bu.id=r.business_unit_id WHERE ${clause} ORDER BY ar.started_at DESC,ar.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params as any[])]);
    return pageResult(rows.map((row: any) => sanitize(row)), Number(countRows[0]?.total || 0), page, limit);
  }

  async runDetail(actor: AutomationActor, id: number) {
    const [rows]: any = await pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code,LOWER(bu.code) workspace,r.business_unit_id FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id JOIN business_units bu ON bu.id=r.business_unit_id WHERE ar.id=? AND r.organization_id=? LIMIT 1`, [id, actor.organization_id]);
    if (!rows.length) throw new NotFoundError('Riwayat eksekusi tidak ditemukan.'); const row = rows[0]; const workspace = this.workspaceOf(row.workspace); const cap = await this.requireWorkspace(actor, workspace, 'read'); if (cap.businessUnitId !== Number(row.business_unit_id)) throw new AppError(403, 'AUTOMATION_WORKSPACE_FORBIDDEN', 'Run tidak berada pada workspace yang diizinkan.');
    return sanitize({ ...row, workspace, input_json: typeof row.input_json === 'string' ? JSON.parse(row.input_json) : row.input_json, rule_snapshot_json: typeof row.rule_snapshot_json === 'string' ? JSON.parse(row.rule_snapshot_json) : row.rule_snapshot_json, result_json: typeof row.result_json === 'string' ? JSON.parse(row.result_json) : row.result_json });
  }

  async events(actor: AutomationActor, filters: Record<string, unknown>) {
    const scopes = await this.readableScopes(actor, filters.workspace); const ids = this.ids(scopes); const { page, limit } = boundedPage(filters); const where = ['e.organization_id=?', `e.business_unit_id IN (${this.placeholders(ids)})`]; const params: unknown[] = [actor.organization_id, ...ids];
    if (filters.status) { where.push('e.status_code=?'); params.push(String(filters.status)); } if (filters.module) { where.push('e.module_code=?'); params.push(String(filters.module)); } if (filters.event) { where.push('e.event_name=?'); params.push(String(filters.event)); } if (filters.search) { where.push('(e.event_name LIKE ? OR e.entity_code LIKE ? OR e.correlation_id LIKE ?)'); params.push(...Array(3).fill(`%${String(filters.search).slice(0, 120)}%`)); }
    const clause = where.join(' AND '); const [[countRows], [rows]]: any = await Promise.all([pool.execute(`SELECT COUNT(*) total FROM domain_events e WHERE ${clause}`, params as any[]), pool.execute(`SELECT e.id,e.event_name,e.module_code,e.entity_type,e.entity_id,e.entity_code,e.correlation_id,e.chain_depth,e.status_code,e.attempt_count,e.available_at,e.locked_at,e.processed_at,e.last_error,e.created_at,LOWER(bu.code) workspace FROM domain_events e JOIN business_units bu ON bu.id=e.business_unit_id WHERE ${clause} ORDER BY e.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params as any[])]);
    return pageResult(rows.map((row: any) => sanitize(row)), Number(countRows[0]?.total || 0), page, limit);
  }
}

export const globalAutomationsService = new GlobalAutomationsService();
