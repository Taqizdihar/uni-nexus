import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type { ProductionJob, QcChecklistItem, QcResult, QcTemplateOption, SubmitQcInspectionRequest } from '../../../../types/craft-production';
import { ProductionSectionHeader } from './ProductionUI';

interface EditableCheck {
  key: number;
  templateItemId: number | null;
  label: string;
  result: 'pass' | 'fail' | 'na';
  notes: string;
}

const genericChecks = [
  'Dimensi sesuai',
  'Permukaan sesuai',
  'Tidak ada warping signifikan',
  'Tidak ada layer shift',
  'Warna sesuai',
  'Tidak ada cacat mayor',
];

export function QcInspectionModal({ open, job, onClose, onSuccess }: { open: boolean; job: ProductionJob; onClose: () => void; onSuccess: () => void }) {
  const [templates, setTemplates] = useState<QcTemplateOption[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [checks, setChecks] = useState<EditableCheck[]>([]);
  const [result, setResult] = useState<Exclude<QcResult, 'pending'>>('pass');
  const [notes, setNotes] = useState('');
  const [requiresReprint, setRequiresReprint] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError(null); setNotes(''); setResult('pass'); setRequiresReprint(true);
    void Promise.all([
      craftProductionApi.getPrintJob(job.id),
      craftProductionApi.getReferences({ productId: job.product_id ?? undefined, variantId: job.variant_id ?? undefined, printerId: job.printer_id ?? undefined }),
    ]).then(([detail, references]) => {
      setTemplates(references.qc_templates || []);
      if (detail.qc_inspection?.items.length) {
        setTemplateId(detail.qc_inspection.template_id ? String(detail.qc_inspection.template_id) : '');
        setChecks(detail.qc_inspection.items.map((item, index) => normalizeExistingCheck(item, index)));
        if (detail.qc_inspection.result_code !== 'pending') setResult(detail.qc_inspection.result_code);
        setNotes(detail.qc_inspection.notes || '');
        return;
      }
      const defaultTemplate = references.qc_templates.find(template => Boolean(template.is_default)) || references.qc_templates[0];
      if (defaultTemplate) {
        setTemplateId(String(defaultTemplate.id));
        setChecks(fromTemplate(defaultTemplate));
      } else {
        setTemplateId('');
        setChecks(fromGeneric());
      }
    }).catch(requestError => {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat data pemeriksaan QC.');
      setChecks(fromGeneric());
    }).finally(() => setLoading(false));
  }, [job.id, job.printer_id, job.product_id, job.variant_id, open]);

  if (!open) return null;

  const selectTemplate = (value: string) => {
    setTemplateId(value);
    const template = templates.find(row => row.id === Number(value));
    setChecks(template ? fromTemplate(template) : fromGeneric());
  };
  const updateCheck = (key: number, changes: Partial<EditableCheck>) => setChecks(current => current.map(check => check.key === key ? { ...check, ...changes } : check));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (checks.length === 0 || checks.some(check => !check.label.trim())) { setError('Checklist QC harus memiliki setidaknya satu butir dengan label yang valid.'); return; }
    if (result === 'conditional' && !notes.trim()) { setError('Hasil bersyarat memerlukan penjelasan penerimaan.'); return; }
    if (result === 'pass' && checks.some(check => check.result === 'fail')) { setError('Hasil Lulus tidak dapat disimpan selama masih ada butir gagal.'); return; }
    setSaving(true); setError(null);
    const payload: SubmitQcInspectionRequest = {
      template_id: templateId ? Number(templateId) : null,
      result_code: result,
      notes: notes || null,
      requires_reprint: result === 'fail' ? requiresReprint : false,
      items: checks.map(check => ({
        template_item_id: check.templateItemId,
        item_label: check.label.trim(),
        value_text: check.result === 'na' ? 'N/A' : null,
        passed: check.result === 'na' ? null : check.result === 'pass',
        notes: check.notes || null,
      })),
    };
    try { await craftProductionApi.submitQcInspection(job.id, payload); onSuccess(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan pemeriksaan QC.'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]"><form onSubmit={submit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="qc-modal-title"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--nexus-border)] bg-white p-5 sm:p-6"><div><p className="production-eyebrow">{job.job_code} · {job.item_name}</p><h2 id="qc-modal-title" className="text-xl font-bold text-[var(--nexus-charcoal)]">Pemeriksaan Kontrol Kualitas</h2><p className="mt-1 text-sm text-[var(--nexus-muted)]">Hasil Lulus atau Bersyarat menyelesaikan output baik. Hasil Gagal tidak dihitung sebagai output baik.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button></div><div className="space-y-6 p-5 sm:p-6">{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{loading ? <div className="py-12 text-center text-sm text-[var(--nexus-muted)]">Memuat template dan inspeksi...</div> : <><section className="space-y-4"><ProductionSectionHeader icon={ClipboardCheck} title="Checklist inspeksi" description="Gunakan template tersimpan atau checklist ad-hoc yang akan tetap dicatat ke database." action={<Button type="button" size="sm" variant="outline" onClick={() => setChecks(current => [...current, { key: Date.now(), templateItemId: null, label: '', result: 'pass', notes: '' }])}><Plus className="h-3.5 w-3.5" /> Butir Custom</Button>} /><label className="flex max-w-md flex-col gap-1.5"><span className="text-xs font-semibold">Template QC</span><select className="production-input production-select" value={templateId} onChange={event => selectTemplate(event.target.value)}><option value="">Checklist umum / ad-hoc</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><div className="space-y-2">{checks.map((check, index) => <div key={check.key} className="grid items-start gap-3 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/35 p-3 md:grid-cols-[32px_minmax(0,1fr)_130px_minmax(0,1fr)_40px]"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--nexus-charcoal)] text-xs font-bold text-[var(--nexus-yellow)]">{index + 1}</span><input className="production-input" value={check.label} onChange={event => updateCheck(check.key, { label: event.target.value })} disabled={check.templateItemId !== null} aria-label={`Butir QC ${index + 1}`} /><select className="production-input production-select" value={check.result} onChange={event => updateCheck(check.key, { result: event.target.value as EditableCheck['result'] })}><option value="pass">Lulus</option><option value="fail">Gagal</option><option value="na">N/A</option></select><input className="production-input" value={check.notes} onChange={event => updateCheck(check.key, { notes: event.target.value })} placeholder="Catatan butir..." />{check.templateItemId === null ? <Button type="button" variant="ghost" className="h-11 px-2 text-red-600 hover:bg-red-50" onClick={() => setChecks(current => current.filter(row => row.key !== check.key))} aria-label="Hapus butir"><Trash2 className="h-4 w-4" /></Button> : <span />}</div>)}</div></section><section className="space-y-4"><ProductionSectionHeader title="Keputusan QC" description="Keputusan ini menjalankan sinkronisasi antrean dan status pesanan di backend." /><div className="grid gap-4 md:grid-cols-3">{(['pass', 'conditional', 'fail'] as const).map(value => <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${result === value ? 'border-[var(--nexus-yellow-deep)] bg-[var(--nexus-yellow)]/10 ring-2 ring-[var(--nexus-yellow)]/20' : 'border-[var(--nexus-border)]'}`}><input type="radio" className="sr-only" name="qc-result" value={value} checked={result === value} onChange={() => setResult(value)} /><strong className="text-sm">{value === 'pass' ? 'Lulus' : value === 'conditional' ? 'Bersyarat' : 'Gagal'}</strong><p className="mt-1 text-xs leading-5 text-[var(--nexus-muted)]">{value === 'pass' ? 'Output diterima sebagai hasil baik.' : value === 'conditional' ? 'Output diterima dengan catatan wajib.' : 'Output ditolak dan dapat dibuat reprint.'}</p></label>)}</div><label className="flex flex-col gap-1.5"><span className="text-xs font-semibold">Catatan keputusan{result === 'conditional' && <span className="text-red-500"> *</span>}</span><textarea className="production-textarea" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Temuan akhir dan alasan keputusan..." /></label>{result === 'fail' && <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><input type="checkbox" checked={requiresReprint} onChange={event => setRequiresReprint(event.target.checked)} /> Hasil gagal memerlukan reprint</label>}</section></>}</div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/95 p-4"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving || loading} className={result === 'fail' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}>{saving ? 'Menyimpan...' : 'Simpan Pemeriksaan'}</Button></div></form></div>;
}

function fromGeneric(): EditableCheck[] { return genericChecks.map((label, index) => ({ key: Date.now() + index, templateItemId: null, label, result: 'pass', notes: '' })); }
function fromTemplate(template: QcTemplateOption): EditableCheck[] { return template.items.map((item, index) => ({ key: Date.now() + index, templateItemId: item.id, label: item.label, result: 'pass', notes: '' })); }
function normalizeExistingCheck(item: QcChecklistItem, index: number): EditableCheck {
  const result = item.result && item.result !== 'pending' ? item.result : item.passed === null ? 'na' : Boolean(item.passed) ? 'pass' : 'fail';
  return { key: item.id || Date.now() + index, templateItemId: item.template_item_id, label: item.label || item.item_label || `Butir ${index + 1}`, result, notes: item.notes || '' };
}
