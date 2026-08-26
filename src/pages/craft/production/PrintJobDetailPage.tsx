import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ClipboardCheck, Factory, FileClock, Layers3, PackageCheck, Paperclip, Printer, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { craftProductionApi } from '../../../services/api/craft-production.api';
import type { ProductionJobDetail } from '../../../types/craft-production';
import { JobActions } from './components/JobActions';
import { OrderAttachmentList } from './components/OrderAttachmentList';
import {
  DeadlineRiskBadge,
  failureTypeLabels,
  formatDuration,
  formatProductionDate,
  ProductionError,
  ProductionLoading,
  ProductionPageHeader,
  ProductionPriorityBadge,
  ProductionProgress,
  ProductionStatusBadge,
  productionStatusLabels,
  QcResultBadge,
} from './components/ProductionUI';

export function PrintJobDetailPage() {
  const jobId = Number(useParams<{ id: string }>().id);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('craft.production.write');
  const canReadOrder = hasPermission('craft.orders.read');
  const [data, setData] = useState<ProductionJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(jobId) || jobId <= 0) {
      setError('ID pekerjaan cetak tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await craftProductionApi.getPrintJob(jobId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat detail pekerjaan cetak.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <ProductionLoading label="Memuat detail pekerjaan cetak..." />;
  if (!data) return <ProductionError message={error || 'Pekerjaan cetak tidak ditemukan.'} retry={() => void load()} />;

  const {
    job,
    materials,
    history,
    qc_inspection: qc,
    failure,
    reprint_job: reprintJob,
    order_attachments: orderAttachments,
  } = data;

  return <div className="space-y-6 pb-12">
    <ProductionPageHeader
      eyebrow={`Craft Production / ${job.job_code}`}
      title={job.job_code}
      description={`${job.job_name} · ${job.item_name}`}
      back={() => navigate('/app/craft/production/jobs')}
      actions={<><ProductionStatusBadge value={job.status_code} /><ProductionPriorityBadge value={job.priority_code} /></>}
    />

    {error && <ProductionError message={error} />}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Summary label="Status"><ProductionStatusBadge value={job.status_code} /></Summary>
      <Summary label="Risiko Tenggat"><DeadlineRiskBadge value={job.deadline_risk} /></Summary>
      <Summary label="Progres"><span className="text-xl font-bold">{Number(job.progress_percent || 0)}%</span><p className="mt-1 text-[11px] text-[var(--nexus-muted)]">{job.progress_source === 'estimated' ? 'Estimasi berbasis waktu' : job.progress_source === 'manual' ? 'Input manual operator' : 'Belum dicatat'}</p></Summary>
      <Summary label="Estimasi Selesai"><span className="text-sm font-bold">{formatProductionDate(job.estimated_finish_at)}</span></Summary>
    </div>

    <Card><div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
      <InfoGroup icon={Factory} title="Identitas Pekerjaan"><Info label="Nama" value={job.job_name} /><Info label="Jenis" value={job.order_id ? 'Pekerjaan pesanan' : 'Pekerjaan internal'} /><Info label="Jumlah" value={`${Number(job.quantity)} unit`} /></InfoGroup>
      <InfoGroup icon={PackageCheck} title="Pesanan & Item"><Info label="Order" value={job.order_code || 'Tidak terkait order'} link={job.order_id && canReadOrder ? `/app/craft/orders/${job.order_id}` : undefined} /><Info label="Pelanggan" value={job.customer_name || 'Uni-Inside'} /><Info label="Item" value={job.item_name} /></InfoGroup>
      <InfoGroup icon={Printer} title="Eksekusi"><Info label="Printer" value={job.printer_name || 'Belum dipilih'} detail={job.printer_status || undefined} /><Info label="Operator" value={job.operator_name || 'Belum ditentukan'} /><Info label="Kanal" value={job.sales_channel_name || '-'} /></InfoGroup>
    </div></Card>

    {job.order_id && orderAttachments !== undefined && <Card><div className="space-y-4 p-5 sm:p-6">
      <SectionTitle icon={Paperclip} title="Lampiran Pesanan" />
      <p className="text-xs text-[var(--nexus-muted)]">File referensi dari order sumber tersedia hanya-baca untuk operator produksi.</p>
      <OrderAttachmentList orderId={job.order_id} attachments={orderAttachments} />
    </div></Card>}

    {(job.status_code === 'printing' || job.status_code === 'paused') && <Card><div className="space-y-4 p-5 sm:p-6">
      <div><h2 className="font-bold">Progres Operasional</h2><p className="mt-1 text-xs text-[var(--nexus-muted)]">Tidak terhubung ke telemetri langsung printer.</p></div>
      <ProductionProgress value={job.progress_percent} source={job.progress_source || 'estimated'} />
      <div className="grid gap-3 text-xs sm:grid-cols-3"><Info label="Dimulai" value={formatProductionDate(job.started_at)} /><Info label="ETA" value={formatProductionDate(job.estimated_finish_at)} /><Info label="Durasi estimasi" value={formatDuration(job.estimated_print_minutes)} /></div>
    </div></Card>}

    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card><div className="space-y-5 p-5 sm:p-6">
        <SectionTitle icon={CalendarClock} title="Jadwal & Referensi" />
        <div className="grid gap-4 sm:grid-cols-2"><Info label="Jadwal mulai" value={formatProductionDate(job.scheduled_start_at)} /><Info label="Jadwal selesai" value={formatProductionDate(job.scheduled_end_at || job.estimated_finish_at)} /><Info label="File desain" value={job.design_file_name || 'Belum ditautkan'} /><Info label="Profil cetak" value={job.print_profile_name || 'Belum ditautkan'} /><Info label="Tenggat order" value={formatProductionDate(job.deadline_at)} /><Info label="Catatan" value={job.notes || '-'} /></div>
      </div></Card>
      <Card><div className="space-y-5 p-5 sm:p-6">
        <SectionTitle icon={FileClock} title="Estimasi vs Aktual" />
        <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-[var(--nexus-muted)]"><tr><th className="pb-3">Metrik</th><th>Estimasi</th><th>Aktual</th></tr></thead>
          <tbody><CompareRow label="Waktu cetak" estimated={formatDuration(job.estimated_print_minutes)} actual={formatDuration(job.actual_print_minutes)} /><CompareRow label="Material" estimated={job.estimated_material_qty === null || job.estimated_material_qty === undefined ? '-' : `${job.estimated_material_qty} ${job.material_unit || 'g'}`} actual={job.actual_material_qty === null || job.actual_material_qty === undefined ? '-' : `${job.actual_material_qty} ${job.material_unit || 'g'}`} /><CompareRow label="Biaya material" estimated={job.estimated_cost === null || job.estimated_cost === undefined ? '-' : formatCurrency(job.estimated_cost)} actual={job.actual_cost === null || job.actual_cost === undefined ? '-' : formatCurrency(job.actual_cost)} /></tbody>
        </table></div>
      </div></Card>
    </div>

    <Card>
      <div className="border-b border-[var(--nexus-border)] px-5 py-4"><SectionTitle icon={Layers3} title="Material Pekerjaan" /></div>
      {materials.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead className="production-table-head"><tr><th>Material</th><th>Batch / Spool</th><th>Rencana</th><th>Aktual</th><th>Tersedia</th><th>Direservasi</th><th>Biaya Rencana</th><th>Biaya Aktual</th></tr></thead>
        <tbody>{materials.map(material => <tr key={material.id} className="production-table-row"><td><p className="font-semibold">{material.material_name}</p><span className="text-[11px] text-[var(--nexus-muted)]">{Boolean(material.is_tracked) ? 'Terhubung inventaris' : 'Tidak dilacak'}</span></td><td>{material.batch_code || '-'}</td><td>{material.planned_qty ?? '-'} {material.unit_code || ''}</td><td>{material.actual_qty ?? '-'} {material.unit_code || ''}</td><td>{material.available_qty ?? '-'} {material.unit_code || ''}</td><td>{material.reserved_qty ?? '-'} {material.unit_code || ''}</td><td>{material.planned_cost === null ? '-' : formatCurrency(material.planned_cost)}</td><td>{material.actual_cost === null ? '-' : formatCurrency(material.actual_cost)}</td></tr>)}</tbody>
      </table></div> : <div className="p-5 text-sm text-[var(--nexus-muted)]">Material belum ditautkan ke pekerjaan. Produksi tetap dapat berjalan, tetapi konsumsi inventaris tidak dicatat otomatis.</div>}
    </Card>

    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card><div className="space-y-4 p-5 sm:p-6">
        <SectionTitle icon={ClipboardCheck} title="Kontrol Kualitas" />
        {qc ? <div className="space-y-3"><div className="flex items-center justify-between"><QcResultBadge value={qc.result_code} /><span className="text-xs text-[var(--nexus-muted)]">{formatProductionDate(qc.inspected_at)}</span></div><Info label="Inspector" value={qc.inspector_name || 'Belum ditentukan'} /><Info label="Catatan" value={qc.notes || '-'} /><p className="text-xs text-[var(--nexus-muted)]">{qc.items.length} butir inspeksi tercatat.</p></div> : <p className="text-sm text-[var(--nexus-muted)]">Belum ada pemeriksaan QC untuk pekerjaan ini.</p>}
      </div></Card>
      <Card><div className="space-y-4 p-5 sm:p-6">
        <SectionTitle icon={RotateCcw} title="Kegagalan & Reprint" />
        {failure ? <div className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="error">{failureTypeLabels[failure.failure_type]}</Badge>{Boolean(failure.requires_reprint) && <Badge variant="warning">Perlu Reprint</Badge>}</div><Info label="Tahap" value={failure.failure_stage} /><Info label="Deskripsi" value={failure.description || '-'} /><Info label="Material terbuang" value={failure.material_wasted_qty === null ? '-' : `${failure.material_wasted_qty} ${failure.material_unit || 'g'}`} />{reprintJob || failure.reprint_job_id ? <Link className="inline-flex text-xs font-semibold text-[var(--nexus-yellow-deep)] hover:underline" to={`/app/craft/production/jobs/${reprintJob?.id || failure.reprint_job_id}`}>Buka reprint {reprintJob?.job_code || failure.reprint_job_code}</Link> : null}</div> : <p className="text-sm text-[var(--nexus-muted)]">Tidak ada kegagalan yang tercatat.</p>}
      </div></Card>
    </div>

    <Card><div className="space-y-5 p-5 sm:p-6">
      <SectionTitle icon={FileClock} title="Riwayat Status" />
      {history.length ? <div className="space-y-4">{history.map(entry => <div key={entry.id} className="relative border-l-2 border-[var(--nexus-yellow)] pl-4"><p className="text-sm font-semibold">{entry.from_status_code ? `${productionStatusLabels[entry.from_status_code]} → ` : ''}{productionStatusLabels[entry.to_status_code]}</p><p className="mt-1 text-xs text-[var(--nexus-muted)]">{formatProductionDate(entry.changed_at)} · {entry.changed_by_name || 'Sistem'}{entry.progress_percent !== null ? ` · ${entry.progress_percent}%` : ''}</p>{entry.reason && <p className="mt-2 text-sm text-[var(--nexus-muted)]">{entry.reason}</p>}</div>)}</div> : <p className="text-sm text-[var(--nexus-muted)]">Belum ada riwayat status.</p>}
    </div></Card>

    <Card><div className="space-y-4 p-5 sm:p-6">
      <h2 className="font-bold">Tindakan Operasional</h2>
      <JobActions job={job} canWrite={canWrite} onChanged={() => { setNotice('Pekerjaan berhasil diperbarui.'); void load(); }} onError={setError} showDetail={false} />
      {!canWrite && <p className="text-xs text-[var(--nexus-muted)]">Anda memiliki akses baca. Tindakan operasional memerlukan izin craft.production.write.</p>}
    </div></Card>
  </div>;
}

function Summary({ label, children }: { label: string; children: React.ReactNode }) { return <div className="production-kpi"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>{children}</div>; }
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) { return <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nexus-cream-soft)]"><Icon className="h-4 w-4" /></span><h2 className="font-bold">{title}</h2></div>; }
function InfoGroup({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) { return <section className="space-y-3"><SectionTitle icon={Icon} title={title} />{children}</section>; }
function Info({ label, value, detail, link }: { label: string; value: string; detail?: string; link?: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nexus-muted)]">{label}</p>{link ? <Link to={link} className="mt-1 block text-sm font-semibold text-[var(--nexus-yellow-deep)] hover:underline">{value}</Link> : <p className="mt-1 text-sm font-semibold text-[var(--nexus-charcoal)]">{value}</p>}{detail && <p className="mt-1 text-xs text-[var(--nexus-muted)]">{detail}</p>}</div>; }
function CompareRow({ label, estimated, actual }: { label: string; estimated: string; actual: string }) { return <tr className="border-t border-[var(--nexus-border)]"><td className="py-3 font-medium">{label}</td><td className="text-[var(--nexus-muted)]">{estimated}</td><td className="font-semibold">{actual}</td></tr>; }
