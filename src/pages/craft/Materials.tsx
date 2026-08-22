import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { mockMaterials } from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function CraftMaterials() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Inventaris Material</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Lacak filamen, resin, dan material produksi lainnya.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Terima Stok
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[var(--nexus-border)] flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan ID, tipe, atau warna..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--nexus-yellow)]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" /> Status
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 sticky top-0 border-b border-[var(--nexus-border)] shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">ID Material</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tipe & Warna</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tersisa</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Tingkat Visual</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Est. Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockMaterials.map((mat) => {
                const percentage = Math.round((mat.remaining / mat.initial) * 100);
                // Rough estimate cost per gram (170rp)
                const estValue = mat.remaining * 170;
                
                return (
                  <tr key={mat.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-[var(--nexus-charcoal)]">{mat.id}</td>
                    <td className="px-6 py-4 font-medium">{mat.type}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="font-semibold">{mat.remaining}g</span> / {mat.initial}g
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${percentage < 20 ? 'bg-red-500' : percentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 mt-1 inline-block">{percentage}%</span>
                    </td>
                    <td className="px-6 py-4">
                      {mat.status === 'Critical' || mat.status === 'Kritis' ? (
                        <Badge variant="error" className="gap-1.5"><AlertTriangle className="w-3 h-3" /> Kritis</Badge>
                      ) : mat.status === 'Low' || mat.status === 'Rendah' ? (
                        <Badge variant="warning">Stok Sedikit</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                      {formatCurrency(estValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
