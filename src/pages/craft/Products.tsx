import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Filter, Box } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function CraftProducts() {
  const products = [
    { id: 'PRD-001', name: 'Custom Keycap', category: 'Accessories', price: 50000, cost: 6290, margin: '87%', time: '1h 20m', material: 'PLA Black' },
    { id: 'PRD-002', name: 'Miniature Building', category: 'Diorama', price: 850000, cost: 125000, margin: '85%', time: '14h 45m', material: 'PLA White' },
    { id: 'PRD-003', name: 'IoT Enclosure', category: 'Functional', price: 150000, cost: 24000, margin: '84%', time: '4h 30m', material: 'PETG Black' },
    { id: 'PRD-004', name: 'Nameplate', category: 'Signage', price: 100000, cost: 15000, margin: '85%', time: '2h 15m', material: 'PLA Yellow' },
    { id: 'PRD-005', name: 'Custom Figurine', category: 'Art', price: 350000, cost: 45000, margin: '87%', time: '8h 00m', material: 'Resin Grey' },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Katalog Produk</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola produk cetak 3D, penetapan harga, dan profil manufaktur.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Produk
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[var(--nexus-border)] flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari produk atau SKU..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Kategori
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-32 bg-[var(--nexus-cream-soft)] flex items-center justify-center border-b border-gray-100">
                  <Box className="w-10 h-10 text-gray-300" />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500">{product.id}</p>
                    <h3 className="font-bold text-[var(--nexus-charcoal)] leading-tight mt-0.5">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Harga</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Est. Biaya</span>
                      <span className="font-medium text-[var(--nexus-charcoal)]">{formatCurrency(product.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">Cetak: {product.time}</span>
                      <span className="font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Margin {product.margin}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
