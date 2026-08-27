export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'disabled';
export type AutomationTriggerType = 'event' | 'schedule' | 'sensor' | 'manual';
export type AutomationRunStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';
export type AutomationOperator = 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'not_null' | 'before' | 'after' | 'within_hours' | 'changed_from' | 'changed_to';

export interface AutomationCondition { field: string; operator: AutomationOperator; value?: unknown; }
export interface AutomationConditionGroup { version?: number; logic: 'all' | 'any'; conditions: Array<AutomationCondition | AutomationConditionGroup>; }
export interface AutomationAction { type: string; config?: Record<string, unknown>; continue_on_error?: boolean; }
export interface AutomationRule {
  id: number; rule_code: string; name: string; description: string | null; module_code: string;
  trigger_type: AutomationTriggerType; trigger_event: string; trigger_config_json: { version?: number; schedule?: { type: 'cron'; expression: string; timezone?: string } } | null;
  schedule_timezone: string | null; condition_json: AutomationConditionGroup | null; action_json: { version?: number; actions: AutomationAction[] };
  status_code: AutomationRuleStatus; priority: number; cooldown_seconds: number; max_retries: number; version_no: number; is_system: boolean;
  next_run_at: string | null; last_run_at: string | null; last_success_at: string | null; last_failure_at: string | null; created_by: number | null; updated_by: number | null; created_at: string; updated_at: string;
  total_runs?: number; success_runs?: number; failed_runs?: number;
}
export interface AutomationConditionField { field: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'enum'; values?: string[]; }
export interface AutomationTriggerDefinition { code: string; label: string; module: string; description: string; triggerType: AutomationTriggerType; entityType: string; fields: AutomationConditionField[]; recommendedActions: string[]; }
export interface AutomationActionDefinition { type: string; label: string; module: string; description: string; requiredPermission: string; retrySafe: boolean; risk: 'informational' | 'operational' | 'data_change'; supportedEvents?: string[]; }
export interface AutomationCatalog { triggers: AutomationTriggerDefinition[]; actions: AutomationActionDefinition[]; operators: AutomationOperator[]; modules: string[]; }
export interface AutomationRun { id: number; rule_id: number; run_key: string; rule_version: number; trigger_event: string | null; trigger_entity_type: string | null; trigger_entity_id: number | null; scheduled_for: string | null; initiated_by: number | null; attempt_no: number; next_attempt_at: string | null; correlation_id: string | null; chain_depth: number; status_code: AutomationRunStatus; started_at: string; finished_at: string | null; input_json: Record<string, unknown> | null; rule_snapshot_json: Record<string, unknown> | null; result_json: Record<string, unknown> | null; error_message: string | null; rule_code?: string; rule_name?: string; module_code?: string; }
export interface AutomationTemplate { code: string; name: string; description: string; rule: Omit<AutomationRule, 'id' | 'rule_code' | 'organization_id' | 'business_unit_id' | 'module_code' | 'version_no' | 'is_system' | 'created_by' | 'updated_by' | 'next_run_at' | 'last_run_at' | 'last_success_at' | 'last_failure_at' | 'created_at' | 'updated_at'>; }
export interface DomainEventSummary { id: number; event_name: string; module_code: string; entity_type: string | null; entity_id: number | null; entity_code: string | null; correlation_id: string | null; chain_depth: number; status_code: string; attempt_count: number; available_at: string; locked_at: string | null; processed_at: string | null; last_error: string | null; created_at: string; }
export interface AutomationOverview { active_rules: number; paused_rules: number; runs_today: number; success_rate: number | null; failed_today: number; pending_events: number; health: { last_run: string | null; last_success: string | null; last_failure: string | null; oldest_pending_event: string | null; worker_warning: string | null }; recent_runs: AutomationRun[]; }
