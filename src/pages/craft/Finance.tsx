import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FinanceListPage, FinanceOverviewPage, TreasuryPage } from './finance/FinancePages';
import { AccountingPage, BudgetsPage, CashFlowPage, ExpensesPage, IncomePage, ProfitabilityPage } from './finance/FinanceExtendedPages';
import { CraftCalculator } from './Calculator';

export function CraftFinance() {
  return <Routes>
    <Route index element={<FinanceOverviewPage />} />
    <Route path="transactions" element={<FinanceListPage page="transactions" />} />
    <Route path="treasury" element={<TreasuryPage />} />
    <Route path="receivables" element={<FinanceListPage page="receivables" />} />
    <Route path="payables" element={<FinanceListPage page="payables" />} />
    <Route path="calculator" element={<CraftCalculator />} />
    <Route path="income" element={<IncomePage />} />
    <Route path="expenses" element={<ExpensesPage />} />
    <Route path="profitability" element={<ProfitabilityPage />} />
    <Route path="cash-flow" element={<CashFlowPage />} />
    <Route path="budgets" element={<BudgetsPage />} />
    <Route path="accounting" element={<AccountingPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
