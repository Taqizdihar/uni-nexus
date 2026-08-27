import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FinanceListPage, FinanceOverviewPage, TreasuryPage } from './finance/FinancePages';
import { FinancePlaceholderPage } from './finance/PlaceholderPage';
import { CraftCalculator } from './Calculator';

export function CraftFinance() {
  return <Routes>
    <Route index element={<FinanceOverviewPage />} />
    <Route path="transactions" element={<FinanceListPage page="transactions" />} />
    <Route path="treasury" element={<TreasuryPage />} />
    <Route path="receivables" element={<FinanceListPage page="receivables" />} />
    <Route path="payables" element={<FinanceListPage page="payables" />} />
    <Route path="calculator" element={<CraftCalculator />} />
    <Route path="income" element={<FinancePlaceholderPage title="Pendapatan" />} />
    <Route path="expenses" element={<FinancePlaceholderPage title="Pengeluaran" />} />
    <Route path="profitability" element={<FinancePlaceholderPage title="HPP & Profitabilitas" />} />
    <Route path="cash-flow" element={<FinancePlaceholderPage title="Arus Kas" />} />
    <Route path="budgets" element={<FinancePlaceholderPage title="Anggaran" />} />
    <Route path="accounting" element={<FinancePlaceholderPage title="Jurnal & Periode" />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
