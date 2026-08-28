import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD.');

export const dashboardFiltersSchema = z.object({
  range: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  start_date: date.optional(),
  end_date: date.optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Mata uang harus berupa kode ISO 3 huruf.').optional(),
}).superRefine((value, context) => {
  if (value.range === 'custom' && (!value.start_date || !value.end_date)) {
    context.addIssue({ code: 'custom', message: 'Rentang tanggal memerlukan start_date dan end_date.' });
  }
});
