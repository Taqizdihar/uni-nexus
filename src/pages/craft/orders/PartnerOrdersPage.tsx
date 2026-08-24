import React from 'react';
import { OrderSubListPage } from './OrderSubListPage';
export function PartnerOrdersPage() {
  return <OrderSubListPage title="Pesanan Mitra" description="Pesanan yang berasal dari mitra." filterType="partner" emptyMessage="Belum Ada Pesanan Mitra" />;
}
