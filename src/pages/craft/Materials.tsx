import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MaterialInventoryPage } from './materials/MaterialInventoryPage';
import { MaterialCreatePage } from './materials/MaterialCreatePage';
import { MaterialDetailPage } from './materials/MaterialDetailPage';
import { MaterialEditPage } from './materials/MaterialEditPage';
import { FilamentSpoolsPage } from './materials/FilamentSpoolsPage';
import { StockMovementsPage } from './materials/StockMovementsPage';
import { LowStockPage } from './materials/LowStockPage';
import { MaterialWastePage } from './materials/MaterialWastePage';

export function CraftMaterials() {
  return <Routes>
    <Route index element={<Navigate to="filament" replace />} />
    <Route path="filament" element={<MaterialInventoryPage />} />
    <Route path="new" element={<MaterialCreatePage />} />
    <Route path="spools" element={<FilamentSpoolsPage />} />
    <Route path="movements" element={<StockMovementsPage />} />
    <Route path="low-stock" element={<LowStockPage />} />
    <Route path="waste" element={<MaterialWastePage />} />
    <Route path=":id/edit" element={<MaterialEditPage />} />
    <Route path=":id" element={<MaterialDetailPage />} />
    <Route path="*" element={<Navigate to="filament" replace />} />
  </Routes>;
}
