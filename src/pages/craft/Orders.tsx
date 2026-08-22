import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockOrders } from '../../data/mock';
import { formatCurrency } from '../../lib/utils';
import { Search, Plus, Filter, Download } from 'lucide-react';

export function CraftOrders() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pesanan Craft</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola pesanan pencetakan 3D dan antrean produksi.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Ekspor
          </Button>
          <Button className="gap-2">
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
              placeholder="Cari berdasarkan ID, pelanggan, atau produk..." 
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
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 sticky top-0 border-b border-[var(--nexus-border)] shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">ID Pesanan</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Pelanggan</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Produk</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Jumlah</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tenggat</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Prioritas</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-medium text-[var(--nexus-charcoal)]">{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer}</span>
                      <span className="text-xs text-gray-500">{order.channel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{order.product}</td>
                  <td className="px-6 py-4 text-gray-700">{order.qty}</td>
                  <td className="px-6 py-4 text-gray-700">{order.deadline}</td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      order.priority === 'Critical' || order.priority === 'Kritis' ? 'error' : 
                      order.priority === 'High' || order.priority === 'Tinggi' ? 'warning' : 'default'
                    }>
                      {order.priority}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      order.status === 'Completed' || order.status === 'Selesai' ? 'success' : 
                      order.status === 'In Production' || order.status === 'Sedang Diproduksi' ? 'warning' : 'info'
                    }>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-[var(--nexus-charcoal)]">
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-[var(--nexus-border)] flex items-center justify-between text-sm text-gray-500 bg-white">
          <span>Menampilkan 1 hingga {mockOrders.length} dari {mockOrders.length} data</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled>Berikutnya</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
