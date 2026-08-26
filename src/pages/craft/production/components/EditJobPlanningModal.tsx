import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { CreatePrintJobRequest, ProductionJob, ProductionJobDetail, UpdatePrintJobRequest } from '../../../../types/craft-production';
import { JobPlanningModal, type PlanningDefaults } from './JobPlanningModal';

interface Props {
  open: boolean;
  job: ProductionJob;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditJobPlanningModal({ open, job, onClose, onSuccess }: Props) {
  const [detail, setDetail] = useState<ProductionJobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    void craftProductionApi.getPrintJob(job.id).then(result => {
      if (!active) return;
      if (!['queued', 'ready'].includes(result.job.status_code)) {
        setError('Perencanaan tidak lagi dapat diedit karena status pekerjaan telah berubah.');
        return;
      }
      setDetail(result);
    }).catch(requestError => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Detail perencanaan pekerjaan tidak dapat dimuat.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [job.id, open, requestVersion]);

  const defaults = useMemo<PlanningDefaults | undefined>(() => detail ? {
    jobName: detail.job.job_name,
    quantity: detail.job.quantity,
    printerId: detail.job.printer_id,
    operatorUserId: detail.job.operator_user_id,
    printProfileId: detail.job.print_profile_id,
    designFileId: detail.job.design_file_id,
    scheduledStartAt: detail.job.scheduled_start_at,
    estimatedPrintMinutes: detail.job.estimated_print_minutes,
    estimatedMaterialG: detail.job.estimated_material_qty,
    notes: detail.job.notes,
    productId: detail.job.product_id,
    variantId: detail.job.variant_id,
    materials: detail.materials.flatMap(material => material.material_id && material.planned_qty !== null ? [{
      materialId: material.material_id,
      batchId: material.batch_id,
      plannedQty: material.planned_qty,
      reserve: material.is_reserved === undefined ? true : Boolean(material.is_reserved),
    }] : []),
  } : undefined, [detail]);

  if (!open) return null;
  if (loading || !detail || !defaults) {
    return <LoadingOrErrorDialog job={job} loading={loading} error={error} onClose={onClose} onRetry={() => setRequestVersion(current => current + 1)} />;
  }

  const submit = async (form: CreatePrintJobRequest) => {
    const payload: UpdatePrintJobRequest = {
      job_name: form.job_name,
      printer_id: form.printer_id,
      operator_user_id: form.operator_user_id ?? null,
      scheduled_start_at: form.scheduled_start_at ?? null,
      print_profile_id: form.print_profile_id ?? null,
      design_file_id: form.design_file_id ?? null,
      estimated_print_minutes: form.estimated_print_minutes ?? null,
      estimated_material_g: form.estimated_material_g ?? null,
      notes: form.notes ?? null,
      materials: form.materials,
    };
    await craftProductionApi.updatePrintJob(job.id, payload);
    onSuccess();
  };

  return <JobPlanningModal
    open
    mode="edit"
    defaults={defaults}
    orderId={detail.job.order_id}
    attachments={detail.order_attachments}
    title="Edit Perencanaan Pekerjaan"
    description={`${detail.job.job_code} · Ubah penugasan, jadwal, referensi cetak, dan rencana material sebelum produksi dimulai.`}
    submitLabel="Simpan Perubahan"
    onClose={onClose}
    onSubmit={submit}
  />;
}

function LoadingOrErrorDialog({ job, loading, error, onClose, onRetry }: { job: ProductionJob; loading: boolean; error: string | null; onClose: () => void; onRetry: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]" onClick={event => event.stopPropagation()}>
    <div className="w-full max-w-lg rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="edit-job-loading-title">
      <div className="flex items-start justify-between border-b border-[var(--nexus-border)] p-5">
        <div><p className="production-eyebrow">Perencanaan produksi</p><h2 id="edit-job-loading-title" className="text-lg font-bold">Edit {job.job_code}</h2></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-6">
        {loading ? <div className="flex items-center justify-center gap-3 py-8 text-sm text-[var(--nexus-muted)]"><Loader2 className="h-5 w-5 animate-spin text-[var(--nexus-yellow-deep)]" /> Memuat perencanaan terbaru...</div> : <div className="space-y-4"><div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error || 'Detail perencanaan tidak tersedia.'}</span></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Tutup</Button><Button type="button" onClick={onRetry}>Coba Lagi</Button></div></div>}
      </div>
    </div>
  </div>;
}
