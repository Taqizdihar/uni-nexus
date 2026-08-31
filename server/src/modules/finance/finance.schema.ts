import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD.');
const id = z.coerce.number().int().positive();
const idempotencyKey = z.string().trim().min(8).max(190);

export const filtersSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  from: date.optional(), to: date.optional(),
  workspace: z.enum(['all', 'craft', 'studio', 'shared']).default('all'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  transaction_type: z.enum(['income', 'expense', 'transfer', 'adjustment']).optional(),
  category: z.string().trim().max(60).optional(), treasury: id.optional(), source: z.string().trim().max(60).optional(), status: z.string().trim().max(30).optional(), q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
}).superRefine((value, context) => { if (value.period === 'custom' && (!value.from || !value.to)) context.addIssue({ code: 'custom', message: 'Periode kustom memerlukan from dan to.' }); });

export const transferSchema = z.object({
  from_treasury_account_id: id, to_treasury_account_id: id, amount: z.coerce.number().positive().finite(), transfer_date: date,
  description: z.string().trim().max(500).nullable().optional(), idempotency_key: idempotencyKey,
});

export const sharedTransactionSchema = z.object({
  direction: z.enum(['in', 'out']), amount: z.coerce.number().positive().finite(), transaction_date: date, treasury_account_id: id,
  category_code: z.string().trim().min(1).max(60), description: z.string().trim().min(1).max(500), party_id: id.nullable().optional(), idempotency_key: idempotencyKey,
});

export const reversalSchema = z.object({ reversal_date: date, reason: z.string().trim().min(3).max(500), idempotency_key: idempotencyKey });

export const sharedTreasurySchema = z.object({ name: z.string().trim().min(1).max(150), account_type: z.enum(['cash', 'bank', 'ewallet', 'marketplace_balance']), provider_name: z.string().trim().max(120).nullable().optional(), account_number_masked: z.string().trim().max(100).nullable().optional(), currency_code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('IDR'), opening_balance: z.coerce.number().min(0).finite().default(0), coa_account_id: id.nullable().optional() });
export const statusSchema = z.object({ is_active: z.boolean() });
export const periodCreateSchema = z.object({ period_code: z.string().trim().min(2).max(30), start_date: date, end_date: date });
export const periodReasonSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const exportSchema = filtersSchema.extend({ dataset: z.enum(['transactions', 'cash-flow', 'profit-loss', 'receivables', 'payables', 'transfers']).default('transactions'), format: z.enum(['csv', 'xlsx']).default('csv') });
