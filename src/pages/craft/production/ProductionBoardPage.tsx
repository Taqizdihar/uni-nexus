import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Factory, Layers, ListOrdered, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { craftProductionApi } from '../../../services/api/craft-production.api';
import type { CreatePrintJobRequest, DeadlineRisk, OperatorOption, PrinterOption, ProductionBoardStatus, ProductionFilters, ProductionJob } from '../../../types/craft-production';
import type { PriorityCode } from '../../../types/craft-orders';
import { JobActions } from './components/JobActions';
import { JobPlanningModal } from './components/JobPlanningModal';
import { DeadlineRiskBadge, formatDuration, formatProductionDate, ProductionEmptyState, ProductionError, ProductionPageHeader, ProductionPriorityBadge, ProductionProgress, ProductionStatusBadge, productionStatusLabels } from './components/ProductionUI';

const boardColumns: ProductionBoardStatus[] = ['queued', 'ready', 'printing', 'paused', 'qc', 'completed'];

export function ProductionBoardPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.production.write');
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [filters, setFilters] = useState<ProductionFilters>({ search: '', sortBy: 'priority', sortOrder: 'desc' });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await craftProductionApi.getBoard(filters); setJobs(result.jobs || []); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat papan produksi.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void craftProductionApi.getReferences().then(data => { setPrinters(data.printers || []); setOperators(data.operators || []); }).catch(() => undefined); }, []);

  const visibleJobs = useMemo(() => jobs.filter(job => {
    const query = filters.search?.trim().toLowerCase();
    if (query && ![job.job_code, job.order_code, job.customer_name, job.item_name].some(value => value?.toLowerCase().includes(query))) return false;
    if (filters.printerId && job.printer_id !== filters.printerId) return false;
    if (filters.operatorId && job.operator_user_id !== filters.operatorId) return false;
    if (filters.priority && job.priority_code !== filters.priority) return false;
    if (filters.deadlineRisk && job.deadline_risk !== filters.deadlineRisk) return false;
    return true;
  }), [filters, jobs]);
  const grouped = useMemo(() => Object.fromEntries(boardColumns.map(status => [status, visibleJobs.filter(job => job.status_code === status)])) as Record<ProductionBoardStatus, ProductionJob[]>, [visibleJobs]);

  const createInternal = async (data: CreatePrintJobRequest) => {
    const created = await craftProductionApi.createPrintJob(data);
    setInternalOpen(false);
    setNotice(`${created.job_code} berhasil dibuat.`);
    navigate(`/app/craft/production/jobs/${created.id}`);
  };

  return <div className="flex h-full min-h-0 flex-col gap-5 pb-4">
    <ProductionPageHeader title="Papan Produksi" description="Pantau pekerjaan cetak dan progres produksi secara real-time operasional." actions={<><Button variant="outline" onClick={() => navigate('/app/craft/production/queue')}><ListOrdered className="h-4 w-4" /> Antrean Cetak</Button>{canWrite && <Button onClick={() => setChoiceOpen(true)}><Plus className="h-4 w-4" /> Tambah Pekerjaan</Button>}</>} />
    {error && <ProductionError message={error} retry={() => void load()} />}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{boardColumns.map(status => <button type="button" key={status} className="production-kpi text-left transition hover:border-[var(--nexus-yellow-deep)]" onClick={() => document.getElementById(`production-column-${status}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--nexus-muted)]">{productionStatusLabels[status]}</p><p className="mt-2 text-2xl font-bold text-[var(--nexus-charcoal)]">{grouped[status].length}</p></button>)}</div>
    <div className="rounded-xl border border-[var(--nexus-border)] bg-white p-4"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5"><label className="relative block xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nexus-muted)]" /><input type="search" className="production-input pl-10" value={filters.search || ''} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} placeholder="Cari job, order, pelanggan, item..." /></label><select className="production-filter-select" aria-label="Printer" value={filters.printerId || ''} onChange={event => setFilters(current => ({ ...current, printerId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Semua Printer</option>{printers.map(printer => <option key={printer.id} value={printer.id}>{printer.name}</option>)}</select><select className="production-filter-select" aria-label="Operator" value={filters.operatorId || ''} onChange={event => setFilters(current => ({ ...current, operatorId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Semua Operator</option>{operators.map(operator => <option key={operator.id} value={operator.id}>{operator.full_name}</option>)}</select><select className="production-filter-select" aria-label="Prioritas" value={filters.priority || ''} onChange={event => setFilters(current => ({ ...current, priority: (event.target.value || undefined) as PriorityCode | undefined }))}><option value="">Semua Prioritas</option><option value="critical">Kritis</option><option value="high">Tinggi</option><option value="normal">Normal</option><option value="low">Rendah</option></select><select className="production-filter-select" aria-label="Risiko tenggat" value={filters.deadlineRisk || ''} onChange={event => setFilters(current => ({ ...current, deadlineRisk: (event.target.value || undefined) as DeadlineRisk | undefined }))}><option value="">Semua Risiko</option><option value="on_track">Sesuai Jadwal</option><option value="at_risk">Berisiko</option><option value="late">Terlambat</option><option value="unknown">Belum Dihitung</option></select></div></div>
    {loading ? <div className="flex min-h-72 items-center justify-center text-sm text-[var(--nexus-muted)]">Memuat papan produksi...</div> : jobs.length === 0 ? <Card><ProductionEmptyState title="Belum Ada Pekerjaan Produksi" description="Item dari Antrean Produksi akan muncul setelah dibuat menjadi pekerjaan cetak." action={<Button onClick={() => navigate('/app/craft/production/queue')}><ListOrdered className="h-4 w-4" /> Buka Antrean Cetak</Button>} /></Card> : <div className="min-h-[560px] flex-1 overflow-x-auto pb-4"><div className="flex min-w-max gap-4">{boardColumns.map(status => <section id={`production-column-${status}`} key={status} className="flex w-[330px] flex-col rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45"><div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-[var(--nexus-border)] bg-white px-4 py-3"><div><p className="text-sm font-bold text-[var(--nexus-charcoal)]">{productionStatusLabels[status]}</p><p className="mt-0.5 text-[10px] text-[var(--nexus-muted)]">{columnDescription(status)}</p></div><Badge variant="outline">{grouped[status].length}</Badge></div><div className="space-y-3 p-3">{grouped[status].length ? grouped[status].map(job => <ProductionJobCard key={job.id} job={job} canWrite={canWrite} reload={() => void load()} onError={setError} />) : <div className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-white/60 p-5 text-center text-xs leading-5 text-[var(--nexus-muted)]">Tidak ada pekerjaan dalam tahap ini.</div>}</div></section>)}</div></div>}
    <CreateChoiceModal open={choiceOpen} onClose={() => setChoiceOpen(false)} openQueue={() => navigate('/app/craft/production/queue')} openInternal={() => { setChoiceOpen(false); setInternalOpen(true); }} />
    <JobPlanningModal open={internalOpen} onClose={() => setInternalOpen(false)} onSubmit={createInternal} title="Pekerjaan Internal" description="Untuk test print, kalibrasi, prototipe, atau kebutuhan internal Uni-Inside." />
  </div>;
}

function ProductionJobCard({ job, canWrite, reload, onError }: { job: ProductionJob; canWrite: boolean; reload: () => void; onError: (message: string) => void; key?: React.Key }) {
  const navigate = useNavigate();
  return <Card className="cursor-pointer transition hover:border-[var(--nexus-yellow-deep)]" onClick={() => navigate(`/app/craft/production/jobs/${job.id}`)}><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><ProductionPriorityBadge value={job.priority_code} /><ProductionStatusBadge value={job.status_code} /></div><div><p className="font-mono text-sm font-bold tracking-wide text-[var(--nexus-charcoal)]">{job.job_code}</p><p className="mt-1 text-sm font-semibold text-[var(--nexus-charcoal)]">{job.job_name}</p></div><dl className="grid grid-cols-[74px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs"><dt className="text-[var(--nexus-muted)]">Order</dt><dd className="font-semibold">{job.order_code || 'Internal'}</dd><dt className="text-[var(--nexus-muted)]">Item</dt><dd className="line-clamp-2">{job.item_name} × {job.quantity}</dd><dt className="text-[var(--nexus-muted)]">Pelanggan</dt><dd className="truncate">{job.customer_name || 'Uni-Inside'}</dd><dt className="text-[var(--nexus-muted)]">Printer</dt><dd className="truncate">{job.printer_name || 'Belum dipilih'}</dd><dt className="text-[var(--nexus-muted)]">Operator</dt><dd className="truncate">{job.operator_name || 'Belum ditentukan'}</dd><dt className="text-[var(--nexus-muted)]">Tenggat</dt><dd>{formatProductionDate(job.deadline_at, false)}</dd><dt className="text-[var(--nexus-muted)]">Estimasi</dt><dd>{formatDuration(job.estimated_print_minutes)}</dd></dl><div className="flex flex-wrap gap-2"><DeadlineRiskBadge value={job.deadline_risk} />{job.material_summary && <Badge variant="outline" className="max-w-full truncate">{job.material_summary}</Badge>}</div>{job.status_code === 'printing' && <div className="space-y-2 rounded-lg bg-[var(--nexus-cream-soft)] p-3"><ProductionProgress value={job.progress_percent} source={job.progress_source || 'estimated'} /><div className="flex justify-between text-[10px] text-[var(--nexus-muted)]"><span>Mulai {formatProductionDate(job.started_at)}</span><span>ETA {formatProductionDate(job.estimated_finish_at)}</span></div></div>}<div className="border-t border-[var(--nexus-border)] pt-3"><JobActions job={job} canWrite={canWrite} onChanged={reload} onError={onError} compact /></div></div></Card>;
}

function CreateChoiceModal({ open, onClose, openQueue, openInternal }: { open: boolean; onClose: () => void; openQueue: () => void; openInternal: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]"><div className="w-full max-w-xl rounded-xl border border-[var(--nexus-border)] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true"><div className="flex items-start justify-between"><div><p className="production-eyebrow">Sumber pekerjaan</p><h2 className="text-xl font-bold">Tambah Pekerjaan</h2><p className="mt-1 text-sm text-[var(--nexus-muted)]">Pilih hubungan pekerjaan dengan kebutuhan operasional.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={openQueue} className="rounded-xl border border-[var(--nexus-border)] p-5 text-left transition hover:border-[var(--nexus-yellow-deep)] hover:bg-[var(--nexus-yellow)]/5"><ListOrdered className="h-5 w-5 text-[var(--nexus-yellow-deep)]" /><strong className="mt-4 block text-sm">Dari Antrean Pesanan</strong><span className="mt-1 block text-xs leading-5 text-[var(--nexus-muted)]">Cara normal untuk memproduksi item pesanan pelanggan.</span></button><button type="button" onClick={openInternal} className="rounded-xl border border-[var(--nexus-border)] p-5 text-left transition hover:border-[var(--nexus-yellow-deep)] hover:bg-[var(--nexus-yellow)]/5"><Factory className="h-5 w-5 text-[var(--nexus-yellow-deep)]" /><strong className="mt-4 block text-sm">Pekerjaan Internal</strong><span className="mt-1 block text-xs leading-5 text-[var(--nexus-muted)]">Test print, kalibrasi, prototipe, atau kebutuhan internal.</span></button></div></div></div>;
}

function columnDescription(status: ProductionBoardStatus): string {
  const labels: Record<ProductionBoardStatus, string> = { queued: 'Belum siap dieksekusi', ready: 'Siap dimulai', printing: 'Sedang memakai printer', paused: 'Printer tetap sibuk', qc: 'Menunggu inspeksi', completed: 'Output baik diterima' };
  return labels[status];
}
