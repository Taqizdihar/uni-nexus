import React from 'react';
import { OrderSubListPage } from './OrderSubListPage';
export function CustomOrdersPage() {
  return <OrderSubListPage title="Pesanan Custom" description="Pesanan dengan spesifikasi kustom." filterType="custom" emptyMessage="Belum Ada Pesanan Custom" />;
}
