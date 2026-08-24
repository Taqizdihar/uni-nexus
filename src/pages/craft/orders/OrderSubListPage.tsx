import React, { useEffect, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../lib/utils';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import type { CraftOrder, OrderStatus } from '../../../types/craft-orders';

interface Props { title: string; description: string; filterStatus?: OrderStatus[]; filterType?: CraftOrder['order_type']; emptyMessage: string; }
const statusLabels: Record<OrderStatus, string> = { new: 'Baru', confirmed: 'Dikonfirmasi', waiting: 'Menunggu', ready: 'Siap Produksi', in_production: 'Diproduksi', qc: 'QC', completed: 'Selesai', packed: 'Dikemas', shipped: 'Dikirim', cancelled: 'Dibatalkan', returned: 'Dikembalikan' };

export function OrderSubListPage({ title, description, filterStatus, filterType, emptyMessage }: Props) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CraftOrder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const result = await craftOrdersApi.getOrders({ page: 1, limit: 100, statuses: filterStatus, orderType: filterType }); setOrders(result.items); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat pesanan.'); } finally { setLoading(false); } })(); }, [filterStatus, filterType]);
  return <div className="space-y-6"><div className="flex justify-between gap-4"><div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">{title}</h1><p className="text-sm text-[var(--nexus-muted)] mt-1">{description}</p></div><Button onClick={() => navigate('/app/craft/orders/new')}><Plus className="w-4 h-4" /> Pesanan Baru</Button></div>{error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Card>{loading ? <div className="h-48 flex items-center justify-center text-gray-500">Memuat pesanan...</div> : orders.length === 0 ? <div className="h-48 flex flex-col items-center justify-center text-center"><Inbox className="w-9 h-9 text-gray-400 mb-2" /><h3 className="font-medium">{emptyMessage}</h3></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-4">ID Pesanan</th><th className="p-4">Pelanggan</th><th className="p-4">Item</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th></tr></thead><tbody>{orders.map(order => <tr key={order.id} onClick={() => navigate(`/app/craft/orders/${order.id}`)} className="cursor-pointer border-t hover:bg-gray-50"><td className="p-4 font-medium">{order.order_code}</td><td className="p-4">{order.customer_name}</td><td className="p-4 max-w-xs truncate">{order.item_summary || '-'}</td><td className="p-4"><Badge>{statusLabels[order.status_code]}</Badge></td><td className="p-4 text-right">{formatCurrency(order.total_amount)}</td></tr>)}</tbody></table></div>}</Card></div>;
}
