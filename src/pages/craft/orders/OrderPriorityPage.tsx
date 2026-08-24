import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function OrderPriorityPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPriority = async () => {
    setLoading(true);
    try {
      const res = await craftOrdersApi.getOrders({
        sortBy: 'priority',
        sortOrder: 'desc',
        limit: 50
      });
      setOrders(res.items);
    } catch (error) {
      alert('Gagal memuat prioritas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriority();
  }, []);

  const handleRecalculate = async () => {
    try {
      await craftOrdersApi.recalculatePriorities();
      await fetchPriority();
    } catch (error) {
      alert('Gagal mengkalkulasi prioritas');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/craft/orders')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Prioritas Produksi</h1>
            <p className="text-sm text-[var(--nexus-muted)] mt-1">Daftar pesanan berdasarkan tingkat urgensi.</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRecalculate}>
          <RefreshCw className="w-4 h-4" /> Kalkulasi Ulang
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Memuat...</div>
        ) : orders.length === 0 ? (
          <div className="text-center p-8 text-gray-500">Tidak ada pesanan aktif.</div>
        ) : (
          orders.map((order, idx) => (
            <Card 
              key={order.id} 
              className={`hover:border-[var(--nexus-yellow)] transition-colors cursor-pointer ${order.priority_code === 'critical' ? 'border-red-200 bg-red-50' : ''}`}
              onClick={() => navigate(`/app/craft/orders/${order.id}`)}
            >
              <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl font-bold text-gray-300 w-12 text-center">#{idx + 1}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[var(--nexus-charcoal)]">{order.order_code}</span>
                      <Badge variant={
                        order.priority_code === 'critical' ? 'error' : 
                        order.priority_code === 'high' ? 'warning' : 'default'
                      }>{order.priority_code.toUpperCase()}</Badge>
                      {order.is_overdue && (
                        <Badge variant="error" className="gap-1"><AlertTriangle className="w-3 h-3"/> Terlambat</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{order.customer_name} • {order.sales_channel_name}</div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Skor Prioritas:</span> {order.priority_score}
                      {order.priority_reason && (
                        <span className="ml-2 text-gray-500">({order.priority_reason})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                   <div className="flex items-center gap-1 text-gray-600">
                     <Clock className="w-4 h-4" />
                     {order.deadline_at ? new Date(order.deadline_at).toLocaleString() : 'Tidak ada tenggat'}
                   </div>
                   <div className="text-gray-500">
                     Estimasi waktu cetak: {order.total_print_minutes || '?'} menit
                   </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
