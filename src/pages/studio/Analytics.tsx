import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { StudioAnalyticsPage } from './analytics/AnalyticsPages';

/** Read-only Studio business intelligence routes. */
export function StudioAnalytics() {
  return <Routes>
    <Route index element={<StudioAnalyticsPage report="overview" />} />
    <Route path="projects" element={<StudioAnalyticsPage report="projects" />} />
    <Route path="clients" element={<StudioAnalyticsPage report="clients" />} />
    <Route path="services" element={<StudioAnalyticsPage report="services" />} />
    <Route path="commercial" element={<StudioAnalyticsPage report="commercial" />} />
    <Route path="revenue" element={<StudioAnalyticsPage report="revenue" />} />
    <Route path="profitability" element={<StudioAnalyticsPage report="profitability" />} />
    <Route path="receivables" element={<StudioAnalyticsPage report="receivables" />} />
    <Route path="vendors" element={<StudioAnalyticsPage report="vendors" />} />
    <Route path="equipment" element={<StudioAnalyticsPage report="equipment" />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>;
}
