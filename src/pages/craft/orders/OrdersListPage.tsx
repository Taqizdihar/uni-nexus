import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { CraftOrder, CraftOrderFilters } from '../../../types/craft-orders';
import { formatCurrency } from '../../../lib/utils';
import { Search, Plus, Filter, Download, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OrdersListPage() {
  const [orders, setOrders] = useState<CraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CraftOrderFilters>({ page: 1, limit: 20 });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await craftOrdersApi.getOrders(filters);
      setOrders(result.items);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const getPriorityBadgeVariant = (code: string) => {
    if (code === 'critical') return 'error';
    if (code === 'high') return 'warning';
    return 'default';
  };

  const getStatusBadgeVariant = (code: string) => {
    if (['completed', 'packed', 'shipped'].includes(code)) return 'success';
    if (['in_production', 'qc'].includes(code)) return 'warning';
    if (['cancelled', 'returned'].includes(code)) return 'error';
    return 'info';
  };

  const statusLabels: Record<string, string> = {
    new: 'Baru',
    confirmed: 'Dikonfirmasi',
    waiting: 'Menunggu',
    ready: 'Siap Produksi',
    in_production: 'Sedang Diproduksi',
    qc: 'Kontrol Kualitas',
    completed: 'Selesai',
    packed: 'Dikemas',
    shipped: 'Dikirim',
    cancelled: 'Dibatalkan',
    returned: 'Dikembalikan'
  };

  const priorityLabels: Record<string, string> = {
    low: 'Rendah',
    normal: 'Normal',
    high: 'Tinggi',
    critical: 'Kritis'
  };

  const paymentLabels: Record<string, string> = {
    unpaid: 'Belum Dibayar',
    partial: 'Dibayar Sebagian',
    paid: 'Lunas',
    refunded: 'Dikembalikan',
    cancelled: 'Dibatalkan'
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Semua Pesanan</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola semua pesanan operasional Craft.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => {/* Handle export CSV */}}>
            <Download className="w-4 h-4" /> Ekspor
          </Button>
          <Button className="gap-2" onClick={() => navigate('/app/craft/orders/new')}>
            <Plus className="w-4 h-4" /> Pesanan Baru
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[var(--nexus-border)] flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari ID, pelanggan, produk, atau ID marketplace..." 
              value={filters.search || ''}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Status
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Prioritas
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex items-center justify-center h-full text-gray-500">Memuat pesanan...</div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-500">
               <p className="text-red-500">{error}</p>
               <Button variant="outline" className="mt-4" onClick={fetchOrders}>Coba Lagi</Button>
             </div>
          ) : orders.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center p-8">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                 <Inbox className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-1">Belum Ada Pesanan</h3>
               <p className="text-sm text-gray-500 max-w-sm mb-6">
                 Pesanan Craft yang dibuat atau diimpor akan muncul di sini. Pesanan dapat berasal dari marketplace, pesanan langsung, mitra, maupun pesanan custom.
               </p>
               <Button onClick={() => navigate('/app/craft/orders/new')} className="gap-2">
                 <Plus className="w-4 h-4" /> Pesanan Baru
               </Button>
             </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 sticky top-0 border-b border-[var(--nexus-border)] shadow-sm">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">ID Pesanan</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Pelanggan</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Item</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Jumlah</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Tenggat</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Prioritas</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Pembayaran</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/app/craft/orders/${order.id}`)}>
                    <td className="px-6 py-4 font-medium text-[var(--nexus-charcoal)]">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer_name}</span>
                        <span className="text-xs text-gray-500">{order.sales_channel_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate" title={order.item_summary}>
                      {order.item_summary || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{order.total_quantity || 0}</td>
                    <td className="px-6 py-4 text-gray-700">
                       {order.deadline_at ? new Date(order.deadline_at).toLocaleDateString() : '-'}
                       {order.is_overdue && <span className="text-red-500 ml-2 text-xs font-medium">Terlambat</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getPriorityBadgeVariant(order.priority_code)}>
                        {priorityLabels[order.priority_code] || order.priority_code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(order.status_code)}>
                        {statusLabels[order.status_code] || order.status_code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${order.payment_status_code === 'paid' ? 'text-green-600' : order.payment_status_code === 'partial' ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {paymentLabels[order.payment_status_code] || order.payment_status_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-[var(--nexus-charcoal)]">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {orders.length > 0 && (
          <div className="p-4 border-t border-[var(--nexus-border)] flex items-center justify-between text-sm text-gray-500 bg-white">
            <span>Menampilkan {(meta.page - 1) * meta.limit + 1} hingga Math.min(meta.page * meta.limit, meta.total) dari {meta.total} data</span>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={meta.page <= 1}
                onClick={() => setFilters({ ...filters, page: meta.page - 1 })}
              >
                Sebelumnya
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={meta.page >= meta.totalPages}
                onClick={() => setFilters({ ...filters, page: meta.page + 1 })}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
