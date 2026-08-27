import React from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  ServiceCategoriesPage, ServiceDetailPage, ServiceFormPage, ServicePackageDetailPage,
  ServicePackageFormPage, ServicePackagesPage, ServicesCatalogPage,
} from './services/ServicesPages';

/** Canonical Studio service catalog. Static paths precede the service `:id` route. */
export function StudioServices() {
  return (
    <Routes>
      <Route index element={<ServicesCatalogPage />} />
      <Route path="new" element={<ServiceFormPage />} />
      <Route path="categories" element={<ServiceCategoriesPage />} />
      <Route path="packages" element={<ServicePackagesPage />} />
      <Route path="packages/new" element={<ServicePackageFormPage />} />
      <Route path="packages/:id/edit" element={<ServicePackageFormPage edit />} />
      <Route path="packages/:id" element={<ServicePackageDetailPage />} />
      <Route path=":id/edit" element={<ServiceFormPage edit />} />
      <Route path=":id" element={<ServiceDetailPage />} />
    </Routes>
  );
}
