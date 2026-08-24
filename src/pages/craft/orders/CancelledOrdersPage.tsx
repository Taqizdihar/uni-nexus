import React from 'react';
import { OrderSubListPage } from './OrderSubListPage';
export function CancelledOrdersPage() {
  return <OrderSubListPage title="Dibatalkan / Dikembalikan" description="Pesanan yang dibatalkan atau dikembalikan." filterStatus={['cancelled','returned']} emptyMessage="Belum Ada Pesanan Dibatalkan atau Dikembalikan" />;
}
