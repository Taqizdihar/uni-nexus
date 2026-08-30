import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet, FileText, Filter, LoaderCircle, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

type AuditGroup = 'authentication' | 'account' | 'create' | 'update' | 'delete' | 'approval' | 'finance' | 'automation' | 'export' | 'other';
type Workspace = 'all' | 'global' | 'craft' | 'studio';
type AuditItem = {
  id: number; created_at: string; module_code: string; action_code: string; action_group: AuditGroup; description: string | null;
  actor: { id: number; full_name: string; username: string; avatar_path: string | null; current_role: { code: string; name: string } | null; archived: boolean } | null;
  workspace: { id: number; code: string; name: string } | null;
  entity: { type: string | null; id: number | null; code: string | null };
  old_values: unknown; new_values: unknown; ip_address: string | null; user_agent: string | null;
};
type ListResponse = { items: AuditItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } };
type Summary = { total_in_range: number; today_count: number; auth_today_count: number; change_today_count: number; unique_actors_in_range: number };
type Metadata = { modules: Array<{ code: string }>; actions: Array<{ code: string; action_group: AuditGroup }>; action_groups: AuditGroup[]; users: Array<{ id: number; full_name: string; username: string }>; entity_types: Array<{ code: string }>; workspaces: Array<{ id?: number; code: Workspace; name: string }> };

const emptySummary: Summary = { total_in_range: 0, today_count: 0, auth_today_count: 0, change_today_count: 0, unique_actors_in_range: 0 };
const actionGroupLabel: Record<AuditGroup, string> = { authentication: 'Autentikasi', account: 'Akun & Profil', create: 'Pembuatan', update: 'Perubahan', delete: 'Penghapusan', approval: 'Persetujuan', finance: 'Keuangan', automation: 'Otomasi', export: 'Ekspor', other: 'Lainnya' };
const pretty = (value: string) => value.replace(/[._-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const actionLabel = (action: string) => ({ login: 'Login', logout: 'Logout', role_change: 'Ubah Role', approval: 'Setujui Akun', rejection: 'Tolak Akun' }[action] || pretty(action));
const formatTime = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value));
const formatJson = (value: unknown) => value === null || value === undefined ? 'Tidak ada data perubahan.' : JSON.stringify(value, null, 2);

export function AuditLog() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<AuditItem[]>([]); const [summary, setSummary] = useState<Summary>(emptySummary);
  const [metadata, setMetadata] = useState<Metadata | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1); const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [workspace, setWorkspace] = useState<Workspace>('all'); const [module, setModule] = useState(''); const [action, setAction] = useState(''); const [actionGroup, setActionGroup] = useState<AuditGroup | ''>(''); const [userId, setUserId] = useState(''); const [entityType, setEntityType] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [detail, setDetail] = useState<AuditItem | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const filters = useMemo(() => ({ workspace, module, action, action_group: actionGroup, user_id: userId, entity_type: entityType, q: query, from, to }), [action, actionGroup, entityType, from, module, query, to, userId, workspace]);
  const params = useCallback((extra: Record<string, string> = {}) => {
    const result = new URLSearchParams({ page: String(page), limit: '25', ...extra });
    Object.entries(filters).forEach(([key, value]) => { if (value) result.set(key, value); });
    return result.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [list, cards] = await Promise.all([api.get<ListResponse>(`/audit?${params()}`), api.get<Summary>(`/audit/summary?${params()}`)]);
      if (page > list.pagination.total_pages) { setPage(list.pagination.total_pages); return; }
      setItems(list.items); setPagination(list.pagination); setSummary(cards);
    } catch { setError('Log Audit tidak dapat dimuat. Silakan coba lagi.'); }
    finally { setLoading(false); }
  }, [page, params]);

  const loadMetadata = useCallback(async () => {
    try { setMetadata(await api.get<Metadata>(`/audit/meta?workspace=${workspace}`)); } catch { /* Filters remain usable while metadata is unavailable. */ }
  }, [workspace]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMetadata(); }, [loadMetadata]);
  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setQuery(search.trim()); }, 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [detail]);

  const change = <T,>(set: (value: T) => void) => (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { setPage(1); set(event.target.value as T); };
  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try { setDetail(await api.get<AuditItem>(`/audit/${id}`)); } catch { setError('Detail Log Audit tidak dapat dimuat.'); }
    finally { setDetailLoading(false); }
  };
  const exportAudit = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try {
      const blob = await api.getBlob(`/audit/export?${params({ format })}`); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `uni-nexus-audit-log.${format}`; link.click(); URL.revokeObjectURL(url);
    } catch { setError('Ekspor Log Audit gagal. Periksa filter dan izin Anda.'); }
    finally { setExporting(null); }
  };

  return <div className="space-y-5 pb-6">
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--nexus-charcoal)]"><ShieldAlert className="h-6 w-6 text-[var(--nexus-yellow-deep)]" />Log Audit</h1><p className="mt-1 text-sm text-gray-500">Riwayat aktivitas keamanan dan perubahan penting di UNI-NEXUS.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[var(--nexus-charcoal)] hover:bg-[var(--nexus-cream-soft)] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button>{hasPermission('reports.export') && <><button type="button" onClick={() => void exportAudit('csv')} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[var(--nexus-charcoal)] hover:bg-[var(--nexus-cream-soft)] disabled:opacity-60"><FileText className="h-4 w-4" />{exporting === 'csv' ? 'Mengekspor…' : 'CSV'}</button><button type="button" onClick={() => void exportAudit('xlsx')} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-md bg-[var(--nexus-charcoal)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"><FileSpreadsheet className="h-4 w-4" />{exporting === 'xlsx' ? 'Mengekspor…' : 'Excel'}</button></>}</div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Total', summary.total_in_range], ['Hari ini', summary.today_count], ['Login & Logout', summary.auth_today_count], ['Perubahan hari ini', summary.change_today_count], ['Aktor unik', summary.unique_actors_in_range]].map(([label, count]) => <div key={String(label)} className="rounded-lg border border-[var(--nexus-border)] bg-white px-4 py-3 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">{count}</p></div>)}</section>

    <section className="rounded-lg border border-[var(--nexus-border)] bg-white p-4 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-6"><label className="relative xl:col-span-2"><span className="sr-only">Cari Log Audit</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={change(setSearch)} placeholder="Cari deskripsi, aktor, atau kode…" className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--nexus-yellow)]" /></label><select aria-label="Workspace" value={workspace} onChange={change(setWorkspace)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="all">Semua workspace</option><option value="global">Global</option><option value="craft">Craft</option><option value="studio">Studio</option></select><select aria-label="Grup tindakan" value={actionGroup} onChange={change(setActionGroup)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua kategori</option>{(metadata?.action_groups || Object.keys(actionGroupLabel)).map(group => <option key={group} value={group}>{actionGroupLabel[group as AuditGroup]}</option>)}</select><select aria-label="Modul" value={module} onChange={change(setModule)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua modul</option>{metadata?.modules.map(item => <option key={item.code} value={item.code}>{pretty(item.code)}</option>)}</select><select aria-label="Tindakan" value={action} onChange={change(setAction)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua tindakan</option>{metadata?.actions.map(item => <option key={item.code} value={item.code}>{actionLabel(item.code)}</option>)}</select></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><select aria-label="Aktor" value={userId} onChange={change(setUserId)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua aktor</option>{metadata?.users.map(user => <option key={user.id} value={user.id}>{user.full_name} ({user.username})</option>)}</select><select aria-label="Jenis entitas" value={entityType} onChange={change(setEntityType)} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua entitas</option>{metadata?.entity_types.map(item => <option key={item.code} value={item.code}>{pretty(item.code)}</option>)}</select><label className="text-xs text-gray-500">Dari<input aria-label="Tanggal dari" type="date" value={from} onChange={change(setFrom)} className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-2 text-sm text-gray-700" /></label><label className="text-xs text-gray-500">Sampai<input aria-label="Tanggal sampai" type="date" value={to} onChange={change(setTo)} className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-2 text-sm text-gray-700" /></label><button type="button" onClick={() => { setWorkspace('all'); setModule(''); setAction(''); setActionGroup(''); setUserId(''); setEntityType(''); setFrom(''); setTo(''); setSearch(''); setQuery(''); setPage(1); }} className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"><Filter className="h-4 w-4" />Reset filter</button></div>
    </section>

    <section className="overflow-hidden rounded-lg border border-[var(--nexus-border)] bg-white shadow-sm">
      {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500"><LoaderCircle className="h-5 w-5 animate-spin" />Memuat Log Audit…</div> : error ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-gray-500"><p>{error}</p><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2"><RefreshCw className="h-4 w-4" />Coba lagi</button></div> : !items.length ? <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-sm text-gray-500"><ShieldAlert className="h-8 w-8 text-gray-300" /><p>Tidak ada aktivitas yang sesuai dengan filter.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Aktor</th><th className="px-4 py-3">Aktivitas</th><th className="px-4 py-3">Workspace</th><th className="px-4 py-3">Entitas</th><th className="px-4 py-3"><span className="sr-only">Detail</span></th></tr></thead><tbody className="divide-y divide-gray-100">{items.map(item => <tr key={item.id} className="hover:bg-[var(--nexus-cream-soft)]"><td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatTime(item.created_at)}</td><td className="px-4 py-3"><p className="font-medium text-gray-800">{item.actor?.full_name || 'Sistem UNI-NEXUS'}</p><p className="text-xs text-gray-500">{item.actor?.username ? `@${item.actor.username}` : 'Aksi sistem'}{item.actor?.archived ? ' · Diarsipkan' : ''}</p></td><td className="max-w-80 px-4 py-3"><p className="font-medium text-gray-800">{actionLabel(item.action_code)}</p><p className="mt-0.5 truncate text-xs text-gray-500" title={item.description || ''}>{item.description || pretty(item.module_code)}</p></td><td className="px-4 py-3"><span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">{item.workspace?.name || 'Global'}</span></td><td className="px-4 py-3 text-xs text-gray-600">{item.entity.code || (item.entity.id ? `#${item.entity.id}` : '—')}<p className="mt-0.5 text-gray-400">{item.entity.type ? pretty(item.entity.type) : ''}</p></td><td className="px-4 py-3 text-right"><button type="button" aria-label={`Lihat detail Audit ${item.id}`} onClick={() => void openDetail(item.id)} className="rounded p-2 text-gray-500 hover:bg-white hover:text-[var(--nexus-charcoal)]"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>}
      {!loading && !error && pagination.total_pages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500"><span>Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}</span><span className="flex gap-2"><button aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded border border-gray-200 p-1 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button aria-label="Halaman berikutnya" disabled={page >= pagination.total_pages} onClick={() => setPage(current => current + 1)} className="rounded border border-gray-200 p-1 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></span></div>}
    </section>
    {detailLoading && !detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"><LoaderCircle className="h-7 w-7 animate-spin text-white" /></div>}
    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDetail(null)}><section role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" onMouseDown={event => event.stopPropagation()} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl"><header className="sticky top-0 flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4"><div><h2 id="audit-detail-title" className="text-lg font-bold text-[var(--nexus-charcoal)]">Detail Log Audit</h2><p className="mt-1 text-sm text-gray-500">{formatTime(detail.created_at)} · {detail.workspace?.name || 'Global'}</p></div><button type="button" aria-label="Tutup detail Log Audit" onClick={() => setDetail(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Info label="Aktor" value={detail.actor ? `${detail.actor.full_name} (@${detail.actor.username})` : 'Sistem UNI-NEXUS'} /><Info label="Role saat ini" value={detail.actor?.current_role?.name || '—'} /><Info label="Modul" value={pretty(detail.module_code)} /><Info label="Tindakan" value={actionLabel(detail.action_code)} /><Info label="Entitas" value={[detail.entity.type && pretty(detail.entity.type), detail.entity.code || (detail.entity.id ? `#${detail.entity.id}` : null)].filter(Boolean).join(' · ') || '—'} /><Info label="Alamat IP" value={detail.ip_address || '—'} /></div><div><h3 className="text-sm font-semibold text-gray-800">Deskripsi</h3><p className="mt-1 rounded bg-gray-50 p-3 text-sm text-gray-600">{detail.description || 'Tidak ada deskripsi.'}</p></div><div className="grid gap-4 lg:grid-cols-2"><JsonPanel title="Nilai sebelumnya" value={detail.old_values} /><JsonPanel title="Nilai setelah perubahan" value={detail.new_values} /></div>{detail.user_agent && <Info label="User-Agent" value={detail.user_agent} />}</div></section></div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-words text-sm text-gray-800">{value}</p></div>; }
function JsonPanel({ title, value }: { title: string; value: unknown }) { return <div><h3 className="text-sm font-semibold text-gray-800">{title}</h3><pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs leading-5 text-slate-100">{formatJson(value)}</pre></div>; }

