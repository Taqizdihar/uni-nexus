import { api } from '../../lib/api';
import type { Accounting, Budget, BudgetPayload, CashFlow, ExpensePayload, FinanceExpense, FinanceOverview, FinanceReferences, FinanceTransaction, IncomePayload, JournalDetail, ListFilters, Paginated, Profitability, TreasuryPayload } from '../../types/craft-finance';

const BASE='/craft/finance';
const query = (filters: Record<string, string | number | undefined> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params}` : '';
};

export const craftFinanceApi={
  overview:()=>api.get<FinanceOverview>(`${BASE}/overview`),
  references:()=>api.get<FinanceReferences>(`${BASE}/references`),
  treasury:()=>api.get<any[]>(`${BASE}/treasury`),
  transactions:()=>api.get<FinanceTransaction[]>(`${BASE}/transactions`),
  receivables:()=>api.get<any[]>(`${BASE}/receivables`),
  payables:()=>api.get<any[]>(`${BASE}/payables`),
  createTreasury:(data:TreasuryPayload)=>api.post<{ id: number }>(`${BASE}/treasury`,data),
  setTreasuryStatus:(id:number,is_active:boolean)=>api.patch<any>(`${BASE}/treasury/${id}/status`,{is_active}),
  payInvoice:(id:number,data:any)=>api.post<any>(`${BASE}/invoices/${id}/pay`,data),
  paySupplierInvoice:(id:number,data:any)=>api.post<any>(`${BASE}/supplier-invoices/${id}/pay`,data),
  recordIncome:(data:IncomePayload)=>api.post<{ id: number; transaction_code: string }>(`${BASE}/income`,data),

  income:(filters: ListFilters = {})=>api.get<Paginated<FinanceTransaction>>(`${BASE}/income${query(filters as Record<string, string | number | undefined>)}`),
  expenses:(filters: ListFilters = {})=>api.get<Paginated<FinanceExpense>>(`${BASE}/expenses${query(filters as Record<string, string | number | undefined>)}`),
  createExpense:(data: ExpensePayload)=>api.post<{ id: number; expense_code: string }>(`${BASE}/expenses`,data),
  approveExpense:(id:number)=>api.post<{ id: number; status_code: string }>(`${BASE}/expenses/${id}/approve`,{}),
  payExpense:(id:number,data:{ treasury_account_id: number; payment_date: string; reference_number?: string | null })=>api.post<{ id: number; transaction_id: number }>(`${BASE}/expenses/${id}/pay`,data),
  reverseExpense:(id:number,data:{ reversal_date: string; reason: string })=>api.post<{ id: number; status_code: string; reversal_transaction_id: number }>(`${BASE}/expenses/${id}/reverse`,data),

  profitability:(filters: { from?: string; to?: string } = {})=>api.get<Profitability>(`${BASE}/profitability${query(filters)}`),
  cashFlow:(filters: { from?: string; to?: string } = {})=>api.get<CashFlow>(`${BASE}/cash-flow${query(filters)}`),

  budgets:()=>api.get<Budget[]>(`${BASE}/budgets`),
  createBudget:(data: BudgetPayload)=>api.post<{ id: number; budget_code: string }>(`${BASE}/budgets`,data),
  approveBudget:(id:number)=>api.post<{ id: number; status_code: string }>(`${BASE}/budgets/${id}/approve`,{}),
  activateBudget:(id:number)=>api.post<{ id: number; status_code: string }>(`${BASE}/budgets/${id}/activate`,{}),
  closeBudget:(id:number)=>api.post<{ id: number; status_code: string }>(`${BASE}/budgets/${id}/close`,{}),

  accounting:()=>api.get<Accounting>(`${BASE}/accounting`),
  journalDetail:(id:number)=>api.get<JournalDetail>(`${BASE}/accounting/journals/${id}`),
};
