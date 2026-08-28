/**
 * Shared table repository facade.  Craft keeps its public class name for API
 * compatibility, while Studio and the unified worker use the same backing
 * repository and the same `automation_rules` / `automation_runs` tables.
 */
export { CraftAutomationsRepository as AutomationRepository, normalizeRule, normalizeRun } from '../../modules/craft-automations/craft-automations.repository';
