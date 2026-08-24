import React from 'react';
import { OrderSubListPage } from './OrderSubListPage';
export function CompletedOrdersPage() {
  return <OrderSubListPage title="Pesanan Selesai" description="Pesanan yang sudah selesai, dikemas, atau dikirim." filterStatus={['completed','packed','shipped']} emptyMessage="Belum Ada Pesanan Selesai" />;
}
