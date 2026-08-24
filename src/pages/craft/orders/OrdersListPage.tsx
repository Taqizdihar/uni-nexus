import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Download, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../lib/utils';
import { craftOrdersApi } from '../../../services/api/craft-orders.api';
import type { CraftOrder, CraftOrderFilters, SalesChannelOption } from '../../../types/craft-orders';
import { EmptyOrdersState, OrderPageHeader, OrderPriorityBadge, OrderStatusBadge, PaymentStatusBadge, TableHeader, TableRow } from './components/OrdersUI';

const statusLabels: Record<string, string> = { new: 'Baru', confirmed: 'Dikonfirmasi', waiting: 'Menunggu', ready: 'Siap Produksi', in_production: 'Diproduksi', qc: 'QC', completed: 'Selesai', packed: 'Dikemas', shipped: 'Dikirim', cancelled: 'Dibatalkan', returned: 'Dikembalikan' };
const priorityLabels: Record<string, string> = { low: 'Rendah', normal: 'Normal', high: 'Tinggi', critical: 'Kritis' };

export function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CraftOrder[]>([]);
  const [channels, setChannels] = useState<SalesChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<CraftOrderFilters>({ page: 1, limit: 20, sortBy: 'date', sortOrder: 'desc' });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await craftOrdersApi.getOrders(filters); setOrders(result.items); setMeta(result.meta); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat pesanan.'); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { void fetchOrders(); }, [fetchOrders]);
  useEffect(() => { void craftOrdersApi.getSalesChannels().then(setChannels).catch(() => undefined); }, []);

  const updateFilter = <K extends keyof CraftOrderFilters>(key: K, value: CraftOrderFilters[K]) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  const reset = () => setFilters({ page: 1, limit: 20, sortBy: 'date', sortOrder: 'desc' });
  const exportCsv = async () => { setExporting(true); try { await craftOrdersApi.exportOrders(filters); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal mengekspor CSV.'); } finally { setExporting(false); } };
  const activeFilters = useMemo(() => [
    filters.status && { key: 'status' as const, label: `Status: ${statusLabels[filters.status]}` },
    filters.priority && { key: 'priority' as const, label: `Prioritas: ${priorityLabels[filters.priority]}` },
    filters.paymentStatus && { key: 'paymentStatus' as const, label: `Pembayaran: ${filters.paymentStatus === 'paid' ? 'Lunas' : filters.paymentStatus === 'partial' ? 'Sebagian' : 'Belum Dibayar'}` },
    filters.channel && { key: 'channel' as const, label: `Kanal: ${channels.find(channel => channel.id === filters.channel)?.name || filters.channel}` },
    filters.orderType && { key: 'orderType' as const, label: `Tipe: ${filters.orderType}` },
    filters.dateFrom && { key: 'dateFrom' as const, label: `Dari: ${filters.dateFrom}` },
    filters.dateTo && { key: 'dateTo' as const, label: `Sampai: ${filters.dateTo}` },
    filters.overdue && { key: 'overdue' as const, label: 'Terlambat' },
  ].filter(Boolean) as { key: keyof CraftOrderFilters; label: string }[], [channels, filters]);

  return <div className="flex h-full flex-col gap-6 pb-8">
    <OrderPageHeader title="Semua Pesanan" description="Kelola seluruh pesanan operasional Uni-Inside Craft." actions={<><Button variant="outline" onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" />{exporting ? 'Mengekspor...' : 'Ekspor CSV'}</Button><Button onClick={() => navigate('/app/craft/orders/new')}><Plus className="h-4 w-4" /> Pesanan Baru</Button></>} />
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <Card className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 w-full flex-col">
        <div className="space-y-4 border-b border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/40 p-4 sm:p-5">
          <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" /><input className="orders-input pl-10" placeholder="Cari ID, pelanggan, produk, atau ID marketplace..." value={filters.search || ''} onChange={event => updateFilter('search', event.target.value || undefined)} /></div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <select className="orders-filter-select" aria-label="Status" value={filters.status || ''} onChange={event => updateFilter('status', event.target.value as CraftOrderFilters['status'] || undefined)}><option value="">Status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select className="orders-filter-select" aria-label="Prioritas" value={filters.priority || ''} onChange={event => updateFilter('priority', event.target.value as CraftOrderFilters['priority'] || undefined)}><option value="">Prioritas</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select className="orders-filter-select" aria-label="Pembayaran" value={filters.paymentStatus || ''} onChange={event => updateFilter('paymentStatus', event.target.value as CraftOrderFilters['paymentStatus'] || undefined)}><option value="">Pembayaran</option><option value="unpaid">Belum Dibayar</option><option value="partial">Dibayar Sebagian</option><option value="paid">Lunas</option></select>
            <select className="orders-filter-select" aria-label="Kanal" value={filters.channel || ''} onChange={event => updateFilter('channel', event.target.value ? Number(event.target.value) : undefined)}><option value="">Kanal</option>{channels.map(channel => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select>
            <select className="orders-filter-select" aria-label="Tipe pesanan" value={filters.orderType || ''} onChange={event => updateFilter('orderType', event.target.value as CraftOrderFilters['orderType'] || undefined)}><option value="">Tipe</option><option value="standard">Standar</option><option value="custom">Custom</option><option value="partner">Mitra</option><option value="internal">Internal</option></select>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setAdvancedOpen(open => !open)}><Filter className="h-3.5 w-3.5" /> Filter Lanjutan <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} /></Button><label className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${filters.overdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-[var(--nexus-border)] bg-white text-[var(--nexus-charcoal)]'}`}><input type="checkbox" className="sr-only" checked={Boolean(filters.overdue)} onChange={event => updateFilter('overdue', event.target.checked || undefined)} /> Hanya Terlambat</label>{activeFilters.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Reset Semua</Button>}</div>
          {advancedOpen && <div className="grid grid-cols-1 gap-3 border-t border-[var(--nexus-border)] pt-4 sm:grid-cols-2"><label className="orders-field"><span className="orders-field-label">Tanggal mulai</span><span className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" /><input type="date" className="orders-input pl-10" value={filters.dateFrom || ''} onChange={event => updateFilter('dateFrom', event.target.value || undefined)} /></span></label><label className="orders-field"><span className="orders-field-label">Tanggal akhir</span><span className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" /><input type="date" className="orders-input pl-10" value={filters.dateTo || ''} onChange={event => updateFilter('dateTo', event.target.value || undefined)} /></span></label></div>}
          {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--nexus-muted)]">Filter aktif</span>{activeFilters.map(filter => <span className="orders-filter-chip" key={filter.key}><span>{filter.label}</span><button type="button" className="rounded-full p-0.5 hover:bg-white" onClick={() => updateFilter(filter.key, undefined)} aria-label={`Hapus ${filter.label}`}><X className="h-3 w-3" /></button></span>)}</div>}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{loading ? <div className="flex h-72 items-center justify-center text-sm text-[var(--nexus-muted)]">Memuat pesanan...</div> : orders.length === 0 ? <EmptyOrdersState action={<Button onClick={() => navigate('/app/craft/orders/new')}><Plus className="h-4 w-4" /> Buat Pesanan Pertama</Button>} /> : <table className="w-full min-w-[980px] text-left text-sm"><TableHeader><tr>{['ID Pesanan', 'Pelanggan', 'Item', 'Jumlah', 'Tenggat', 'Prioritas', 'Status', 'Pembayaran', 'Total'].map(label => <th key={label}>{label}</th>)}</tr></TableHeader><tbody>{orders.map(order => <TableRow key={order.id} onClick={() => navigate(`/app/craft/orders/${order.id}`)}><td><span className="orders-code">{order.order_code}</span>{order.external_order_id && <span className="mt-1 block max-w-32 truncate text-[10px] text-[var(--nexus-muted)]">{order.external_order_id}</span>}</td><td><div className="font-medium text-[var(--nexus-charcoal)]">{order.customer_name}</div><span className="text-xs text-[var(--nexus-muted)]">{order.sales_channel_name}</span></td><td className="max-w-48 truncate text-[var(--nexus-muted)]">{order.item_summary || '-'}</td><td>{Number(order.total_quantity || 0)}</td><td><span>{order.deadline_at ? new Date(order.deadline_at).toLocaleDateString('id-ID') : '-'}</span>{Boolean(order.is_overdue) && <span className="mt-1 block text-[10px] font-semibold text-red-600">Terlambat</span>}</td><td><OrderPriorityBadge value={order.priority_code} /></td><td><OrderStatusBadge value={order.status_code} /></td><td><PaymentStatusBadge value={order.payment_status_code} /></td><td className="text-right font-semibold text-[var(--nexus-charcoal)]">{formatCurrency(order.total_amount)}</td></TableRow>)}</tbody></table>}</div>
        {orders.length > 0 && <div className="flex flex-col gap-3 border-t border-[var(--nexus-border)] px-5 py-3 text-xs text-[var(--nexus-muted)] sm:flex-row sm:items-center sm:justify-between"><span>Menampilkan {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} data</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => setFilters(current => ({ ...current, page: meta.page - 1 }))}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => setFilters(current => ({ ...current, page: meta.page + 1 }))}>Berikutnya</Button></div></div>}
      </div>
    </Card>
  </div>;
}
