import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { CustomerCreatePage } from './customers/CustomerCreatePage';
import { CustomerDetailPage } from './customers/CustomerDetailPage';
import { CustomerEditPage } from './customers/CustomerEditPage';
import { CustomersListPage } from './customers/CustomersListPage';

export function CraftCustomers() {
  return <Routes><Route index element={<CustomersListPage />} /><Route path="new" element={<CustomerCreatePage />} /><Route path="partners" element={<CustomersListPage partnersOnly />} /><Route path=":id/edit" element={<CustomerEditPage />} /><Route path=":id" element={<CustomerDetailPage />} /></Routes>;
}
