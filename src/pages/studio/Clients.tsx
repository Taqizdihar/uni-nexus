import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ClientCreatePage } from './clients/ClientCreatePage';
import { ClientDetailPage } from './clients/ClientDetailPage';
import { ClientEditPage } from './clients/ClientEditPage';
import { ClientsListPage } from './clients/ClientsListPage';

/** Static routes are declared before `:id` so they are never swallowed as a client ID. */
export function StudioClients() {
  return (
    <Routes>
      <Route index element={<ClientsListPage />} />
      <Route path="new" element={<ClientCreatePage />} />
      <Route path=":id/edit" element={<ClientEditPage />} />
      <Route path=":id" element={<ClientDetailPage />} />
    </Routes>
  );
}
