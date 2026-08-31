import { z } from 'zod';

const id = z.coerce.number().int().positive();
const optionalInstant = z.string().trim().max(64).nullable().optional();
const workspace = z.union([z.literal('all'), z.literal('global'), z.literal('craft'), z.literal('studio')]).default('all');
const optionalTaskStatus = z.preprocess(value => value === '' ? undefined : value, z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']).optional());
const optionalTaskPriority = z.preprocess(value => value === '' ? undefined : value, z.enum(['low', 'normal', 'high', 'critical']).optional());
const body = z.object({
  title: z.string().trim().min(1).max(220), description: z.string().trim().max(10_000).nullable().optional(),
  priority_code: z.enum(['low', 'normal', 'high', 'critical']).optional(), business_unit_id: id.nullable().optional(),
  start_at: optionalInstant, due_at: optionalInstant, reminder_minutes_before: z.coerce.number().int().min(0).max(1_008_000).nullable().optional(),
  assignee_ids: z.array(id).max(100).optional(),
});
export const tasksListSchema = z.object({ query: z.object({ page: z.coerce.number().int().positive().max(10_000).default(1), limit: z.coerce.number().int().positive().max(100).default(25), q: z.string().trim().max(120).optional(), workspace, status: optionalTaskStatus, priority: optionalTaskPriority, mine: z.enum(['true', 'false']).optional(), assignee_id: id.optional(), due: z.enum(['all', 'overdue', 'today', 'week']).default('all') }), params: z.object({}), body: z.object({}).passthrough().default({}) });
export const taskCreateSchema = z.object({ body, query: z.object({}), params: z.object({}) });
export const taskUpdateSchema = z.object({ body: body.partial(), query: z.object({}), params: z.object({ id }) });
export const taskIdSchema = z.object({ body: z.object({}).passthrough().default({}), query: z.object({}), params: z.object({ id }) });
export const taskStatusSchema = z.object({ body: z.object({ status_code: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']) }), query: z.object({}), params: z.object({ id }) });
export const taskAssigneesSchema = z.object({ body: z.object({ assignee_ids: z.array(id).max(100) }), query: z.object({}), params: z.object({ id }) });
