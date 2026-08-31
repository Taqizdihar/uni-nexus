import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, Download, Edit3, Eye, FileSpreadsheet, Filter, Plus, RefreshCw, Search, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { masterDataApi } from '../../services/api/master-data.api';
import type { MasterDataDatasetKey, MasterDataFilters, MasterDataItem, MasterDataMeta, MasterDataOverview, MasterDataUsage } from '../../types/master-data';

const inputClass = 'mt-1 block w-full rounded-lg border border-[var(--nexus-border)] bg-white px-3 py-2 text-sm text-[var(--nexus-charcoal)] outline-none focus:border-[var(--nexus-yellow-deep)] focus:ring-2 focus:ring-[var(--nexus-yellow)]/30';
const labelClass = 'block text-sm font-medium text-[var(--nexus-charcoal)]';

const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return 'Tindakan tidak dapat diselesaikan. Silakan coba lagi.';
  const messages: Record<string, string> = {
    MASTER_DATASET_NOT_FOUND: 'Dataset Data Master tidak ditemukan.', MASTER_DATA_ACCESS_DENIED: 'Anda tidak memiliki akses untuk dataset atau scope ini.',
    MASTER_DATA_CODE_ALREADY_EXISTS: 'Kode referensi sudah digunakan.', MASTER_DATA_REFERENCE_PROTECTED: 'Referensi inti sistem tidak dapat diubah statusnya.',
    MASTER_DATA_ACTIVE_CHILDREN: 'Kategori masih memiliki subkategori aktif.', MASTER_DATA_INVALID_PARENT: 'Induk kategori tidak valid.',
    MASTER_DATA_HIERARCHY_CYCLE: 'Struktur kategori tidak boleh membentuk siklus.', MASTER_DATA_INVALID_SCOPE: 'Scope keuangan tidak valid.',
    MASTER_DATA_INVALID_COA: 'COA harus aktif, berada di organisasi yang sama, dan sesuai scope.',
  };
  return messages[error.code] || error.message;
};

const datasetExtraLabel = (item: MasterDataItem) => {
  switch (item.dataset) {
    case 'units': return `${item.details.symbol} · ${item.details.unit_group} · ${item.details.decimal_places} desimal`;
    case 'payment-methods': return item.details.method_type.replace('_', ' ');
    case 'craft-product-categories': return item.details.parent_name ? `Induk: ${item.details.parent_name}` : 'Kategori utama';
    case 'craft-material-categories': return item.details.category_type;
    case 'craft-sales-channels': return item.details.channel_type;
    case 'studio-service-categories': return 'Katalog layanan Studio';
    case 'finance-transaction-categories': return `${item.details.transaction_type === 'income' ? 'Pendapatan' : 'Pengeluaran'}${item.details.coa_code ? ` · ${item.details.coa_code}` : ''}`;
  }
};

const emptyForm = (dataset: MasterDataDatasetKey, item?: MasterDataItem): Record<string, string> => {
  const base = { code: item?.code || '', name: item?.name || '', scope: item?.scope || 'craft' };
  if (dataset === 'units') return { ...base, symbol: item?.dataset === 'units' ? item.details.symbol : '', unit_group: item?.dataset === 'units' ? item.details.unit_group : 'count', decimal_places: item?.dataset === 'units' ? String(item.details.decimal_places) : '0' };
  if (dataset === 'payment-methods') return { ...base, method_type: item?.dataset === 'payment-methods' ? item.details.method_type : 'cash' };
  if (dataset === 'craft-product-categories') return { ...base, parent_id: item?.dataset === 'craft-product-categories' && item.details.parent_id ? String(item.details.parent_id) : '' };
  if (dataset === 'craft-material-categories') return { ...base, category_type: item?.dataset === 'craft-material-categories' ? item.details.category_type : 'filament' };
  if (dataset === 'craft-sales-channels') return { ...base, channel_type: item?.dataset === 'craft-sales-channels' ? item.details.channel_type : 'marketplace', external_url: item?.dataset === 'craft-sales-channels' ? item.details.external_url || '' : '' };
  if (dataset === 'finance-transaction-categories') return { ...base, transaction_type: item?.dataset === 'finance-transaction-categories' ? item.details.transaction_type : 'expense', default_coa_account_id: item?.dataset === 'finance-transaction-categories' && item.details.default_coa_account_id ? String(item.details.default_coa_account_id) : '' };
  return base;
};

export function MasterData() {
  const { hasPermission } = useAuth();
  const [overview, setOverview] = useState<MasterDataOverview | null>(null);
  const [meta, setMeta] = useState<MasterDataMeta | null>(null);
  const [selected, setSelected] = useState<MasterDataDatasetKey | null>(null);
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, total_pages: 1 });
  const [filters, setFilters] = useState<MasterDataFilters>({ q: '', status: 'all', page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<MasterDataItem | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<{ item: MasterDataItem; data: MasterDataUsage } | null>(null);
  const [confirm, setConfirm] = useState<{ item: MasterDataItem; data: MasterDataUsage } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const selectedMeta = useMemo(() => meta?.datasets.find(dataset => dataset.key === selected) || null, [meta, selected]);
  const selectedOverview = useMemo(() => overview?.datasets.find(dataset => dataset.key === selected) || null, [overview, selected]);

  const loadShell = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextOverview, nextMeta] = await Promise.all([masterDataApi.overview(), masterDataApi.meta()]);
      setOverview(nextOverview); setMeta(nextMeta);
      setSelected(current => current && nextMeta.datasets.some(dataset => dataset.key === current) ? current : nextMeta.datasets[0]?.key || null);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }, []);

  const loadList = useCallback(async () => {
    if (!selected) return;
    setListLoading(true); setError('');
    try {
      const result = await masterDataApi.list(selected, filters);
      setItems(result.items); setPagination(result.pagination);
    } catch (cause) { setError(errorMessage(cause)); setItems([]); }
    finally { setListLoading(false); }
  }, [filters, selected]);

  useEffect(() => { void loadShell(); }, [loadShell]);
  useEffect(() => { void loadList(); }, [loadList]);

  const changeFilter = (next: Partial<MasterDataFilters>) => setFilters(current => ({ ...current, ...next, page: next.page ?? 1 }));
  const openEditor = (item: MasterDataItem | 'new') => {
    if (!selected) return;
    const target = item === 'new' ? undefined : item;
    setForm(emptyForm(selected, target)); setEditor(item);
  };
  const setField = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

  const payload = () => {
    if (!selected) return {};
    const data: Record<string, unknown> = { name: form.name.trim() };
    if (editor === 'new') data.code = form.code.trim().toUpperCase();
    if (selected === 'units') Object.assign(data, { symbol: form.symbol.trim(), unit_group: form.unit_group, decimal_places: Number(form.decimal_places) });
    if (selected === 'payment-methods') data.method_type = form.method_type;
    if (selected === 'craft-product-categories') data.parent_id = form.parent_id ? Number(form.parent_id) : null;
    if (selected === 'craft-material-categories') data.category_type = form.category_type;
    if (selected === 'craft-sales-channels') Object.assign(data, { channel_type: form.channel_type, external_url: form.external_url.trim() || null });
    if (selected === 'finance-transaction-categories') {
      if (editor === 'new') Object.assign(data, { scope: form.scope, transaction_type: form.transaction_type });
      data.default_coa_account_id = form.default_coa_account_id ? Number(form.default_coa_account_id) : null;
    }
    return data;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !editor) return;
    setSaving(true); setError('');
    try {
      if (editor === 'new') await masterDataApi.create(selected, payload());
      else await masterDataApi.update(selected, editor.id, payload());
      setEditor(null); await Promise.all([loadList(), loadShell()]);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  const showUsage = async (item: MasterDataItem, forDeactivation = false) => {
    try {
      const data = await masterDataApi.usage(item.dataset, item.id);
      forDeactivation ? setConfirm({ item, data }) : setUsage({ item, data });
    } catch (cause) { setError(errorMessage(cause)); }
  };
  const lifecycle = async (item: MasterDataItem, active: boolean) => {
    setBusyAction(true); setError('');
    try {
      active ? await masterDataApi.activate(item.dataset, item.id) : await masterDataApi.deactivate(item.dataset, item.id);
      setConfirm(null); await Promise.all([loadList(), loadShell()]);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusyAction(false); }
  };
  const exportRows = async (format: 'csv' | 'xlsx') => {
    if (!selected) return;
    try {
      const blob = await masterDataApi.export(selected, format, filters);
      const href = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = href; anchor.download = `data-master-${selected}.${format}`; anchor.click(); URL.revokeObjectURL(href);
    } catch (cause) { setError(errorMessage(cause)); }
  };

  return <main className="min-w-0 space-y-5 p-4 pb-8 md:p-7">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--nexus-yellow-deep)]">Global Control Center</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Data Master</h1><p className="mt-1 max-w-2xl text-sm text-[var(--nexus-muted)]">Kelola data referensi UNI-NEXUS dari satu pusat agar seluruh workspace tetap konsisten.</p></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { void loadShell(); void loadList(); }}><RefreshCw className="h-4 w-4" /> Refresh</Button>{selectedMeta?.capabilities.canManage && <Button type="button" onClick={() => openEditor('new')}><Plus className="h-4 w-4" /> Tambah Data</Button>}{hasPermission('reports.export') && selected && <div className="flex overflow-hidden rounded-lg border border-[var(--nexus-border)]"><button aria-label="Ekspor CSV" onClick={() => void exportRows('csv')} className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--nexus-cream-soft)]"><Download className="h-4 w-4" /> CSV</button><button aria-label="Ekspor XLSX" onClick={() => void exportRows('xlsx')} className="border-l border-[var(--nexus-border)] px-3 py-2 text-sm hover:bg-[var(--nexus-cream-soft)]"><FileSpreadsheet className="h-4 w-4" /></button></div>}</div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Dataset Tersedia" value={overview?.dataset_count ?? '—'} icon={Database} /><Metric label="Data Aktif" value={overview?.active_rows ?? '—'} icon={ShieldCheck} /><Metric label="Data Nonaktif" value={overview?.inactive_rows ?? '—'} icon={ToggleLeft} /><Metric label="Referensi Tercatat" value={overview?.total_reference_rows ?? '—'} icon={BarChart3} />
    </section>
    {loading ? <Card className="p-8 text-center text-sm text-[var(--nexus-muted)]">Memuat Data Master...</Card> : <>
      <section className="space-y-4">
        {overview?.groups.filter(group => group.datasets.length > 0).map(group => <div key={group.key}><h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{group.label}</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.datasets.map(dataset => <button type="button" key={dataset.key} onClick={() => { setSelected(dataset.key); changeFilter({ q: '', status: 'all' }); }} className={`rounded-xl border p-4 text-left transition ${selected === dataset.key ? 'border-[var(--nexus-yellow-deep)] bg-[var(--nexus-cream-soft)] shadow-sm' : 'border-[var(--nexus-border)] bg-white hover:border-[var(--nexus-yellow)]'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--nexus-charcoal)]">{dataset.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--nexus-muted)]">{dataset.description}</p></div><Badge variant="outline">{dataset.scope_label}</Badge></div><div className="mt-4 flex gap-4 text-xs"><span><b className="text-[var(--nexus-charcoal)]">{dataset.active_count}</b> aktif</span><span><b className="text-[var(--nexus-charcoal)]">{dataset.inactive_count}</b> nonaktif</span>{dataset.can_manage && <span className="ml-auto font-semibold text-[var(--nexus-yellow-deep)]">Kelola</span>}</div></button>)}</div></div>)}
      </section>
      {selected && <section className="space-y-4"><div className="flex flex-col gap-3 rounded-xl border border-[var(--nexus-border)] bg-white p-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">{selectedMeta?.name}</h2><p className="mt-1 text-sm text-[var(--nexus-muted)]">{selectedMeta?.description}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative min-w-52"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label="Cari data referensi" value={filters.q || ''} onChange={event => changeFilter({ q: event.target.value })} placeholder="Cari kode atau nama..." className="w-full rounded-lg border border-[var(--nexus-border)] py-2 pl-9 pr-3 text-sm" /></label><label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><select aria-label="Status data" value={filters.status || 'all'} onChange={event => changeFilter({ status: event.target.value as MasterDataFilters['status'] })} className="rounded-lg border border-[var(--nexus-border)] py-2 pl-9 pr-3 text-sm"><option value="all">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label><DatasetFilter dataset={selected} filters={filters} meta={meta} onChange={changeFilter} /></div></div>
        <Card>{listLoading ? <div className="p-8 text-center text-sm text-[var(--nexus-muted)]">Memuat referensi...</div> : <ReferenceTable items={items} canManage={Boolean(selectedMeta?.capabilities.canManage)} onEdit={openEditor} onUsage={showUsage} onLifecycle={(item, active) => active ? void lifecycle(item, true) : void showUsage(item, true)} />}</Card>
        <Pagination pagination={pagination} onPage={page => changeFilter({ page })} />
        {selectedOverview && <p className="text-xs text-[var(--nexus-muted)]">{selectedOverview.row_count} referensi terlihat sesuai hak akses Anda. Kode referensi dikunci setelah dibuat untuk menjaga integritas sistem.</p>}
      </section>}
    </>}
    {editor && selected && <ReferenceEditor dataset={selected} item={editor === 'new' ? undefined : editor} form={form} setField={setField} meta={meta} categoryItems={items.filter((item): item is Extract<MasterDataItem, { dataset: 'craft-product-categories' }> => item.dataset === 'craft-product-categories')} saving={saving} onClose={() => !saving && setEditor(null)} onSubmit={save} />}
    {usage && <UsageDialog item={usage.item} usage={usage.data} onClose={() => setUsage(null)} />}
    {confirm && <ConfirmDialog open title={`Nonaktifkan ${confirm.item.name}?`} description={<UsageWarning usage={confirm.data} />} confirmLabel="Nonaktifkan" variant="warning" isLoading={busyAction} onCancel={() => setConfirm(null)} onConfirm={() => void lifecycle(confirm.item, false)} />}
  </main>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) { return <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--nexus-muted)]">{label}</p><span className="rounded-lg bg-[var(--nexus-cream-soft)] p-2 text-[var(--nexus-yellow-deep)]"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-bold text-[var(--nexus-charcoal)]">{value}</p></Card>; }

function DatasetFilter({ dataset, filters, meta, onChange }: { dataset: MasterDataDatasetKey; filters: MasterDataFilters; meta: MasterDataMeta | null; onChange: (next: Partial<MasterDataFilters>) => void }) {
  if (dataset === 'units') return <select aria-label="Kelompok satuan" value={filters.unit_group || ''} onChange={event => onChange({ unit_group: event.target.value || undefined })} className="rounded-lg border border-[var(--nexus-border)] px-3 py-2 text-sm"><option value="">Semua Kelompok</option>{meta?.enums.unit_groups.map(item => <option key={item} value={item}>{item}</option>)}</select>;
  if (dataset === 'craft-sales-channels') return <select aria-label="Tipe kanal" value={filters.channel_type || ''} onChange={event => onChange({ channel_type: event.target.value || undefined })} className="rounded-lg border border-[var(--nexus-border)] px-3 py-2 text-sm"><option value="">Semua Tipe</option>{meta?.enums.sales_channel_types.map(item => <option key={item} value={item}>{item}</option>)}</select>;
  if (dataset === 'finance-transaction-categories') return <><select aria-label="Tipe transaksi" value={filters.transaction_type || ''} onChange={event => onChange({ transaction_type: event.target.value || undefined })} className="rounded-lg border border-[var(--nexus-border)] px-3 py-2 text-sm"><option value="">Semua Tipe</option><option value="income">Pendapatan</option><option value="expense">Pengeluaran</option></select><select aria-label="Scope keuangan" value={filters.business_unit || ''} onChange={event => onChange({ business_unit: event.target.value as MasterDataFilters['business_unit'] || undefined })} className="rounded-lg border border-[var(--nexus-border)] px-3 py-2 text-sm"><option value="">Semua Scope</option>{meta?.finance_scopes.map(item => <option key={item} value={item}>{item === 'craft' ? 'Craft' : item === 'studio' ? 'Studio' : 'Shared'}</option>)}</select></>;
  return null;
}

function ReferenceTable({ items, canManage, onEdit, onUsage, onLifecycle }: { items: MasterDataItem[]; canManage: boolean; onEdit: (item: MasterDataItem) => void; onUsage: (item: MasterDataItem, forDeactivation?: boolean) => void; onLifecycle: (item: MasterDataItem, active: boolean) => void }) {
  if (!items.length) return <div className="p-8 text-center text-sm text-[var(--nexus-muted)]">Belum ada data yang cocok dengan filter ini.</div>;
  return <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase tracking-wide text-[var(--nexus-muted)]"><tr><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Rincian</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Penggunaan</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-[var(--nexus-border)]"><td className="px-4 py-3 font-mono text-xs font-semibold">{item.code}</td><td className="px-4 py-3 font-semibold text-[var(--nexus-charcoal)]">{item.name}{item.is_protected && <span className="ml-2 text-xs text-amber-700">inti</span>}</td><td className="px-4 py-3"><Badge variant="outline">{item.scope_label}</Badge></td><td className="max-w-56 truncate px-4 py-3 text-xs text-[var(--nexus-muted)]">{datasetExtraLabel(item)}</td><td className="px-4 py-3"><Badge variant={item.is_active ? 'success' : 'warning'}>{item.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td><td className="px-4 py-3"><button onClick={() => void onUsage(item)} className="text-sm font-semibold text-[var(--nexus-yellow-deep)] hover:underline">{item.usage_total || 0} record</button></td><td className="px-4 py-3"><Actions item={item} canManage={canManage} onEdit={onEdit} onUsage={onUsage} onLifecycle={onLifecycle} /></td></tr>)}</tbody></table></div><div className="grid gap-3 p-3 md:hidden">{items.map(item => <article key={item.id} className="rounded-lg border border-[var(--nexus-border)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-[var(--nexus-muted)]">{item.code}</p><h3 className="mt-1 font-semibold text-[var(--nexus-charcoal)]">{item.name}</h3><p className="mt-1 text-xs text-[var(--nexus-muted)]">{datasetExtraLabel(item)}</p></div><Badge variant={item.is_active ? 'success' : 'warning'}>{item.is_active ? 'Aktif' : 'Nonaktif'}</Badge></div><div className="mt-3 flex items-center justify-between text-xs"><span>{item.scope_label}</span><button onClick={() => void onUsage(item)} className="font-semibold text-[var(--nexus-yellow-deep)]">{item.usage_total || 0} penggunaan</button></div><div className="mt-3 border-t border-[var(--nexus-border)] pt-3"><Actions item={item} canManage={canManage} onEdit={onEdit} onUsage={onUsage} onLifecycle={onLifecycle} /></div></article>)}</div></>;
}

function Actions({ item, canManage, onEdit, onUsage, onLifecycle }: { item: MasterDataItem; canManage: boolean; onEdit: (item: MasterDataItem) => void; onUsage: (item: MasterDataItem, forDeactivation?: boolean) => void; onLifecycle: (item: MasterDataItem, active: boolean) => void }) { const allowed = canManage && item.capabilities.canManage; return <div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => void onUsage(item)} aria-label={`Lihat penggunaan ${item.name}`}><Eye className="h-3.5 w-3.5" /> Penggunaan</Button>{allowed && <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>}{allowed && (item.is_active ? <Button type="button" size="sm" variant="ghost" onClick={() => void onUsage(item, true)} disabled={item.is_protected}><ToggleLeft className="h-3.5 w-3.5" /> Nonaktifkan</Button> : <Button type="button" size="sm" variant="ghost" onClick={() => onLifecycle(item, true)}><ToggleRight className="h-3.5 w-3.5" /> Aktifkan</Button>)}</div>; }

function Pagination({ pagination, onPage }: { pagination: { total: number; page: number; total_pages: number }; onPage: (page: number) => void }) { return <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--nexus-muted)]"><span>{pagination.total} data · Halaman {pagination.page} dari {pagination.total_pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={pagination.page >= pagination.total_pages} onClick={() => onPage(pagination.page + 1)}>Berikutnya</Button></div></div>; }

function ReferenceEditor({ dataset, item, form, setField, meta, categoryItems, saving, onClose, onSubmit }: { dataset: MasterDataDatasetKey; item?: MasterDataItem; form: Record<string, string>; setField: (key: string, value: string) => void; meta: MasterDataMeta | null; categoryItems: Array<Extract<MasterDataItem, { dataset: 'craft-product-categories' }>>; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const editing = Boolean(item); const select = (label: string, key: string, options: Array<{ value: string; label: string }>) => <label className={labelClass}>{label}<select value={form[key] || ''} onChange={event => setField(key, event.target.value)} className={inputClass}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  return <Modal open title={`${editing ? 'Edit' : 'Tambah'} ${item ? item.name : datasetLabel(dataset)}`} busy={saving} onClose={onClose} className="max-w-2xl"><form onSubmit={onSubmit}><div className="grid gap-4 p-5 sm:grid-cols-2">{!editing && <label className={labelClass}>Kode<input required maxLength={60} value={form.code || ''} onChange={event => setField('code', event.target.value.toUpperCase())} className={inputClass} placeholder="CONTOH_KODE" /></label>}<label className={`${labelClass} ${editing ? 'sm:col-span-2' : ''}`}>Nama<input required value={form.name || ''} onChange={event => setField('name', event.target.value)} className={inputClass} autoFocus /></label>{dataset === 'units' && <><label className={labelClass}>Simbol<input required value={form.symbol || ''} onChange={event => setField('symbol', event.target.value)} className={inputClass} placeholder="kg" /></label>{select('Kelompok Satuan', 'unit_group', (meta?.enums.unit_groups || []).map(value => ({ value, label: value })))}<label className={labelClass}>Jumlah Desimal<input required type="number" min="0" max="6" value={form.decimal_places || '0'} onChange={event => setField('decimal_places', event.target.value)} className={inputClass} /></label></>}{dataset === 'payment-methods' && select('Tipe Metode', 'method_type', (meta?.enums.payment_method_types || []).map(value => ({ value, label: value.replace('_', ' ') })))}{dataset === 'craft-product-categories' && <label className={labelClass}>Kategori Induk<select value={form.parent_id || ''} onChange={event => setField('parent_id', event.target.value)} className={inputClass}><option value="">Tanpa induk (kategori utama)</option>{categoryItems.filter(category => category.id !== item?.id && category.is_active).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}{dataset === 'craft-material-categories' && select('Jenis Material', 'category_type', (meta?.enums.material_category_types || []).map(value => ({ value, label: value })))}{dataset === 'craft-sales-channels' && <><>{select('Tipe Kanal', 'channel_type', (meta?.enums.sales_channel_types || []).map(value => ({ value, label: value })))}</><label className={labelClass}>URL Seller Center<input type="url" value={form.external_url || ''} onChange={event => setField('external_url', event.target.value)} className={inputClass} placeholder="https://..." /></label></>}{dataset === 'finance-transaction-categories' && <><>{!editing && select('Scope Keuangan', 'scope', (meta?.finance_scopes || []).map(value => ({ value, label: value === 'craft' ? 'Craft' : value === 'studio' ? 'Studio' : 'Shared' })))}</>{!editing && select('Tipe Transaksi', 'transaction_type', [{ value: 'income', label: 'Pendapatan' }, { value: 'expense', label: 'Pengeluaran' }])}<label className={`${labelClass} ${editing ? 'sm:col-span-2' : ''}`}>COA Default<select value={form.default_coa_account_id || ''} onChange={event => setField('default_coa_account_id', event.target.value)} className={inputClass}><option value="">Tanpa COA default</option>{meta?.chart_of_accounts.map(account => <option key={account.id} value={account.id}>{account.account_code} — {account.account_name}</option>)}</select></label></>}</div>{editing && <div className="border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] px-5 py-3 text-xs text-[var(--nexus-muted)]">Kode <b>{item?.code}</b> dikunci setelah dibuat untuk menjaga integritas referensi.</div>}<div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] p-5"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div></form></Modal>;
}

function UsageDialog({ item, usage, onClose }: { item: MasterDataItem; usage: MasterDataUsage; onClose: () => void }) { return <Modal open title={`Penggunaan ${item.name}`} onClose={onClose} className="max-w-lg"><div className="space-y-4 p-5"><UsageWarning usage={usage} /><div className="divide-y divide-[var(--nexus-border)] rounded-lg border border-[var(--nexus-border)]">{usage.usage_breakdown.length ? usage.usage_breakdown.map(row => <div key={row.source} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span>{row.label}</span><b>{row.count}</b></div>) : <p className="p-4 text-sm text-[var(--nexus-muted)]">Belum digunakan oleh data lain.</p>}</div><div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>Tutup</Button></div></div></Modal>; }
function UsageWarning({ usage }: { usage: MasterDataUsage }) { return <div className={`rounded-lg border p-3 text-sm ${usage.deactivation_allowed ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}><p className="font-semibold">{usage.usage_total ? `Data ini digunakan oleh ${usage.usage_total} record.` : 'Data ini belum digunakan oleh record lain.'}</p>{usage.blocking_reason ? <p className="mt-1">{usage.blocking_reason}</p> : <p className="mt-1">Riwayat tetap tersimpan; referensi tidak akan ditawarkan untuk data baru setelah dinonaktifkan.</p>}</div>; }
const datasetLabel = (dataset: MasterDataDatasetKey) => ({ units: 'Satuan', 'payment-methods': 'Metode Pembayaran', 'craft-product-categories': 'Kategori Produk', 'craft-material-categories': 'Kategori Material', 'craft-sales-channels': 'Sales Channel', 'studio-service-categories': 'Kategori Layanan', 'finance-transaction-categories': 'Kategori Transaksi' }[dataset]);
