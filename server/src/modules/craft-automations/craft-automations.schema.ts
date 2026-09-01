import { z } from 'zod';

const conditionSchema: z.ZodType<any> = z.lazy(() => z.object({
  logic: z.enum(['all', 'any']),
  conditions: z.array(z.union([
    z.object({ field: z.string().min(1).max(120), operator: z.enum(['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'is_null', 'not_null', 'before', 'after', 'within_hours', 'changed_from', 'changed_to']), value: z.unknown().optional() }),
    conditionSchema,
  ])).min(1).max(20),
}).strict());

const actionSchema = z.object({ type: z.string().min(3).max(80), config: z.record(z.string(), z.unknown()).optional().default({}), continue_on_error: z.boolean().optional().default(false) }).strict();
export const automationRuleSchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(500).nullable().optional(),
  trigger_type: z.enum(['event', 'schedule', 'sensor', 'manual']),
  trigger_event: z.string().trim().min(3).max(100),
  trigger_config_json: z.object({ version: z.number().int().positive().optional(), schedule: z.object({ type: z.literal('cron'), expression: z.string().trim().max(80), timezone: z.string().trim().max(64).optional() }).optional(), interval_minutes: z.number().int().min(1).max(10080).optional() }).strict().nullable().optional(),
  schedule_timezone: z.string().trim().max(64).nullable().optional(),
  condition_json: conditionSchema.nullable().optional(),
  action_json: z.object({ version: z.number().int().positive().optional(), actions: z.array(actionSchema).min(1).max(10) }).strict(),
  priority: z.number().int().min(1).max(10000).optional().default(100),
  cooldown_seconds: z.number().int().min(0).max(604800).optional().default(0),
  max_retries: z.number().int().min(0).max(5).optional().default(0),
  status_code: z.enum(['draft', 'active', 'paused', 'disabled']).optional(),
}).strict();
export const automationRulePatchSchema = automationRuleSchema.partial().extend({
  action_json: z.object({ version: z.number().int().positive().optional(), actions: z.array(actionSchema).min(1).max(10) }).strict().optional(),
  expected_version: z.number().int().positive().optional(),
}).strict();
export const manualRunSchema = z.object({ event_id: z.number().int().positive().optional(), dry_run: z.boolean().optional(), input: z.record(z.string(), z.unknown()).optional() }).strict();
