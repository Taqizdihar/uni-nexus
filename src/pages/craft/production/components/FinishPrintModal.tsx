import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { FinishPrintRequest, ProductionJob, ProductionJobDetail } from '../../../../types/craft-production';

interface Props {
  open: boolean;
  job: ProductionJob;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function FinishPrintModal({ open, job, onClose, onSuccess, onError }: Props) {
  const [detail, setDetail] = useState<ProductionJobDetail | null>(null);
  const [minutes, setMinutes] = useState('');
  const [untrackedMaterialG, setUntrackedMaterialG] = useState('');
  const [notes, setNotes] = useState('');
  const [actuals, setActuals] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setDetail(null);
    setMinutes('');
    setUntrackedMaterialG('');
    setNotes('');
    setActuals({});
    setLoadError(null);
    setSubmitError(null);
    setLoading(true);
    void craftProductionApi.getPrintJob(job.id).then(data => {
      if (!active) return;
      setDetail(data);
      setActuals(Object.fromEntries(data.materials.map(material => [material.id, String(material.actual_qty ?? material.planned_qty ?? '')])));
    }).catch(requestError => {
      if (active) setLoadError(requestError instanceof Error ? requestError.message : 'Material pekerjaan tidak dapat dimuat.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [job.id, open, requestVersion]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || loadError || !detail) {
      setSubmitError('Tunggu hingga detail material berhasil dimuat sebelum menyelesaikan pekerjaan.');
      return;
    }
    const invalidMaterial = detail.materials.some(material => !material.material_id || !material.unit_id || actuals[material.id]?.trim() === '' || !Number.isFinite(Number(actuals[material.id])) || Number(actuals[material.id]) < 0);
    if (invalidMaterial) {
      setSubmitError('Jumlah aktual wajib diisi dengan nilai nol atau lebih untuk setiap material pekerjaan.');
      return;
    }
    const rawDuration = minutes.trim() ? Number(minutes) : null;
    if (rawDuration !== null && (!Number.isFinite(rawDuration) || rawDuration < 1)) {
      setSubmitError('Durasi aktual harus berupa jumlah menit yang valid.');
      return;
    }
    const duration = rawDuration === null ? null : Math.trunc(rawDuration);
    if (detail.materials.length === 0 && untrackedMaterialG.trim() && (!Number.isFinite(Number(untrackedMaterialG)) || Number(untrackedMaterialG) < 0)) {
      setSubmitError('Jumlah material aktual harus berupa angka nol atau lebih.');
      return;
    }

    const payload: FinishPrintRequest = {
      notes: notes.trim() || null,
      materials: detail.materials.map(material => ({
        print_job_material_id: material.id,
        material_id: Number(material.material_id),
        material_batch_id: material.batch_id,
        actual_qty: Number(actuals[material.id]),
        unit_id: Number(material.unit_id),
      })),
    };
    if (duration !== null) payload.actual_print_minutes = duration;
    if (detail.materials.length === 0 && untrackedMaterialG.trim()) payload.actual_material_g = Number(untrackedMaterialG);

    setSaving(true);
    setSubmitError(null);
    try {
      await craftProductionApi.finishPrinting(job.id, payload);
      onSuccess();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Gagal menyelesaikan proses cetak.';
      setSubmitError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]" onClick={event => event.stopPropagation()}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="finish-print-title">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--nexus-border)] bg-white p-5">
        <div><p className="production-eyebrow">{job.job_code}</p><h2 id="finish-print-title" className="text-lg font-bold">Selesai Mencetak</h2></div>
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={submit}>
        <div className="space-y-5 p-5 sm:p-6">
          {submitError && <ErrorText message={submitError} />}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Tindakan ini mengakhiri proses fisik, melepaskan printer, dan memindahkan pekerjaan ke Kontrol Kualitas. Ini belum berarti hasil produksi diterima.</div>
          <Field label="Durasi aktual (menit)" hint="Biarkan kosong agar sistem menghitung durasi dari waktu mulai hingga sekarang.">
            <input type="number" min={1} className="production-input" value={minutes} onChange={event => setMinutes(event.target.value)} placeholder={job.estimated_print_minutes ? `Estimasi ${job.estimated_print_minutes} menit` : 'Contoh: 150'} />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--nexus-charcoal)]">Pemakaian material aktual</p>
            {loading ? <div className="flex items-center gap-2 rounded-lg bg-[var(--nexus-cream-soft)] p-4 text-xs text-[var(--nexus-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Memuat material pekerjaan...</div> : loadError ? <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-xs text-red-700" role="alert">{loadError}</p><Button type="button" size="sm" variant="outline" onClick={() => setRequestVersion(current => current + 1)}><RotateCcw className="h-3.5 w-3.5" /> Coba Lagi</Button></div> : detail?.materials.length ? <div className="space-y-2">{detail.materials.map(material => <div key={material.id} className="grid items-center gap-3 rounded-lg border border-[var(--nexus-border)] p-3 sm:grid-cols-[minmax(0,1fr)_130px]"><div><p className="text-sm font-semibold">{material.material_name}</p><p className="text-[11px] text-[var(--nexus-muted)]">Rencana {material.planned_qty ?? '-'} {material.unit_code || ''} · {material.batch_code || 'Tanpa batch inventaris'}</p></div><input type="number" min={0} step="0.01" className="production-input" value={actuals[material.id] ?? ''} onChange={event => setActuals(current => ({ ...current, [material.id]: event.target.value }))} aria-label={`Aktual ${material.material_name}`} /></div>)}</div> : detail ? <div className="space-y-3 rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3"><p className="text-xs leading-5 text-[var(--nexus-muted)]">Material belum ditautkan ke inventaris. Jumlah gram dapat dicatat pada job, tetapi tidak mengurangi stok otomatis.</p><Field label="Total material aktual (gram)"><input type="number" min={0} step="0.01" className="production-input bg-white" value={untrackedMaterialG} onChange={event => setUntrackedMaterialG(event.target.value)} /></Field></div> : null}
          </div>
          <Field label="Catatan hasil cetak"><textarea className="production-textarea" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Kondisi hasil fisik sebelum QC..." /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/95 p-4 backdrop-blur-sm"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving || loading || Boolean(loadError) || !detail}>{saving ? 'Menyimpan...' : 'Kirim ke QC'}</Button></div>
      </form>
    </div>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[var(--nexus-charcoal)]">{label}</span>{children}{hint && <span className="text-[11px] text-[var(--nexus-muted)]">{hint}</span>}</label>;
}

function ErrorText({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>;
}
