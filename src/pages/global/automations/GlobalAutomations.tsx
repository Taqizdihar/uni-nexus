import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { automationsApi } from '../../../services/api/automations.api';
import type { AutomationMeta } from '../../../types/automations';
import { AutomationNav, ErrorState, LoadingState } from './components';
import { AutomationOverviewPage } from './AutomationOverviewPage';
import { AutomationRulesPage, AutomationRuleDetailPage, AutomationRuleEditorPage } from './AutomationRulesPages';
import { AutomationTemplatesPage, AutomationCatalogPage } from './AutomationCatalogPages';
import { AutomationRunsPage, AutomationRunDetailPage, AutomationEventsPage } from './AutomationOperationsPages';

const AutomationMetaContext = createContext<AutomationMeta | null>(null);
export const useAutomationMeta = () => { const value = useContext(AutomationMetaContext); if (!value) throw new Error('Metadata Pusat Otomasi belum tersedia.'); return value; };

export function GlobalAutomations() {
  const [meta, setMeta] = useState<AutomationMeta | null>(null); const [error, setError] = useState('');
  const load = () => { setError(''); void automationsApi.meta().then(setMeta).catch(cause => setError(cause instanceof Error ? cause.message : 'Metadata otomasi tidak dapat dimuat.')); };
  useEffect(() => { load(); }, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!meta) return <LoadingState />;
  return <AutomationMetaContext.Provider value={meta}><div className="space-y-6"><AutomationNav /><Routes><Route index element={<AutomationOverviewPage />} /><Route path="rules" element={<AutomationRulesPage />} /><Route path="rules/new" element={<AutomationRuleEditorPage />} /><Route path="rules/:id" element={<AutomationRuleDetailPage />} /><Route path="rules/:id/edit" element={<AutomationRuleEditorPage />} /><Route path="templates" element={<AutomationTemplatesPage />} /><Route path="runs" element={<AutomationRunsPage />} /><Route path="runs/:id" element={<AutomationRunDetailPage />} /><Route path="events" element={<AutomationEventsPage />} /><Route path="catalog" element={<AutomationCatalogPage />} /><Route path="*" element={<Navigate to="." replace />} /></Routes></div></AutomationMetaContext.Provider>;
}
