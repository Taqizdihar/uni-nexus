import React, { useEffect, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../lib/utils';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import type { CraftOrder, OrderStatus } from '../../../types/craft-orders';
import { EmptyOrdersState, OrderPageHeader, OrderStatusBadge, TableHeader, TableRow } from './components/OrdersUI';

interface Props { title: string; description: string; filterStatus?: OrderStatus[]; filterType?: CraftOrder['order_type']; emptyMessage: string; }

export function OrderSubListPage({ title, description, filterStatus, filterType, emptyMessage }: Props) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CraftOrder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const result = await craftOrdersApi.getOrders({ page: 1, limit: 100, statuses: filterStatus, orderType: filterType }); setOrders(result.items); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat pesanan.'); } finally { setLoading(false); } })(); }, [filterStatus, filterType]);
  return <div className="space-y-6 pb-8"><OrderPageHeader title={title} description={description} actions={<Button onClick={() => navigate('/app/craft/orders/new')}><Plus className="h-4 w-4" /> Pesanan Baru</Button>} />{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Card>{loading ? <div className="flex h-64 items-center justify-center text-sm text-[var(--nexus-muted)]">Memuat pesanan...</div> : orders.length === 0 ? <EmptyOrdersState title={emptyMessage} action={<Button onClick={() => navigate('/app/craft/orders/new')}><Plus className="h-4 w-4" /> Buat Pesanan</Button>} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><TableHeader><tr><th>ID Pesanan</th><th>Pelanggan</th><th>Kanal</th><th>Item</th><th>Status</th><th className="text-right">Total</th></tr></TableHeader><tbody>{orders.map(order => <TableRow key={order.id} onClick={() => navigate(`/app/craft/orders/${order.id}`)}><td><span className="orders-code">{order.order_code}</span></td><td><span className="font-medium">{order.customer_name}</span></td><td className="text-[var(--nexus-muted)]">{order.sales_channel_name}</td><td className="max-w-xs truncate text-[var(--nexus-muted)]">{order.item_summary || '-'}</td><td><OrderStatusBadge value={order.status_code} /></td><td className="text-right font-semibold">{formatCurrency(order.total_amount)}</td></TableRow>)}</tbody></table></div>}</Card></div>;
}
