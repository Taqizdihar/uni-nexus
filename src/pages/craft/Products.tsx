import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProductCatalogPage } from './products/ProductCatalogPage';
import { ProductCreatePage } from './products/ProductCreatePage';
import { ProductDetailPage } from './products/ProductDetailPage';
import { ProductEditPage } from './products/ProductEditPage';
import { DesignLibraryPage } from './products/DesignLibraryPage';
import { PrintProfilesPage } from './products/PrintProfilesPage';
import { CostPricingPage } from './products/CostPricingPage';

export function CraftProducts() {
  return <Routes>
    <Route index element={<ProductCatalogPage />} />
    <Route path="new" element={<ProductCreatePage />} />
    <Route path="design-library" element={<DesignLibraryPage />} />
    <Route path="print-profiles" element={<PrintProfilesPage />} />
    <Route path="cost-pricing" element={<CostPricingPage />} />
    <Route path=":id/edit" element={<ProductEditPage />} />
    <Route path=":id" element={<ProductDetailPage />} />
    <Route path="*" element={<Navigate to="/app/craft/products" replace />} />
  </Routes>;
}
