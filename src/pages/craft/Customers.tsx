import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, Mail, Phone, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function CraftCustomers() {
  const customers = [
    { id: 'CUST-001', name: 'PT Indofood', type: 'Mitra B2B', contact: 'Budi Santoso', email: 'budi@indofood.com', spent: 145000000, lastOrder: '2 hari lalu', status: 'Aktif' },
    { id: 'CUST-002', name: 'Studio Kreatif', type: 'Agensi', contact: 'Sari W.', email: 'sari@studiokreatif.id', spent: 45000000, lastOrder: '1 minggu lalu', status: 'Aktif' },
    { id: 'CUST-003', name: 'Arch. Mahendra', type: 'Individu', contact: 'Mahendra', email: 'mahendra.arch@gmail.com', spent: 12500000, lastOrder: '3 minggu lalu', status: 'Aktif' },
    { id: 'CUST-004', name: 'EduTech Indo', type: 'Institusi', contact: 'Dr. Rani', email: 'rani@edutech.ac.id', spent: 8500000, lastOrder: '2 bulan lalu', status: 'Tidak Aktif' },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pelanggan & Mitra</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola akun grosir, dropshipper, dan klien B2B.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Pelanggan
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[var(--nexus-border)] flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama, email, atau perusahaan..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((cust) => (
              <Card key={cust.id} className="border-gray-200 shadow-sm hover:border-[var(--nexus-yellow)] transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--nexus-charcoal)] text-lg">{cust.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{cust.id} • {cust.type}</p>
                    </div>
                    <Badge variant={cust.status === 'Aktif' || cust.status === 'Active' ? 'success' : 'default'}>{cust.status}</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-gray-500" />
                      </div>
                      <span className="truncate">{cust.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Phone className="w-3 h-3 text-gray-500" />
                      </div>
                      <span className="truncate">{cust.contact}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Total Nilai Seumur Hidup</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(cust.spent)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-2">
                      Lihat Profil <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
