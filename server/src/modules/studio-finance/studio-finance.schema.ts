import { z } from 'zod';

const positiveAmount = z.coerce.number().positive().finite();
const optionalId = z.coerce.number().int().positive().nullable().optional();
const date = z.string().min(10).max(40);

export const treasurySchema = z.object({
  name: z.string().trim().min(1).max(150),
  account_type: z.enum(['cash', 'bank', 'e-wallet', 'ewallet', 'marketplace_balance']),
  provider_name: z.string().trim().max(120).nullable().optional(),
  account_number_masked: z.string().trim().max(100).nullable().optional(),
  currency_code: z.string().trim().length(3).default('IDR'),
  opening_balance: z.coerce.number().min(0).finite().default(0),
  coa_account_id: optionalId,
});

export const transferSchema = z.object({
  from_treasury_account_id: z.coerce.number().int().positive(),
  to_treasury_account_id: z.coerce.number().int().positive(),
  amount: positiveAmount,
  transfer_date: date,
  description: z.string().trim().max(500).nullable().optional(),
});

export const incomeSchema = z.object({
  amount: positiveAmount,
  transaction_date: date,
  treasury_account_id: z.coerce.number().int().positive(),
  category_code: z.string().trim().max(60).default('STUDIO_PROJECT'),
  description: z.string().trim().min(1).max(500),
  party_id: optionalId,
  reference_number: z.string().trim().max(100).nullable().optional(),
});

export const customerPaymentSchema = z.object({
  amount: positiveAmount,
  payment_date: date,
  payment_method_id: z.coerce.number().int().positive(),
  treasury_account_id: z.coerce.number().int().positive(),
  payment_schedule_id: optionalId,
  reference_number: z.string().trim().max(190).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const expenseSchema = z.object({
  expense_date: date,
  description: z.string().trim().min(1).max(500),
  amount: positiveAmount,
  tax_amount: z.coerce.number().min(0).finite().default(0),
  category_code: z.string().trim().max(60).default('STUDIO_PROJECT_COST'),
  party_id: optionalId,
  studio_project_id: optionalId,
  treasury_account_id: optionalId,
  status_code: z.enum(['draft', 'approved', 'paid']).default('draft'),
  direct_payment_confirmed: z.boolean().optional(),
});

export const payExpenseSchema = z.object({
  treasury_account_id: z.coerce.number().int().positive(),
  payment_date: date,
  reference_number: z.string().trim().max(190).nullable().optional(),
  direct_payment_confirmed: z.boolean().optional(),
});

export const reverseExpenseSchema = z.object({
  reversal_date: date,
  reason: z.string().trim().min(3).max(500),
});

export const externalPayoutSchema = z.object({
  amount: positiveAmount,
  payment_date: date,
  treasury_account_id: z.coerce.number().int().positive(),
  category_code: z.string().trim().max(60).default('STUDIO_PROJECT_COST'),
  description: z.string().trim().max(500).nullable().optional(),
  reference_number: z.string().trim().max(190).nullable().optional(),
});

export const maintenancePaymentSchema = z.object({
  treasury_account_id: z.coerce.number().int().positive(),
  payment_date: date,
  category_code: z.string().trim().max(60).default('STUDIO_PROJECT_COST'),
  studio_project_id: optionalId,
});

export const budgetSchema = z.object({
  name: z.string().trim().min(1).max(180),
  period_start: z.string().min(10).max(10),
  period_end: z.string().min(10).max(10),
  items: z.array(z.object({
    category_id: optionalId,
    name: z.string().trim().min(1).max(180),
    allocated_amount: z.coerce.number().min(0).finite(),
    notes: z.string().trim().max(500).nullable().optional(),
  })).min(1).max(100),
});
