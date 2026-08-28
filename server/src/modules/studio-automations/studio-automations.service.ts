import { CraftAutomationsService } from '../craft-automations/craft-automations.service';
import { AutomationRuleService } from '../../shared/automation/automation-rule.service';
import { StudioAutomationTemplateService } from './studio-automations.templates';

/** Workspace adapter over the one shared rules/runs/outbox engine. */
export class StudioAutomationsService extends CraftAutomationsService {
  override readonly rules = new AutomationRuleService({ businessUnitCode: 'STUDIO', automationPermission: 'studio.automations.write', templates: new StudioAutomationTemplateService() });
  override async catalog() { return super.catalog('STUDIO'); }
}
