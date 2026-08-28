import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowDownRight, ArrowDownToLine, ArrowUpRight, BadgeDollarSign, ChevronDown, ExternalLink, Folder, Globe2, Link as LinkIcon, MessageCircle, Music2, Network, RefreshCw, ShoppingBag, Store, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import craftLogo from '../../assets/branding/logos/uni-inside-craft/Uni-Inside Craft Light Mode.png';
import studioLogo from '../../assets/branding/logos/uni-inside-studio/Uni-Inside Studio Light Mode.png';
import { dashboardApi } from '../../services/api/dashboard.api';
import type { DashboardKpi, DashboardOverview, DashboardQuickLink, DashboardRange } from '../../types/dashboard';

type QuickAccessWorkspace = 'studio' | 'craft';

const formatCurrency = (value: number, code = 'IDR') => new Intl.NumberFormat('id-ID', { style: 'currency', currency: code, maximumFractionDigits: code === 'IDR' ? 0 : 2 }).format(value || 0);
const compactCurrency = (value: number, code = 'IDR') => new Intl.NumberFormat('id-ID', { style: 'currency', currency: code, notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const formatDateTime = (value: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : '—';
const statusLabel = (value: string) => value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const iconMap: Record<string, React.ElementType> = { link: LinkIcon, website: Globe2, linktree: Network, instagram: Globe2, tiktok: Music2, youtube: Globe2, facebook: Globe2, linkedin: Globe2, whatsapp: MessageCircle, shopee: ShoppingBag, tokopedia: Store, store: Store, folder: Folder };

const emptyKpi = (key: DashboardKpi['key'], label: string, currencyCode: string): DashboardKpi => ({ key, label, value: 0, currency_code: currencyCode, snapshot: key === 'total_cash', description: '', comparison: null });

function KpiCard({ item, icon: Icon }: { item: DashboardKpi; icon: React.ElementType }) {
  const comparison = item.comparison;
  const delta = comparison?.delta_percent;
  const positive = (comparison?.delta_value || 0) >= 0;
  const directionGood = item.key === 'total_expenses' ? (comparison?.delta_value || 0) <= 0 : positive;
  return <Card className={item.key === 'net_result' ? 'border-[var(--nexus-yellow)] shadow-sm' : ''}><CardContent className="p-5"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-[var(--nexus-muted)] uppercase tracking-wider">{item.label}</p><p className="mt-1 text-xl font-bold text-[var(--nexus-charcoal)] truncate" title={formatCurrency(item.value, item.currency_code)}>{formatCurrency(item.value, item.currency_code)}</p></div><div className="p-2.5 rounded-lg bg-gray-100 text-gray-600 shrink-0"><Icon className="w-5 h-5" /></div></div><div className="mt-4 flex items-center gap-1.5 text-xs min-h-4">{comparison ? <>{positive ? <ArrowUpRight className={directionGood ? 'w-3.5 h-3.5 text-emerald-500' : 'w-3.5 h-3.5 text-red-500'} /> : <ArrowDownRight className={directionGood ? 'w-3.5 h-3.5 text-emerald-500' : 'w-3.5 h-3.5 text-red-500'} />}<span className={directionGood ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>{delta === null ? 'Tanpa persentase pembanding' : `${Math.abs(delta).toFixed(1)}% dibanding periode sebelumnya`}</span></> : <span className="text-gray-400">Saldo saat ini</span>}</div></CardContent></Card>;
}

function SummaryRow({ label, value, tone }: { label: string; value?: number; tone?: string }) {
  return <div className="flex justify-between items-center text-sm gap-3"><span className="text-gray-600">{label}</span><span className={`font-bold ${tone || ''}`}>{value === undefined ? '—' : value}</span></div>;
}

function QuickLinkCard({ link }: { key?: React.Key; link: DashboardQuickLink }) {
  const Icon = iconMap[link.icon_key] || LinkIcon;
  const internal = link.url.startsWith('/app/');
  const content = <><Icon className="h-4 w-4 shrink-0 text-[var(--nexus-yellow-deep)]" /><span className="min-w-0 truncate">{link.label}</span>{!internal && <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />}</>;
  const className = 'flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-[var(--nexus-charcoal)] shadow-sm transition-colors hover:border-[var(--nexus-yellow)] hover:bg-[var(--nexus-cream-soft)]';
  return internal ? <Link to={link.url} className={className}>{content}</Link> : <a href={link.url} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>;
}

function QuickAccessPanel({ workspace, links }: { workspace: QuickAccessWorkspace; links: DashboardOverview['quick_links'] }) {
  const workspaceLinks = workspace === 'studio' ? links.studio : links.craft;
  const logo = workspace === 'studio' ? studioLogo : craftLogo;
  const name = workspace === 'studio' ? 'Uni-Inside Studio' : 'Uni-Inside Craft';
  const emptyText = workspace === 'studio' ? 'Belum ada akses cepat Uni-Inside Studio yang dikonfigurasi.' : 'Belum ada akses cepat Uni-Inside Craft yang dikonfigurasi.';
  return <div id="quick-access-overlay" data-testid="quick-access-overlay" className="absolute inset-0 z-30 flex flex-col overflow-hidden rounded-xl border border-[var(--nexus-yellow)] bg-[#fffdf7] p-4 shadow-xl sm:p-5">
    <div className="flex items-center gap-3 border-b border-[var(--nexus-border)] pb-3"><p className="text-sm font-bold text-[var(--nexus-charcoal)]">Akses Cepat</p><img src={logo} alt={name} className="h-6 w-[112px] object-contain object-left" /></div>
    <div className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1">
      {workspaceLinks.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{workspaceLinks.map(link => <QuickLinkCard key={link.id} link={link} />)}</div> : <p className="py-5 text-center text-sm text-gray-500">{emptyText}</p>}
      {links.shared.length ? <section className={workspaceLinks.length ? 'mt-4 border-t border-[var(--nexus-border)] pt-4' : ''}><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--nexus-muted)]">Umum</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{links.shared.map(link => <QuickLinkCard key={link.id} link={link} />)}</div></section> : null}
    </div>
  </div>;
}

export function Dashboard() {
  const [range, setRange] = useState<DashboardRange>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openQuickAccess, setOpenQuickAccess] = useState<QuickAccessWorkspace | null>(null);
  const quickAccessControlsRef = useRef<HTMLDivElement>(null);
  const quickAccessOverlayRef = useRef<HTMLDivElement>(null);
  const studioTriggerRef = useRef<HTMLButtonElement>(null);
  const craftTriggerRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const response = await dashboardApi.overview({ range, start_date: range === 'custom' ? startDate || undefined : undefined, end_date: range === 'custom' ? endDate || undefined : undefined, currency: selectedCurrency || undefined }, signal);
      setData(response);
      if (!selectedCurrency && response.selected_currency) setSelectedCurrency(response.selected_currency);
    } catch (reason: any) {
      if (reason?.name !== 'AbortError') setError(reason?.message || 'Dasbor tidak dapat dimuat.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [range, startDate, endDate, selectedCurrency]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60_000); return () => window.clearInterval(interval); }, [load]);
  useEffect(() => {
    if (!openQuickAccess) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (quickAccessControlsRef.current?.contains(target) || quickAccessOverlayRef.current?.contains(target)) return;
      setOpenQuickAccess(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const trigger = openQuickAccess === 'studio' ? studioTriggerRef.current : craftTriggerRef.current;
      setOpenQuickAccess(null);
      window.requestAnimationFrame(() => trigger?.focus());
    };
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('click', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape); };
  }, [openQuickAccess]);

  const kpis = useMemo(() => new Map((data?.kpis || []).map(item => [item.key, item])), [data]);
  const currentCurrency = data?.selected_currency || selectedCurrency || 'IDR';
  const kpiItems = [
    kpis.get('total_cash') || emptyKpi('total_cash', 'Total Kas', currentCurrency),
    kpis.get('gross_revenue') || emptyKpi('gross_revenue', 'Pendapatan Kotor', currentCurrency),
    kpis.get('total_expenses') || emptyKpi('total_expenses', 'Total Pengeluaran', currentCurrency),
    kpis.get('net_result') || emptyKpi('net_result', 'Pendapatan Bersih', currentCurrency),
  ];
  const cash = data?.cash_flow;
  const cashMax = Math.max(cash?.cash_in || 0, cash?.cash_out || 0, 1);
  const chart = data?.revenue_breakdown;
  const quickLinks = data?.quick_links || { craft: [], studio: [], shared: [] };
  const onRange = (value: DashboardRange) => { setOpenQuickAccess(null); if (value === 'custom' && !startDate && !endDate) { const today = new Date().toISOString().slice(0, 10); setStartDate(today); setEndDate(today); } setRange(value); };
  const toggleQuickAccess = (workspace: QuickAccessWorkspace) => setOpenQuickAccess(current => current === workspace ? null : workspace);

  if (error) return <div className="min-h-[360px] grid place-items-center"><Card className="max-w-md"><CardContent className="p-8 text-center"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" /><h1 className="font-bold text-lg">Dasbor tidak dapat dimuat</h1><p className="text-sm text-gray-500 mt-2">{error}</p><Button className="mt-5" onClick={() => void load()}><RefreshCw className="w-4 h-4" />Coba Lagi</Button></CardContent></Card></div>;
  if (loading && !data) return <div className="space-y-6 animate-pulse"><div className="h-16 bg-gray-200 rounded-xl" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 bg-gray-200 rounded-xl" />)}</div><div className="h-72 bg-gray-200 rounded-xl" /></div>;

  return <div className="space-y-6 pb-12">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
      <div className="min-w-0"><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Dasbor Global</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Ringkasan terpadu seluruh operasional Uni-Inside.</p>{data?.generated_at && <p className="mt-1 text-xs text-gray-400">Diperbarui {new Intl.DateTimeFormat('id-ID', { timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(data.generated_at))}</p>}</div>
      <div ref={quickAccessControlsRef} className="flex min-w-0 flex-wrap items-center gap-2">
        <button ref={studioTriggerRef} type="button" data-testid="quick-access-studio" aria-haspopup="dialog" aria-controls="quick-access-overlay" aria-expanded={openQuickAccess === 'studio'} onClick={() => toggleQuickAccess('studio')} className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-[var(--nexus-charcoal)] shadow-sm transition-colors hover:border-[var(--nexus-yellow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--nexus-yellow)]/30"><span className="whitespace-nowrap">Akses Cepat</span><img src={studioLogo} alt="Uni-Inside Studio" className="h-5 w-[76px] object-contain" /><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openQuickAccess === 'studio' ? 'rotate-180' : ''}`} /></button>
        <button ref={craftTriggerRef} type="button" data-testid="quick-access-craft" aria-haspopup="dialog" aria-controls="quick-access-overlay" aria-expanded={openQuickAccess === 'craft'} onClick={() => toggleQuickAccess('craft')} className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-[var(--nexus-charcoal)] shadow-sm transition-colors hover:border-[var(--nexus-yellow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--nexus-yellow)]/30"><span className="whitespace-nowrap">Akses Cepat</span><img src={craftLogo} alt="Uni-Inside Craft" className="h-5 w-[76px] object-contain" /><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openQuickAccess === 'craft' ? 'rotate-180' : ''}`} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end" onMouseDown={() => setOpenQuickAccess(null)}>
        <select value={range} onChange={event => onRange(event.target.value as DashboardRange)} className="h-10 bg-white border border-gray-200 rounded-md px-3 text-sm font-medium text-gray-700"><option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option><option value="year">Tahun Ini</option><option value="custom">Rentang Tanggal</option></select>
        {range === 'custom' && <><input aria-label="Tanggal mulai" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="h-10 border border-gray-200 rounded-md px-2 text-sm" /><input aria-label="Tanggal akhir" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="h-10 border border-gray-200 rounded-md px-2 text-sm" /></>}
        {data?.available_currencies.length ? <select aria-label="Mata uang" value={selectedCurrency} onChange={event => { setOpenQuickAccess(null); setSelectedCurrency(event.target.value); }} className="h-10 bg-white border border-gray-200 rounded-md px-3 text-sm font-medium text-gray-700">{data.available_currencies.map(value => <option key={value} value={value}>{value}</option>)}</select> : null}
        <Button size="md" variant="outline" className="h-10 w-10 rounded-md px-0" aria-label="Muat ulang dasbor" title="Muat ulang dasbor" disabled={loading || (range === 'custom' && (!startDate || !endDate))} onClick={() => void load()}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>
    </div>

    <div ref={quickAccessOverlayRef} data-testid="dashboard-kpi-grid" className="relative"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><KpiCard item={kpiItems[0]} icon={Wallet} /><KpiCard item={kpiItems[1]} icon={TrendingUp} /><KpiCard item={kpiItems[2]} icon={ArrowDownToLine} /><KpiCard item={kpiItems[3]} icon={BadgeDollarSign} /></div>{openQuickAccess && <QuickAccessPanel workspace={openQuickAccess} links={quickLinks} />}</div>

    <div data-testid="dashboard-charts" className="grid grid-cols-1 gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Rincian Pendapatan</CardTitle></CardHeader><CardContent className="min-h-[300px] pt-4">{chart?.buckets.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={chart.buckets} margin={{ top: 0, right: 0, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D7" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tickFormatter={value => compactCurrency(value, currentCurrency)} tick={{ fill: '#737373', fontSize: 12 }} /><Tooltip formatter={(value: number) => formatCurrency(value, currentCurrency)} /><Legend iconType="circle" />{chart.series.includes('CRAFT') && <Bar name="Craft" dataKey="craft" fill="#FFD43B" radius={[4, 4, 0, 0]} maxBarSize={40} />}{chart.series.includes('STUDIO') && <Bar name="Studio" dataKey="studio" fill="#202020" radius={[4, 4, 0, 0]} maxBarSize={40} />}{chart.series.includes('SHARED') && <Bar name="Shared" dataKey="shared" fill="#64748B" radius={[4, 4, 0, 0]} maxBarSize={40} />}</BarChart></ResponsiveContainer> : <div className="grid h-[260px] place-items-center text-sm text-gray-400">Belum ada data pendapatan pada periode ini.</div>}</CardContent></Card><Card><CardHeader><CardTitle>Ringkasan Arus Kas</CardTitle></CardHeader><CardContent className="flex flex-col justify-center gap-6"><div className="space-y-2"><div className="flex justify-between text-sm gap-3"><span className="text-gray-500">Pemasukan (In)</span><span className="font-semibold text-emerald-600">{formatCurrency(cash?.cash_in || 0, currentCurrency)}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(cash?.cash_in || 0) / cashMax * 100}%` }} /></div></div><div className="space-y-2"><div className="flex justify-between text-sm gap-3"><span className="text-gray-500">Pengeluaran (Out)</span><span className="font-semibold text-red-600">{formatCurrency(cash?.cash_out || 0, currentCurrency)}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${(cash?.cash_out || 0) / cashMax * 100}%` }} /></div></div><div className="pt-4 border-t border-gray-100 flex justify-between gap-3"><span className="text-sm font-medium">Arus Bersih</span><span className={(cash?.net_cash_flow || 0) >= 0 ? 'text-lg font-bold text-emerald-600' : 'text-lg font-bold text-red-600'}>{formatCurrency(cash?.net_cash_flow || 0, currentCurrency)}</span></div></CardContent></Card></div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Card><CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50"><CardTitle className="text-sm">Ringkasan Craft</CardTitle></CardHeader><CardContent className="p-4 space-y-3"><SummaryRow label="Pesanan Masuk" value={data?.craft_summary?.orders_received} /><SummaryRow label="Menunggu Produksi" value={data?.craft_summary?.waiting_production} /><SummaryRow label="Sedang Dicetak" value={data?.craft_summary?.printing_now} tone="text-[var(--nexus-yellow-deep)]" /><SummaryRow label="Terlambat" value={data?.craft_summary?.overdue_orders} tone="text-red-500" /><SummaryRow label="Stok Mat. Menipis" value={data?.craft_summary?.low_stock} tone="text-amber-500" /></CardContent></Card><Card><CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50"><CardTitle className="text-sm">Ringkasan Studio</CardTitle></CardHeader><CardContent className="p-4 space-y-3"><SummaryRow label="Proyek Aktif" value={data?.studio_summary?.active_projects} /><SummaryRow label="Tenggat Mendekat" value={data?.studio_summary?.due_soon} tone="text-amber-500" /><SummaryRow label="Proyek Terlambat" value={data?.studio_summary?.overdue_projects} tone="text-red-500" /><SummaryRow label="Proyek Belum Lunas" value={data?.studio_summary?.unpaid_projects} tone="text-red-500" /><SummaryRow label="Selesai (Periode)" value={data?.studio_summary?.completed_in_period} /></CardContent></Card><Card><CardHeader className="py-4 border-b border-gray-100 bg-gray-50/50"><CardTitle className="text-sm">Ringkasan Produksi</CardTitle></CardHeader><CardContent className="p-4 space-y-3">{data?.production.length ? data.production.map(job => <div key={job.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0"><p className="font-semibold text-sm">{job.printer_name || 'Printer'}{job.printer_code ? ` · ${job.printer_code}` : ''}</p><p className="text-xs text-gray-500 mt-1">{job.job_code} · {job.job_name}</p><div className="flex justify-between text-xs mt-2"><span>{job.progress_percent}% selesai</span><span>{formatDateTime(job.estimated_finish_at)}</span></div><div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className="bg-[var(--nexus-yellow-deep)] h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, job.progress_percent))}%` }} /></div></div>) : <div className="py-8 text-center text-sm text-gray-400">Tidak ada pekerjaan cetak yang sedang berjalan.</div>}</CardContent></Card></div>

    <Card className="border-amber-200"><CardHeader className="py-4 border-b border-amber-100 bg-amber-50/30"><CardTitle className="text-base text-amber-900">Perlu Perhatian</CardTitle></CardHeader><CardContent className="p-3 space-y-1">{data?.attention.length ? data.attention.map(item => { const content = <><span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} /><span className="text-sm text-amber-900 leading-tight"><strong>{item.title}:</strong> {item.description}</span></>; const className = `flex items-start gap-3 p-2 rounded ${item.action_url ? 'hover:bg-amber-50/60' : ''}`; return item.action_url ? <Link to={item.action_url} key={item.id} className={className}>{content}</Link> : <div key={item.id} className={className}>{content}</div>; }) : <p className="py-5 text-center text-sm text-gray-400">Tidak ada perhatian operasional saat ini.</p>}</CardContent></Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card><CardHeader className="flex flex-row items-center justify-between py-4"><CardTitle className="text-base">Pesanan Craft Terbaru</CardTitle>{data?.navigation.craft_orders && <Link to="/app/craft/orders" className="text-xs font-medium text-[var(--nexus-muted)] hover:text-black">Lihat Semua</Link>}</CardHeader><CardContent className="p-0"><div className="divide-y divide-[var(--nexus-border)]">{data?.recent.craft_orders.length ? data.recent.craft_orders.map(order => { const content = <><div className="min-w-0"><p className="font-semibold text-sm truncate">{order.order_code} · {order.item_summary || 'Tanpa item'}</p><p className="text-xs text-gray-500 mt-1 truncate">{order.customer_name} · {order.channel_name}</p></div><div className="text-right shrink-0"><Badge variant={order.status_code === 'completed' ? 'success' : order.status_code === 'in_production' ? 'warning' : 'default'} className="mb-1.5">{statusLabel(order.status_code)}</Badge><p className="text-xs font-medium text-gray-700">{formatCurrency(order.total_amount, order.currency_code)}</p></div></>; const className = `p-4 flex items-center justify-between gap-3 ${data.navigation.craft_orders ? 'hover:bg-gray-50' : ''}`; return data.navigation.craft_orders ? <Link to={`/app/craft/orders/${order.id}`} key={order.id} className={className}>{content}</Link> : <div key={order.id} className={className}>{content}</div>; }) : <p className="p-6 text-center text-sm text-gray-400">Belum ada pesanan.</p>}</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between py-4"><CardTitle className="text-base">Proyek Studio Aktif</CardTitle>{data?.navigation.studio_projects && <Link to="/app/studio/projects" className="text-xs font-medium text-[var(--nexus-muted)] hover:text-black">Lihat Semua</Link>}</CardHeader><CardContent className="p-0"><div className="divide-y divide-[var(--nexus-border)]">{data?.recent.studio_projects.length ? data.recent.studio_projects.map(project => { const content = <><div className="min-w-0"><p className="font-semibold text-sm truncate">{project.project_code} · {project.project_name}</p><p className="text-xs text-gray-500 mt-1 truncate">{project.client_name} · Tenggat {formatDateTime(project.deadline_at)}</p></div><div className="text-right shrink-0"><Badge variant={project.status_code === 'review' ? 'info' : 'warning'} className="mb-1.5">{statusLabel(project.status_code)}</Badge><p className="text-xs font-medium text-gray-700">{formatCurrency(project.contract_value, project.currency_code)}</p></div></>; const className = `p-4 flex items-center justify-between gap-3 ${data.navigation.studio_projects ? 'hover:bg-gray-50' : ''}`; return data.navigation.studio_projects ? <Link to={`/app/studio/projects/${project.id}`} key={project.id} className={className}>{content}</Link> : <div key={project.id} className={className}>{content}</div>; }) : <p className="p-6 text-center text-sm text-gray-400">Belum ada proyek aktif.</p>}</div></CardContent></Card></div>
  </div>;
}
