import React, { useCallback, useEffect, useState } from 'react';
import { CirclePause, ClipboardCheck, Gauge, Printer, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { craftProductionApi } from '../../../services/api/craft-production.api';
import type { ActiveProduction, ActivePrinter, ProductionJob } from '../../../types/craft-production';
import { JobActions } from './components/JobActions';
import { formatProductionDate, ProductionEmptyState, ProductionError, ProductionKpi, ProductionLoading, ProductionPageHeader, ProductionPriorityBadge, ProductionProgress, ProductionStatusBadge } from './components/ProductionUI';

const emptyData: ActiveProduction = { jobs: [], printers: [], metrics: { printing: 0, paused: 0, qc: 0, available_printers: 0 } };

export function ActiveProductionPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.production.write');
  const [data, setData] = useState<ActiveProduction>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const result = await craftProductionApi.getActiveProduction(); setData({ ...emptyData, ...result, metrics: { ...emptyData.metrics, ...result.metrics } }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat produksi aktif.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const representedJobIds = new Set(data.printers.flatMap(printer => printer.current_job ? [printer.current_job.id] : []));
  const otherActiveJobs = data.jobs.filter(job => !representedJobIds.has(job.id));

  return <div className="space-y-6 pb-8"><ProductionPageHeader title="Produksi Aktif" description="Tampilan harian berbasis printer untuk pekerjaan yang siap, dicetak, dijeda, atau menunggu QC." actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan</Button>} />{error && <ProductionError message={error} retry={() => void load()} />}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProductionKpi label="Sedang Dicetak" value={data.metrics.printing} icon={Gauge} /><ProductionKpi label="Dijeda" value={data.metrics.paused} icon={CirclePause} tone={data.metrics.paused ? 'warning' : 'default'} /><ProductionKpi label="Menunggu QC" value={data.metrics.qc} icon={ClipboardCheck} /><ProductionKpi label="Printer Tersedia" value={data.metrics.available_printers} icon={Printer} tone="success" /></div>{loading ? <ProductionLoading label="Memuat aktivitas printer..." /> : data.printers.length === 0 && data.jobs.length === 0 ? <Card><ProductionEmptyState title="Belum Ada Produksi Aktif" description="Pekerjaan berstatus Siap, Sedang Dicetak, Dijeda, atau QC akan tampil di sini." /></Card> : <><div className="grid items-start gap-4 xl:grid-cols-2">{data.printers.map(printer => <PrinterActivityCard key={printer.id} printer={printer} canWrite={canWrite} reload={() => void load()} onError={setError} />)}</div>{otherActiveJobs.length > 0 && <section className="space-y-3"><div><h2 className="font-bold text-[var(--nexus-charcoal)]">Pekerjaan Aktif Lainnya</h2><p className="mt-1 text-xs text-[var(--nexus-muted)]">Pekerjaan Siap dan QC, serta pekerjaan aktif yang tidak menjadi current job printer.</p></div><div className="grid items-start gap-4 xl:grid-cols-2">{otherActiveJobs.map(job => <FallbackJobCard key={job.id} job={job} canWrite={canWrite} reload={() => void load()} onError={setError} />)}</div></section>}</>}<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><strong>Catatan progres:</strong> UNI-NEXUS belum menerima telemetri mesin. Progres yang terlihat berasal dari input manual atau estimasi waktu berjalan, sesuai label pada tiap pekerjaan.</div></div>;
}

function PrinterActivityCard({ printer, canWrite, reload, onError }: { printer: ActivePrinter; canWrite: boolean; reload: () => void; onError: (message: string) => void; key?: React.Key }) {
  const job = printer.current_job;
  return <Card><div className="border-b border-[var(--nexus-border)] bg-[var(--nexus-charcoal)] p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--nexus-yellow)]">{printer.code || 'Printer 3D'}</p><h2 className="mt-1 text-lg font-bold">{printer.name}</h2></div><Badge variant={printer.status_code === 'available' ? 'success' : printer.status_code === 'busy' ? 'warning' : printer.status_code === 'error' ? 'error' : 'default'}>{printer.status_code === 'available' ? 'Tersedia' : printer.status_code === 'busy' ? 'Sedang Digunakan' : printer.status_code}</Badge></div></div>{job ? <ActiveJobBody job={job} canWrite={canWrite} reload={reload} onError={onError} /> : <ProductionEmptyState compact icon={Printer} title="Printer Tersedia" description="Tidak ada pekerjaan aktif yang menggunakan printer ini." />}</Card>;
}

function ActiveJobBody({ job, canWrite, reload, onError }: { job: ProductionJob; canWrite: boolean; reload: () => void; onError: (message: string) => void }) {
  const navigate = useNavigate();
  return <div className="space-y-4 p-5"><button type="button" className="block w-full text-left" onClick={() => navigate(`/app/craft/production/jobs/${job.id}`)}><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{job.job_code}</span><ProductionStatusBadge value={job.status_code} /><ProductionPriorityBadge value={job.priority_code} /></div><p className="mt-2 text-base font-bold text-[var(--nexus-charcoal)]">{job.item_name} × {job.quantity}</p><p className="mt-1 text-xs text-[var(--nexus-muted)]">{job.order_code || 'Pekerjaan internal'} · {job.customer_name || 'Uni-Inside'}</p></button>{(job.status_code === 'printing' || job.status_code === 'paused') && <ProductionProgress value={job.progress_percent} source={job.progress_source || 'estimated'} />}<div className="grid grid-cols-2 gap-3 rounded-lg bg-[var(--nexus-cream-soft)] p-3 text-xs"><Info label="Mulai" value={formatProductionDate(job.started_at)} /><Info label="ETA" value={formatProductionDate(job.estimated_finish_at)} /><Info label="Operator" value={job.operator_name || 'Belum ditentukan'} /><Info label="Material" value={job.material_summary || 'Belum ditautkan'} /></div><JobActions job={job} canWrite={canWrite} onChanged={reload} onError={onError} compact /></div>;
}

function FallbackJobCard({ job, canWrite, reload, onError }: { job: ProductionJob; canWrite: boolean; reload: () => void; onError: (message: string) => void; key?: React.Key }) { return <Card><div className="p-5"><p className="text-xs text-[var(--nexus-muted)]">Printer: {job.printer_name || 'Belum dipilih'}</p><div className="mt-3"><ActiveJobBody job={job} canWrite={canWrite} reload={reload} onError={onError} /></div></div></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nexus-muted)]">{label}</p><p className="mt-1 truncate font-semibold text-[var(--nexus-charcoal)]">{value}</p></div>; }
