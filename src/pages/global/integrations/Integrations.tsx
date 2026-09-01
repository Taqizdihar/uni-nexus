import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  IntegrationConnectionDetailPage,
  IntegrationConnectionsPage,
  IntegrationConnectionWizardPage,
  IntegrationHistoryPage,
  IntegrationLogDetailPage,
  IntegrationOverviewPage,
  IntegrationProvidersPage,
} from './IntegrationsPages';

export function Integrations() {
  return (
    <Routes>
      <Route index element={<IntegrationOverviewPage />} />
      <Route path="connections" element={<IntegrationConnectionsPage />} />
      <Route path="connections/new" element={<IntegrationConnectionWizardPage />} />
      <Route path="connections/:id" element={<IntegrationConnectionDetailPage />} />
      <Route path="providers" element={<IntegrationProvidersPage />} />
      <Route path="history" element={<IntegrationHistoryPage />} />
      <Route path="history/:id" element={<IntegrationLogDetailPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
