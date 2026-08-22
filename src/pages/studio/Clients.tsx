import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, Mail, Phone, Building2, MapPin } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function StudioClients() {
  const clients = [
    { id: 'CLI-101', name: 'Nusantara Architecture', contact: 'Bpk. Hendra', email: 'hendra@nusantara-arch.com', phone: '+62 811-1234-5678', activeProjects: 2, totalBilled: 125000000, type: 'Perusahaan' },
    { id: 'CLI-102', name: 'TechInnovate Startup', contact: 'Sarah J.', email: 'sarah@techinnovate.id', phone: '+62 812-9876-5432', activeProjects: 1, totalBilled: 45000000, type: 'Perusahaan' },
    { id: 'CLI-103', name: 'Dr. Anita Permata', contact: 'Anita P.', email: 'anita.p@gmail.com', phone: '+62 813-5555-8888', activeProjects: 0, totalBilled: 8500000, type: 'Individu' },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Direktori Klien</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola klien desain arsitektur, produk, dan prototipe.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 bg-black hover:bg-gray-800 text-white">
            <Plus className="w-4 h-4" /> Tambah Klien
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-gray-200">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari klien..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Info Klien</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Detail Kontak</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Proyek Aktif</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Total Ditagih</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {client.type === 'Corporate' || client.type === 'Perusahaan' ? <Building2 className="w-5 h-5 text-gray-500" /> : <MapPin className="w-5 h-5 text-gray-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.id} • {client.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{client.contact}</p>
                    <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {client.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {client.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={client.activeProjects > 0 ? 'success' : 'default'} className="rounded-md">
                      {client.activeProjects} Aktif
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(client.totalBilled)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="bg-white">Lihat Profil</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
