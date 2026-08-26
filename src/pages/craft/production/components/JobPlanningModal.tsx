import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Factory, Layers3, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { craftProductionApi } from '../../../../services/api/craft-production.api';
import type {
  CreatePrintJobRequest,
  MaterialOption,
  ProductionQueueItem,
  ProductionReferences,
} from '../../../../types/craft-production';
import type { AttachmentSummary } from '../../../../types/craft-orders';
import { OrderAttachmentList } from './OrderAttachmentList';
import { ProductionSectionHeader } from './ProductionUI';

export interface PlanningDefaults {
  jobName?: string;
  quantity?: number;
  printerId?: number | null;
  operatorUserId?: number | null;
  printProfileId?: number | null;
  designFileId?: number | null;
  estimatedPrintMinutes?: number | null;
  estimatedMaterialG?: number | null;
  scheduledStartAt?: string | null;
  notes?: string | null;
  productId?: number | null;
  variantId?: number | null;
  materials?: Array<{ materialId: number; batchId?: number | null; plannedQty: number; reserve?: boolean }>;
}

interface MaterialRow {
  key: number;
  materialId: string;
  batchId: string;
  plannedQty: string;
  reserve: boolean;
}

interface Props {
  open: boolean;
  mode?: 'create' | 'edit';
  queueItem?: ProductionQueueItem | null;
  defaults?: PlanningDefaults;
  title?: string;
  description?: string;
  submitLabel?: string;
  orderId?: number | null;
  attachments?: AttachmentSummary[];
  onClose: () => void;
  onSubmit: (data: CreatePrintJobRequest) => Promise<void>;
}

const emptyReferences: ProductionReferences = {
  printers: [], operators: [], materials: [], units: [], print_profiles: [], design_files: [], qc_templates: [],
};

export function JobPlanningModal({ open, mode = 'create', queueItem, defaults, title = 'Rencanakan Pekerjaan Cetak', description, submitLabel = 'Buat Pekerjaan Cetak', orderId, attachments, onClose, onSubmit }: Props) {
  const [references, setReferences] = useState<ProductionReferences>(emptyReferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [printerId, setPrinterId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [estimatedMaterialG, setEstimatedMaterialG] = useState('');
  const [profileId, setProfileId] = useState('');
  const [designFileId, setDesignFileId] = useState('');
  const [notes, setNotes] = useState('');
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const maxQuantity = queueItem ? Math.max(0, Number(queueItem.remaining_quantity ?? queueItem.quantity)) : null;
  const linkedOrderId = orderId ?? queueItem?.order_id ?? null;
  const linkedAttachments = attachments ?? queueItem?.order_attachments;

  useEffect(() => {
    if (!open) return;
    setJobName(defaults?.jobName || queueItem?.item_name || '');
    setQuantity(String(defaults?.quantity || (maxQuantity && maxQuantity > 0 ? maxQuantity : queueItem?.quantity || 1)));
    setPrinterId(defaults?.printerId ? String(defaults.printerId) : '');
    setOperatorId(defaults?.operatorUserId ? String(defaults.operatorUserId) : '');
    setScheduledStart(toLocalDateTime(defaults?.scheduledStartAt ?? queueItem?.scheduled_start_at ?? null));
    setEstimatedMinutes(String(defaults?.estimatedPrintMinutes ?? queueItem?.estimated_print_minutes ?? ''));
    setEstimatedMaterialG(String(defaults?.estimatedMaterialG ?? queueItem?.estimated_material_qty ?? ''));
    setProfileId(defaults?.printProfileId ? String(defaults.printProfileId) : '');
    setDesignFileId(defaults?.designFileId ? String(defaults.designFileId) : '');
    setNotes(defaults?.notes || '');
    setMaterialRows(defaults?.materials?.map((material, index) => ({ key: Date.now() + index, materialId: String(material.materialId), batchId: material.batchId ? String(material.batchId) : '', plannedQty: String(material.plannedQty), reserve: material.reserve ?? true })) || []);
    setError(null);
    setLoading(true);
    void craftProductionApi.getReferences({
      productId: defaults?.productId ?? queueItem?.product_id ?? undefined,
      variantId: defaults?.variantId ?? queueItem?.variant_id ?? undefined,
      printerId: defaults?.printerId ?? undefined,
    }).then(data => {
      setReferences({ ...emptyReferences, ...data });
      if (!defaults?.printerId) {
        const available = data.printers.find(printer => printer.status_code === 'available' && Boolean(printer.is_active));
        if (available) setPrinterId(String(available.id));
      }
      if (!defaults?.printProfileId && data.print_profiles.length === 1) setProfileId(String(data.print_profiles[0].id));
      if (!defaults?.designFileId && data.design_files.length === 1) setDesignFileId(String(data.design_files[0].id));
    }).catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Gagal memuat referensi produksi.')).finally(() => setLoading(false));
  }, [defaults, maxQuantity, open, queueItem]);

  useEffect(() => {
    if (!open || !printerId) return;
    void craftProductionApi.getReferences({
      productId: defaults?.productId ?? queueItem?.product_id ?? undefined,
      variantId: defaults?.variantId ?? queueItem?.variant_id ?? undefined,
      printerId: Number(printerId),
    }).then(data => setReferences(current => ({ ...current, print_profiles: data.print_profiles, design_files: data.design_files })))
      .catch(() => undefined);
  }, [defaults?.productId, defaults?.variantId, open, printerId, queueItem?.product_id, queueItem?.variant_id]);

  const selectedMaterials = useMemo(() => materialRows.map(row => ({ row, material: references.materials.find(material => material.id === Number(row.materialId)) })), [materialRows, references.materials]);

  if (!open) return null;

  const updateMaterial = (key: number, changes: Partial<MaterialRow>) => setMaterialRows(current => current.map(row => row.key === key ? { ...row, ...changes } : row));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedQuantity = Math.trunc(Number(quantity));
    const normalizedEstimatedMinutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    const normalizedEstimatedMaterial = estimatedMaterialG.trim() ? Number(estimatedMaterialG) : null;
    if (!jobName.trim() || !printerId || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
      setError('Nama pekerjaan, printer, dan jumlah yang valid wajib diisi.');
      return;
    }
    if (maxQuantity !== null && normalizedQuantity > maxQuantity) {
      setError(`Jumlah tidak boleh melebihi sisa kebutuhan ${maxQuantity} unit.`);
      return;
    }
    if (normalizedEstimatedMinutes !== null && (!Number.isFinite(normalizedEstimatedMinutes) || normalizedEstimatedMinutes < 1)) {
      setError('Estimasi waktu cetak harus berupa jumlah menit yang valid.');
      return;
    }
    if (normalizedEstimatedMaterial !== null && (!Number.isFinite(normalizedEstimatedMaterial) || normalizedEstimatedMaterial < 0)) {
      setError('Estimasi material harus berupa angka nol atau lebih.');
      return;
    }
    const invalidMaterial = selectedMaterials.some(({ row, material }) => {
      const plannedQty = Number(row.plannedQty);
      return Boolean(row.materialId) && (!material?.unit_id || !Number.isFinite(plannedQty) || plannedQty <= 0);
    });
    if (invalidMaterial) {
      setError('Material yang dipilih harus memiliki unit dan jumlah rencana lebih dari nol.');
      return;
    }
    const materials = selectedMaterials.flatMap(({ row, material }) => material && row.materialId ? [{
      material_id: material.id,
      material_batch_id: row.batchId ? Number(row.batchId) : null,
      planned_qty: Number(row.plannedQty),
      unit_id: Number(material.unit_id),
      reserve: material.batches.length > 0 ? row.reserve : false,
    }] : []);
    setSaving(true);
    try {
      await onSubmit({
        queue_item_id: queueItem?.id ?? null,
        job_name: jobName.trim(),
        quantity: normalizedQuantity,
        printer_id: Number(printerId),
        operator_user_id: operatorId ? Number(operatorId) : null,
        scheduled_start_at: scheduledStart || null,
        print_profile_id: profileId ? Number(profileId) : null,
        design_file_id: designFileId ? Number(designFileId) : null,
        estimated_print_minutes: normalizedEstimatedMinutes === null ? null : Math.trunc(normalizedEstimatedMinutes),
        estimated_material_g: normalizedEstimatedMaterial,
        notes: notes || null,
        materials,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : mode === 'edit' ? 'Perencanaan pekerjaan tidak dapat diperbarui.' : 'Gagal membuat pekerjaan cetak.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/55 p-4 backdrop-blur-[2px]" onClick={event => event.stopPropagation()}>
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="job-planning-title">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--nexus-border)] bg-white p-5 sm:p-6">
        <div><p className="production-eyebrow">Perencanaan produksi</p><h2 id="job-planning-title" className="text-xl font-bold text-[var(--nexus-charcoal)]">{title}</h2><p className="mt-1 text-sm text-[var(--nexus-muted)]">{description || (queueItem ? `${queueItem.order_code} · ${queueItem.item_name}` : 'Pekerjaan internal tanpa membuat pesanan palsu.')}</p></div>
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" aria-label="Tutup"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="py-10 text-center text-sm text-[var(--nexus-muted)]">Memuat printer, operator, dan referensi produksi...</div> : <>
          <section className="space-y-4"><ProductionSectionHeader icon={Factory} title={mode === 'edit' ? 'Penugasan Produksi' : 'Pekerjaan & Printer'} description="Printer dipilih sekarang, tetapi baru menjadi sibuk ketika pekerjaan benar-benar dimulai." />{mode === 'edit' && <div className="rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4 text-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nexus-muted)]">Jumlah Produksi Tetap</p><p className="mt-1 font-semibold text-[var(--nexus-charcoal)]">{quantity} unit</p></div>}<div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama pekerjaan" required><input className="production-input" value={jobName} onChange={event => setJobName(event.target.value)} placeholder="Contoh: Keycap batch A" /></Field>
            {mode === 'create' && <Field label="Jumlah" required hint={maxQuantity !== null ? `Maksimum sisa kebutuhan: ${maxQuantity}` : undefined}><input type="number" min={1} max={maxQuantity ?? undefined} step={1} className="production-input" value={quantity} onChange={event => setQuantity(event.target.value)} /></Field>}
            <Field label="Printer" required><select className="production-input production-select" value={printerId} onChange={event => setPrinterId(event.target.value)}><option value="">Pilih printer</option>{references.printers.map(printer => <option key={printer.id} value={printer.id} disabled={!Boolean(printer.is_active)}>{printer.name} · {printer.status_code}</option>)}</select></Field>
            <Field label="Operator"><select className="production-input production-select" value={operatorId} onChange={event => setOperatorId(event.target.value)}><option value="">Tentukan saat mulai</option>{references.operators.map(operator => <option key={operator.id} value={operator.id}>{operator.full_name}</option>)}</select></Field>
          </div></section>
          {linkedOrderId && linkedAttachments !== undefined && <section className="space-y-4"><ProductionSectionHeader icon={Paperclip} title="Lampiran Pesanan" description="Referensi desain dari pesanan sumber. Pengelolaan lampiran tetap dilakukan di halaman order." /><OrderAttachmentList orderId={linkedOrderId} attachments={linkedAttachments} /></section>}
          <section className="space-y-4"><ProductionSectionHeader icon={CalendarClock} title={mode === 'edit' ? 'Referensi Cetak' : 'Jadwal & Referensi Cetak'} description="Profil dan desain bersifat opsional jika data master belum tersedia." /><div className="grid gap-4 md:grid-cols-2">
            <Field label="Jadwal mulai"><input type="datetime-local" className="production-input" value={scheduledStart} onChange={event => setScheduledStart(event.target.value)} /></Field>
            <Field label="Estimasi waktu cetak"><div className="relative"><input type="number" min={1} className="production-input pr-16" value={estimatedMinutes} onChange={event => setEstimatedMinutes(event.target.value)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--nexus-muted)]">menit</span></div></Field>
            <Field label="Profil cetak"><select className="production-input production-select" value={profileId} onChange={event => setProfileId(event.target.value)}><option value="">Tanpa profil</option>{references.print_profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></Field>
            <Field label="File desain"><select className="production-input production-select" value={designFileId} onChange={event => setDesignFileId(event.target.value)}><option value="">Tanpa file desain</option>{references.design_files.map(file => <option key={file.id} value={file.id}>{file.name || file.file_name}</option>)}</select></Field>
          </div></section>
          <section className="space-y-4"><ProductionSectionHeader icon={Layers3} title="Rencana Material" description={mode === 'edit' ? 'Daftar ini menggantikan rencana material sebelumnya. Reservasi lama akan diselaraskan oleh sistem.' : 'Material boleh dikosongkan. Jika tidak ditautkan, pemakaian inventaris tidak tercatat otomatis.'} action={<Button type="button" size="sm" variant="outline" onClick={() => setMaterialRows(current => [...current, { key: Date.now(), materialId: '', batchId: '', plannedQty: estimatedMaterialG || '', reserve: true }])}><Plus className="h-3.5 w-3.5" /> Material</Button>} />
            <div className="grid gap-4 md:grid-cols-2"><Field label="Total estimasi material"><div className="relative"><input type="number" min={0} step="0.01" className="production-input pr-10" value={estimatedMaterialG} onChange={event => setEstimatedMaterialG(event.target.value)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--nexus-muted)]">g</span></div></Field><Field label="Catatan"><textarea className="production-textarea min-h-20" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Instruksi operator, orientasi, atau catatan produksi..." /></Field></div>
            {materialRows.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 text-xs leading-5 text-[var(--nexus-muted)]">Belum ada material inventaris yang ditautkan. Pekerjaan tetap dapat direncanakan.</div> : <div className="space-y-3">{selectedMaterials.map(({ row, material }) => <MaterialPlannerRow key={row.key} row={row} material={material} options={references.materials} update={changes => updateMaterial(row.key, changes)} remove={() => setMaterialRows(current => current.filter(item => item.key !== row.key))} />)}</div>}
          </section>
        </>}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/95 p-4 backdrop-blur-sm"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving || loading}>{saving ? 'Menyimpan...' : submitLabel}</Button></div>
    </form>
  </div>;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-[var(--nexus-charcoal)]">{label}{required && <span className="text-red-500"> *</span>}</span>{children}{hint && <span className="text-[11px] text-[var(--nexus-muted)]">{hint}</span>}</label>;
}

function MaterialPlannerRow({ row, material, options, update, remove }: { row: MaterialRow; material?: MaterialOption; options: MaterialOption[]; update: (changes: Partial<MaterialRow>) => void; remove: () => void; key?: React.Key }) {
  const batches = material?.batches || [];
  const canReserve = batches.length > 0;
  const selectedBatch = batches.find(batch => batch.id === Number(row.batchId));
  const reservableQuantity = selectedBatch?.available_qty ?? (batches.length ? Math.max(...batches.map(batch => Number(batch.available_qty))) : null);
  const insufficient = Boolean(material && canReserve && row.reserve && row.plannedQty && reservableQuantity !== null && Number(row.plannedQty) > reservableQuantity);
  return <div className="rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/35 p-4"><div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_auto]">
    <Field label="Material"><select className="production-input production-select" value={row.materialId} onChange={event => { const selected = options.find(option => option.id === Number(event.target.value)); update({ materialId: event.target.value, batchId: '', reserve: Boolean(selected?.batches.length) }); }}><option value="">Pilih material</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}{option.color ? ` · ${option.color}` : ''}</option>)}</select></Field>
    <Field label="Batch / spool"><select className="production-input production-select" value={row.batchId} onChange={event => update({ batchId: event.target.value })} disabled={!material || !canReserve}><option value="">{canReserve ? 'Pilih otomatis dari stok saat reservasi' : 'Tanpa batch inventaris'}</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.batch_code} · {batch.available_qty} {batch.unit_code}</option>)}</select></Field>
    <Field label={`Rencana${material?.unit_code ? ` (${material.unit_code})` : ''}`}><input type="number" min={0.01} step="0.01" className="production-input" value={row.plannedQty} onChange={event => update({ plannedQty: event.target.value })} /></Field>
    <Button type="button" variant="ghost" className="h-11 px-3 text-red-600 hover:bg-red-50" onClick={remove} aria-label="Hapus material"><Trash2 className="h-4 w-4" /></Button>
  </div>{material && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--nexus-muted)]"><span>Tersedia total: <strong className={insufficient ? 'text-red-600' : 'text-[var(--nexus-charcoal)]'}>{material.available_qty ?? '-'} {material.unit_code || ''}</strong></span><span>Dipesan: <strong>{material.reserved_qty ?? '-'} {material.unit_code || ''}</strong></span><label className={`ml-auto inline-flex items-center gap-2 ${canReserve ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}><input type="checkbox" checked={canReserve && row.reserve} disabled={!canReserve} onChange={event => update({ reserve: event.target.checked })} /> Reservasi stok</label></div>}{material && !canReserve && <p className="mt-2 text-xs text-[var(--nexus-muted)]">Material ini tidak memiliki batch inventaris; rencana disimpan tanpa reservasi stok.</p>}{insufficient && <p className="mt-2 text-xs font-medium text-red-600">Tidak ada satu batch terpilih/tersedia yang cukup untuk rencana kebutuhan ini.</p>}</div>;
}

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
