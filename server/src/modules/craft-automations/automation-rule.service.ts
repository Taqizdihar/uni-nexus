import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { automationActionRegistry } from '../../shared/automation/automation-action-registry';
import { automationConditionEngine } from '../../shared/automation/automation-condition-engine';
import { parseJson } from '../../shared/automation/automation-context';
import { automationEventRegistry } from '../../shared/automation/automation-event-registry';
import { automationScheduleService } from '../../shared/automation/automation-schedule.service';
import type { AutomationActor, AutomationRuleInput } from './craft-automations.types';
import { CraftAutomationsRepository } from './craft-automations.repository';
import { AutomationTemplateService } from './automation-template.service';

export interface AutomationRuleServiceOptions {
  businessUnitCode?: 'CRAFT' | 'STUDIO';
  automationPermission?: string;
  templates?: { list(): any[]; get(code: string): any };
}

const requirePermissions = (actor: AutomationActor, permissions: string[]) => {
  const missing = permissions.filter((permission) => !actor.permissions.includes(permission));
  if (missing.length) throw new AppError(403, 'AUTOMATION_ACTION_PERMISSION_REQUIRED', 'Anda tidak memiliki izin untuk mengaktifkan aksi otomasi ini.', { missing_permissions: missing });
};
const moduleFor = (input: AutomationRuleInput, businessUnitCode: 'CRAFT' | 'STUDIO') => automationEventRegistry.get(input.trigger_event, businessUnitCode)?.module || automationActionRegistry.get(input.action_json.actions[0]?.type || '')?.module || `${businessUnitCode.toLowerCase()}_automations`;

export class AutomationRuleService {
  readonly repository = new CraftAutomationsRepository();
  readonly templates: { list(): any[]; get(code: string): any };
  readonly businessUnitCode: 'CRAFT' | 'STUDIO';
  readonly automationPermission: string;

  constructor(options: AutomationRuleServiceOptions = {}) {
    this.businessUnitCode = options.businessUnitCode || 'CRAFT';
    this.automationPermission = options.automationPermission || `${this.businessUnitCode.toLowerCase()}.automations.write`;
    this.templates = options.templates || new AutomationTemplateService();
  }

  private normalize(input: AutomationRuleInput, fallback?: any): AutomationRuleInput {
    return {
      name: input.name ?? fallback?.name,
      description: input.description !== undefined ? input.description : fallback?.description || null,
      trigger_type: input.trigger_type ?? fallback?.trigger_type,
      trigger_event: input.trigger_event ?? fallback?.trigger_event,
      trigger_config_json: input.trigger_config_json !== undefined ? input.trigger_config_json : parseJson(fallback?.trigger_config_json, null),
      schedule_timezone: input.schedule_timezone !== undefined ? input.schedule_timezone : fallback?.schedule_timezone || null,
      condition_json: input.condition_json !== undefined ? input.condition_json : parseJson(fallback?.condition_json, null),
      action_json: input.action_json ?? parseJson(fallback?.action_json, { version: 1, actions: [] }),
      priority: input.priority ?? Number(fallback?.priority ?? 100),
      cooldown_seconds: input.cooldown_seconds ?? Number(fallback?.cooldown_seconds ?? 0),
      max_retries: input.max_retries ?? Number(fallback?.max_retries ?? 0),
      status_code: input.status_code ?? fallback?.status_code ?? 'draft',
    };
  }

  private validate(input: AutomationRuleInput, requireExecutable: boolean) {
    if (!['event', 'schedule', 'sensor', 'manual'].includes(input.trigger_type)) throw new AppError(400, 'AUTOMATION_TRIGGER_INVALID', 'Jenis pemicu tidak valid.');
    if (['event', 'sensor', 'manual'].includes(input.trigger_type) && !automationEventRegistry.get(input.trigger_event, this.businessUnitCode)) throw new AppError(400, 'AUTOMATION_TRIGGER_UNKNOWN', 'Pemicu otomasi tidak terdaftar untuk workspace ini.');
    if (['schedule', 'sensor'].includes(input.trigger_type)) automationScheduleService.scheduleOf(input.trigger_config_json || null, input.schedule_timezone);
    automationActionRegistry.assertAvailable(input.action_json.actions, this.businessUnitCode);
    if (automationEventRegistry.get(input.trigger_event, this.businessUnitCode)) automationConditionEngine.validate(input.trigger_event, input.condition_json || null);
    if (requireExecutable) automationActionRegistry.validate(input.trigger_event, input.action_json.actions, this.businessUnitCode);
  }

  private nextRun(input: AutomationRuleInput) {
    if (input.status_code === 'active' && ['schedule', 'sensor'].includes(input.trigger_type)) return automationScheduleService.nextRun(input.trigger_config_json || null, input.schedule_timezone);
    return null;
  }

  async list(businessUnitId: number, filters: Record<string, unknown>) { return this.repository.listRules(businessUnitId, filters); }
  async get(id: number, businessUnitId: number) { const rule = await this.repository.getRule(id, businessUnitId); if (!rule) throw new NotFoundError('Aturan otomasi tidak ditemukan.'); return rule; }

  async create(input: AutomationRuleInput, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) {
    const normalized = this.normalize(input); const executable = normalized.status_code === 'active';
    this.validate(normalized, executable);
    if (executable) requirePermissions(actor, automationActionRegistry.requiredPermissions(normalized.action_json.actions, this.businessUnitCode));
    return this.repository.createRule(normalized, { ...context, userId: actor.id, moduleCode: moduleFor(normalized, this.businessUnitCode), nextRunAt: this.nextRun(normalized) });
  }

  async update(id: number, patch: Partial<AutomationRuleInput>, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) {
    const existing = await this.get(id, context.businessUnitId); if (existing.is_system) throw new AppError(409, 'SYSTEM_RULE_READ_ONLY', 'Aturan sistem tidak dapat diubah.');
    const normalized = this.normalize(patch as AutomationRuleInput, existing); const executable = normalized.status_code === 'active';
    this.validate(normalized, executable); if (executable) requirePermissions(actor, automationActionRegistry.requiredPermissions(normalized.action_json.actions, this.businessUnitCode));
    return this.repository.updateRule(id, normalized, { ...context, userId: actor.id, moduleCode: moduleFor(normalized, this.businessUnitCode), nextRunAt: this.nextRun(normalized) });
  }

  async activate(id: number, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) {
    const rule = await this.get(id, context.businessUnitId); if (rule.is_system) throw new AppError(409, 'SYSTEM_RULE_READ_ONLY', 'Aturan sistem tidak dapat diaktifkan secara manual.');
    const input = this.normalize(rule, rule); this.validate(input, true); requirePermissions(actor, automationActionRegistry.requiredPermissions(input.action_json.actions, this.businessUnitCode));
    return this.repository.changeStatus(id, 'active', { ...context, userId: actor.id, nextRunAt: this.nextRun({ ...input, status_code: 'active' }) });
  }
  async pause(id: number, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) { await this.get(id, context.businessUnitId); return this.repository.changeStatus(id, 'paused', { ...context, userId: actor.id, nextRunAt: null }); }
  async resume(id: number, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) { return this.activate(id, actor, context); }
  async disable(id: number, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) { await this.get(id, context.businessUnitId); return this.repository.changeStatus(id, 'disabled', { ...context, userId: actor.id, nextRunAt: null }); }
  async duplicate(id: number, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) { await this.get(id, context.businessUnitId); return this.repository.duplicateRule(id, { ...context, userId: actor.id }); }

  async useTemplate(code: string, actor: AutomationActor, context: { organizationId: number; businessUnitId: number }) {
    const template = this.templates.get(code); if (!template) throw new NotFoundError('Template otomasi tidak ditemukan.');
    return this.create({ ...template.rule, name: template.rule.name, status_code: 'draft' }, actor, context);
  }

  async test(id: number, body: { event_id?: number; input?: Record<string, unknown> }, businessUnitId: number) {
    const rule = await this.get(id, businessUnitId); this.validate(this.normalize(rule, rule), rule.status_code === 'active');
    let input = body.input || {};
    if (body.event_id) {
      const [events]: any = await (await import('../../config/database')).pool.execute('SELECT * FROM domain_events WHERE id=? AND business_unit_id=?', [body.event_id, businessUnitId]);
      if (!events.length) throw new NotFoundError('Event domain tidak ditemukan.');
      const event = events[0]; input = parseJson(event.payload_json, {}); if (!input.event) input = { ...input, event: { id: Number(event.id), name: event.event_name, entity_type: event.entity_type, entity_id: event.entity_id } };
    }
    const evaluation = automationEventRegistry.get(rule.trigger_event, this.businessUnitCode) ? automationConditionEngine.evaluate(rule.trigger_event, rule.condition_json, input) : { matched: true, evaluations: [] };
    return { dry_run: true, conditions_matched: evaluation.matched, evaluations: evaluation.evaluations, actions: rule.action_json.actions.map((action: any) => ({ type: action.type, would_run: evaluation.matched, definition: automationActionRegistry.get(action.type) || null })), warnings: rule.status_code !== 'active' ? ['Aturan belum aktif; ini hanya uji aman.'] : [] };
  }
}
