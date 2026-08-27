import type { AutomationAction } from '../../shared/automation/automation-action-registry';
import type { AutomationConditionGroup } from '../../shared/automation/automation-condition-engine';

export type AutomationTriggerType = 'event' | 'schedule' | 'sensor' | 'manual';
export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'disabled';
export type AutomationRunStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';

export interface AutomationScheduleConfig { version?: number; schedule?: { type: 'cron'; expression: string; timezone?: string }; interval_minutes?: number; }
export interface AutomationRuleInput {
  name: string;
  description?: string | null;
  trigger_type: AutomationTriggerType;
  trigger_event: string;
  trigger_config_json?: AutomationScheduleConfig | null;
  schedule_timezone?: string | null;
  condition_json?: AutomationConditionGroup | null;
  action_json: { version?: number; actions: AutomationAction[] };
  priority?: number;
  cooldown_seconds?: number;
  max_retries?: number;
  status_code?: AutomationRuleStatus;
}

export interface AutomationActor { id: number; permissions: string[]; }

export interface AutomationRule extends AutomationRuleInput {
  id: number;
  rule_code: string;
  organization_id: number;
  business_unit_id: number | null;
  module_code: string;
  version_no: number;
  is_system: boolean;
  created_by: number | null;
  updated_by: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: number;
  rule_id: number;
  run_key: string;
  rule_version: number;
  trigger_event: string | null;
  trigger_entity_type: string | null;
  trigger_entity_id: number | null;
  scheduled_for: string | null;
  initiated_by: number | null;
  attempt_no: number;
  next_attempt_at: string | null;
  correlation_id: string | null;
  chain_depth: number;
  status_code: AutomationRunStatus;
  started_at: string;
  finished_at: string | null;
  input_json: Record<string, unknown> | null;
  rule_snapshot_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
  rule_code?: string;
  rule_name?: string;
  module_code?: string;
}

export interface AutomationTemplate { code: string; name: string; description: string; rule: AutomationRuleInput; }
