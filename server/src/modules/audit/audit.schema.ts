import { z } from 'zod';
import { jakartaDateStartUtc } from '../../shared/time/jakarta-time';

const safeCode = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_.-]+$/);
const safeEntity = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_.-]+$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  try { jakartaDateStartUtc(value); return true; } catch { return false; }
}, 'Tanggal tidak valid.');

const filters = z.object({
  workspace: z.enum(['all', 'global', 'craft', 'studio']).default('all'),
  module: safeCode.optional(),
  action: safeCode.optional(),
  action_group: z.enum(['authentication', 'account', 'create', 'update', 'delete', 'approval', 'finance', 'automation', 'export', 'other']).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  entity_type: safeEntity.optional(),
  q: z.string().trim().max(160).optional(),
  from: date.optional(),
  to: date.optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: 'custom', path: ['to'], message: 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai.' });
});

export const auditListSchema = z.object({
  query: filters.extend({ page: z.coerce.number().int().positive().max(10_000).default(1), limit: z.coerce.number().int().positive().max(100).default(25) }),
  body: z.object({}).passthrough().default({}), params: z.object({}),
});
export const auditSummarySchema = z.object({ query: filters, body: z.object({}).passthrough().default({}), params: z.object({}) });
export const auditMetaSchema = z.object({ query: z.object({ workspace: z.enum(['all', 'global', 'craft', 'studio']).default('all') }), body: z.object({}).passthrough().default({}), params: z.object({}) });
export const auditExportSchema = z.object({ query: filters.extend({ format: z.enum(['csv', 'xlsx']) }), body: z.object({}).passthrough().default({}), params: z.object({}) });
export const auditIdSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}), body: z.object({}).passthrough().default({}) });

