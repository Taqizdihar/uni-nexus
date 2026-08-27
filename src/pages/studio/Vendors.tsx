import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { VendorDetailPage } from './vendors/VendorDetailPage';
import { VendorFormPage } from './vendors/VendorFormPage';
import { VendorsDirectoryPage } from './vendors/VendorsDirectoryPage';
export function StudioVendors() { return <Routes><Route index element={<VendorsDirectoryPage />} /><Route path="vendor" element={<VendorsDirectoryPage role="vendor" />} /><Route path="freelancers" element={<VendorsDirectoryPage role="freelancer" />} /><Route path="partners" element={<VendorsDirectoryPage role="studio_partner" />} /><Route path="assignments" element={<VendorsDirectoryPage assignmentsView />} /><Route path="new" element={<VendorFormPage />} /><Route path=":id/edit" element={<VendorFormPage edit />} /><Route path=":id" element={<VendorDetailPage />} /></Routes>; }
