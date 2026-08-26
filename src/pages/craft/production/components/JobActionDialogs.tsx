import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { FailPrintRequest, FailureType, ProductionJob, ProductionJobDetail, ScheduleJobRequest } from '../../../../types/craft-production';
import { failureTypeLabels, ProductionSectionHeader } from './ProductionUI';

interface ModalBaseProps {
  open: boolean;
  job: ProductionJob;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function ScheduleJobModal({ open, job, onClose, onSuccess, onError }: ModalBaseProps) {
  const [start, setStart] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStart(toLocalDateTime(job.scheduled_start_at));
    setMinutes(job.estimated_print_minutes ? String(job.estimated_print_minutes) : '');
    setError(null);
  }, [job.estimated_print_minutes, job.scheduled_start_at, open]);

  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: ScheduleJobRequest = { scheduled_start_at: start || null, estimated_print_minutes: minutes ? Math.max(1, Math.trunc(Number(minutes))) : null };
    try {
      await craftProductionApi.scheduleJob(job.id, payload);
      onSuccess();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Gagal memperbarui jadwal.';
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return <ModalShell title="Atur Jadwal Produksi" eyebrow={job.job_code} onClose={onClose} disabled={saving}>
    <form onSubmit={submit}>
      <div className="space-y-4 p-5 sm:p-6">
        {error && <ErrorText message={error} />}
        <ProductionSectionHeader icon={CalendarClock} title="Waktu penggunaan printer" description="Sistem akan menolak jadwal yang bertabrakan pada printer yang sama." />
        <Field label="Mulai dijadwalkan"><input type="datetime-local" className="production-input" value={start} onChange={event => setStart(event.target.value)} /></Field>
        <Field label="Estimasi durasi (menit)"><input type="number" min={1} className="production-input" value={minutes} onChange={event => setMinutes(event.target.value)} /></Field>
        {!start && <p className="rounded-lg bg-[var(--nexus-cream-soft)] p-3 text-xs text-[var(--nexus-muted)]">Kosongkan waktu mulai untuk menghapus jadwal. Pekerjaan tetap berada dalam daftar perencanaan.</p>}
      </div>
      <ModalFooter saving={saving} onClose={onClose} submitLabel="Simpan Jadwal" />
    </form>
  </ModalShell>;
}

export function ProgressUpdateModal({ open, job, onClose, onSuccess, onError }: ModalBaseProps) {
  const [progress, setProgress] = useState(job.progress_percent || 0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProgress(Math.min(100, Math.max(0, Number(job.progress_percent) || 0)));
    setReason('');
    setError(null);
  }, [job.progress_percent, open]);

  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await craftProductionApi.updateProgress(job.id, progress, reason);
      onSuccess();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Gagal memperbarui progres.';
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return <ModalShell title="Perbarui Progres Manual" eyebrow={job.job_code} onClose={onClose} disabled={saving}>
    <form onSubmit={submit}>
      <div className="space-y-5 p-5 sm:p-6">
        {error && <ErrorText message={error} />}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Progres ini diisi manual oleh operator, bukan telemetri langsung dari printer.</div>
        <div><div className="flex items-center justify-between"><span className="text-xs font-semibold">Progres</span><span className="text-2xl font-bold">{progress}%</span></div><input type="range" min={0} max={100} step={1} value={progress} onChange={event => setProgress(Number(event.target.value))} className="mt-3 w-full accent-[var(--nexus-yellow-deep)]" /></div>
        <Field label="Catatan perubahan"><textarea className="production-textarea" value={reason} onChange={event => setReason(event.target.value)} placeholder="Opsional" /></Field>
      </div>
      <ModalFooter saving={saving} onClose={onClose} submitLabel="Simpan Progres" />
    </form>
  </ModalShell>;
}

export function FailureReportModal({ open, job, onClose, onSuccess, onError }: ModalBaseProps) {
  const [type, setType] = useState<FailureType>('spaghetti');
  const [stage, setStage] = useState('printing');
  const [description, setDescription] = useState('');
  const [wasted, setWasted] = useState('');
  const [loss, setLoss] = useState('');
  const [requiresReprint, setRequiresReprint] = useState(true);
  const [printerIssue, setPrinterIssue] = useState(false);
  const [detail, setDetail] = useState<ProductionJobDetail | null>(null);
  const [materialRowId, setMaterialRowId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType('spaghetti');
    setStage(job.status_code === 'qc' ? 'qc' : 'printing');
    setDescription('');
    setWasted('');
    setLoss('');
    setRequiresReprint(true);
    setPrinterIssue(false);
    setDetail(null);
    setMaterialRowId('');
    setError(null);
    void craftProductionApi.getPrintJob(job.id).then(data => {
      setDetail(data);
      const tracked = data.materials.find(material => material.material_id && material.batch_id);
      if (tracked) setMaterialRowId(String(tracked.id));
    }).catch(() => undefined);
  }, [job.id, job.status_code, open]);

  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setError('Deskripsi kegagalan wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    const selectedMaterial = detail?.materials.find(material => material.id === Number(materialRowId));
    const payload: FailPrintRequest = {
      failure_type: type,
      failure_stage: stage,
      description: description.trim(),
      material_wasted_qty: wasted ? Number(wasted) : null,
      material_id: selectedMaterial?.material_id ?? null,
      batch_id: selectedMaterial?.batch_id ?? null,
      estimated_loss: loss ? Number(loss) : null,
      requires_reprint: requiresReprint,
      printer_has_issue: printerIssue,
    };
    try {
      await craftProductionApi.failJob(job.id, payload);
      onSuccess();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Gagal mencatat kegagalan cetak.';
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return <ModalShell title="Laporkan Cetak Gagal" eyebrow={job.job_code} onClose={onClose} disabled={saving}>
    <form onSubmit={submit}>
      <div className="space-y-4 p-5 sm:p-6">
        {error && <ErrorText message={error} />}
        <ProductionSectionHeader icon={AlertTriangle} title="Detail kegagalan" description="Printer akan dilepaskan, kecuali Anda menandai adanya masalah perangkat keras." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis kegagalan"><select className="production-input production-select" value={type} onChange={event => setType(event.target.value as FailureType)}>{Object.entries(failureTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Tahap kegagalan"><select className="production-input production-select" value={stage} onChange={event => setStage(event.target.value)}><option value="setup">Persiapan</option><option value="printing">Saat mencetak</option><option value="finishing">Finishing</option><option value="qc">Kontrol kualitas</option></select></Field>
          <Field label="Material / spool terdampak"><select className="production-input production-select" value={materialRowId} onChange={event => setMaterialRowId(event.target.value)}><option value="">Tidak ditautkan ke inventaris</option>{detail?.materials.map(material => <option key={material.id} value={material.id}>{material.material_name} · {material.batch_code || 'tanpa batch inventaris'}</option>)}</select></Field>
          <Field label="Material terbuang (gram)"><input type="number" min={0} step="0.01" className="production-input" value={wasted} onChange={event => setWasted(event.target.value)} /></Field>
          <Field label="Estimasi kerugian (Rp)"><input type="number" min={0} step={1} className="production-input" value={loss} onChange={event => setLoss(event.target.value)} /></Field>
        </div>
        <Field label="Deskripsi" required><textarea required className="production-textarea" value={description} onChange={event => setDescription(event.target.value)} placeholder="Jelaskan gejala, penyebab yang diketahui, dan kondisi terakhir..." /></Field>
        {materialRowId && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Material terbuang akan ditautkan ke batch inventaris terpilih agar waste dan pergerakan stok dapat dicatat secara konsisten.</p>}
        <div className="space-y-2 rounded-lg bg-[var(--nexus-cream-soft)] p-4 text-sm">
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5" checked={requiresReprint} onChange={event => setRequiresReprint(event.target.checked)} /><span><strong className="block text-[var(--nexus-charcoal)]">Memerlukan reprint</strong><span className="text-xs text-[var(--nexus-muted)]">Kebutuhan produksi kembali menunggu pekerjaan baru.</span></span></label>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5" checked={printerIssue} onChange={event => setPrinterIssue(event.target.checked)} /><span><strong className="block text-[var(--nexus-charcoal)]">Printer juga bermasalah</strong><span className="text-xs text-[var(--nexus-muted)]">Gunakan hanya jika ada indikasi masalah perangkat keras.</span></span></label>
        </div>
      </div>
      <ModalFooter saving={saving} onClose={onClose} submitLabel="Catat Kegagalan" danger />
    </form>
  </ModalShell>;
}

export function ReasonModal({ open, job, title, description, submitLabel, onClose, onSubmit }: { open: boolean; job: ProductionJob; title: string; description: string; submitLabel: string; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setReason(''); setError(null); } }, [open]);
  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) { setError('Alasan wajib diisi.'); return; }
    setSaving(true);
    try {
      await onSubmit(reason.trim());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tindakan gagal diproses.');
    } finally {
      setSaving(false);
    }
  };

  return <ModalShell title={title} eyebrow={job.job_code} onClose={onClose} disabled={saving}>
    <form onSubmit={submit}><div className="space-y-4 p-5 sm:p-6">{error && <ErrorText message={error} />}<p className="text-sm leading-6 text-[var(--nexus-muted)]">{description}</p><Field label="Alasan" required><textarea autoFocus required className="production-textarea" value={reason} onChange={event => setReason(event.target.value)} /></Field></div><ModalFooter saving={saving} onClose={onClose} submitLabel={submitLabel} danger /></form>
  </ModalShell>;
}

function ModalShell({ title, eyebrow, children, onClose, disabled }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void; disabled: boolean }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]" onClick={event => event.stopPropagation()}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--nexus-border)] bg-white p-5"><div><p className="production-eyebrow">{eyebrow}</p><h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">{title}</h2></div><button type="button" className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" onClick={onClose} disabled={disabled} aria-label="Tutup"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function ModalFooter({ saving, onClose, submitLabel, danger = false }: { saving: boolean; onClose: () => void; submitLabel: string; danger?: boolean }) {
  return <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/95 p-4"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving} className={danger ? 'bg-red-600 text-white hover:bg-red-700' : undefined}>{saving ? 'Memproses...' : submitLabel}</Button></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[var(--nexus-charcoal)]">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>; }
function ErrorText({ message }: { message: string }) { return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>; }
function toLocalDateTime(value: string | null): string { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
