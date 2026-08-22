import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { mockKPIs, revenueData, mockOrders, mockProjects, mockPrinters, mockMaterials } from '../../data/mock';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, ArrowDownToLine, BadgeDollarSign, ExternalLink, ShoppingBag, Store, Folder } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

function KPICard({ title, value, icon: Icon, trend, isGood, emphasize = false }: any) {
  return (
    <Card className={emphasize ? "border-[var(--nexus-yellow)] shadow-sm" : ""}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--nexus-muted)] uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-[var(--nexus-charcoal)]">{value}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${emphasize ? 'bg-[var(--nexus-yellow)] text-black' : 'bg-gray-100 text-gray-600'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {trend.startsWith('+') ? (
            <ArrowUpRight className={`w-3.5 h-3.5 ${isGood ? 'text-emerald-500' : 'text-red-500'}`} />
          ) : (
            <ArrowDownRight className={`w-3.5 h-3.5 ${isGood ? 'text-emerald-500' : 'text-red-500'}`} />
          )}
          <span className={isGood ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
            {trend.replace('+', '').replace('-', '')} {trend.startsWith('+') ? 'lebih tinggi' : 'lebih rendah'}
          </span>
          <span className="text-gray-400">vs bulan lalu</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const formatChartYAxis = (val: number) => {
    if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)} jt`;
    if (val >= 1000) return `Rp${val / 1000}k`;
    return `Rp${val}`;
  };

  const activePrinter = mockPrinters.find(p => p.status === 'Busy');

  return (
    <div className="space-y-6 pb-12">
      {/* Row 1: Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Dasbor Global</h1>
          <p className="text-sm text-[var(--nexus-muted)] mt-1">Ringkasan terpadu seluruh operasional Uni-Inside.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 outline-none focus:border-[var(--nexus-yellow)] shadow-sm">
            <option>Hari Ini</option>
            <option>Minggu Ini</option>
            <option>Bulan Ini</option>
            <option>Tahun Ini</option>
            <option>Rentang Tanggal</option>
          </select>
        </div>
      </div>

      {/* Row 2: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Kas" 
          value={formatCurrency(mockKPIs.totalCash)} 
          icon={Wallet} 
          trend="+12.5%" 
          isGood={true} 
        />
        <KPICard 
          title="Pendapatan Kotor" 
          value={formatCurrency(mockKPIs.grossRevenue)} 
          icon={TrendingUp} 
          trend="+8.2%" 
          isGood={true} 
        />
        <KPICard 
          title="Total Pengeluaran" 
          value={formatCurrency(mockKPIs.totalExpenses)} 
          icon={ArrowDownToLine} 
          trend="-2.4%" 
          isGood={true} 
          emphasize={true}
        />
        <KPICard 
          title="Pendapatan Bersih" 
          value={formatCurrency(mockKPIs.netIncome)} 
          icon={BadgeDollarSign} 
          trend="+15.3%" 
          isGood={true} 
          emphasize={true}
        />
      </div>

      {/* Row 3: Revenue Breakdown + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Rincian Pendapatan</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-6 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} tickFormatter={formatChartYAxis} />
                <Tooltip 
                  cursor={{fill: '#F5F1E8'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                <Bar dataKey="Craft" fill="#FFD43B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Studio" fill="#202020" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Arus Kas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center gap-6">
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Pemasukan (In)</span>
                 <span className="font-semibold text-emerald-600">{formatCurrency(120000000)}</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full w-[70%]" />
               </div>
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Pengeluaran (Out)</span>
                 <span className="font-semibold text-red-600">{formatCurrency(85000000)}</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full w-[45%]" />
               </div>
             </div>

             <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-sm font-medium text-[var(--nexus-charcoal)]">Arus Bersih</span>
               <span className="text-lg font-bold text-emerald-600">{formatCurrency(35000000)}</span>
             </div>
             
             <Link to="/app/finance">
               <Button variant="outline" className="w-full mt-2 text-xs">Lihat Laporan Bendahara</Button>
             </Link>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Operational Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Craft Overview */}
        <Card>
          <CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-sm">Ringkasan Craft</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Pesanan Masuk</span>
               <span className="font-bold">12</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Menunggu Produksi</span>
               <span className="font-bold">8</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Sedang Dicetak</span>
               <span className="font-bold text-[var(--nexus-yellow-deep)]">2</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Terlambat</span>
               <span className="font-bold text-red-500">1</span>
             </div>
             <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
               <span className="text-gray-600">Stok Mat. Menipis</span>
               <span className="font-bold text-amber-500">{mockMaterials.filter(m => m.status === 'Low' || m.status === 'Critical').length}</span>
             </div>
          </CardContent>
        </Card>

        {/* Studio Overview */}
        <Card>
          <CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-sm">Ringkasan Studio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Proyek Aktif</span>
               <span className="font-bold">5</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Tenggat Mendekat</span>
               <span className="font-bold text-amber-500">2</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Proyek Belum Lunas</span>
               <span className="font-bold text-red-500">1</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-gray-600">Selesai (Bln)</span>
               <span className="font-bold">4</span>
             </div>
          </CardContent>
        </Card>

        {/* Production Overview */}
        <Card>
          <CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-sm">Ringkasan Produksi</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col h-full">
            {activePrinter ? (
              <div className="space-y-4">
                <div>
                   <p className="text-xs text-gray-500 mb-1">Printer Aktif</p>
                   <p className="font-semibold text-[var(--nexus-charcoal)] text-sm">{activePrinter.name}</p>
                </div>
                <div>
                   <p className="text-xs text-gray-500 mb-1">Pekerjaan Saat Ini</p>
                   <p className="font-medium text-[var(--nexus-charcoal)] text-sm">{activePrinter.currentJob}</p>
                </div>
                <div className="pt-2">
                   <div className="flex justify-between text-xs mb-1.5">
                     <span className="font-medium">{activePrinter.progress}% Selesai</span>
                     <span className="text-gray-500">Est: {activePrinter.estimatedCompletion}</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-1.5">
                     <div 
                        className="bg-[var(--nexus-yellow-deep)] h-1.5 rounded-full" 
                        style={{ width: `${activePrinter.progress}%` }}
                     />
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Semua printer diam.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Requires Attention & Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-amber-200">
          <CardHeader className="py-4 border-b border-amber-100 bg-amber-50/30">
            <CardTitle className="text-base text-amber-900">Perlu Perhatian</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3 p-2 hover:bg-amber-50/50 rounded transition-colors cursor-pointer">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-amber-900 leading-tight">Pesanan <span className="font-bold">NX-102</span> mungkin melewati tenggat hari ini.</p>
            </div>
            <div className="flex items-start gap-3 p-2 hover:bg-amber-50/50 rounded transition-colors cursor-pointer">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0" />
              <p className="text-sm text-amber-900 leading-tight">PLA Black tersisa: 140g (Stok Menipis).</p>
            </div>
            <div className="flex items-start gap-3 p-2 hover:bg-amber-50/50 rounded transition-colors cursor-pointer">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0" />
              <p className="text-sm text-amber-900 leading-tight">Invoice PRJ-2407-15 menunggu pembayaran akhir.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-base">Akses Cepat</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-medium text-[var(--nexus-charcoal)] transition-colors">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              Shopee
            </a>
            <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-medium text-[var(--nexus-charcoal)] transition-colors">
              <Store className="w-4 h-4 text-black" />
              TikTok Shop
            </a>
            <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-medium text-[var(--nexus-charcoal)] transition-colors">
              <Store className="w-4 h-4 text-green-500" />
              Tokopedia
            </a>
            <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-medium text-[var(--nexus-charcoal)] transition-colors">
              <Folder className="w-4 h-4 text-blue-500" />
              Google Drive
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Pesanan Craft Terbaru</CardTitle>
            <Link to="/app/craft/orders" className="text-xs font-medium text-[var(--nexus-muted)] hover:text-black">Lihat Semua</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--nexus-border)]">
              {mockOrders.slice(0,3).map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-semibold text-sm text-[var(--nexus-charcoal)]">{order.id} - {order.product}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customer} • {order.channel}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === 'Sedang Diproduksi' || order.status === 'In Production' ? 'warning' : order.status === 'Selesai' || order.status === 'Completed' ? 'success' : 'default'} className="mb-1.5">
                      {order.status}
                    </Badge>
                    <p className="text-xs font-medium text-gray-700">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Proyek Studio Aktif</CardTitle>
            <Link to="/app/studio/projects" className="text-xs font-medium text-[var(--nexus-muted)] hover:text-black">Lihat Semua</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--nexus-border)]">
              {mockProjects.slice(0,3).map(project => (
                <div key={project.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-semibold text-sm text-[var(--nexus-charcoal)]">{project.id} - {project.client}</p>
                    <p className="text-xs text-gray-500 mt-1">{project.type} • Tenggat {project.deadline}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={project.status === 'Selesai' || project.status === 'Completed' ? 'success' : project.status === 'Tinjauan' || project.status === 'Review' ? 'info' : 'warning'} className="mb-1.5">
                      {project.status}
                    </Badge>
                    <p className="text-xs font-medium text-gray-700">{formatCurrency(project.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
