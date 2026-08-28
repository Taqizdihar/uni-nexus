export interface StudioFinanceListFilters {
  search?: string;
  transactionType?: string;
  categoryId?: number;
  treasuryId?: number;
  status?: string;
  projectId?: number;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface StudioExpenseInput {
  expense_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  category_code: string;
  party_id?: number | null;
  studio_project_id?: number | null;
  treasury_account_id?: number | null;
  status_code: 'draft' | 'approved' | 'paid';
  direct_payment_confirmed?: boolean;
}
