import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { CreatePrintJobRequest, ProductionJob, ProductionJobDetail } from '../../../../types/craft-production';
import { failureTypeLabels } from './ProductionUI';
import { JobPlanningModal, type PlanningDefaults } from './JobPlanningModal';

interface Props {
  open: boolean;
  job: ProductionJob;
  onClose: () => void;
  onCreated: (jobId: number) => void;
  onOpenExisting: (jobId: number) => void;
}

export function ReprintJobPlanningModal({ open, job, onClose, onCreated, onOpenExisting }: Props) {
  const [detail, setDetail] = useState<ProductionJobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingJobId, setExistingJobId] = useState<number | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    setExistingJobId(null);
    setDetail(null);
    void craftProductionApi.getPrintJob(job.id).then(result => {
      if (!active) return;
      if (!result.failure) {
        setError('Catatan kegagalan untuk pekerjaan ini tidak ditemukan.');
      } else if (result.failure.reprint_job_id) {
        setExistingJobId(result.failure.reprint_job_id);
        setError(`Reprint ${result.failure.reprint_job_code || ''} sudah dibuat untuk kegagalan ini.`.trim());
      } else if (!Boolean(result.failure.requires_reprint)) {
        setError('Catatan kegagalan ini tidak ditandai memerlukan reprint.');
      } else {
        setDetail(result);
      }
    }).catch(requestError => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Detail kegagalan tidak dapat dimuat.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [job.id, open, requestVersion]);

  const defaults = useMemo<PlanningDefaults | undefined>(() => detail ? {
    jobName: `Reprint ${detail.job.job_name}`,
    quantity: detail.job.quantity,
    printerId: detail.job.printer_id,
    operatorUserId: detail.job.operator_user_id,
    printProfileId: detail.job.print_profile_id,
    designFileId: detail.job.design_file_id,
    estimatedPrintMinutes: detail.job.estimated_print_minutes,
    estimatedMaterialG: detail.job.estimated_material_qty,
    notes: detail.job.notes,
    productId: detail.job.product_id,
    variantId: detail.job.variant_id,
    materials: detail.materials.flatMap(material => material.material_id && material.planned_qty !== null ? [{ materialId: material.material_id, batchId: material.batch_id, plannedQty: material.planned_qty, reserve: true }] : []),
  } : undefined, [detail]);

  if (!open) return null;
  if (loading || !detail || !defaults || !detail.failure) {
    return <LoadDialog job={job} loading={loading} error={error} existingJobId={existingJobId} onClose={onClose} onRetry={() => setRequestVersion(current => current + 1)} onOpenExisting={onOpenExisting} />;
  }

  const failure = detail.failure;
  const submit = async (form: CreatePrintJobRequest) => {
    const created = await craftProductionApi.createReprint(failure.id, form);
    onCreated(created.id);
  };

  return <JobPlanningModal
    open
    defaults={defaults}
    orderId={detail.job.order_id}
    attachments={detail.order_attachments}
    title="Buat Pekerjaan Reprint"
    description={`${detail.job.job_code} gagal karena ${failureTypeLabels[failure.failure_type]}. Pekerjaan lama tetap tersimpan sebagai riwayat.`}
    submitLabel="Buat Reprint"
    onClose={onClose}
    onSubmit={submit}
  />;
}

function LoadDialog({ job, loading, error, existingJobId, onClose, onRetry, onOpenExisting }: { job: ProductionJob; loading: boolean; error: string | null; existingJobId: number | null; onClose: () => void; onRetry: () => void; onOpenExisting: (jobId: number) => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]" onClick={event => event.stopPropagation()}>
    <div className="w-full max-w-lg rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reprint-loading-title">
      <div className="flex items-start justify-between border-b border-[var(--nexus-border)] p-5"><div><p className="production-eyebrow">Reprint produksi</p><h2 id="reprint-loading-title" className="text-lg font-bold">{job.job_code}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button></div>
      <div className="p-6">{loading ? <div className="flex items-center justify-center gap-3 py-8 text-sm text-[var(--nexus-muted)]"><Loader2 className="h-5 w-5 animate-spin text-[var(--nexus-yellow-deep)]" /> Memuat sumber reprint...</div> : <div className="space-y-4"><div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error || 'Sumber reprint tidak tersedia.'}</span></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Tutup</Button>{existingJobId ? <Button type="button" onClick={() => onOpenExisting(existingJobId)}>Buka Reprint</Button> : <Button type="button" onClick={onRetry}>Coba Lagi</Button>}</div></div>}</div>
    </div>
  </div>;
}
