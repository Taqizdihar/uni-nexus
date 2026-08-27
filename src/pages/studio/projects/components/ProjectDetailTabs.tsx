import React from 'react';
import {
  ArrowDown, ArrowUp, ExternalLink, FileUp, Link2, Lock, Paperclip, Plus, RefreshCw, Trash2, UserMinus, X,
} from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { formatCurrency } from '../../../../lib/utils';
import { studioProjectsApi, studioReferencesApi } from '../../../../services/api/studio-projects.api';
import type {
  DeliverableStatus, ExternalPartyOption, MilestoneStatus, ProjectDetailResponse,
  ServicePackageOption, StudioServiceOption, StudioUserOption,
} from '../../../../types/studio-projects';
import {
  CurrencyInput, DeliverableStatusBadge, EmptyState, Field, MilestoneStatusBadge,
  QuantityInput, SectionHeader, deliverableLabels, externalRoleLabels, formatDateOnly, formatDateTime,
  milestoneLabels, toDateInput,
} from './ProjectsUI';

interface TabProps {
  detail: ProjectDetailResponse;
  canWrite: boolean;
  reload: () => Promise<void>;
  onError: (message: string) => void;
}

const run = async (action: () => Promise<unknown>, reload: () => Promise<void>, onError: (message: string) => void, setBusy: (busy: boolean) => void) => {
  setBusy(true);
  try {
    await action();
    await reload();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Aksi gagal dijalankan.');
  } finally {
    setBusy(false);
  }
};

/** Scope lines. Pricing edits are refused once Billing has committed the numbers. */
export function ServicesTab({ detail, canWrite, reload, onError }: TabProps) {
  const [catalog, setCatalog] = React.useState<StudioServiceOption[]>([]);
  const [packages, setPackages] = React.useState<ServicePackageOption[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ service_id: '', package_id: '', description: '', quantity: '1', unit_price: '' });

  React.useEffect(() => {
    void (async () => {
      try {
        const [services, servicePackages] = await Promise.all([studioReferencesApi.getServices(), studioReferencesApi.getServicePackages()]);
        setCatalog(services); setPackages(servicePackages);
      } catch { /* selectors stay empty; custom scope lines still work */ }
    })();
  }, []);

  const locked = detail.commercial.lock.locked;
  const editable = canWrite && !locked && detail.project.status_code !== 'cancelled';
  const subtotal = detail.project.service_subtotal;

  return (
    <div className="space-y-5">
      {locked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Scope komersial terkunci</p>
            <p className="mt-0.5 text-xs leading-5">{detail.commercial.lock.reasons.join(' · ')}. Tahapan, tim, dan deliverable tetap dapat diubah.</p>
          </div>
        </div>
      )}

      <Card>
        <div className="space-y-5 p-5">
          <SectionHeader
            title="Layanan & Scope"
            description="Harga tersimpan sebagai snapshot komersial dan tidak ikut berubah saat katalog diperbarui."
            action={editable ? <Button size="sm" variant="outline" onClick={() => setAdding(current => !current)}><Plus className="h-4 w-4" /> Tambah Layanan</Button> : undefined}
          />

          {adding && editable && (
            <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-2">
              <Field label="Layanan katalog" hint={catalog.length ? 'Opsional.' : 'Katalog masih kosong — gunakan scope kustom.'}>
                <select className="studio-input studio-select" value={draft.service_id} disabled={!catalog.length} onChange={event => {
                  const service = catalog.find(item => String(item.id) === event.target.value);
                  setDraft(current => ({ ...current, service_id: event.target.value, package_id: '', description: service?.name || current.description, unit_price: service ? String(service.base_price) : current.unit_price }));
                }}>
                  <option value="">Scope kustom</option>
                  {catalog.map(service => <option key={service.id} value={service.id}>{service.code} — {service.name}</option>)}
                </select>
              </Field>
              <Field label="Paket layanan" hint={packages.length ? 'Opsional.' : 'Belum ada paket layanan.'}>
                <select className="studio-input studio-select" value={draft.package_id} disabled={!packages.length} onChange={event => {
                  const servicePackage = packages.find(item => String(item.id) === event.target.value);
                  setDraft(current => ({ ...current, package_id: event.target.value, service_id: '', description: servicePackage?.name || current.description, unit_price: servicePackage ? String(servicePackage.package_price) : current.unit_price }));
                }}>
                  <option value="">Tanpa paket</option>
                  {packages.map(servicePackage => <option key={servicePackage.id} value={servicePackage.id}>{servicePackage.code} — {servicePackage.name}</option>)}
                </select>
              </Field>
              <Field label="Deskripsi scope" required className="md:col-span-2">
                <input className="studio-input" value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} />
              </Field>
              <Field label="Jumlah" required hint="Boleh desimal."><QuantityInput value={draft.quantity} onChange={value => setDraft(current => ({ ...current, quantity: value }))} /></Field>
              <Field label="Harga satuan" required><CurrencyInput value={draft.unit_price} onChange={value => setDraft(current => ({ ...current, unit_price: value }))} /></Field>
              <div className="flex gap-2 md:col-span-2">
                <Button
                  size="sm"
                  disabled={busy || !draft.description.trim() || !(Number(draft.quantity) > 0)}
                  onClick={() => void run(async () => {
                    await studioProjectsApi.addService(detail.project.id, {
                      service_id: draft.service_id ? Number(draft.service_id) : null,
                      package_id: draft.package_id ? Number(draft.package_id) : null,
                      description: draft.description.trim(),
                      quantity: Number(draft.quantity),
                      unit_price: Number(draft.unit_price) || 0,
                    });
                    setDraft({ service_id: '', package_id: '', description: '', quantity: '1', unit_price: '' });
                    setAdding(false);
                  }, reload, onError, setBusy)}
                >
                  Simpan Layanan
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          )}

          {detail.services.length === 0 ? (
            <EmptyState title="Belum Ada Layanan" description="Tambahkan scope pekerjaan agar nilai proyek dapat dihitung." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="studio-table-head"><tr><th>Layanan / Paket</th><th>Deskripsi</th><th>Jumlah</th><th>Harga Satuan</th><th className="text-right">Subtotal</th>{editable && <th className="w-20" />}</tr></thead>
                <tbody>
                  {detail.services.map(line => (
                    <tr key={line.id} className="studio-table-row">
                      <td>
                        {line.service_name || line.package_name
                          ? <><span className="font-medium text-[var(--nexus-charcoal)]">{line.service_name || line.package_name}</span><span className="mt-0.5 block studio-code">{line.service_code || line.package_code}</span></>
                          : <Badge variant="outline">Scope Kustom</Badge>}
                      </td>
                      <td className="max-w-xs truncate text-[var(--nexus-muted)]">{line.description}</td>
                      <td>{line.quantity}{line.unit_label ? ` ${line.unit_label}` : ''}</td>
                      <td>{formatCurrency(line.unit_price)}</td>
                      <td className="text-right font-semibold">{formatCurrency(line.line_total)}</td>
                      {editable && (
                        <td className="text-right">
                          <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" disabled={busy}
                            onClick={() => void run(() => studioProjectsApi.removeService(detail.project.id, line.id), reload, onError, setBusy)}>
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ml-auto max-w-sm space-y-2 border-t border-[var(--nexus-border)] pt-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[var(--nexus-muted)]">Subtotal Layanan</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--nexus-muted)]">Nilai Kontrak</span><span className="font-bold">{formatCurrency(detail.project.contract_value)}</span></div>
            {!detail.project.contract_value_matches_services && (
              <div className="rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3 text-[11px] leading-4 text-[var(--nexus-muted)]">
                Nilai kontrak berbeda dari subtotal layanan.
                {editable && (
                  <button type="button" className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--nexus-charcoal)] hover:underline" disabled={busy}
                    onClick={() => void run(() => studioProjectsApi.syncContractValue(detail.project.id), reload, onError, setBusy)}>
                    <RefreshCw className="h-3 w-3" /> Samakan dengan Subtotal Layanan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Milestones and deliverables share a tab because deliverables hang off milestones. */
export function WorkTab({ detail, canWrite, reload, onError }: TabProps) {
  const [busy, setBusy] = React.useState(false);
  const [milestoneDraft, setMilestoneDraft] = React.useState({ title: '', due_at: '' });
  const [deliverableDraft, setDeliverableDraft] = React.useState({ title: '', milestone_id: '', due_at: '', external_url: '' });
  const [showMilestoneForm, setShowMilestoneForm] = React.useState(false);
  const [showDeliverableForm, setShowDeliverableForm] = React.useState(false);
  const [reopenTarget, setReopenTarget] = React.useState<{ id: number; kind: 'milestone' | 'deliverable'; status: string } | null>(null);
  const [reopenReason, setReopenReason] = React.useState('');

  const editable = canWrite && detail.project.status_code !== 'cancelled';
  const milestoneOrder = detail.milestones.map(milestone => milestone.id);

  const moveMilestone = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= milestoneOrder.length) return;
    const next = [...milestoneOrder];
    [next[index], next[target]] = [next[target], next[index]];
    void run(() => studioProjectsApi.reorderMilestones(detail.project.id, next), reload, onError, setBusy);
  };

  const milestoneActions: Record<string, Array<Exclude<MilestoneStatus, 'late'>>> = {
    pending: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['completed', 'pending', 'cancelled'],
    late: ['in_progress', 'completed', 'cancelled'],
    completed: ['in_progress'],
    cancelled: ['pending'],
  };

  const deliverableActions: Record<string, DeliverableStatus[]> = {
    pending: ['submitted'],
    submitted: ['approved', 'revision'],
    revision: ['submitted'],
    approved: ['delivered', 'revision'],
    delivered: ['revision'],
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="space-y-5 p-5">
          <SectionHeader
            title="Tahapan Proyek"
            description="Status terlambat dihitung dari tanggal jatuh tempo — tidak pernah diubah otomatis saat halaman dibuka."
            action={editable ? <Button size="sm" variant="outline" onClick={() => setShowMilestoneForm(current => !current)}><Plus className="h-4 w-4" /> Tahapan</Button> : undefined}
          />

          {showMilestoneForm && editable && (
            <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
              <Field label="Judul tahapan" required><input className="studio-input" value={milestoneDraft.title} onChange={event => setMilestoneDraft(current => ({ ...current, title: event.target.value }))} /></Field>
              <Field label="Jatuh tempo"><input type="datetime-local" className="studio-input" value={milestoneDraft.due_at} onChange={event => setMilestoneDraft(current => ({ ...current, due_at: event.target.value }))} /></Field>
              <div className="flex items-end gap-2 pb-1">
                <Button size="sm" disabled={busy || !milestoneDraft.title.trim()} onClick={() => void run(async () => {
                  await studioProjectsApi.createMilestone(detail.project.id, { title: milestoneDraft.title.trim(), due_at: milestoneDraft.due_at || null });
                  setMilestoneDraft({ title: '', due_at: '' }); setShowMilestoneForm(false);
                }, reload, onError, setBusy)}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowMilestoneForm(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          )}

          {detail.milestones.length === 0 ? (
            <EmptyState title="Belum Ada Tahapan" description="Tambahkan tahapan untuk melacak kemajuan proyek secara terukur." />
          ) : (
            <ul className="space-y-3">
              {detail.milestones.map((milestone, index) => (
                <li key={milestone.id} className="rounded-lg border border-[var(--nexus-border)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[var(--nexus-muted)]">{index + 1}.</span>
                        <h3 className="font-semibold text-[var(--nexus-charcoal)]">{milestone.title}</h3>
                        <MilestoneStatusBadge value={milestone.status_code} overdue={milestone.is_overdue} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                        Jatuh tempo {formatDateTime(milestone.due_at)}
                        {milestone.completed_at ? ` · Selesai ${formatDateTime(milestone.completed_at)}` : ''}
                        {milestone.deliverable_count > 0 ? ` · ${milestone.deliverable_count} deliverable` : ''}
                      </p>
                      {milestone.description && <p className="mt-2 border-l-2 border-[var(--nexus-yellow)] pl-3 text-xs leading-5 text-[var(--nexus-muted)]">{milestone.description}</p>}
                    </div>

                    {editable && (
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <button type="button" className="rounded-md border border-[var(--nexus-border)] p-1.5 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)] disabled:opacity-40" aria-label="Naikkan urutan" disabled={busy || index === 0} onClick={() => moveMilestone(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" className="rounded-md border border-[var(--nexus-border)] p-1.5 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)] disabled:opacity-40" aria-label="Turunkan urutan" disabled={busy || index === detail.milestones.length - 1} onClick={() => moveMilestone(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                        {(milestoneActions[milestone.status_code] || []).map(status => (
                          <Button key={status} size="sm" variant="outline" disabled={busy}
                            onClick={() => {
                              if (milestone.status_code === 'completed' && status === 'in_progress') {
                                setReopenTarget({ id: milestone.id, kind: 'milestone', status });
                                setReopenReason('');
                                return;
                              }
                              void run(() => studioProjectsApi.changeMilestoneStatus(detail.project.id, milestone.id, status), reload, onError, setBusy);
                            }}>
                            {milestoneLabels[status]}
                          </Button>
                        ))}
                        {milestone.status_code === 'pending' && milestone.deliverable_count === 0 && (
                          <button type="button" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" aria-label="Hapus tahapan" disabled={busy}
                            onClick={() => void run(() => studioProjectsApi.deleteMilestone(detail.project.id, milestone.id), reload, onError, setBusy)}><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-5 p-5">
          <SectionHeader
            title="Deliverable"
            description="Hasil kerja dapat berupa file terunggah atau tautan eksternal untuk media berukuran besar."
            action={editable ? <Button size="sm" variant="outline" onClick={() => setShowDeliverableForm(current => !current)}><Plus className="h-4 w-4" /> Deliverable</Button> : undefined}
          />

          {showDeliverableForm && editable && (
            <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-2">
              <Field label="Judul deliverable" required><input className="studio-input" value={deliverableDraft.title} onChange={event => setDeliverableDraft(current => ({ ...current, title: event.target.value }))} /></Field>
              <Field label="Tahapan terkait" hint="Hanya tahapan pada proyek ini.">
                <select className="studio-input studio-select" value={deliverableDraft.milestone_id} onChange={event => setDeliverableDraft(current => ({ ...current, milestone_id: event.target.value }))}>
                  <option value="">Tanpa tahapan</option>
                  {detail.milestones.map(milestone => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
                </select>
              </Field>
              <Field label="Tautan hasil kerja" hint="Hanya http:// atau https://."><input className="studio-input" value={deliverableDraft.external_url} placeholder="https://..." onChange={event => setDeliverableDraft(current => ({ ...current, external_url: event.target.value }))} /></Field>
              <Field label="Jatuh tempo"><input type="datetime-local" className="studio-input" value={deliverableDraft.due_at} onChange={event => setDeliverableDraft(current => ({ ...current, due_at: event.target.value }))} /></Field>
              <div className="flex gap-2 md:col-span-2">
                <Button size="sm" disabled={busy || !deliverableDraft.title.trim()} onClick={() => void run(async () => {
                  await studioProjectsApi.createDeliverable(detail.project.id, {
                    title: deliverableDraft.title.trim(),
                    milestone_id: deliverableDraft.milestone_id ? Number(deliverableDraft.milestone_id) : null,
                    due_at: deliverableDraft.due_at || null,
                    external_url: deliverableDraft.external_url.trim() || null,
                  });
                  setDeliverableDraft({ title: '', milestone_id: '', due_at: '', external_url: '' }); setShowDeliverableForm(false);
                }, reload, onError, setBusy)}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowDeliverableForm(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          )}

          {detail.deliverables.length === 0 ? (
            <EmptyState title="Belum Ada Deliverable" description="Catat hasil kerja yang akan diserahkan ke klien." />
          ) : (
            <ul className="space-y-3">
              {detail.deliverables.map(deliverable => (
                <li key={deliverable.id} className="rounded-lg border border-[var(--nexus-border)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--nexus-charcoal)]">{deliverable.title}</h3>
                        <DeliverableStatusBadge value={deliverable.status_code} />
                        {deliverable.is_overdue && <Badge variant="error">Lewat Jatuh Tempo</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                        {deliverable.milestone_title ? `Tahapan: ${deliverable.milestone_title} · ` : ''}
                        Jatuh tempo {formatDateTime(deliverable.due_at)}
                        {deliverable.delivered_at ? ` · Diserahkan ${formatDateTime(deliverable.delivered_at)}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {deliverable.external_url && (
                          <a href={deliverable.external_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-[var(--nexus-yellow-deep)] hover:underline">
                            <Link2 className="h-3.5 w-3.5" /> Buka tautan <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {deliverable.has_file && (
                          <button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--nexus-charcoal)] hover:underline"
                            onClick={() => void studioProjectsApi.downloadDeliverableFile(detail.project.id, deliverable.id, deliverable.file_name || 'deliverable').catch(error => onError(error instanceof Error ? error.message : 'Gagal mengunduh file.'))}>
                            <Paperclip className="h-3.5 w-3.5" /> {deliverable.file_name}
                          </button>
                        )}
                        {!deliverable.external_url && !deliverable.has_file && <span className="text-[var(--nexus-muted)]">Belum ada file atau tautan.</span>}
                      </div>
                    </div>

                    {editable && (
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--nexus-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--nexus-charcoal)] hover:bg-[var(--nexus-cream-soft)]">
                          <FileUp className="h-3.5 w-3.5" /> {deliverable.has_file ? 'Ganti File' : 'Unggah File'}
                          <input type="file" className="hidden" disabled={busy} onChange={event => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) void run(() => studioProjectsApi.uploadDeliverableFile(detail.project.id, deliverable.id, file), reload, onError, setBusy);
                          }} />
                        </label>
                        {(deliverableActions[deliverable.status_code] || []).map(status => (
                          <Button key={status} size="sm" variant={status === 'revision' ? 'outline' : 'primary'} disabled={busy}
                            onClick={() => {
                              if (status === 'revision') {
                                setReopenTarget({ id: deliverable.id, kind: 'deliverable', status });
                                setReopenReason('');
                                return;
                              }
                              void run(() => studioProjectsApi.changeDeliverableStatus(detail.project.id, deliverable.id, status), reload, onError, setBusy);
                            }}>
                            {deliverableLabels[status]}
                          </Button>
                        ))}
                        {deliverable.status_code === 'pending' && (
                          <button type="button" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" aria-label="Hapus deliverable" disabled={busy}
                            onClick={() => void run(() => studioProjectsApi.deleteDeliverable(detail.project.id, deliverable.id), reload, onError, setBusy)}><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">
                {reopenTarget.kind === 'milestone' ? 'Buka Kembali Tahapan' : 'Minta Revisi Deliverable'}
              </h2>
              <Field
                label="Alasan"
                required={reopenTarget.kind === 'milestone'}
                hint={reopenTarget.kind === 'milestone' ? 'Wajib diisi agar pengerjaan ulang tercatat.' : 'Opsional, tersimpan pada log audit.'}
              >
                <textarea className="studio-textarea" value={reopenReason} onChange={event => setReopenReason(event.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4">
              <Button variant="outline" onClick={() => setReopenTarget(null)} disabled={busy}>Batal</Button>
              <Button
                disabled={busy || (reopenTarget.kind === 'milestone' && reopenReason.trim().length < 3)}
                onClick={() => {
                  const target = reopenTarget;
                  const reason = reopenReason.trim();
                  setReopenTarget(null);
                  void run(() => (target.kind === 'milestone'
                    ? studioProjectsApi.changeMilestoneStatus(detail.project.id, target.id, 'in_progress', reason)
                    : studioProjectsApi.changeDeliverableStatus(detail.project.id, target.id, 'revision', reason)), reload, onError, setBusy);
                }}
              >
                Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Internal team plus external collaborators — two different domains, one tab. */
export function TeamTab({ detail, canWrite, reload, onError }: TabProps) {
  const [users, setUsers] = React.useState<StudioUserOption[]>([]);
  const [parties, setParties] = React.useState<ExternalPartyOption[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [memberDraft, setMemberDraft] = React.useState({ user_id: '', role_label: '', allocation_percent: '' });
  const [externalDraft, setExternalDraft] = React.useState({ party_id: '', assignment_role: 'freelancer', scope_description: '', agreed_fee: '', start_date: '', end_date: '' });
  const [showMemberForm, setShowMemberForm] = React.useState(false);
  const [showExternalForm, setShowExternalForm] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const [userOptions, partyOptions] = await Promise.all([studioReferencesApi.getUsers(), studioReferencesApi.getExternalParties()]);
        setUsers(userOptions); setParties(partyOptions);
      } catch { /* selectors stay empty */ }
    })();
  }, []);

  const editable = canWrite && detail.project.status_code !== 'cancelled';
  const activeMemberIds = new Set(detail.members.filter(member => !member.left_at).map(member => member.user_id));

  return (
    <div className="space-y-5">
      <Card>
        <div className="space-y-5 p-5">
          <SectionHeader
            title="Tim Internal"
            description="Alokasi adalah beban kerja per orang, bukan pembagian kepemilikan proyek."
            action={editable ? <Button size="sm" variant="outline" onClick={() => setShowMemberForm(current => !current)}><Plus className="h-4 w-4" /> Anggota</Button> : undefined}
          />

          {showMemberForm && editable && (
            <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_auto]">
              <Field label="Pengguna" required>
                <select className="studio-input studio-select" value={memberDraft.user_id} onChange={event => setMemberDraft(current => ({ ...current, user_id: event.target.value }))}>
                  <option value="">Pilih pengguna</option>
                  {users.filter(user => !activeMemberIds.has(user.id)).map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </Field>
              <Field label="Peran"><input className="studio-input" value={memberDraft.role_label} onChange={event => setMemberDraft(current => ({ ...current, role_label: event.target.value }))} /></Field>
              <Field label="Alokasi (%)"><input type="text" inputMode="numeric" className="studio-input" value={memberDraft.allocation_percent} onChange={event => setMemberDraft(current => ({ ...current, allocation_percent: event.target.value.replace(/[^\d]/g, '').slice(0, 3) }))} /></Field>
              <div className="flex items-end gap-2 pb-1">
                <Button size="sm" disabled={busy || !memberDraft.user_id} onClick={() => void run(async () => {
                  await studioProjectsApi.addMember(detail.project.id, {
                    user_id: Number(memberDraft.user_id),
                    role_label: memberDraft.role_label.trim() || null,
                    allocation_percent: memberDraft.allocation_percent === '' ? null : Number(memberDraft.allocation_percent),
                  });
                  setMemberDraft({ user_id: '', role_label: '', allocation_percent: '' }); setShowMemberForm(false);
                }, reload, onError, setBusy)}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowMemberForm(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          )}

          {detail.members.length === 0 ? (
            <EmptyState title="Belum Ada Anggota Tim" description="Tugaskan Project Manager atau tambahkan anggota tim internal." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="studio-table-head"><tr><th>Nama</th><th>Peran</th><th>Alokasi</th><th>Bergabung</th><th>Status</th>{editable && <th className="w-24" />}</tr></thead>
                <tbody>
                  {detail.members.map(member => (
                    <tr key={member.user_id} className="studio-table-row">
                      <td>
                        <span className="font-medium text-[var(--nexus-charcoal)]">{member.full_name}</span>
                        <span className="mt-0.5 block text-xs text-[var(--nexus-muted)]">{member.email}</span>
                      </td>
                      <td>{member.role_label || '-'}</td>
                      <td>{member.allocation_percent === null ? '-' : `${member.allocation_percent}%`}</td>
                      <td>{formatDateOnly(member.joined_at)}</td>
                      <td>{member.left_at ? <Badge variant="outline">Keluar {formatDateOnly(member.left_at)}</Badge> : <Badge variant="success">Aktif</Badge>}</td>
                      {editable && (
                        <td className="text-right">
                          {!member.left_at && member.user_id !== detail.project.project_manager_user_id && (
                            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" disabled={busy}
                              onClick={() => void run(() => studioProjectsApi.endMembership(detail.project.id, member.user_id), reload, onError, setBusy)}>
                              <UserMinus className="h-3.5 w-3.5" /> Keluarkan
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-5 p-5">
          <SectionHeader
            title="Kolaborator Eksternal"
            description="Fee yang disepakati adalah komitmen komersial, bukan biaya aktual maupun pembayaran."
            action={editable ? <Button size="sm" variant="outline" onClick={() => setShowExternalForm(current => !current)}><Plus className="h-4 w-4" /> Kolaborator</Button> : undefined}
          />

          {showExternalForm && editable && (
            <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-2">
              <Field label="Pihak eksternal" required hint="Vendor, freelancer, dan mitra tampil lebih dahulu.">
                <select className="studio-input studio-select" value={externalDraft.party_id} onChange={event => setExternalDraft(current => ({ ...current, party_id: event.target.value }))}>
                  <option value="">Pilih pihak</option>
                  {parties.map(party => <option key={party.id} value={party.id}>{party.display_name} — {party.code}{party.role_codes.length ? ` (${party.role_codes.join(', ')})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Jenis penugasan" required>
                <select className="studio-input studio-select" value={externalDraft.assignment_role} onChange={event => setExternalDraft(current => ({ ...current, assignment_role: event.target.value }))}>
                  {Object.entries(externalRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Scope pekerjaan" className="md:col-span-2"><input className="studio-input" value={externalDraft.scope_description} onChange={event => setExternalDraft(current => ({ ...current, scope_description: event.target.value }))} /></Field>
              <Field label="Fee disepakati"><CurrencyInput value={externalDraft.agreed_fee} onChange={value => setExternalDraft(current => ({ ...current, agreed_fee: value }))} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mulai"><input type="date" className="studio-input" value={externalDraft.start_date} onChange={event => setExternalDraft(current => ({ ...current, start_date: event.target.value }))} /></Field>
                <Field label="Selesai"><input type="date" className="studio-input" value={externalDraft.end_date} onChange={event => setExternalDraft(current => ({ ...current, end_date: event.target.value }))} /></Field>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button size="sm" disabled={busy || !externalDraft.party_id} onClick={() => void run(async () => {
                  await studioProjectsApi.addExternal(detail.project.id, {
                    party_id: Number(externalDraft.party_id),
                    assignment_role: externalDraft.assignment_role,
                    scope_description: externalDraft.scope_description.trim() || null,
                    agreed_fee: Number(externalDraft.agreed_fee) || 0,
                    start_date: externalDraft.start_date || null,
                    end_date: externalDraft.end_date || null,
                  });
                  setExternalDraft({ party_id: '', assignment_role: 'freelancer', scope_description: '', agreed_fee: '', start_date: '', end_date: '' });
                  setShowExternalForm(false);
                }, reload, onError, setBusy)}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowExternalForm(false)} disabled={busy}>Batal</Button>
              </div>
            </div>
          )}

          {detail.externals.length === 0 ? (
            <EmptyState title="Belum Ada Kolaborator Eksternal" description="Catat vendor, freelancer, atau mitra yang terlibat pada proyek ini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="studio-table-head"><tr><th>Pihak</th><th>Jenis</th><th>Scope</th><th>Fee Disepakati</th><th>Periode</th><th>Pembayaran</th>{editable && <th className="w-24" />}</tr></thead>
                <tbody>
                  {detail.externals.map(assignment => (
                    <tr key={assignment.id} className="studio-table-row">
                      <td>
                        <span className="font-medium text-[var(--nexus-charcoal)]">{assignment.party_name}</span>
                        <span className="mt-0.5 block studio-code">{assignment.party_code}</span>
                      </td>
                      <td>{externalRoleLabels[assignment.assignment_role] || assignment.assignment_role}</td>
                      <td className="max-w-xs truncate text-[var(--nexus-muted)]">{assignment.scope_description || '-'}</td>
                      <td className="font-semibold">{formatCurrency(assignment.agreed_fee)}</td>
                      <td className="text-xs text-[var(--nexus-muted)]">{formatDateOnly(assignment.start_date)} — {assignment.end_date ? formatDateOnly(assignment.end_date) : 'berjalan'}</td>
                      <td><Badge variant="outline">{assignment.payment_status_code === 'paid' ? 'Lunas' : assignment.payment_status_code === 'partial' ? 'Sebagian' : 'Belum Dibayar'}</Badge></td>
                      {editable && (
                        <td className="text-right">
                          {!assignment.end_date && (
                            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nexus-muted)] hover:text-[var(--nexus-charcoal)] hover:underline" disabled={busy}
                              onClick={() => void run(() => studioProjectsApi.endExternal(detail.project.id, assignment.id, toDateInput(new Date().toISOString())), reload, onError, setBusy)}>
                              <X className="h-3.5 w-3.5" /> Akhiri
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] leading-4 text-[var(--nexus-muted)]">
            Status pembayaran kolaborator eksternal hanya ditampilkan. Pembayaran dicatat melalui modul Keuangan Studio.
          </p>
        </div>
      </Card>
    </div>
  );
}

/** Read-only commercial view. Projects never creates quotations, invoices or payments. */
export function CommercialTab({ detail }: { detail: ProjectDetailResponse }) {
  const { commercial, project } = detail;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MoneyTile label="Nilai Kontrak" value={formatCurrency(project.contract_value)} hint="Nilai yang disepakati dengan klien." />
        <MoneyTile label="Total Ditagih" value={formatCurrency(commercial.invoice_summary.total_invoiced)} hint={`${commercial.invoice_summary.count} invoice.`} />
        <MoneyTile label="Jumlah Terbayar" value={formatCurrency(commercial.invoice_summary.total_paid)} hint="Berdasarkan data invoice." />
        <MoneyTile label="Outstanding" value={formatCurrency(commercial.invoice_summary.outstanding)} hint="Tagihan yang belum dibayar." />
      </div>

      <Card>
        <div className="space-y-4 p-5">
          <SectionHeader title="Penawaran" description="Dikelola oleh modul Penawaran & Penagihan." />
          {commercial.quotations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/60 p-4 text-sm text-[var(--nexus-muted)]">
              Belum ada penawaran untuk proyek ini. Penawaran akan dikelola melalui modul Penawaran &amp; Penagihan.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="studio-table-head"><tr><th>Nomor</th><th>Tanggal</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {commercial.quotations.map(quotation => (
                  <tr key={quotation.id} className="studio-table-row">
                    <td className="studio-code">{quotation.quotation_number}</td>
                    <td>{formatDateOnly(quotation.issue_date)}</td>
                    <td><Badge variant={quotation.status_code === 'accepted' ? 'success' : 'outline'}>{quotation.status_code}</Badge></td>
                    <td className="text-right font-semibold">{formatCurrency(quotation.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-4 p-5">
          <SectionHeader title="Invoice" description="Pencatatan pembayaran dilakukan dari modul Penagihan/Keuangan." />
          {commercial.invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/60 p-4 text-sm text-[var(--nexus-muted)]">Belum ada invoice untuk proyek ini.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="studio-table-head"><tr><th>Nomor</th><th>Terbit</th><th>Jatuh Tempo</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Terbayar</th><th className="text-right">Sisa</th></tr></thead>
              <tbody>
                {commercial.invoices.map(invoice => (
                  <tr key={invoice.id} className="studio-table-row">
                    <td className="studio-code">{invoice.invoice_number}</td>
                    <td>{formatDateOnly(invoice.issue_date)}</td>
                    <td>{formatDateOnly(invoice.due_date)}</td>
                    <td><Badge variant={invoice.status_code === 'paid' ? 'success' : 'outline'}>{invoice.status_code}</Badge></td>
                    <td className="text-right">{formatCurrency(invoice.total_amount)}</td>
                    <td className="text-right">{formatCurrency(invoice.paid_amount)}</td>
                    <td className="text-right font-semibold">{formatCurrency(invoice.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="space-y-4 p-5">
            <SectionHeader title="Pengeluaran Terkait" description="Biaya aktual dicatat oleh Keuangan Studio." />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[var(--nexus-muted)]">{commercial.expense_summary.count} pengeluaran</span>
              <span className="text-lg font-bold text-[var(--nexus-charcoal)]">{formatCurrency(commercial.expense_summary.total)}</span>
            </div>
            {commercial.expenses.length > 0 && (
              <ul className="space-y-2 text-sm">
                {commercial.expenses.slice(0, 6).map(expense => (
                  <li key={expense.id} className="flex items-center justify-between gap-3 border-t border-[var(--nexus-border)] pt-2">
                    <span className="min-w-0 truncate">{expense.description}</span>
                    <span className="shrink-0 font-semibold">{formatCurrency(expense.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-4 text-[var(--nexus-muted)]">Biaya aktual proyek: {formatCurrency(project.actual_cost)} · Estimasi biaya: {formatCurrency(project.estimated_cost)}</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 p-5">
            <SectionHeader title="Komitmen Fee Eksternal" description="Belum tentu sama dengan biaya yang sudah dibayarkan." />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[var(--nexus-muted)]">{commercial.external_fee_summary.count} penugasan</span>
              <span className="text-lg font-bold text-[var(--nexus-charcoal)]">{formatCurrency(commercial.external_fee_summary.total_agreed_fee)}</span>
            </div>
            {commercial.assets.length > 0 && (
              <>
                <p className="border-t border-[var(--nexus-border)] pt-3 text-xs font-bold text-[var(--nexus-charcoal)]">Peralatan Terkait</p>
                <ul className="space-y-2 text-sm">
                  {commercial.assets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate">{asset.asset_name} <span className="studio-code">{asset.asset_code}</span></span>
                      <span className="shrink-0 text-xs text-[var(--nexus-muted)]">{formatDateOnly(asset.assigned_from)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MoneyTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="studio-kpi">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>
      <p className="mt-1.5 text-lg font-bold text-[var(--nexus-charcoal)]">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--nexus-muted)]">{hint}</p>
    </div>
  );
}
