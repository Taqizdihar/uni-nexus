import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockProjects } from '../../data/mock';
import { formatCurrency } from '../../lib/utils';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';

export function StudioProjects() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Proyek Studio</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Kelola proyek layanan kreatif dan hasil karya.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Proyek Baru
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[var(--nexus-border)] flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari proyek atau klien..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Status
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Tipe Layanan
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockProjects.map((project) => (
              <Card key={project.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{project.client}</h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{project.id}</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Layanan</span>
                      <span className="font-medium">{project.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tenggat Waktu</span>
                      <span className="font-medium">{project.deadline}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Nilai</span>
                      <span className="font-semibold text-[var(--nexus-charcoal)]">{formatCurrency(project.value)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Badge variant={
                      project.status === 'Completed' || project.status === 'Selesai' ? 'success' : 
                      project.status === 'Review' || project.status === 'Ditinjau' ? 'info' : 'warning'
                    }>
                      {project.status === 'Completed' ? 'Selesai' : project.status === 'Review' ? 'Ditinjau' : project.status === 'In Progress' ? 'Sedang Berjalan' : project.status}
                    </Badge>
                    <Badge variant={project.payment === 'Paid' || project.payment === 'Lunas' ? 'success' : 'outline'}>
                      {project.payment === 'Paid' ? 'Lunas Penuh' : 'Pembayaran Sebagian'}
                    </Badge>
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
