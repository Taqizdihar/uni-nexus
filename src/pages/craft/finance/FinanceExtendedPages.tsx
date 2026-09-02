import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Landmark, Plus, Wallet } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { craftFinanceApi } from '../../../services/api/craft-finance.api';
import type { Accounting, Budget, CashFlow, FinanceExpense, FinanceReferences, FinanceTransaction, Journal, Profitability } from '../../../types/craft-finance';

const inputClass = 'w-full rounded-lg border border-[var(--nexus-border)] bg-white px-3 py-2 text-sm text-[var(--nexus-charcoal)] outline-none focus:border-[var(--nexus-yellow-deep)] focus:ring-4 focus:ring-[var(--nexus-yellow)]/20';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[var(--nexus-muted)]';
const Loading = () => <div className="p-8 text-sm text-[var(--nexus-muted)]">Memuat data keuangan...</div>;
const ErrorView = ({ retry }: { retry: () => void }) => <div className="p-8 text-sm text-red-700">Gagal memuat data. <button className="underline" onClick={retry}>Coba Lagi</button></div>;
const date = (value: string | null | undefined) => (value ? new Date(value).toLocaleDateString('id-ID') : '—');
const getError = (error: unknown) => (error instanceof Error ? error.message : 'Operasi tidak dapat diselesaikan.');
const todayIso = () => new Date().toISOString().slice(0, 10);

const sourceLabels: Record<string, string> = {
  customer_payment: 'Pembayaran Pelanggan',
  marketplace_settlement: 'Settlement Marketplace',
  craft_manual_income: 'Pendapatan Manual',
  finance_cash_reversal: 'Pembalikan',
};
const expenseStatusLabels: Record<string, string> = { draft: 'Draf', approved: 'Disetujui', paid: 'Dibayar', void: 'Dibalik' };
const expenseStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'> = { draft: 'outline', approved: 'info', paid: 'success', void: 'error' };
const budgetStatusLabels: Record<string, string> = { draft: 'Draf', approved: 'Disetujui', active: 'Aktif', closed: 'Ditutup' };

function KpiCard({ label, value, icon: Icon, color = 'text-[var(--nexus-charcoal)]' }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string }) {
  return <Card><CardContent className="p-5"><div className="flex justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--nexus-muted)]">{label}</p><Icon className={`h-4 w-4 ${color}`} /></div><p className={`mt-3 text-2xl font-bold ${color}`}>{value}</p></CardContent></Card>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-end gap-2 border-t border-[var(--nexus-border)] p-4 text-xs text-[var(--nexus-muted)]">
    <span>Halaman {page} dari {totalPages}</span>
    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Sebelumnya</Button>
    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Berikutnya</Button>
  </div>;
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

export function IncomePage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.finance.write');
  const [filters, setFilters] = useState({ from: '', to: '', categoryId: '', treasuryId: '', source: '', search: '', page: 1 });
  const [data, setData] = useState<Awaited<ReturnType<typeof craftFinanceApi.income>> | null>(null);
  const [references, setReferences] = useState<FinanceReferences | null>(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ amount: '', transaction_date: todayIso(), treasury_account_id: '', category_code: '', description: '' });

  const load = useCallback(() => {
    setError('');
    craftFinanceApi.income({ from: filters.from || undefined, to: filters.to || undefined, categoryId: filters.categoryId ? Number(filters.categoryId) : undefined, treasuryId: filters.treasuryId ? Number(filters.treasuryId) : undefined, source: filters.source || undefined, search: filters.search || undefined, page: filters.page, limit: 25 })
      .then(setData).catch((cause) => setError(getError(cause)));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { craftFinanceApi.references().then(setReferences).catch(() => undefined); }, []);

  const incomeCategories = useMemo(() => (references?.categories || []).filter((category) => category.transaction_type === 'income'), [references]);
  const updateFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? (value as number) : 1 }));

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(''); setSaving(true);
    try {
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Jumlah harus lebih dari nol.');
      if (!form.treasury_account_id) throw new Error('Pilih akun kas tujuan.');
      if (!form.category_code) throw new Error('Pilih kategori pendapatan.');
      if (!form.description.trim()) throw new Error('Deskripsi wajib diisi.');
      await craftFinanceApi.recordIncome({ amount: Number(form.amount), transaction_date: form.transaction_date, treasury_account_id: Number(form.treasury_account_id), category_code: form.category_code, description: form.description.trim() });
      setShowCreate(false);
      setForm({ amount: '', transaction_date: todayIso(), treasury_account_id: '', category_code: '', description: '' });
      load();
    } catch (cause) { setFormError(getError(cause)); } finally { setSaving(false); }
  };

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Pendapatan</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pendapatan</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Pembayaran pelanggan, settlement marketplace, dan pendapatan manual Craft.</p></div>
      {canWrite && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Catat Pendapatan</Button>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <KpiCard label="Total Pendapatan (Hasil Filter)" value={formatCurrency(data.summary.total_amount)} icon={ArrowUpRight} color="text-emerald-600" />
      <KpiCard label="Jumlah Transaksi" value={String(data.summary.total_count)} icon={Wallet} />
    </div>
    <Card><CardContent className="flex flex-wrap gap-3 p-4">
      <input className={`${inputClass} max-w-xs`} type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
      <input className={`${inputClass} max-w-xs`} type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
      <select className={`${inputClass} max-w-xs`} value={filters.categoryId} onChange={(e) => updateFilter('categoryId', e.target.value)}><option value="">Semua kategori</option>{incomeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select className={`${inputClass} max-w-xs`} value={filters.treasuryId} onChange={(e) => updateFilter('treasuryId', e.target.value)}><option value="">Semua akun kas</option>{(references?.treasuries || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select className={`${inputClass} max-w-xs`} value={filters.source} onChange={(e) => updateFilter('source', e.target.value)}><option value="">Semua sumber</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input className={`${inputClass} max-w-xs`} placeholder="Cari kode atau deskripsi..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
    </CardContent></Card>
    {!data.items.length ? <Card><CardContent className="p-8 text-center text-sm text-[var(--nexus-muted)]">Belum ada pendapatan yang sesuai filter.</CardContent></Card> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Tanggal</th><th>Kode</th><th>Kategori</th><th>Sumber</th><th>Akun Kas</th><th>Deskripsi</th><th className="text-right">Jumlah</th></tr></thead><tbody>{data.items.map((row: FinanceTransaction) => <tr key={row.id} className="border-t border-[var(--nexus-border)]"><td className="p-4">{date(row.transaction_date)}</td><td className="font-mono text-xs">{row.transaction_code}</td><td>{row.category_name || '—'}</td><td><Badge variant={row.source_type === 'finance_cash_reversal' ? 'warning' : 'outline'}>{(row.source_type && sourceLabels[row.source_type]) || row.source_type || '—'}</Badge></td><td>{row.treasury_name || '—'}</td><td>{row.description}</td><td className="text-right font-semibold text-emerald-600">+{formatCurrency(row.amount)}</td></tr>)}</tbody></table></div>
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(page) => updateFilter('page', page)} /></Card>}
    <Modal open={showCreate} title="Catat Pendapatan Manual" onClose={() => !saving && setShowCreate(false)} busy={saving}>
      <form onSubmit={submitCreate} className="space-y-4 p-5">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <div><label className={labelClass}>Jumlah (IDR)</label><input className={inputClass} type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></div>
        <div><label className={labelClass}>Tanggal</label><input className={inputClass} type="date" value={form.transaction_date} onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))} required /></div>
        <div><label className={labelClass}>Akun Kas Tujuan</label><select className={inputClass} value={form.treasury_account_id} onChange={(e) => setForm((f) => ({ ...f, treasury_account_id: e.target.value }))} required><option value="">Pilih akun kas</option>{(references?.treasuries || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className={labelClass}>Kategori</label><select className={inputClass} value={form.category_code} onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value }))} required><option value="">Pilih kategori</option>{incomeCategories.map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
        <div><label className={labelClass}>Deskripsi</label><input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
      </form>
    </Modal>
  </div>;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function ExpensesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.finance.write');
  const [filters, setFilters] = useState({ from: '', to: '', categoryId: '', treasuryId: '', status: '', search: '', page: 1 });
  const [data, setData] = useState<Awaited<ReturnType<typeof craftFinanceApi.expenses>> | null>(null);
  const [references, setReferences] = useState<FinanceReferences | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ expense_date: todayIso(), description: '', amount: '', tax_amount: '0', category_code: '', craft_order_id: '', treasury_account_id: '', status_code: 'draft' as 'draft' | 'approved' | 'paid', direct_payment_confirmed: false });
  const [payTarget, setPayTarget] = useState<FinanceExpense | null>(null);
  const [payForm, setPayForm] = useState({ treasury_account_id: '', payment_date: todayIso() });
  const [reverseTarget, setReverseTarget] = useState<FinanceExpense | null>(null);
  const [reverseForm, setReverseForm] = useState({ reversal_date: todayIso(), reason: '' });
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setError('');
    craftFinanceApi.expenses({ from: filters.from || undefined, to: filters.to || undefined, categoryId: filters.categoryId ? Number(filters.categoryId) : undefined, treasuryId: filters.treasuryId ? Number(filters.treasuryId) : undefined, status: filters.status || undefined, search: filters.search || undefined, page: filters.page, limit: 25 })
      .then(setData).catch((cause) => setError(getError(cause)));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { craftFinanceApi.references().then(setReferences).catch(() => undefined); }, []);

  const expenseCategories = useMemo(() => (references?.categories || []).filter((category) => category.transaction_type === 'expense'), [references]);
  const updateFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? (value as number) : 1 }));

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(''); setSaving(true);
    try {
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Jumlah harus lebih dari nol.');
      if (!form.category_code) throw new Error('Pilih kategori pengeluaran.');
      if (!form.description.trim()) throw new Error('Deskripsi wajib diisi.');
      if (form.status_code === 'paid' && !form.treasury_account_id) throw new Error('Pilih akun kas untuk pembayaran langsung.');
      if (form.status_code === 'paid' && !form.direct_payment_confirmed) throw new Error('Konfirmasi pembayaran langsung wajib dipilih.');
      await craftFinanceApi.createExpense({ expense_date: form.expense_date, description: form.description.trim(), amount: Number(form.amount), tax_amount: Number(form.tax_amount || 0), category_code: form.category_code, craft_order_id: form.craft_order_id ? Number(form.craft_order_id) : null, treasury_account_id: form.treasury_account_id ? Number(form.treasury_account_id) : null, status_code: form.status_code, direct_payment_confirmed: form.status_code === 'paid' ? true : undefined });
      setShowCreate(false);
      setForm({ expense_date: todayIso(), description: '', amount: '', tax_amount: '0', category_code: '', craft_order_id: '', treasury_account_id: '', status_code: 'draft', direct_payment_confirmed: false });
      load();
    } catch (cause) { setFormError(getError(cause)); } finally { setSaving(false); }
  };

  const approve = async (row: FinanceExpense) => {
    setWorking(true);
    try { await craftFinanceApi.approveExpense(row.id); setNotice(`Pengeluaran ${row.expense_code} disetujui.`); load(); }
    catch (cause) { setError(getError(cause)); } finally { setWorking(false); }
  };

  const submitPay = async (event: React.FormEvent) => {
    event.preventDefault(); if (!payTarget) return; setWorking(true);
    try { await craftFinanceApi.payExpense(payTarget.id, { treasury_account_id: Number(payForm.treasury_account_id), payment_date: payForm.payment_date }); setNotice(`Pengeluaran ${payTarget.expense_code} dibayar.`); setPayTarget(null); setFormError(''); load(); }
    catch (cause) { setFormError(getError(cause)); } finally { setWorking(false); }
  };

  const submitReverse = async (event: React.FormEvent) => {
    event.preventDefault(); if (!reverseTarget) return; setWorking(true);
    try { await craftFinanceApi.reverseExpense(reverseTarget.id, reverseForm); setNotice(`Pengeluaran ${reverseTarget.expense_code} dibalik.`); setReverseTarget(null); setFormError(''); load(); }
    catch (cause) { setFormError(getError(cause)); } finally { setWorking(false); }
  };

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Pengeluaran</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Pengeluaran</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Pengeluaran material, operasional, dan biaya lain Craft. Pengeluaran yang sudah dibayar tidak dihapus, hanya dibalik.</p></div>
      {canWrite && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Catat Pengeluaran</Button>}
    </div>
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <KpiCard label="Total Pengeluaran (Hasil Filter)" value={formatCurrency(data.summary.total_amount)} icon={ArrowDownRight} color="text-red-600" />
      <KpiCard label="Jumlah Catatan" value={String(data.summary.total_count)} icon={Wallet} />
    </div>
    <Card><CardContent className="flex flex-wrap gap-3 p-4">
      <input className={`${inputClass} max-w-xs`} type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
      <input className={`${inputClass} max-w-xs`} type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
      <select className={`${inputClass} max-w-xs`} value={filters.categoryId} onChange={(e) => updateFilter('categoryId', e.target.value)}><option value="">Semua kategori</option>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select className={`${inputClass} max-w-xs`} value={filters.treasuryId} onChange={(e) => updateFilter('treasuryId', e.target.value)}><option value="">Semua akun kas</option>{(references?.treasuries || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select className={`${inputClass} max-w-xs`} value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">Semua status</option>{Object.entries(expenseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input className={`${inputClass} max-w-xs`} placeholder="Cari kode atau deskripsi..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
    </CardContent></Card>
    {!data.items.length ? <Card><CardContent className="p-8 text-center text-sm text-[var(--nexus-muted)]">Belum ada pengeluaran yang sesuai filter.</CardContent></Card> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Tanggal</th><th>Kode</th><th>Kategori</th><th>Pesanan</th><th>Status</th><th className="text-right">Jumlah</th><th className="p-4">Aksi</th></tr></thead><tbody>{data.items.map((row: FinanceExpense) => <tr key={row.id} className="border-t border-[var(--nexus-border)]"><td className="p-4">{date(row.expense_date)}</td><td className="font-mono text-xs">{row.expense_code}<div className="text-xs font-normal text-[var(--nexus-muted)]">{row.description}</div></td><td>{row.category_name}</td><td>{row.order_code || '—'}</td><td><Badge variant={expenseStatusVariant[row.status_code]}>{expenseStatusLabels[row.status_code]}</Badge></td><td className="text-right font-semibold text-red-600">-{formatCurrency(row.total_amount)}</td><td className="p-4"><div className="flex gap-2">{canWrite && row.status_code === 'draft' && <Button size="sm" variant="outline" onClick={() => approve(row)} disabled={working}>Setujui</Button>}{canWrite && (row.status_code === 'draft' || row.status_code === 'approved') && <Button size="sm" onClick={() => { setPayTarget(row); setPayForm({ treasury_account_id: '', payment_date: todayIso() }); }} disabled={working}>Bayar</Button>}{canWrite && row.status_code === 'paid' && <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setReverseTarget(row); setReverseForm({ reversal_date: todayIso(), reason: '' }); }} disabled={working}>Balik</Button>}</div></td></tr>)}</tbody></table></div>
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(page) => updateFilter('page', page)} /></Card>}

    <Modal open={showCreate} title="Catat Pengeluaran" onClose={() => !saving && setShowCreate(false)} busy={saving}>
      <form onSubmit={submitCreate} className="space-y-4 p-5">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <div><label className={labelClass}>Tanggal</label><input className={inputClass} type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} required /></div>
        <div><label className={labelClass}>Deskripsi</label><input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Jumlah (IDR)</label><input className={inputClass} type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></div><div><label className={labelClass}>Pajak (IDR)</label><input className={inputClass} type="number" min="0" value={form.tax_amount} onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))} /></div></div>
        <div><label className={labelClass}>Kategori</label><select className={inputClass} value={form.category_code} onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value }))} required><option value="">Pilih kategori</option>{expenseCategories.map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
        <div><label className={labelClass}>Kaitkan Pesanan (opsional)</label><select className={inputClass} value={form.craft_order_id} onChange={(e) => setForm((f) => ({ ...f, craft_order_id: e.target.value }))}><option value="">Tidak dikaitkan</option>{(references?.orders || []).map((o) => <option key={o.id} value={o.id}>{o.order_code}</option>)}</select></div>
        <div><label className={labelClass}>Status Awal</label><select className={inputClass} value={form.status_code} onChange={(e) => setForm((f) => ({ ...f, status_code: e.target.value as typeof f.status_code }))}><option value="draft">Draf (belum dibayar)</option><option value="approved">Disetujui (belum dibayar)</option><option value="paid">Dibayar langsung</option></select></div>
        {form.status_code === 'paid' && <><div><label className={labelClass}>Akun Kas Pembayaran</label><select className={inputClass} value={form.treasury_account_id} onChange={(e) => setForm((f) => ({ ...f, treasury_account_id: e.target.value }))} required><option value="">Pilih akun kas</option>{(references?.treasuries || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={form.direct_payment_confirmed} onChange={(e) => setForm((f) => ({ ...f, direct_payment_confirmed: e.target.checked }))} /><span>Saya memahami bahwa alur ini menyetujui dan membayar pengeluaran dalam satu operasi.</span></label></>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(payTarget)} title={`Bayar Pengeluaran ${payTarget?.expense_code || ''}`} onClose={() => !working && setPayTarget(null)} busy={working}>
      <form onSubmit={submitPay} className="space-y-4 p-5">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <div><label className={labelClass}>Akun Kas</label><select className={inputClass} value={payForm.treasury_account_id} onChange={(e) => setPayForm((f) => ({ ...f, treasury_account_id: e.target.value }))} required><option value="">Pilih akun kas</option>{(references?.treasuries || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className={labelClass}>Tanggal Bayar</label><input className={inputClass} type="date" value={payForm.payment_date} onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))} required /></div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setPayTarget(null)} disabled={working}>Batal</Button><Button type="submit" disabled={working}>{working ? 'Memproses...' : 'Bayar'}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(reverseTarget)} title={`Balik Pengeluaran ${reverseTarget?.expense_code || ''}`} onClose={() => !working && setReverseTarget(null)} busy={working}>
      <form onSubmit={submitReverse} className="space-y-4 p-5">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <p className="text-sm text-[var(--nexus-muted)]">Pembalikan akan membuat transaksi penyeimbang; catatan pengeluaran asli tidak dihapus.</p>
        <div><label className={labelClass}>Tanggal Pembalikan</label><input className={inputClass} type="date" value={reverseForm.reversal_date} onChange={(e) => setReverseForm((f) => ({ ...f, reversal_date: e.target.value }))} required /></div>
        <div><label className={labelClass}>Alasan</label><input className={inputClass} value={reverseForm.reason} onChange={(e) => setReverseForm((f) => ({ ...f, reason: e.target.value }))} required minLength={3} /></div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setReverseTarget(null)} disabled={working}>Batal</Button><Button type="submit" variant="outline" className="text-red-600" disabled={working}>{working ? 'Memproses...' : 'Balik'}</Button></div>
      </form>
    </Modal>
  </div>;
}

// ---------------------------------------------------------------------------
// Profitability (HPP)
// ---------------------------------------------------------------------------

export function ProfitabilityPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState<Profitability | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); craftFinanceApi.profitability(range).then(setData).catch((cause) => setError(getError(cause))); }, [range]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">HPP & Profitabilitas</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;
  const summary = data.period_summary;

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">HPP & Profitabilitas</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Margin per pesanan dari pendapatan, biaya produksi aktual job cetak, dan fee marketplace yang tercatat.</p></div>
    <Card><CardContent className="flex flex-wrap items-center gap-3 p-4">
      <input className={`${inputClass} max-w-xs`} type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
      <input className={`${inputClass} max-w-xs`} type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      <p className="text-xs text-[var(--nexus-muted)]">Biaya langsung diambil dari biaya aktual job cetak (fallback estimasi bila belum selesai). Overhead, listrik, dan kemasan tidak disertakan karena belum ada sumber data tercatat — bukan diasumsikan nol.</p>
    </CardContent></Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total Pendapatan" value={formatCurrency(summary.total_revenue)} icon={ArrowUpRight} color="text-emerald-600" />
      <KpiCard label="Total Biaya Langsung" value={formatCurrency(summary.total_direct_cost)} icon={ArrowDownRight} color="text-red-600" />
      <KpiCard label="Total Fee Marketplace" value={formatCurrency(summary.total_marketplace_fee)} icon={ArrowDownRight} color="text-amber-600" />
      <KpiCard label="Laba Kotor" value={formatCurrency(summary.total_gross_profit)} icon={Landmark} color={summary.total_gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
    </div>
    {(summary.orders_missing_cost_data > 0 || summary.waste_events_informational > 0) && <Card><CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-amber-700"><AlertTriangle className="h-4 w-4 shrink-0" />
      {summary.orders_missing_cost_data > 0 && <span>{summary.orders_missing_cost_data} pesanan belum memiliki data biaya job cetak dan dikecualikan dari total laba di atas.</span>}
      {summary.waste_events_informational > 0 && <span>Informasi: {summary.waste_events_informational} kejadian gagal cetak/waste senilai {formatCurrency(summary.waste_cost_informational)} pada periode ini (tidak dikurangkan dari margin per pesanan karena belum dapat diatribusikan per pesanan secara pasti).</span>}
    </CardContent></Card>}
    {!data.orders.length ? <Card><CardContent className="p-8 text-center text-sm text-[var(--nexus-muted)]">Belum ada pesanan terealisasi pada periode ini.</CardContent></Card> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Pesanan</th><th>Tanggal</th><th className="text-right">Pendapatan</th><th className="text-right">Biaya Langsung</th><th className="text-right">Fee Marketplace</th><th className="text-right">Laba Kotor</th><th className="text-right">Margin</th></tr></thead><tbody>{data.orders.map((row) => <tr key={row.id} className="border-t border-[var(--nexus-border)]"><td className="p-4 font-mono text-xs">{row.order_code}</td><td>{date(row.order_date)}</td><td className="text-right">{formatCurrency(row.revenue)}</td><td className="text-right">{row.direct_cost_available ? <>{formatCurrency(row.direct_cost as number)}{row.direct_cost_is_estimated && <Badge variant="warning" className="ml-2">Estimasi</Badge>}{row.direct_cost_is_partially_estimated && <Badge variant="warning" className="ml-2">Sebagian estimasi</Badge>}</> : <Badge variant="outline">Tidak tersedia</Badge>}</td><td className="text-right">{formatCurrency(row.marketplace_fee)}</td><td className={`text-right font-semibold ${row.gross_profit !== null ? (row.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>{row.gross_profit !== null ? formatCurrency(row.gross_profit) : '—'}</td><td className="text-right">{row.margin_percent !== null ? `${row.margin_percent.toFixed(1)}%` : '—'}</td></tr>)}</tbody></table></div></Card>}
  </div>;
}

// ---------------------------------------------------------------------------
// Cash Flow
// ---------------------------------------------------------------------------

export function CashFlowPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState<CashFlow | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); craftFinanceApi.cashFlow(range).then(setData).catch((cause) => setError(getError(cause))); }, [range]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Arus Kas</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;
  const totals = data.daily.reduce((acc, row) => ({ cashIn: acc.cashIn + row.cash_in, cashOut: acc.cashOut + row.cash_out }), { cashIn: 0, cashOut: 0 });

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Arus Kas</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Kas masuk dan keluar dari transaksi yang sudah diposting.</p></div>
    <Card><CardContent className="flex flex-wrap gap-3 p-4"><input className={`${inputClass} max-w-xs`} type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /><input className={`${inputClass} max-w-xs`} type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></CardContent></Card>
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard label="Kas Masuk" value={formatCurrency(totals.cashIn)} icon={ArrowUpRight} color="text-emerald-600" />
      <KpiCard label="Kas Keluar" value={formatCurrency(totals.cashOut)} icon={ArrowDownRight} color="text-red-600" />
      <KpiCard label="Arus Kas Bersih" value={formatCurrency(totals.cashIn - totals.cashOut)} icon={Landmark} color={totals.cashIn - totals.cashOut >= 0 ? 'text-emerald-600' : 'text-red-600'} />
    </div>
    <Card><CardHeader><CardTitle className="text-base">Per Hari</CardTitle></CardHeader>{!data.daily.length ? <CardContent className="p-6 text-sm text-[var(--nexus-muted)]">Belum ada transaksi kas pada periode ini.</CardContent> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Tanggal</th><th className="text-right">Kas Masuk</th><th className="text-right">Kas Keluar</th><th className="text-right">Bersih</th></tr></thead><tbody>{data.daily.map((row, index) => <tr key={index} className="border-t border-[var(--nexus-border)]"><td className="p-4">{date(row.day)}</td><td className="text-right text-emerald-600">{formatCurrency(row.cash_in)}</td><td className="text-right text-red-600">{formatCurrency(row.cash_out)}</td><td className={`text-right font-semibold ${row.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(row.net_cash_flow)}</td></tr>)}</tbody></table></div>}</Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Per Akun Kas</CardTitle></CardHeader>{!data.by_treasury.length ? <CardContent className="p-6 text-sm text-[var(--nexus-muted)]">Tidak ada data.</CardContent> : <div className="divide-y">{data.by_treasury.map((row, index) => <div key={index} className="flex justify-between p-4 text-sm"><span>{row.treasury_name || 'Tanpa akun'}</span><span className={`font-semibold ${row.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(row.net_cash_flow)}</span></div>)}</div>}</Card>
      <Card><CardHeader><CardTitle className="text-base">Per Kategori</CardTitle></CardHeader>{!data.by_category.length ? <CardContent className="p-6 text-sm text-[var(--nexus-muted)]">Tidak ada data.</CardContent> : <div className="divide-y">{data.by_category.map((row, index) => <div key={index} className="flex justify-between p-4 text-sm"><span>{row.category_name || 'Tanpa kategori'} <Badge variant={row.transaction_type === 'income' ? 'success' : 'error'} className="ml-1">{row.transaction_type === 'income' ? 'Masuk' : 'Keluar'}</Badge></span><span className="font-semibold">{formatCurrency(row.amount)}</span></div>)}</div>}</Card>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export function BudgetsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.finance.write');
  const [data, setData] = useState<Budget[] | null>(null);
  const [references, setReferences] = useState<FinanceReferences | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', period_start: todayIso(), period_end: todayIso(), items: [{ name: '', category_id: '', allocated_amount: '' }] });
  const [working, setWorking] = useState(false);

  const load = useCallback(() => { setError(''); craftFinanceApi.budgets().then(setData).catch((cause) => setError(getError(cause))); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { craftFinanceApi.references().then(setReferences).catch(() => undefined); }, []);
  const expenseCategories = useMemo(() => (references?.categories || []).filter((category) => category.transaction_type === 'expense'), [references]);

  const approve = async (budget: Budget) => {
    setWorking(true);
    try { await craftFinanceApi.approveBudget(budget.id); setNotice(`Anggaran ${budget.budget_code} disetujui.`); load(); }
    catch (cause) { setError(getError(cause)); } finally { setWorking(false); }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError(''); setSaving(true);
    try {
      if (!form.name.trim()) throw new Error('Nama anggaran wajib diisi.');
      if (form.period_end < form.period_start) throw new Error('Akhir periode tidak boleh mendahului awal periode.');
      const items = form.items.filter((item) => item.name.trim() && Number(item.allocated_amount) > 0).map((item) => ({ name: item.name.trim(), allocated_amount: Number(item.allocated_amount), category_id: item.category_id ? Number(item.category_id) : null }));
      if (!items.length) throw new Error('Tambahkan minimal satu item anggaran dengan jumlah lebih dari nol.');
      await craftFinanceApi.createBudget({ name: form.name.trim(), period_start: form.period_start, period_end: form.period_end, items });
      setShowCreate(false);
      setForm({ name: '', period_start: todayIso(), period_end: todayIso(), items: [{ name: '', category_id: '', allocated_amount: '' }] });
      load();
    } catch (cause) { setFormError(getError(cause)); } finally { setSaving(false); }
  };

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Anggaran</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Anggaran</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Anggaran per periode untuk unit Craft, dibandingkan dengan realisasi pengeluaran yang sudah dibayar.</p></div>
      {canWrite && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Buat Anggaran</Button>}
    </div>
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
    {!data.length ? <Card><CardContent className="p-8 text-center text-sm text-[var(--nexus-muted)]">Belum ada anggaran yang dibuat.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{data.map((budget) => <Card key={budget.id}><CardContent className="space-y-3 p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-[var(--nexus-muted)]">{budget.budget_code}</p><h3 className="font-bold text-[var(--nexus-charcoal)]">{budget.name}</h3><p className="text-xs text-[var(--nexus-muted)]">{date(budget.period_start)} – {date(budget.period_end)}</p></div><Badge variant={budget.status_code === 'approved' || budget.status_code === 'active' ? 'success' : budget.status_code === 'closed' ? 'outline' : 'warning'}>{budgetStatusLabels[budget.status_code] || budget.status_code}</Badge></div>
      <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-[var(--nexus-muted)]">Dialokasikan</span><span className="font-semibold">{formatCurrency(budget.allocated_amount)}</span></div><div className="flex justify-between"><span className="text-[var(--nexus-muted)]">Realisasi</span><span className="font-semibold">{formatCurrency(budget.actual_amount)}</span></div></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--nexus-cream-soft)]"><div className={`h-full ${budget.utilization_percent > 100 ? 'bg-red-500' : 'bg-[var(--nexus-yellow-deep)]'}`} style={{ width: `${Math.min(100, budget.utilization_percent)}%` }} /></div>
      <p className="text-xs text-[var(--nexus-muted)]">{budget.utilization_percent.toFixed(1)}% terpakai</p>
      {canWrite && budget.status_code === 'draft' && <Button size="sm" variant="outline" onClick={() => approve(budget)} disabled={working}>Setujui Anggaran</Button>}
    </CardContent></Card>)}</div>}

    <Modal open={showCreate} title="Buat Anggaran" onClose={() => !saving && setShowCreate(false)} busy={saving} className="max-w-2xl">
      <form onSubmit={submitCreate} className="space-y-4 p-5">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <div><label className={labelClass}>Nama Anggaran</label><input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Mulai Periode</label><input className={inputClass} type="date" value={form.period_start} onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} required /></div><div><label className={labelClass}>Akhir Periode</label><input className={inputClass} type="date" value={form.period_end} onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} required /></div></div>
        <div className="space-y-3">
          <label className={labelClass}>Item Anggaran</label>
          {form.items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <input className={inputClass} placeholder="Nama item" value={item.name} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((current, i) => i === index ? { ...current, name: e.target.value } : current) }))} />
            <select className={inputClass} value={item.category_id} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((current, i) => i === index ? { ...current, category_id: e.target.value } : current) }))}><option value="">Tanpa kategori</option>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input className={inputClass} type="number" min="0" placeholder="Jumlah" value={item.allocated_amount} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((current, i) => i === index ? { ...current, allocated_amount: e.target.value } : current) }))} />
            <Button type="button" variant="ghost" className="text-red-600" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))} disabled={form.items.length <= 1}>Hapus</Button>
          </div>)}
          <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: '', category_id: '', allocated_amount: '' }] }))}><Plus className="h-4 w-4" /> Tambah Item</Button>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
      </form>
    </Modal>
  </div>;
}

// ---------------------------------------------------------------------------
// Journals & Periods
// ---------------------------------------------------------------------------

export function AccountingPage() {
  const { hasPermission } = useAuth();
  const canManagePeriods = hasPermission('finance.manage');
  const [data, setData] = useState<Accounting | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Journal | null>(null);
  const [detailData, setDetailData] = useState<Awaited<ReturnType<typeof craftFinanceApi.journalDetail>> | null>(null);
  const [detailError, setDetailError] = useState('');
  const load = useCallback(() => { setError(''); craftFinanceApi.accounting().then(setData).catch((cause) => setError(getError(cause))); }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = (journal: Journal) => {
    setDetail(journal); setDetailData(null); setDetailError('');
    craftFinanceApi.journalDetail(journal.id).then(setDetailData).catch((cause) => setDetailError(getError(cause)));
  };

  const filteredJournals = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return data.journals;
    return data.journals.filter((journal) => journal.journal_number.toLowerCase().includes(needle) || journal.description.toLowerCase().includes(needle) || (journal.source_type || '').toLowerCase().includes(needle));
  }, [data, search]);

  if (error) return <div className="max-w-7xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Jurnal & Periode</h1><ErrorView retry={load} /></div>;
  if (!data) return <Loading />;

  return <div className="space-y-6 max-w-7xl mx-auto pb-12">
    <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Jurnal & Periode</h1><p className="mt-1 text-sm text-[var(--nexus-muted)]">Jurnal double-entry yang diposting otomatis dari transaksi Craft (250 entri terakhir).</p></div>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Jurnal</CardTitle><input className={`${inputClass} max-w-xs`} placeholder="Cari nomor, sumber, atau deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} /></CardHeader>
      {!filteredJournals.length ? <CardContent className="p-6 text-sm text-[var(--nexus-muted)]">Tidak ada jurnal yang sesuai.</CardContent> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Nomor</th><th>Tanggal</th><th>Sumber</th><th>Deskripsi</th><th className="text-right">Debit</th><th className="text-right">Kredit</th><th>Saldo</th></tr></thead><tbody>{filteredJournals.map((journal) => <tr key={journal.id} className="cursor-pointer border-t border-[var(--nexus-border)] hover:bg-[var(--nexus-cream-soft)]/50" onClick={() => openDetail(journal)}><td className="p-4 font-mono text-xs">{journal.journal_number}</td><td>{date(journal.entry_date)}</td><td>{journal.source_type || '—'}</td><td>{journal.description}</td><td className="text-right">{formatCurrency(journal.debit_amount)}</td><td className="text-right">{formatCurrency(journal.credit_amount)}</td><td>{journal.is_balanced ? <Badge variant="success">Seimbang</Badge> : <Badge variant="error">Tidak Seimbang</Badge>}</td></tr>)}</tbody></table></div>}
    </Card>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Periode Keuangan</CardTitle>{canManagePeriods && <Link to="/app/finance"><Button size="sm" variant="outline">Kelola Periode di Unified Finance</Button></Link>}</CardHeader>
      <CardContent className="text-xs text-[var(--nexus-muted)]">Periode keuangan berlaku untuk seluruh organisasi. Pembuatan, penutupan, dan pembukaan kembali periode dikelola terpusat di Unified Finance untuk menjaga satu sumber kebenaran.</CardContent>
      {!data.periods.length ? <CardContent className="p-6 text-sm text-[var(--nexus-muted)]">Belum ada periode keuangan yang dikonfigurasi.</CardContent> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[var(--nexus-cream-soft)] text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="p-4">Kode</th><th>Mulai</th><th>Akhir</th><th>Status</th></tr></thead><tbody>{data.periods.map((period) => <tr key={period.id} className="border-t border-[var(--nexus-border)]"><td className="p-4 font-mono text-xs">{period.period_code}</td><td>{date(period.start_date)}</td><td>{date(period.end_date)}</td><td><Badge variant={period.status_code === 'open' ? 'success' : period.status_code === 'closed' ? 'outline' : 'warning'}>{period.status_code}</Badge></td></tr>)}</tbody></table></div>}
    </Card>

    <Modal open={Boolean(detail)} title={`Jurnal ${detail?.journal_number || ''}`} onClose={() => setDetail(null)}>
      <div className="space-y-4 p-5">
        {detailError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detailError}</div>}
        {!detailData && !detailError ? <p className="text-sm text-[var(--nexus-muted)]">Memuat detail jurnal...</p> : detailData && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-[var(--nexus-muted)]"><tr><th className="pb-2">Akun</th><th className="text-right">Debit</th><th className="text-right">Kredit</th></tr></thead><tbody>{detailData.lines.map((line) => <tr key={line.id} className="border-t"><td className="py-2">{line.account_code ? `${line.account_code} · ${line.account_name}` : (line.description || '—')}</td><td className="text-right">{line.debit_amount ? formatCurrency(line.debit_amount) : '—'}</td><td className="text-right">{line.credit_amount ? formatCurrency(line.credit_amount) : '—'}</td></tr>)}</tbody></table></div>}
      </div>
    </Modal>
  </div>;
}
