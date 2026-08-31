import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD.');
const optionalId = z.preprocess(value => value === '' || value === undefined ? undefined : value, z.coerce.number().int().positive().optional());
const bool = z.preprocess(value => value === true || value === 'true' ? true : false, z.boolean());

const reportFiltersShape = {
  period: z.enum(['today', 'week', 'month', 'last_30_days', 'quarter', 'year', 'custom']).default('last_30_days'), start_date: date.optional(), end_date: date.optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(), workspace: z.enum(['all', 'craft', 'studio', 'shared']).default('all'), compare: bool.default(false),
  page: z.preprocess(value => value === undefined ? 1 : value, z.coerce.number().int().min(1).max(100000)), limit: z.preprocess(value => value === undefined ? 25 : value, z.coerce.number().int().min(1).max(100)),
  client_id: optionalId, service_id: optionalId, project_type: z.string().trim().max(100).optional(), sales_channel_id: optionalId, product_id: optionalId, customer_id: optionalId, printer_id: optionalId, material_id: optionalId, status: z.string().trim().max(40).optional(),
};
export const reportFiltersSchema = z.object(reportFiltersShape).superRefine((value, context) => { if (value.period === 'custom' && (!value.start_date || !value.end_date)) context.addIssue({ code: 'custom', message: 'Periode kustom memerlukan tanggal mulai dan akhir.' }); if (value.start_date && value.end_date && value.start_date > value.end_date) context.addIssue({ code: 'custom', message: 'Tanggal mulai harus sebelum tanggal akhir.' }); });
const exportFiltersSchema = z.object({ period: z.enum(['today', 'week', 'month', 'last_30_days', 'quarter', 'year', 'custom']).optional(), start_date: date.optional(), end_date: date.optional(), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(), workspace: z.enum(['all', 'craft', 'studio', 'shared']).optional(), compare: bool.optional(), page: z.coerce.number().int().min(1).max(100000).optional(), limit: z.coerce.number().int().min(1).max(100).optional(), client_id: optionalId, service_id: optionalId, project_type: z.string().trim().max(100).optional(), sales_channel_id: optionalId, product_id: optionalId, customer_id: optionalId, printer_id: optionalId, material_id: optionalId, status: z.string().trim().max(40).optional() });

export const exportSchema = z.object({ format: z.enum(['csv', 'xlsx', 'pdf']), filters: exportFiltersSchema.optional() });
export const historySchema = z.object({ page: z.preprocess(value => value === undefined ? 1 : value, z.coerce.number().int().min(1).max(100000)), limit: z.preprocess(value => value === undefined ? 25 : value, z.coerce.number().int().min(1).max(100)), format: z.enum(['csv', 'xlsx', 'pdf']).optional(), q: z.string().trim().max(180).optional(), from: date.optional(), to: date.optional(), status: z.enum(['queued', 'generating', 'generated', 'failed']).optional() }).refine(value => !value.from || !value.to || value.from <= value.to, { message: 'Tanggal mulai harus sebelum tanggal akhir.' });
