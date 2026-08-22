import React from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Plus, MoreHorizontal } from 'lucide-react';
import { mockOrders } from '../../data/mock';

export function CraftProduction() {
  const columns = ['Menunggu', 'Siap', 'Sedang Dicetak', 'Kontrol Kualitas', 'Selesai', 'Dikemas'];
  
  // Distribute mock orders across columns for visual effect
  const kanbanData = {
    'Menunggu': mockOrders.filter(o => o.status === 'New' || o.status === 'Baru'),
    'Siap': mockOrders.filter(o => o.status === 'Confirmed' || o.status === 'Dikonfirmasi'),
    'Sedang Dicetak': mockOrders.filter(o => o.status === 'In Production' || o.status === 'Sedang Diproduksi'),
    'Kontrol Kualitas': [],
    'Selesai': mockOrders.filter(o => o.status === 'Completed' || o.status === 'Selesai'),
    'Dikemas': []
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Papan Produksi</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola pekerjaan cetak aktif dan antrean produksi.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Pekerjaan
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(col => (
            <div key={col} className="w-80 flex flex-col bg-gray-50/50 rounded-xl border border-[var(--nexus-border)] h-full">
              <div className="p-3 border-b border-[var(--nexus-border)] flex items-center justify-between bg-white rounded-t-xl">
                <span className="font-semibold text-sm text-[var(--nexus-charcoal)]">{col}</span>
                <Badge variant="outline">{kanbanData[col as keyof typeof kanbanData]?.length || 0}</Badge>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {kanbanData[col as keyof typeof kanbanData]?.map(order => (
                  <Card key={order.id} className="cursor-grab hover:border-[var(--nexus-yellow)] transition-colors shadow-sm">
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={order.priority === 'Critical' || order.priority === 'Kritis' ? 'error' : order.priority === 'High' || order.priority === 'Tinggi' ? 'warning' : 'default'} className="scale-90 origin-left">
                          {order.priority}
                        </Badge>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-sm text-[var(--nexus-charcoal)] leading-tight mb-1">{order.id}</p>
                      <p className="text-xs text-gray-700 font-medium truncate mb-2">{order.product} (x{order.qty})</p>
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>{order.customer}</span>
                        <span>{order.deadline}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
