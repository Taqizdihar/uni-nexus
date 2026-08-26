import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ActiveProductionPage } from './production/ActiveProductionPage';
import { FailedPrintsPage } from './production/FailedPrintsPage';
import { PrintJobDetailPage } from './production/PrintJobDetailPage';
import { PrintJobsPage } from './production/PrintJobsPage';
import { PrintQueuePage } from './production/PrintQueuePage';
import { ProductionBoardPage } from './production/ProductionBoardPage';
import { ProductionCalendarPage } from './production/ProductionCalendarPage';
import { QualityControlPage } from './production/QualityControlPage';

export function CraftProduction() {
  return <Routes>
    <Route index element={<ProductionBoardPage />} />
    <Route path="active" element={<ActiveProductionPage />} />
    <Route path="queue" element={<PrintQueuePage />} />
    <Route path="jobs" element={<PrintJobsPage />} />
    <Route path="jobs/:id" element={<PrintJobDetailPage />} />
    <Route path="failures" element={<FailedPrintsPage />} />
    <Route path="qc" element={<QualityControlPage />} />
    <Route path="calendar" element={<ProductionCalendarPage />} />
    <Route path="*" element={<Navigate to="/app/craft/production" replace />} />
  </Routes>;
}
