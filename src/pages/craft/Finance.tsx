import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const financeData = [
  { name: 'Jan', revenue: 45000000, expenses: 32000000 },
  { name: 'Feb', revenue: 52000000, expenses: 34000000 },
  { name: 'Mar', revenue: 48000000, expenses: 31000000 },
  { name: 'Apr', revenue: 61000000, expenses: 38000000 },
  { name: 'Mei', revenue: 59000000, expenses: 36000000 },
  { name: 'Jun', revenue: 68000000, expenses: 40000000 },
];

export function CraftFinance() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Keuangan Craft</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Gambaran keuangan dan profitabilitas operasi manufaktur 3D.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Ekspor Laporan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[var(--nexus-muted)] uppercase tracking-wider mb-2">Pendapatan Bulanan</p>
            <p className="text-3xl font-bold text-[var(--nexus-charcoal)]">{formatCurrency(68000000)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 text-sm font-medium">15.2% lebih tinggi</span>
              <span className="text-gray-400 text-sm">vs bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[var(--nexus-muted)] uppercase tracking-wider mb-2">HPP & Pengeluaran</p>
            <p className="text-3xl font-bold text-[var(--nexus-charcoal)]">{formatCurrency(40000000)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
              <span className="text-red-600 text-sm font-medium">11.1% lebih tinggi</span>
              <span className="text-gray-400 text-sm">vs bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--nexus-yellow)] shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[var(--nexus-muted)] uppercase tracking-wider mb-2">Margin Bersih</p>
            <p className="text-3xl font-bold text-[var(--nexus-charcoal)]">41.1%</p>
            <div className="flex items-center gap-1.5 mt-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 text-sm font-medium">2.4% lebih baik</span>
              <span className="text-gray-400 text-sm">vs bulan lalu</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Arus Kas (6 Bulan)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={financeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D7" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} tickFormatter={(val) => `Rp${val/1000000}Jt`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Pendapatan" />
              <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" name="Pengeluaran" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
