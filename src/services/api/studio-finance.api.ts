import { api } from '../../lib/api';
import type { Budget, CashFlowPoint, ExpensePayload, FinanceExpense, FinanceOverview, FinancePayable, FinanceReceivable, FinanceReferences, FinanceTransaction, FinancialPeriod, IncomePayload, Journal, Paginated, ProjectProfitability, TransferPayload, TreasuryAccount, TreasuryPayload } from '../../types/studio-finance';

const BASE = '/studio/finance';
const query = (filters: Record<string, string | number | undefined> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params}` : '';
};

export const studioFinanceApi = {
  overview: () => api.get<FinanceOverview>(`${BASE}/overview`),
  references: () => api.get<FinanceReferences>(`${BASE}/references`),
  transactions: (filters: Record<string, string | number | undefined> = {}) => api.get<Paginated<FinanceTransaction>>(`${BASE}/transactions${query(filters)}`),
  treasury: () => api.get<TreasuryAccount[]>(`${BASE}/treasury`),
  createTreasury: (payload: TreasuryPayload) => api.post<{ id: number; account_code: string }>(`${BASE}/treasury`, payload),
  setTreasuryStatus: (id: number, is_active: boolean) => api.patch<{ id: number; is_active: boolean }>(`${BASE}/treasury/${id}/status`, { is_active }),
  transfer: (payload: TransferPayload) => api.post<{ id: number; transfer_code: string }>(`${BASE}/transfers`, payload),
  income: (payload: IncomePayload) => api.post<{ transactionId: number }>(`${BASE}/income`, payload),
  receivables: () => api.get<FinanceReceivable[]>(`${BASE}/receivables`),
  payInvoice: (id: number, payload: { amount: number; payment_date: string; payment_method_id: number; treasury_account_id: number; payment_schedule_id?: number | null; reference_number?: string | null; notes?: string | null }) => api.post<{ payment_id: number; transaction_id: number }>(`${BASE}/invoices/${id}/payments`, payload),
  expenses: (filters: Record<string, string | number | undefined> = {}) => api.get<Paginated<FinanceExpense>>(`${BASE}/expenses${query(filters)}`),
  createExpense: (payload: ExpensePayload) => api.post<{ id: number; expense_code: string }>(`${BASE}/expenses`, payload),
  approveExpense: (id: number) => api.post<{ id: number; status_code: string }>(`${BASE}/expenses/${id}/approve`, {}),
  payExpense: (id: number, payload: { treasury_account_id: number; payment_date: string; reference_number?: string | null; direct_payment_confirmed?: boolean }) => api.post<{ id: number; transaction_id: number }>(`${BASE}/expenses/${id}/pay`, payload),
  reverseExpense: (id: number, payload: { reversal_date: string; reason: string }) => api.post<{ id: number; status_code: string; reversal_transaction_id: number }>(`${BASE}/expenses/${id}/reverse`, payload),
  payables: () => api.get<FinancePayable[]>(`${BASE}/payables`),
  payout: (id: number, payload: { amount: number; payment_date: string; treasury_account_id: number; category_code?: string; description?: string | null }) => api.post<{ expense_id: number; transaction_id: number; payment_status_code: string; remaining: number }>(`${BASE}/external-assignments/${id}/payouts`, payload),
  profitability: () => api.get<ProjectProfitability[]>(`${BASE}/profitability`),
  cashFlow: (filters: Record<string, string | number | undefined> = {}) => api.get<CashFlowPoint[]>(`${BASE}/cash-flow${query(filters)}`),
  budgets: () => api.get<Budget[]>(`${BASE}/budgets`),
  createBudget: (payload: { name: string; period_start: string; period_end: string; items: Array<{ name: string; allocated_amount: number; category_id?: number | null; notes?: string | null }> }) => api.post<{ id: number; budget_code: string }>(`${BASE}/budgets`, payload),
  approveBudget: (id: number) => api.post<{ id: number; status_code: string }>(`${BASE}/budgets/${id}/approve`, {}),
  accounting: () => api.get<{ journals: Journal[]; periods: FinancialPeriod[] }>(`${BASE}/accounting`),
};
