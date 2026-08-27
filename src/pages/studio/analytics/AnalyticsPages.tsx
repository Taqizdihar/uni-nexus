import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileSpreadsheet, FileText, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioAnalyticsApi } from '../../../services/api/studio-analytics.api';
import type { AnalyticsExportFormat, AnalyticsFilters, AnalyticsKpis, AnalyticsMetric, AnalyticsReport, AnalyticsRow, StudioAnalyticsData } from '../../../types/studio-analytics';

type Endpoint = (filters: Partial<AnalyticsFilters>) => Promise<StudioAnalyticsData>;
interface Config { report: AnalyticsReport; title: string; description: string; endpoint: Endpoint; empty: string; }

const configs: Record<AnalyticsReport, Config> = {
  overview: { report: 'overview', title: 'Ringkasan Analitik', description: 'Analisis kinerja proyek, klien, layanan, pendapatan, dan profitabilitas Uni-Inside Studio.', endpoint: studioAnalyticsApi.overview, empty: 'Belum Ada Aktivitas Studio pada Periode Ini' },
  projects: { report: 'projects', title: 'Proyek', description: 'Volume, pipeline, pengiriman, cycle time, dan margin proyek Studio.', endpoint: studioAnalyticsApi.projects, empty: 'Belum Ada Data Proyek pada Periode Ini' },
  clients: { report: 'clients', title: 'Klien', description: 'Nilai bisnis, repeat client, dan konsentrasi klien.', endpoint: studioAnalyticsApi.clients, empty: 'Belum Ada Aktivitas Klien pada Periode Ini' },
  services: { report: 'services', title: 'Layanan', description: 'Pemakaian layanan berdasarkan snapshot line historis.', endpoint: studioAnalyticsApi.services, empty: 'Belum Ada Data Layanan pada Periode Ini' },
  commercial: { report: 'commercial', title: 'Penawaran & Penagihan', description: 'Funnel quotation, invoice, dan kas yang benar-benar terkumpul.', endpoint: studioAnalyticsApi.commercial, empty: 'Belum Ada Aktivitas Komersial pada Periode Ini' },
  revenue: { report: 'revenue', title: 'Pendapatan & Arus Kas', description: 'Pergerakan kas aktual Studio dari transaksi keuangan posted.', endpoint: studioAnalyticsApi.revenue, empty: 'Belum Ada Aktivitas Keuangan pada Periode Ini' },
  profitability: { report: 'profitability', title: 'Profitabilitas', description: 'Commercial basis, biaya proyek aktual, dan margin tercatat.', endpoint: studioAnalyticsApi.profitability, empty: 'Belum Ada Data Profitabilitas pada Periode Ini' },
  receivables: { report: 'receivables', title: 'Piutang', description: 'Outstanding receivables, aging, dan kecepatan penagihan.', endpoint: studioAnalyticsApi.receivables, empty: 'Belum Ada Piutang Aktif' },
  vendors: { report: 'vendors', title: 'Vendor / Freelancer', description: 'Komitmen fee eksternal dan payout aktual yang tercatat.', endpoint: studioAnalyticsApi.vendors, empty: 'Belum Ada Penugasan Eksternal pada Periode Ini' },
  equipment: { report: 'equipment', title: 'Peralatan & Aset', description: 'Pemakaian aset overlap-safe dan aktivitas pemeliharaan.', endpoint: studioAnalyticsApi.equipment, empty: 'Belum Ada Data Aset Studio' },
};

const jakartaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).reduce((result, item) => ({ ...result, [item.type]: item.value }), {} as Record<string, string>);
const dateText = () => { const parts = jakartaDate(); return `${parts.year}-${parts.month}-${parts.day}`; };
const plusDays = (date: string, amount: number) => { const next = new Date(`${date}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + amount); return next.toISOString().slice(0, 10); };
const defaultFilters = (): AnalyticsFilters => { const end = dateText(); return { start_date: plusDays(end, -29), end_date: end, compare: false, page: 1, limit: 20 }; };
const rowValue = (value: unknown) => typeof value === 'number' ? (Math.abs(value) >= 1000 ? formatCurrency(value) : value.toLocaleString('id-ID', { maximumFractionDigits: 1 })) : value === null || value === undefined || value === '' ? '—' : String(value);
const fieldLabel = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());

function metrics(kpis: AnalyticsKpis | undefined) { return Array.isArray(kpis) ? kpis : Object.values(kpis || {}).flat(); }
function metricsFromData(data: StudioAnalyticsData | null) {
  if (!data) return [];
  const direct = metrics(data.kpis);
  if (direct.length) return direct;
  if (Array.isArray(data.cash_kpis)) return data.cash_kpis as AnalyticsMetric[];
  const summary = data.summary;
  if (summary && typeof summary === 'object' && !Array.isArray(summary)) return Object.entries(summary as Record<string, unknown>).filter(([, value]) => typeof value === 'number' || value === null).slice(0, 8).map(([label, value]) => ({ label: fieldLabel(label), value: typeof value === 'number' ? value : null, definition: 'Ringkasan laporan berdasarkan definisi Studio Analytics.' }));
  const commercial = data.commercial as Record<string, unknown> | undefined;
  const quotation = data.quotation as Record<string, unknown> | undefined;
  const invoice = data.invoice as Record<string, unknown> | undefined;
  const collection = data.collection as Record<string, unknown> | undefined;
  const sources = [commercial, quotation, invoice, collection].filter((source): source is Record<string, unknown> => Boolean(source));
  return sources.flatMap(source => Object.entries(source).filter(([, value]) => typeof value === 'number' || value === null).slice(0, 4).map(([label, value]) => ({ label: fieldLabel(label), value: typeof value === 'number' ? value : null, definition: 'Metrik komersial Studio berdasarkan data kanonis.' }))).slice(0, 8);
}
function tableRows(data: StudioAnalyticsData): AnalyticsRow[] {
  if (Array.isArray(data.rows)) return data.rows;
  const candidates = ['top_clients', 'top_services', 'aging', 'client_breakdown', 'project_breakdown', 'funnel', 'utilization'];
  for (const key of candidates) { const value = data[key]; if (Array.isArray(value)) return value as AnalyticsRow[]; }
  return [];
}
function chartRows(data: StudioAnalyticsData): AnalyticsRow[] {
  const trends = data.trends as Record<string, unknown> | undefined;
  if (trends) { const trend = Object.values(trends).find(value => Array.isArray(value)); if (Array.isArray(trend)) return trend as AnalyticsRow[]; }
  const trend = data.trend; return Array.isArray(trend) ? trend as AnalyticsRow[] : [];
}

function PeriodFilter({ filters, setFilters }: { filters: AnalyticsFilters; setFilters: (value: AnalyticsFilters) => void }) {
  const presets: Array<[string, () => Pick<AnalyticsFilters, 'start_date' | 'end_date'>]> = [
    ['Hari Ini', () => ({ start_date: dateText(), end_date: dateText() })], ['7 Hari', () => ({ start_date: plusDays(dateText(), -6), end_date: dateText() })], ['30 Hari', () => ({ start_date: plusDays(dateText(), -29), end_date: dateText() })],
    ['Bulan Ini', () => ({ start_date: `${dateText().slice(0, 8)}01`, end_date: dateText() })], ['Bulan Lalu', () => { const first = `${dateText().slice(0, 8)}01`; const end = plusDays(first, -1); return { start_date: `${end.slice(0, 8)}01`, end_date: end }; }],
  ];
  return <Card className="overflow-visible"><CardContent className="flex flex-wrap items-end gap-3 p-4"><label className="text-xs font-medium text-[var(--nexus-muted)]">Mulai<input aria-label="Tanggal mulai" type="date" value={filters.start_date} onChange={event => setFilters({ ...filters, start_date: event.target.value })} className="mt-1 block h-9 rounded-lg border border-[var(--nexus-border)] px-2 text-sm" /></label><label className="text-xs font-medium text-[var(--nexus-muted)]">Sampai<input aria-label="Tanggal akhir" type="date" value={filters.end_date} onChange={event => setFilters({ ...filters, end_date: event.target.value })} className="mt-1 block h-9 rounded-lg border border-[var(--nexus-border)] px-2 text-sm" /></label><label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--nexus-border)] px-3 text-xs"><input type="checkbox" checked={Boolean(filters.compare)} onChange={event => setFilters({ ...filters, compare: event.target.checked })} />Bandingkan periode sebelumnya</label><div className="flex flex-wrap gap-1">{presets.map(([label, action]) => <Button key={label} variant="ghost" size="sm" onClick={() => setFilters({ ...filters, ...action() })}>{label}</Button>)}</div></CardContent></Card>;
}

function MetricCard({ item }: { item: AnalyticsMetric }) { const comparison = item.snapshot ? null : item.percent_change; return <Card><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--nexus-muted)]" title={item.definition}>{item.label}</p>{item.snapshot && <Badge variant="outline">Snapshot</Badge>}</div><p className="mt-2 text-xl font-bold text-[var(--nexus-charcoal)]">{item.value === null ? 'Data Belum Lengkap' : rowValue(item.value)}</p>{comparison !== null && comparison !== undefined ? <p className={comparison >= 0 ? 'mt-1 text-xs text-emerald-700' : 'mt-1 text-xs text-red-700'}>{comparison >= 0 ? '+' : ''}{comparison.toFixed(1)}% vs periode sebelumnya</p> : !item.snapshot && item.previous_value === 0 ? <p className="mt-1 text-xs text-blue-700">Baru</p> : null}</CardContent></Card>; }

function ExportMenu({ report, filters }: { report: AnalyticsReport; filters: AnalyticsFilters }) { const { hasPermission } = useAuth(); const [loading, setLoading] = useState<AnalyticsExportFormat | null>(null); if (!hasPermission('studio.analytics.export')) return null; const download = async (format: AnalyticsExportFormat) => { try { setLoading(format); const blob = await studioAnalyticsApi.export(report, format, filters); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `UNI-NEXUS_Studio_${report}.${format}`; anchor.click(); URL.revokeObjectURL(url); } finally { setLoading(null); } }; return <div className="flex items-center gap-1"><span className="text-xs text-[var(--nexus-muted)]">Ekspor</span>{(['csv', 'xlsx', 'pdf'] as AnalyticsExportFormat[]).map(format => <Button key={format} size="sm" variant="outline" onClick={() => download(format)} disabled={loading !== null}>{loading === format ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : format === 'xlsx' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : format === 'pdf' ? <FileText className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}{format.toUpperCase()}</Button>)}</div>; }

function TrendCard({ rows }: { rows: AnalyticsRow[] }) { if (!rows.length) return null; const numericKeys = Object.keys(rows[0]).filter(key => key !== 'label' && typeof rows[0][key] === 'number').slice(0, 2); if (!numericKeys.length) return null; return <Card><CardHeader><CardTitle>Tren Periode</CardTitle></CardHeader><CardContent className="h-72 min-w-[620px] overflow-x-auto"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value: number) => rowValue(value)} />{numericKeys.map((key, index) => <Line key={key} type="monotone" dataKey={key} name={fieldLabel(key)} stroke={index ? '#2563eb' : '#d4a700'} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></CardContent></Card>; }

function TableCard({ rows, empty, report }: { rows: AnalyticsRow[]; empty: string; report: AnalyticsReport }) { const { hasPermission } = useAuth(); if (!rows.length) return <Card><CardContent className="py-10 text-center text-sm text-[var(--nexus-muted)]">{empty}</CardContent></Card>; const columns = Object.keys(rows[0]).slice(0, 12); const drilldown = (row: AnalyticsRow, column: string) => { const numeric = (value: unknown) => typeof value === 'number' ? value : undefined; let path: string | undefined; let permission: string | undefined; if (column === 'project_name' && hasPermission('studio.projects.read')) { const id = numeric(row.project_id) ?? (report === 'projects' || report === 'profitability' ? numeric(row.id) : undefined); if (id) { path = `/app/studio/projects/${id}`; permission = 'studio.projects.read'; } } if (column === 'client_name' && hasPermission('studio.clients.read')) { const id = numeric(row.client_id) ?? (report === 'clients' ? numeric(row.id) : undefined); if (id) { path = `/app/studio/clients/${id}`; permission = 'studio.clients.read'; } } if ((column === 'asset_name' || (column === 'name' && report === 'equipment')) && hasPermission('studio.equipment.read')) { const id = numeric(row.asset_id) ?? numeric(row.id); if (id) { path = `/app/studio/equipment/assets/${id}`; permission = 'studio.equipment.read'; } } if (column === 'party_name' && hasPermission('studio.vendors.read')) { const id = numeric(row.party_id); if (id) { path = `/app/studio/vendors/${id}`; permission = 'studio.vendors.read'; } } return path && permission ? <a href={path} className="font-medium text-[var(--nexus-yellow-deep)] underline-offset-2 hover:underline">{rowValue(row[column])}</a> : rowValue(row[column]); }; return <Card><CardHeader><CardTitle>Rincian</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="min-w-full text-sm"><thead className="bg-[var(--nexus-cream-soft)]"><tr>{columns.map(column => <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-[var(--nexus-charcoal)]" key={column}>{fieldLabel(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.id || row.label || index)}`} className="border-t border-[var(--nexus-border)]">{columns.map(column => <td className="whitespace-nowrap px-4 py-3 text-gray-700" key={column}>{drilldown(row, column)}</td>)}</tr>)}</tbody></table></CardContent></Card>; }

export function StudioAnalyticsPage({ report }: { report: AnalyticsReport }) {
  const config = configs[report]; const [search, setSearch] = useSearchParams(); const navigate = useNavigate();
  const initial = useMemo(() => ({ ...defaultFilters(), start_date: search.get('start') || search.get('start_date') || defaultFilters().start_date, end_date: search.get('end') || search.get('end_date') || defaultFilters().end_date, compare: search.get('compare') === 'true' }), [search]);
  const [filters, setRawFilters] = useState<AnalyticsFilters>(initial); const [data, setData] = useState<StudioAnalyticsData | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const setFilters = (next: AnalyticsFilters) => { setRawFilters(next); setSearch({ start: next.start_date, end: next.end_date, ...(next.compare ? { compare: 'true' } : {}) }); };
  const load = async () => { try { setLoading(true); setError(null); setData(await config.endpoint(filters)); } catch { setError('Gagal Memuat Analitik'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [filters.start_date, filters.end_date, filters.compare, report]);
  const reportMetrics = metricsFromData(data); const rows = data ? tableRows(data) : []; const chart = data ? chartRows(data) : [];
  return <div className="mx-auto max-w-7xl space-y-5 pb-12"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-[var(--nexus-yellow-deep)]">BISNIS STUDIO</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">{config.title}</h1><p className="mt-1 max-w-3xl text-sm text-[var(--nexus-muted)]">{config.description}</p></div><ExportMenu report={report} filters={filters} /></div><PeriodFilter filters={filters} setFilters={setFilters} />{loading ? <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-[var(--nexus-yellow-deep)]" /></div> : error ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-sm"><p>{error}</p><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" />Coba lagi</Button></CardContent></Card> : <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{reportMetrics.map((item, index) => <MetricCard key={`${item.label}-${index}`} item={item} />)}</div><TrendCard rows={chart} /><TableCard rows={rows} empty={config.empty} report={report} />{report === 'overview' && data && <div className="grid gap-4 lg:grid-cols-2"><TopList title="Top Clients" rows={Array.isArray(data.top_clients) ? data.top_clients as AnalyticsRow[] : []} /><TopList title="Top Services" rows={Array.isArray(data.top_services) ? data.top_services as AnalyticsRow[] : []} /></div>}</>}<div className="text-right"><Button variant="ghost" size="sm" onClick={() => navigate('/app/studio/analytics')}>Kembali ke Ringkasan</Button></div></div>;
}

function TopList({ title, rows }: { title: string; rows: AnalyticsRow[] }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.length ? rows.slice(0, 5).map((row, index) => <div className="flex items-center justify-between gap-3 border-b border-[var(--nexus-border)] pb-2 text-sm" key={`${String(row.id || row.name || index)}`}><span>{String(row.name || row.label || '—')}</span><strong>{rowValue(row.commercial_basis ?? row.scope_value ?? row.value)}</strong></div>) : <p className="text-sm text-[var(--nexus-muted)]">Belum ada data.</p>}</CardContent></Card>; }
