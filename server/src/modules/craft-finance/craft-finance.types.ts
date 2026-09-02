export interface CraftFinanceListFilters {
  search?: string;
  categoryId?: number;
  treasuryId?: number;
  source?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface CraftExpenseInput {
  expense_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  category_code: string;
  party_id?: number | null;
  craft_order_id?: number | null;
  treasury_account_id?: number | null;
  status_code: 'draft' | 'approved' | 'paid';
  direct_payment_confirmed?: boolean;
}
