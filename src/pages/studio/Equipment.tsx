import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AssetDetailPage, AssetFormPage, AssignmentsPage, AssetsListPage, EquipmentOverviewPage, MaintenancePage } from './equipment/EquipmentPages';

/** Static paths come before `:id`, preserving every dedicated equipment route. */
export function StudioEquipment() {
  return <Routes>
    <Route index element={<EquipmentOverviewPage />} />
    <Route path="assets" element={<AssetsListPage />} />
    <Route path="assets/new" element={<AssetFormPage />} />
    <Route path="assets/:id/edit" element={<AssetFormPage edit />} />
    <Route path="assets/:id" element={<AssetDetailPage />} />
    <Route path="assignments" element={<AssignmentsPage />} />
    <Route path="maintenance" element={<MaintenancePage />} />
  </Routes>;
}
