import { z } from 'zod';
const amount = z.number().positive();
const optionalId = z.coerce.number().int().positive().nullable().optional();
export const treasurySchema = z.object({ name: z.string().min(1).max(150), account_type: z.enum(['cash','bank','ewallet','marketplace_balance']), provider_name: z.string().max(120).nullable().optional(), account_number_masked: z.string().max(100).nullable().optional(), currency_code: z.string().length(3).default('IDR'), opening_balance: z.number().min(0).default(0), coa_account_id: z.number().int().positive().nullable().optional() });
export const paymentSchema = z.object({ amount, payment_date: z.string(), payment_method_id: z.number().int().positive(), treasury_account_id: z.number().int().positive(), category_code: z.string().max(60).optional(), reference_number: z.string().max(190).nullable().optional(), notes: z.string().max(500).nullable().optional() });
export const incomeSchema = z.object({ amount, transaction_date: z.string(), treasury_account_id: z.number().int().positive(), category_code: z.string().default('CRAFT_SALES'), description: z.string().min(1).max(500), party_id: z.number().int().positive().nullable().optional(), reference_number: z.string().trim().max(190).nullable().optional() });
export const expenseSchema = z.object({ expense_date: z.string().min(10).max(40), amount, tax_amount: z.coerce.number().min(0).finite().default(0), category_code: z.string().min(1).max(60).default('CRAFT_MATERIAL'), description: z.string().min(1).max(500), party_id: optionalId, craft_order_id: optionalId, treasury_account_id: optionalId, status_code: z.enum(['draft','approved','paid']).default('draft'), direct_payment_confirmed: z.boolean().optional() });
export const payExpenseSchema = z.object({ treasury_account_id: z.number().int().positive(), payment_date: z.string().min(10).max(40), reference_number: z.string().max(190).nullable().optional() });
export const reverseExpenseSchema = z.object({ reversal_date: z.string().min(10).max(40), reason: z.string().min(3).max(500) });
export const transferSchema = z.object({ from_treasury_account_id: z.number().int().positive(), to_treasury_account_id: z.number().int().positive(), amount, transfer_date: z.string(), description: z.string().max(500).nullable().optional() });
export const adjustmentSchema = z.object({ amount, direction: z.enum(['in','out']), reason: z.string().min(1).max(500), transaction_date: z.string() });
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
