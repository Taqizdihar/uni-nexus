import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AccountingPage, BudgetsPage, CashFlowPage, ExpensesPage, FinanceOverviewPage, IncomePage, PayablesPage, ProfitabilityPage, ReceivablesPage, TransactionsPage, TreasuryPage } from './finance/StudioFinancePages';

/** One Studio Finance route tree; every child is a live database-backed screen. */
export function StudioFinance() {
  return <Routes>
    <Route index element={<FinanceOverviewPage />} />
    <Route path="transactions" element={<TransactionsPage />} />
    <Route path="treasury" element={<TreasuryPage />} />
    <Route path="income" element={<IncomePage />} />
    <Route path="expenses" element={<ExpensesPage />} />
    <Route path="receivables" element={<ReceivablesPage />} />
    <Route path="payables" element={<PayablesPage />} />
    <Route path="profitability" element={<ProfitabilityPage />} />
    <Route path="cash-flow" element={<CashFlowPage />} />
    <Route path="budgets" element={<BudgetsPage />} />
    <Route path="accounting" element={<AccountingPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
