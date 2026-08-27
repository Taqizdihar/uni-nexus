import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ClipboardList, FileText, Layers, Save, StickyNote, Target, Users, Wallet } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import { studioProjectsApi, studioReferencesApi } from '../../../services/api/studio-projects.api';
import type {
  CreateProjectRequest, ProjectDeliverableDraft, ProjectMemberDraft, ProjectMilestoneDraft,
  ProjectPriority, ProjectServiceDraft, ServicePackageOption, StudioClientOption,
  StudioServiceOption, StudioUserOption,
} from '../../../types/studio-projects';
import {
  DeliverableDraftEditor, MilestoneDraftEditor, ProjectClientSelector, ProjectServiceEditor,
  ProjectTeamEditor, emptyServiceDraft, serviceSubtotal,
} from './components/ProjectForm';
import {
  CurrencyInput, ErrorBanner, Field, LoadingState, SectionHeader, StudioPageHeader,
  priorityLabels, projectTypeSuggestions, useUnsavedChangesGuard,
} from './components/ProjectsUI';

const initialForm = {
  client_party_id: '',
  project_name: '',
  project_type: '',
  priority_code: 'normal' as ProjectPriority,
  start_date: '',
  deadline_at: '',
  contract_value: '',
  estimated_cost: '',
  brief: '',
  notes: '',
  project_manager_user_id: '',
};

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState(initialForm);
  const [services, setServices] = React.useState<ProjectServiceDraft[]>([emptyServiceDraft()]);
  const [members, setMembers] = React.useState<ProjectMemberDraft[]>([]);
  const [milestones, setMilestones] = React.useState<ProjectMilestoneDraft[]>([]);
  const [deliverables, setDeliverables] = React.useState<ProjectDeliverableDraft[]>([]);

  const [clientOptions, setClientOptions] = React.useState<StudioClientOption[]>([]);
  const [serviceCatalog, setServiceCatalog] = React.useState<StudioServiceOption[]>([]);
  const [packageCatalog, setPackageCatalog] = React.useState<ServicePackageOption[]>([]);
  const [users, setUsers] = React.useState<StudioUserOption[]>([]);
  const [projectTypes, setProjectTypes] = React.useState<string[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setValue = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) => setForm(current => ({ ...current, [key]: value }));

  React.useEffect(() => {
    void (async () => {
      try {
        const [catalog, packages, userOptions, types] = await Promise.all([
          studioReferencesApi.getServices(),
          studioReferencesApi.getServicePackages(),
          studioReferencesApi.getUsers(),
          studioProjectsApi.getProjectTypes(),
        ]);
        setServiceCatalog(catalog); setPackageCatalog(packages); setUsers(userOptions); setProjectTypes(types);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat data pendukung.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtotal = serviceSubtotal(services.filter(line => line.description.trim()));
  const contractValue = form.contract_value ? Number(form.contract_value) : 0;
  // A blank contract value inherits the scope subtotal; an explicit figure is preserved.
  const effectiveContractValue = contractValue > 0 ? contractValue : subtotal;
  const isDirty = React.useMemo(() => (
    JSON.stringify(form) !== JSON.stringify(initialForm)
    || services.some(line => line.description.trim() || line.unit_price || line.service_id || line.package_id)
    || members.length > 0 || milestones.length > 0 || deliverables.length > 0
  ), [form, services, members, milestones, deliverables]);

  const guard = useUnsavedChangesGuard(isDirty && !saving);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.client_party_id) { setError('Klien wajib dipilih.'); return; }
    if (!form.project_name.trim()) { setError('Nama proyek wajib diisi.'); return; }

    const filledServices = services.filter(line => line.description.trim() || line.service_id || line.package_id);
    if (filledServices.some(line => !line.description.trim())) { setError('Setiap baris layanan membutuhkan deskripsi scope.'); return; }
    if (filledServices.some(line => !(Number(line.quantity) > 0))) { setError('Jumlah layanan harus lebih besar dari 0.'); return; }

    const filledMembers = members.filter(member => member.user_id);
    const filledMilestones = milestones.filter(milestone => milestone.title.trim());
    const filledDeliverables = deliverables.filter(deliverable => deliverable.title.trim());

    const payload: CreateProjectRequest = {
      client_party_id: Number(form.client_party_id),
      project_name: form.project_name.trim(),
      project_type: form.project_type.trim() || null,
      priority_code: form.priority_code,
      start_date: form.start_date || null,
      deadline_at: form.deadline_at || null,
      currency_code: 'IDR',
      contract_value: contractValue > 0 ? contractValue : null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      brief: form.brief.trim() || null,
      notes: form.notes.trim() || null,
      project_manager_user_id: form.project_manager_user_id ? Number(form.project_manager_user_id) : null,
      services: filledServices.map(line => ({
        service_id: line.service_id ? Number(line.service_id) : null,
        package_id: line.package_id ? Number(line.package_id) : null,
        description: line.description.trim(),
        quantity: Number(line.quantity) || 1,
        unit_price: Number(line.unit_price) || 0,
      })),
      members: filledMembers.map(member => ({
        user_id: Number(member.user_id),
        role_label: member.role_label.trim() || null,
        allocation_percent: member.allocation_percent === '' ? null : Number(member.allocation_percent),
      })),
      milestones: filledMilestones.map(milestone => ({
        title: milestone.title.trim(),
        description: milestone.description.trim() || null,
        due_at: milestone.due_at || null,
      })),
      deliverables: filledDeliverables.map(deliverable => ({
        title: deliverable.title.trim(),
        description: deliverable.description.trim() || null,
        due_at: deliverable.due_at || null,
        external_url: deliverable.external_url.trim() || null,
      })),
    };

    setSaving(true);
    try {
      const created = await studioProjectsApi.createProject(payload);
      guard.approveNavigation();
      navigate(`/app/studio/projects/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal membuat proyek.');
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Menyiapkan form proyek..." />;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        eyebrow="Operasional Studio"
        title="Proyek Baru"
        description="Catat pekerjaan kreatif baru. Hanya klien dan nama proyek yang wajib diisi — sisanya dapat dilengkapi kemudian."
        back={() => navigate('/app/studio/projects')}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="01" icon={ClipboardList} title="Identitas Proyek" description="Nama dan jenis pekerjaan yang akan dikerjakan." />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nama proyek" required>
                  <input required className="studio-input" value={form.project_name} placeholder="Contoh: Company Profile Video PT Nusantara" onChange={event => setValue('project_name', event.target.value)} />
                </Field>
                <Field label="Tipe proyek" hint="Bebas diisi — daftar di bawah hanya saran.">
                  <input className="studio-input" list="studio-project-types" value={form.project_type} placeholder="Contoh: Videography" onChange={event => setValue('project_type', event.target.value)} />
                  <datalist id="studio-project-types">
                    {[...new Set([...projectTypes, ...projectTypeSuggestions])].map(type => <option key={type} value={type} />)}
                  </datalist>
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="02" icon={Users} title="Klien" description="Pemilik proyek. Klien adalah data Party dengan peran Klien Studio." />
              <ProjectClientSelector
                value={form.client_party_id}
                onChange={value => setValue('client_party_id', value)}
                selectedClient={clientOptions.find(client => String(client.id) === form.client_party_id) || null}
                onClientCreated={client => setClientOptions(current => [client, ...current.filter(item => item.id !== client.id)])}
              />
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="03" icon={CalendarClock} title="Jadwal & Prioritas" description="Rencana mulai dan tenggat penyerahan." />
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tanggal mulai" hint="Terisi otomatis saat proyek mulai dikerjakan jika dikosongkan.">
                  <input type="date" className="studio-input" value={form.start_date} onChange={event => setValue('start_date', event.target.value)} />
                </Field>
                <Field label="Deadline">
                  <input type="datetime-local" className="studio-input" value={form.deadline_at} onChange={event => setValue('deadline_at', event.target.value)} />
                </Field>
                <Field label="Prioritas">
                  <select className="studio-input studio-select" value={form.priority_code} onChange={event => setValue('priority_code', event.target.value as ProjectPriority)}>
                    {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="04" icon={FileText} title="Brief Proyek" description="Ringkasan kebutuhan klien dan hasil yang diharapkan." />
              <Field label="Brief">
                <textarea className="studio-textarea" value={form.brief} placeholder="Tujuan, gaya visual, referensi, dan batasan proyek..." onChange={event => setValue('brief', event.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="05" icon={Layers} title="Layanan & Scope" description="Rincian pekerjaan yang disepakati. Harga tersimpan sebagai snapshot komersial." />
              <ProjectServiceEditor lines={services} onChange={setServices} services={serviceCatalog} packages={packageCatalog} />
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="06" icon={Wallet} title="Nilai Proyek" description="Nilai kontrak dan estimasi biaya untuk perencanaan." />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nilai kontrak" hint={subtotal > 0 ? `Kosongkan untuk mengikuti subtotal layanan (${formatCurrency(subtotal)}).` : 'Nilai yang disepakati dengan klien.'}>
                  <CurrencyInput value={form.contract_value} onChange={value => setValue('contract_value', value)} placeholder={subtotal > 0 ? String(subtotal) : '0'} />
                </Field>
                <Field label="Estimasi biaya" hint="Perkiraan biaya produksi. Biaya aktual dikelola oleh Keuangan Studio.">
                  <CurrencyInput value={form.estimated_cost} onChange={value => setValue('estimated_cost', value)} />
                </Field>
              </div>
              {contractValue > 0 && subtotal > 0 && Math.abs(contractValue - subtotal) > 0.5 && (
                <p className="rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-3 text-xs leading-5 text-[var(--nexus-muted)]">
                  Nilai kontrak berbeda dari subtotal layanan ({formatCurrency(subtotal)}). Ini wajar untuk hasil negosiasi.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="07" icon={Target} title="Project Manager & Tim" description="Penanggung jawab dan anggota tim internal." />
              <Field label="Project Manager" hint="PM otomatis tercatat sebagai anggota tim proyek.">
                <select className="studio-input studio-select" value={form.project_manager_user_id} onChange={event => setValue('project_manager_user_id', event.target.value)}>
                  <option value="">Belum ditugaskan</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.role_name ? ` — ${user.role_name}` : ''}</option>)}
                </select>
              </Field>
              <ProjectTeamEditor members={members} onChange={setMembers} users={users} managerUserId={form.project_manager_user_id} />
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="08" icon={CalendarClock} title="Tahapan Awal" description="Opsional. Tahapan dapat ditambahkan kapan saja dari Detail Proyek." />
              <MilestoneDraftEditor milestones={milestones} onChange={setMilestones} />
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="09" icon={FileText} title="Deliverable Awal" description="Opsional. Unggahan file dilakukan dari Detail Proyek." />
              <DeliverableDraftEditor deliverables={deliverables} onChange={setDeliverables} />
            </div>
          </Card>

          <Card>
            <div className="space-y-5 p-5 sm:p-6">
              <SectionHeader number="10" icon={StickyNote} title="Catatan" description="Catatan internal yang tidak dibagikan ke klien." />
              <Field label="Catatan internal">
                <textarea className="studio-textarea" value={form.notes} onChange={event => setValue('notes', event.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-6">
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--nexus-border)] bg-[var(--nexus-charcoal)] p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-yellow)]">Ringkasan proyek</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-sm text-white/70">Nilai Kontrak</span>
                <span className="text-2xl font-bold tracking-tight">{formatCurrency(effectiveContractValue)}</span>
              </div>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <SummaryRow label="Subtotal Layanan" value={formatCurrency(subtotal)} />
              <SummaryRow label="Estimasi Biaya" value={formatCurrency(Number(form.estimated_cost) || 0)} />
              <div className="my-3 border-t border-[var(--nexus-border)]" />
              <SummaryRow label="Baris layanan" value={String(services.filter(line => line.description.trim()).length)} />
              <SummaryRow label="Anggota tim" value={String(members.filter(member => member.user_id).length + (form.project_manager_user_id ? 1 : 0))} />
              <SummaryRow label="Tahapan" value={String(milestones.filter(item => item.title.trim()).length)} />
              <SummaryRow label="Deliverable" value={String(deliverables.filter(item => item.title.trim()).length)} />
              <p className="mt-4 rounded-lg bg-[var(--nexus-cream-soft)] p-3 text-[11px] leading-4 text-[var(--nexus-muted)]">
                Proyek baru dimulai pada status <strong className="text-[var(--nexus-charcoal)]">Prospek</strong>. Ubah status dari halaman Detail Proyek setelah pekerjaan disepakati.
              </p>
              <Button type="submit" className="mt-3 h-11 w-full" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Proyek'}
              </Button>
            </div>
          </Card>
        </aside>
      </form>

      {guard.dialog}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--nexus-muted)]">{label}</span>
      <span className="font-semibold text-[var(--nexus-charcoal)]">{value}</span>
    </div>
  );
}
