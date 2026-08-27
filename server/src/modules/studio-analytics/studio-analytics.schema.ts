import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD.');
const optionalId = z.preprocess(value => value === '' || value === undefined ? undefined : value, z.coerce.number().int().positive().optional());
const boolean = z.preprocess(value => value === 'true' || value === true ? true : value === 'false' || value === false || value === undefined ? false : value, z.boolean());

export const analyticsFiltersSchema = z.object({
  start_date: date.optional(),
  end_date: date.optional(),
  start: date.optional(),
  end: date.optional(),
  compare: boolean.default(false),
  currency: z.string().trim().length(3).optional(),
  project_type: z.string().trim().max(100).optional(),
  client_id: optionalId,
  service_id: optionalId,
  page: z.preprocess(value => value === undefined ? 1 : value, z.coerce.number().int().min(1).max(100000)),
  limit: z.preprocess(value => value === undefined ? 20 : value, z.coerce.number().int().min(1).max(100)),
});

export const exportSchema = z.object({
  report: z.enum(['overview', 'projects', 'clients', 'services', 'commercial', 'revenue', 'profitability', 'receivables', 'vendors', 'equipment']),
  format: z.enum(['csv', 'xlsx', 'pdf']),
  filters: analyticsFiltersSchema.partial().optional(),
});
