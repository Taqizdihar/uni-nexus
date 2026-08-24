import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OrdersListPage } from './orders/OrdersListPage';
import { OrderCreatePage } from './orders/OrderCreatePage';
import { OrderDetailPage } from './orders/OrderDetailPage';
import { OrderPriorityPage } from './orders/OrderPriorityPage';
import { ProductionQueuePage } from './orders/ProductionQueuePage';
import { CustomOrdersPage } from './orders/CustomOrdersPage';
import { PartnerOrdersPage } from './orders/PartnerOrdersPage';
import { CompletedOrdersPage } from './orders/CompletedOrdersPage';
import { CancelledOrdersPage } from './orders/CancelledOrdersPage';
import { OrderEditPage } from './orders/OrderEditPage';

export function CraftOrders() {
  return (
    <Routes>
      <Route index element={<OrdersListPage />} />
      <Route path="new" element={<OrderCreatePage />} />
      <Route path="priority" element={<OrderPriorityPage />} />
      <Route path="queue" element={<ProductionQueuePage />} />
      <Route path="custom" element={<CustomOrdersPage />} />
      <Route path="partners" element={<PartnerOrdersPage />} />
      <Route path="completed" element={<CompletedOrdersPage />} />
      <Route path="cancelled" element={<CancelledOrdersPage />} />
      <Route path=":id/edit" element={<OrderEditPage />} />
      <Route path=":id" element={<OrderDetailPage />} />
    </Routes>
  );
}
