import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Filter, PenTool, LayoutTemplate, Shapes } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function StudioServices() {
  const services = [
    { id: 'SVC-001', name: 'Model Skala Arsitektur', category: 'Prototipe', rate: 'Mulai: Rp 2.500.000', icon: LayoutTemplate, description: 'Model arsitektur detail tinggi termasuk pembagian interior dan atap yang bisa dilepas.' },
    { id: 'SVC-002', name: 'Desain Konsep Produk', category: 'Desain 3D', rate: 'Rp 350.000 / jam', icon: PenTool, description: 'Dari sketsa hingga model CAD 3D yang dapat diproduksi. Proses desain iteratif.' },
    { id: 'SVC-003', name: 'Rekayasa Balik (Reverse Engineering)', category: 'Pemindaian 3D', rate: 'Mulai: Rp 1.200.000', icon: Shapes, description: 'Pemindaian 3D bagian yang ada dan konversi ke model CAD parametrik.' },
    { id: 'SVC-004', name: 'Manufaktur Volume Rendah', category: 'Produksi', rate: 'Harga Kustom', icon: LayoutTemplate, description: 'Produksi batch 10-500 unit menggunakan farm pencetakan 3D atau pengecoran.' },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Katalog Layanan</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola penawaran layanan studio dan harga dasar.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 bg-black hover:bg-gray-800 text-white">
            <Plus className="w-4 h-4" /> Tambah Layanan
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-transparent">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari layanan..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black shadow-sm"
          />
        </div>
        <Button variant="outline" className="bg-white shadow-sm gap-2">
          <Filter className="w-4 h-4" /> Filter Kategori
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="border-gray-200 hover:border-gray-300 transition-colors bg-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <service.icon className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                      <p className="text-xs font-medium text-gray-500">{service.category}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {service.rate}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs bg-white">Edit Detail</Button>
                    <Button variant="outline" size="sm" className="text-xs bg-white">Lihat Proyek</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
