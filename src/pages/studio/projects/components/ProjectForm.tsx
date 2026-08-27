import React from 'react';
import { Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../context/AuthContext';
import { formatCurrency } from '../../../../lib/utils';
import { studioProjectsApi, studioReferencesApi } from '../../../../services/api/studio-projects.api';
import type {
  ClientDuplicateCandidate, ProjectDeliverableDraft, ProjectMemberDraft, ProjectMilestoneDraft,
  ProjectServiceDraft, ServicePackageOption, StudioClientOption, StudioServiceOption, StudioUserOption,
} from '../../../../types/studio-projects';
import { CurrencyInput, ErrorBanner, Field, QuantityInput } from './ProjectsUI';

export const draftKey = () => Math.random().toString(36).slice(2, 10);

export const emptyServiceDraft = (): ProjectServiceDraft => ({ key: draftKey(), service_id: '', package_id: '', description: '', quantity: '1', unit_price: '' });
export const emptyMemberDraft = (): ProjectMemberDraft => ({ key: draftKey(), user_id: '', role_label: '', allocation_percent: '' });
export const emptyMilestoneDraft = (): ProjectMilestoneDraft => ({ key: draftKey(), title: '', description: '', due_at: '' });
export const emptyDeliverableDraft = (): ProjectDeliverableDraft => ({ key: draftKey(), title: '', description: '', due_at: '', external_url: '' });

export const serviceLineTotal = (line: ProjectServiceDraft) => (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
export const serviceSubtotal = (lines: ProjectServiceDraft[]) => lines.reduce((sum, line) => sum + serviceLineTotal(line), 0);

/**
 * Server-side client search over Party code, names, email and phone.
 * Quick create is only offered when the user may also write Studio clients.
 */
export function ProjectClientSelector({ value, onChange, selectedClient, onClientCreated }: {
  value: string;
  onChange: (value: string) => void;
  selectedClient?: StudioClientOption | null;
  onClientCreated: (client: StudioClientOption) => void;
}) {
  const { hasPermission } = useAuth();
  const canCreateClients = hasPermission('studio.clients.write') && hasPermission('studio.projects.write');
  const [search, setSearch] = React.useState('');
  const [clients, setClients] = React.useState<StudioClientOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await studioReferencesApi.getClients(search || undefined);
        if (!cancelled) setClients(results);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search]);

  // A freshly created or preselected client must stay visible even outside the current search page.
  const options = React.useMemo(() => {
    if (!selectedClient || clients.some(client => client.id === selectedClient.id)) return clients;
    return [selectedClient, ...clients];
  }, [clients, selectedClient]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cari klien" hint="Cari berdasarkan kode, nama, email, atau nomor telepon.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="studio-input pl-10" value={search} placeholder="Nama klien, email, atau telepon..." onChange={event => setSearch(event.target.value)} />
          </div>
        </Field>
        <Field label="Klien" required hint={loading ? 'Memuat klien...' : `${options.length} klien tersedia.`}>
          <div className="flex gap-2">
            <select className="studio-input studio-select min-w-0 flex-1" value={value} onChange={event => onChange(event.target.value)}>
              <option value="">Pilih klien</option>
              {options.map(client => (
                <option key={client.id} value={client.id}>{client.display_name}{client.code ? ` — ${client.code}` : ''}</option>
              ))}
            </select>
            {canCreateClients && (
              <Button type="button" variant="outline" className="shrink-0 px-3" onClick={() => setShowModal(true)}>
                <UserPlus className="h-4 w-4" /><span className="hidden sm:inline">Klien Baru</span>
              </Button>
            )}
          </div>
        </Field>
      </div>

      {showModal && (
        <QuickClientModal
          onClose={() => setShowModal(false)}
          onCreated={client => { onClientCreated(client); onChange(String(client.id)); setShowModal(false); }}
        />
      )}
    </>
  );
}

/**
 * Creates a Party with the `studio_client` role, or activates that role on an
 * existing Party when a strong duplicate is found. Nothing is merged silently.
 */
function QuickClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (client: StudioClientOption) => void }) {
  const [form, setForm] = React.useState({ display_name: '', party_kind: 'individual', legal_name: '', email: '', phone: '', tax_id: '', city: '' });
  const [duplicates, setDuplicates] = React.useState<ClientDuplicateCandidate[]>([]);
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const setValue = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  React.useEffect(() => {
    const payload = { display_name: form.display_name.trim(), legal_name: form.legal_name.trim(), email: form.email.trim(), phone: form.phone.trim(), tax_id: form.tax_id.trim() };
    if (!payload.display_name && !payload.email && !payload.phone && !payload.tax_id && !payload.legal_name) { setDuplicates([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const candidates = await studioProjectsApi.findClientDuplicates(payload);
        if (!cancelled) setDuplicates(candidates);
      } catch {
        if (!cancelled) setDuplicates([]);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [form.display_name, form.legal_name, form.email, form.phone, form.tax_id]);

  const submit = async (event: React.FormEvent, useExistingPartyId?: number) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await studioProjectsApi.quickCreateClient({
        display_name: form.display_name.trim() || 'Klien Baru',
        party_kind: form.party_kind,
        legal_name: form.legal_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        tax_id: form.tax_id.trim() || null,
        city: form.city.trim() || null,
        use_existing_party_id: useExistingPartyId ?? null,
      });
      onCreated(created);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan klien.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]">
      <form onSubmit={event => void submit(event)} className="my-8 w-full max-w-lg space-y-5 rounded-xl border border-[var(--nexus-border)] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="studio-eyebrow">Klien Studio</p>
            <h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">Tambah Klien</h2>
          </div>
          <button type="button" className="rounded-lg p-2 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)]" onClick={onClose} aria-label="Tutup"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <Field label="Nama klien" required>
            <input required className="studio-input" value={form.display_name} onChange={event => setValue('display_name', event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jenis">
              <select className="studio-input studio-select" value={form.party_kind} onChange={event => setValue('party_kind', event.target.value)}>
                <option value="individual">Perorangan</option>
                <option value="company">Perusahaan</option>
                <option value="institution">Institusi</option>
              </select>
            </Field>
            <Field label="Kota"><input className="studio-input" value={form.city} onChange={event => setValue('city', event.target.value)} /></Field>
            <Field label="Email"><input type="email" className="studio-input" value={form.email} onChange={event => setValue('email', event.target.value)} /></Field>
            <Field label="Telepon"><input className="studio-input" value={form.phone} onChange={event => setValue('phone', event.target.value)} /></Field>
            <Field label="Nama legal"><input className="studio-input" value={form.legal_name} onChange={event => setValue('legal_name', event.target.value)} /></Field>
            <Field label="NPWP / Tax ID"><input className="studio-input" value={form.tax_id} onChange={event => setValue('tax_id', event.target.value)} /></Field>
          </div>
        </div>

        {(checking || duplicates.length > 0) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-900">{checking ? 'Memeriksa kemungkinan duplikat...' : 'Kemungkinan Klien Sudah Terdaftar'}</p>
            {duplicates.length > 0 && (
              <>
                <p className="mt-1 text-[11px] leading-4 text-amber-800">Gunakan data yang sudah ada agar identitas klien tidak terduplikasi.</p>
                <ul className="mt-2 space-y-2">
                  {duplicates.map(candidate => (
                    <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white p-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--nexus-charcoal)]">{candidate.display_name} <span className="studio-code">{candidate.code}</span></p>
                        <p className="text-[11px] text-[var(--nexus-muted)]">{candidate.match_reason}{candidate.is_studio_client ? ' · sudah menjadi Klien Studio' : ' · belum berperan Klien Studio'}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={event => void submit(event as unknown as React.FormEvent, candidate.id)}>
                        Gunakan Party Ini
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" disabled={saving || !form.display_name.trim()}>{saving ? 'Menyimpan...' : 'Simpan Klien'}</Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Scope editor. Catalog services and packages are optional references: when the
 * catalog is empty a custom line is still a complete, valid scope entry.
 */
export function ProjectServiceEditor({ lines, onChange, services, packages }: {
  lines: ProjectServiceDraft[];
  onChange: (lines: ProjectServiceDraft[]) => void;
  services: StudioServiceOption[];
  packages: ServicePackageOption[];
}) {
  const setLine = (key: string, patch: Partial<ProjectServiceDraft>) => onChange(lines.map(line => (line.key === key ? { ...line, ...patch } : line)));

  // Selecting a catalog entry seeds description and price once; the stored price is a snapshot.
  const selectService = (key: string, serviceId: string) => {
    const service = services.find(item => String(item.id) === serviceId);
    setLine(key, {
      service_id: serviceId,
      package_id: '',
      description: service ? service.name : lines.find(line => line.key === key)?.description || '',
      unit_price: service ? String(service.base_price) : lines.find(line => line.key === key)?.unit_price || '',
    });
  };

  const selectPackage = (key: string, packageId: string) => {
    const servicePackage = packages.find(item => String(item.id) === packageId);
    setLine(key, {
      package_id: packageId,
      service_id: '',
      description: servicePackage ? servicePackage.name : lines.find(line => line.key === key)?.description || '',
      unit_price: servicePackage ? String(servicePackage.package_price) : lines.find(line => line.key === key)?.unit_price || '',
    });
  };

  return (
    <div className="space-y-4">
      {services.length === 0 && packages.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3 text-xs leading-5 text-[var(--nexus-muted)]">
          Katalog Layanan Studio masih kosong. Anda tetap dapat menuliskan scope kustom pada setiap baris di bawah.
        </p>
      )}

      {lines.map((line, index) => (
        <div key={line.key} className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--nexus-charcoal)]">Layanan {index + 1}</span>
            {lines.length > 1 && (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" onClick={() => onChange(lines.filter(item => item.key !== line.key))}>
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Layanan katalog" hint={services.length ? 'Opsional — kosongkan untuk scope kustom.' : 'Belum ada layanan pada katalog.'}>
              <select className="studio-input studio-select" value={line.service_id} disabled={!services.length} onChange={event => selectService(line.key, event.target.value)}>
                <option value="">Scope kustom</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.code} — {service.name} ({service.pricing_model}{service.unit_label ? `/${service.unit_label}` : ''})</option>
                ))}
              </select>
            </Field>
            <Field label="Paket layanan" hint={packages.length ? 'Opsional — mengisi harga paket.' : 'Belum ada paket layanan.'}>
              <select className="studio-input studio-select" value={line.package_id} disabled={!packages.length} onChange={event => selectPackage(line.key, event.target.value)}>
                <option value="">Tanpa paket</option>
                {packages.map(servicePackage => (
                  <option key={servicePackage.id} value={servicePackage.id}>{servicePackage.code} — {servicePackage.name} ({formatCurrency(servicePackage.package_price)})</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)]">
            <Field label="Deskripsi scope" required>
              <input className="studio-input" value={line.description} placeholder="Contoh: Shooting 2 hari di lokasi klien" onChange={event => setLine(line.key, { description: event.target.value })} />
            </Field>
            <Field label="Jumlah" required hint="Boleh desimal.">
              <QuantityInput value={line.quantity} onChange={value => setLine(line.key, { quantity: value })} />
            </Field>
            <Field label="Harga satuan" required>
              <CurrencyInput value={line.unit_price} onChange={value => setLine(line.key, { unit_price: value })} />
            </Field>
          </div>

          <p className="mt-3 text-right text-xs text-[var(--nexus-muted)]">
            Subtotal baris: <span className="font-bold text-[var(--nexus-charcoal)]">{formatCurrency(serviceLineTotal(line))}</span>
          </p>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, emptyServiceDraft()])}>
        <Plus className="h-4 w-4" /> Tambah Layanan
      </Button>
    </div>
  );
}

/** Internal team. Allocation is a per-person workload figure, so it is not summed. */
export function ProjectTeamEditor({ members, onChange, users, managerUserId }: {
  members: ProjectMemberDraft[];
  onChange: (members: ProjectMemberDraft[]) => void;
  users: StudioUserOption[];
  managerUserId: string;
}) {
  const setMember = (key: string, patch: Partial<ProjectMemberDraft>) => onChange(members.map(member => (member.key === key ? { ...member, ...patch } : member)));
  const taken = new Set(members.map(member => member.user_id).filter(Boolean));

  return (
    <div className="space-y-3">
      {members.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3 text-xs text-[var(--nexus-muted)]">
          Belum ada anggota tim tambahan. Project Manager otomatis tercatat sebagai anggota tim.
        </p>
      )}

      {members.map(member => (
        <div key={member.key} className="grid gap-3 rounded-lg border border-[var(--nexus-border)] bg-white p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_auto]">
          <Field label="Anggota">
            <select className="studio-input studio-select" value={member.user_id} onChange={event => setMember(member.key, { user_id: event.target.value })}>
              <option value="">Pilih pengguna</option>
              {users
                .filter(user => String(user.id) === member.user_id || (!taken.has(String(user.id)) && String(user.id) !== managerUserId))
                .map(user => <option key={user.id} value={user.id}>{user.full_name}{user.role_name ? ` — ${user.role_name}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Peran">
            <input className="studio-input" value={member.role_label} placeholder="Contoh: Videografer" onChange={event => setMember(member.key, { role_label: event.target.value })} />
          </Field>
          <Field label="Alokasi (%)" hint="0-100">
            <input type="text" inputMode="numeric" className="studio-input" value={member.allocation_percent} onChange={event => setMember(member.key, { allocation_percent: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })} />
          </Field>
          <div className="flex items-end pb-1">
            <button type="button" className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => onChange(members.filter(item => item.key !== member.key))}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...members, emptyMemberDraft()])}>
        <Plus className="h-4 w-4" /> Tambah Anggota
      </Button>
    </div>
  );
}

/** Optional starting milestones — a simple lead does not need any. */
export function MilestoneDraftEditor({ milestones, onChange }: { milestones: ProjectMilestoneDraft[]; onChange: (value: ProjectMilestoneDraft[]) => void }) {
  const setMilestone = (key: string, patch: Partial<ProjectMilestoneDraft>) => onChange(milestones.map(item => (item.key === key ? { ...item, ...patch } : item)));
  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => (
        <div key={milestone.key} className="grid gap-3 rounded-lg border border-[var(--nexus-border)] bg-white p-3 md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)_auto]">
          <div className="flex items-end pb-3 text-xs font-bold text-[var(--nexus-muted)]">{index + 1}.</div>
          <Field label="Judul tahapan">
            <input className="studio-input" value={milestone.title} placeholder="Contoh: Pra-produksi" onChange={event => setMilestone(milestone.key, { title: event.target.value })} />
          </Field>
          <Field label="Jatuh tempo">
            <input type="datetime-local" className="studio-input" value={milestone.due_at} onChange={event => setMilestone(milestone.key, { due_at: event.target.value })} />
          </Field>
          <div className="flex items-end pb-1">
            <button type="button" className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => onChange(milestones.filter(item => item.key !== milestone.key))}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...milestones, emptyMilestoneDraft()])}>
        <Plus className="h-4 w-4" /> Tambah Tahapan
      </Button>
    </div>
  );
}

/** Optional starting deliverables; files are attached later from Project Detail. */
export function DeliverableDraftEditor({ deliverables, onChange }: { deliverables: ProjectDeliverableDraft[]; onChange: (value: ProjectDeliverableDraft[]) => void }) {
  const setDeliverable = (key: string, patch: Partial<ProjectDeliverableDraft>) => onChange(deliverables.map(item => (item.key === key ? { ...item, ...patch } : item)));
  return (
    <div className="space-y-3">
      {deliverables.map(deliverable => (
        <div key={deliverable.key} className="grid gap-3 rounded-lg border border-[var(--nexus-border)] bg-white p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
          <Field label="Judul deliverable">
            <input className="studio-input" value={deliverable.title} placeholder="Contoh: Master Video 4K" onChange={event => setDeliverable(deliverable.key, { title: event.target.value })} />
          </Field>
          <Field label="Tautan hasil kerja" hint="Gunakan tautan untuk media besar (http/https).">
            <input className="studio-input" value={deliverable.external_url} placeholder="https://drive.google.com/..." onChange={event => setDeliverable(deliverable.key, { external_url: event.target.value })} />
          </Field>
          <Field label="Jatuh tempo">
            <input type="datetime-local" className="studio-input" value={deliverable.due_at} onChange={event => setDeliverable(deliverable.key, { due_at: event.target.value })} />
          </Field>
          <div className="flex items-end pb-1">
            <button type="button" className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => onChange(deliverables.filter(item => item.key !== deliverable.key))}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...deliverables, emptyDeliverableDraft()])}>
        <Plus className="h-4 w-4" /> Tambah Deliverable
      </Button>
    </div>
  );
}
