import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AutomationCatalogPage, AutomationOverviewPage, AutomationRuleDetailPage, AutomationRuleEditorPage, AutomationRulesPage, AutomationRunDetailPage, AutomationRunsPage, AutomationTemplatesPage } from './automations/AutomationPages';

export function CraftAutomations() {
  return <Routes>
    <Route index element={<AutomationOverviewPage />} />
    <Route path="rules" element={<AutomationRulesPage />} />
    <Route path="rules/new" element={<AutomationRuleEditorPage />} />
    <Route path="rules/:id/edit" element={<AutomationRuleEditorPage />} />
    <Route path="rules/:id" element={<AutomationRuleDetailPage />} />
    <Route path="templates" element={<AutomationTemplatesPage />} />
    <Route path="runs" element={<AutomationRunsPage />} />
    <Route path="runs/:id" element={<AutomationRunDetailPage />} />
    <Route path="catalog" element={<AutomationCatalogPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
