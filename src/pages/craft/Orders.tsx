import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OrdersListPage } from './orders/OrdersListPage';
import { OrderCreatePage } from './orders/OrderCreatePage';
import { OrderDetailPage } from './orders/OrderDetailPage';
import { OrderPriorityPage } from './orders/OrderPriorityPage';
import { ProductionQueuePage } from './orders/ProductionQueuePage';

export function CraftOrders() {
  return (
    <Routes>
      <Route path="/" element={<OrdersListPage />} />
      <Route path="/new" element={<OrderCreatePage />} />
      <Route path="/priority" element={<OrderPriorityPage />} />
      <Route path="/queue" element={<ProductionQueuePage />} />
      <Route path="/:id" element={<OrderDetailPage />} />
    </Routes>
  );
}
