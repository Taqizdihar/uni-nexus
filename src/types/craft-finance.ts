export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type ExpenseStatus = 'draft' | 'approved' | 'paid' | 'void';

export interface FinanceTransaction { id: number; transaction_code: string; transaction_date: string; transaction_type: TransactionType; amount: number; currency_code: string; description: string; status_code: string; category_code: string | null; category_name: string | null; treasury_name: string | null; party_name: string | null; source_type: string | null; source_code: string | null; }
export interface TreasuryAccount { id: number; account_code: string; name: string; account_type: string; provider_name: string | null; account_number_masked: string | null; currency_code: string; opening_balance: number; current_balance: number; is_active: boolean; last_transaction_at: string | null; }
export interface FinanceCategory { id: number; code: string; name: string; transaction_type: 'income' | 'expense'; }
export interface FinanceReference { id: number; name: string; code?: string; account_code?: string; current_balance?: number; currency_code?: string; }
export interface OrderReference { id: number; order_code: string; }
export interface FinanceReferences { categories: FinanceCategory[]; methods: Array<{ id: number; code: string; name: string; method_type: string }>; treasuries: FinanceReference[]; orders: OrderReference[]; }
export interface FinanceOverview { cash: number; income: number; expense: number; net_cash_flow: number; receivables: number; payables: number; transactions: FinanceTransaction[]; treasuries: TreasuryAccount[]; }

export interface FinanceExpense { id: number; expense_code: string; expense_date: string; description: string; amount: number; tax_amount: number; total_amount: number; currency_code: string; status_code: ExpenseStatus; category_code: string; category_name: string; party_name: string | null; order_code: string | null; treasury_name: string | null; }
export interface ListSummary { total_amount: number; total_count: number; }
export interface Paginated<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number }; summary: ListSummary; }

export interface ProfitabilityOrder { id: number; order_code: string; order_date: string; status_code: string; revenue: number; marketplace_fee: number; direct_cost: number | null; direct_cost_available: boolean; direct_cost_is_estimated: boolean; gross_profit: number | null; margin_percent: number | null; }
export interface ProfitabilitySummary { total_revenue: number; total_marketplace_fee: number; total_direct_cost: number; total_gross_profit: number; orders_with_cost_data: number; orders_missing_cost_data: number; waste_cost_informational: number; waste_events_informational: number; }
export interface Profitability { orders: ProfitabilityOrder[]; period_summary: ProfitabilitySummary; }

export interface CashFlowPoint { day: string; cash_in: number; cash_out: number; net_cash_flow: number; }
export interface CashFlowByTreasury { treasury_account_id: number | null; treasury_name: string | null; cash_in: number; cash_out: number; net_cash_flow: number; }
export interface CashFlowByCategory { category_id: number | null; category_name: string | null; transaction_type: 'income' | 'expense'; amount: number; }
export interface CashFlow { daily: CashFlowPoint[]; by_treasury: CashFlowByTreasury[]; by_category: CashFlowByCategory[]; }

export interface Budget { id: number; budget_code: string; name: string; period_start: string; period_end: string; status_code: string; total_amount: number; allocated_amount: number; actual_amount: number; utilization_percent: number; }
export interface FinancialPeriod { id: number; period_code: string; start_date: string; end_date: string; status_code: string; }
export interface Journal { id: number; journal_number: string; entry_date: string; description: string; source_type: string | null; source_id: number | null; status_code: string; debit_amount: number; credit_amount: number; is_balanced: boolean; }
export interface JournalLine { id: number; coa_account_id: number | null; account_code: string | null; account_name: string | null; description: string | null; debit_amount: number; credit_amount: number; sort_order: number; }
export interface JournalDetail extends Journal { lines: JournalLine[]; }
export interface Accounting { journals: Journal[]; periods: FinancialPeriod[]; }

export interface TreasuryPayload { name: string; account_type: string; provider_name?: string | null; account_number_masked?: string | null; currency_code?: string; opening_balance?: number; }
export interface IncomePayload { amount: number; transaction_date: string; treasury_account_id: number; category_code?: string; description: string; party_id?: number | null; }
export interface ExpensePayload { expense_date: string; description: string; amount: number; tax_amount?: number; category_code?: string; party_id?: number | null; craft_order_id?: number | null; treasury_account_id?: number | null; status_code?: 'draft' | 'approved' | 'paid'; direct_payment_confirmed?: boolean; }
export interface BudgetPayload { name: string; period_start: string; period_end: string; items: Array<{ name: string; allocated_amount: number; category_id?: number | null; notes?: string | null }>; }

export interface ListFilters { search?: string; categoryId?: number; treasuryId?: number; source?: string; status?: string; from?: string; to?: string; page?: number; limit?: number; }
