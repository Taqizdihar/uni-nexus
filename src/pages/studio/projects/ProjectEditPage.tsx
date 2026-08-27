import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, ClipboardList, FileText, Lock, Save, Target, Wallet } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import { studioProjectsApi, studioReferencesApi } from '../../../services/api/studio-projects.api';
import type { ProjectDetailResponse, ProjectPriority, StudioClientOption, StudioUserOption } from '../../../types/studio-projects';
import { ProjectClientSelector } from './components/ProjectForm';
import {
  CurrencyInput, ErrorBanner, Field, LoadingState, SectionHeader, StudioPageHeader,
  priorityLabels, projectTypeSuggestions, toDateInput, toDateTimeLocal, useUnsavedChangesGuard,
} from './components/ProjectsUI';

type EditForm = {
  client_party_id: string;
  project_name: string;
  project_type: string;
  priority_code: ProjectPriority;
  start_date: string;
  deadline_at: string;
  contract_value: string;
  estimated_cost: string;
  brief: string;
  notes: string;
  project_manager_user_id: string;
};

const buildForm = (detail: ProjectDetailResponse): EditForm => ({
  client_party_id: String(detail.project.client_party_id),
  project_name: detail.project.project_name,
  project_type: detail.project.project_type || '',
  priority_code: detail.project.priority_code,
  start_date: toDateInput(detail.project.start_date),
  deadline_at: toDateTimeLocal(detail.project.deadline_at),
  contract_value: String(Math.round(detail.project.contract_value)),
  estimated_cost: String(Math.round(detail.project.estimated_cost)),
  brief: detail.project.brief || '',
  notes: detail.project.notes || '',
  project_manager_user_id: detail.project.project_manager_user_id ? String(detail.project.project_manager_user_id) : '',
});

export function ProjectEditPage() {
  const navigate = useNavigate();
  const projectId = Number(useParams().id);

  const [detail, setDetail] = React.useState<ProjectDetailResponse | null>(null);
  const [form, setForm] = React.useState<EditForm | null>(null);
  const [baseline, setBaseline] = React.useState('');
  const [users, setUsers] = React.useState<StudioUserOption[]>([]);
  const [clientOptions, setClientOptions] = React.useState<StudioClientOption[]>([]);
  const [projectTypes, setProjectTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setValue = <K extends keyof EditForm>(key: K, value: EditForm[K]) => setForm(current => (current ? { ...current, [key]: value } : current));

  React.useEffect(() => {
    void (async () => {
      try {
        const [projectDetail, userOptions, types] = await Promise.all([
          studioProjectsApi.getProject(projectId),
          studioReferencesApi.getUsers(),
          studioProjectsApi.getProjectTypes(),
        ]);
        const nextForm = buildForm(projectDetail);
        setDetail(projectDetail);
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
        setUsers(userOptions);
        setProjectTypes(types);
        setClientOptions([{
          id: projectDetail.project.client_party_id,
          code: projectDetail.project.client_code,
          display_name: projectDetail.project.client_name,
          legal_name: projectDetail.project.client_legal_name,
          party_kind: projectDetail.project.client_kind,
          email: projectDetail.project.client_email,
          phone: projectDetail.project.client_phone,
          city: null,
        }]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat proyek.');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const isDirty = Boolean(form) && JSON.stringify(form) !== baseline;
  const guard = useUnsavedChangesGuard(isDirty && !saving);
  const commercialLocked = Boolean(detail?.commercial.lock.locked);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !detail) return;
    setError(null);
    if (!form.project_name.trim()) { setError('Nama proyek wajib diisi.'); return; }

    // Only fields the user actually changed are sent, so a locked contract value
    // is not resubmitted just because the form rendered it.
    const original = JSON.parse(baseline) as EditForm;
    const payload: Record<string, unknown> = {};
    if (form.project_name !== original.project_name) payload.project_name = form.project_name.trim();
    if (form.project_type !== original.project_type) payload.project_type = form.project_type.trim() || null;
    if (form.priority_code !== original.priority_code) payload.priority_code = form.priority_code;
    if (form.start_date !== original.start_date) payload.start_date = form.start_date || null;
    if (form.deadline_at !== original.deadline_at) payload.deadline_at = form.deadline_at || null;
    if (form.contract_value !== original.contract_value) payload.contract_value = Number(form.contract_value) || 0;
    if (form.estimated_cost !== original.estimated_cost) payload.estimated_cost = Number(form.estimated_cost) || 0;
    if (form.brief !== original.brief) payload.brief = form.brief.trim() || null;
    if (form.notes !== original.notes) payload.notes = form.notes.trim() || null;
    if (form.project_manager_user_id !== original.project_manager_user_id) payload.project_manager_user_id = form.project_manager_user_id ? Number(form.project_manager_user_id) : null;
    if (form.client_party_id !== original.client_party_id) payload.client_party_id = Number(form.client_party_id);

    if (Object.keys(payload).length === 0) { navigate(`/app/studio/projects/${projectId}`); return; }

    setSaving(true);
    try {
      await studioProjectsApi.updateProject(projectId, payload);
      setBaseline(JSON.stringify(form));
      guard.approveNavigation();
      navigate(`/app/studio/projects/${projectId}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan perubahan proyek.');
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Memuat proyek..." />;
  if (!detail || !form) return <ErrorBanner message={error || 'Proyek tidak ditemukan.'} />;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        eyebrow={detail.project.project_code}
        title="Edit Proyek"
        description="Ubah data induk proyek. Layanan, tim, tahapan, dan deliverable dikelola dari halaman Detail Proyek."
        back={() => navigate(`/app/studio/projects/${projectId}`)}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {commercialLocked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Nilai komersial terkunci</p>
            <p className="mt-0.5 text-xs leading-5">{detail.commercial.lock.reasons.join(' · ')}. Perubahan nilai kontrak harus melalui modul Penawaran &amp; Penagihan.</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="01" icon={ClipboardList} title="Identitas Proyek" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama proyek" required>
                <input required className="studio-input" value={form.project_name} onChange={event => setValue('project_name', event.target.value)} />
              </Field>
              <Field label="Tipe proyek" hint="Bebas diisi.">
                <input className="studio-input" list="studio-edit-project-types" value={form.project_type} onChange={event => setValue('project_type', event.target.value)} />
                <datalist id="studio-edit-project-types">
                  {[...new Set([...projectTypes, ...projectTypeSuggestions])].map(type => <option key={type} value={type} />)}
                </datalist>
              </Field>
            </div>
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
            <SectionHeader number="02" icon={CalendarClock} title="Jadwal & Prioritas" />
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tanggal mulai"><input type="date" className="studio-input" value={form.start_date} onChange={event => setValue('start_date', event.target.value)} /></Field>
              <Field label="Deadline"><input type="datetime-local" className="studio-input" value={form.deadline_at} onChange={event => setValue('deadline_at', event.target.value)} /></Field>
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
            <SectionHeader number="03" icon={Wallet} title="Nilai Proyek" description="Biaya aktual, jumlah terbayar, dan status pembayaran dikelola oleh Keuangan Studio." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nilai kontrak" hint={`Subtotal layanan saat ini: ${formatCurrency(detail.project.service_subtotal)}.`}>
                <CurrencyInput value={form.contract_value} onChange={value => setValue('contract_value', value)} disabled={commercialLocked} />
              </Field>
              <Field label="Estimasi biaya">
                <CurrencyInput value={form.estimated_cost} onChange={value => setValue('estimated_cost', value)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadOnlyValue label="Biaya Aktual" value={formatCurrency(detail.project.actual_cost)} />
              <ReadOnlyValue label="Jumlah Terbayar" value={formatCurrency(detail.project.paid_amount)} />
              <ReadOnlyValue label="Status Pembayaran" value={detail.project.payment_status_code} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="04" icon={Target} title="Project Manager" description="PM otomatis tercatat sebagai anggota tim proyek." />
            <Field label="Project Manager">
              <select className="studio-input studio-select" value={form.project_manager_user_id} onChange={event => setValue('project_manager_user_id', event.target.value)}>
                <option value="">Belum ditugaskan</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.full_name}{user.role_name ? ` — ${user.role_name}` : ''}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <div className="space-y-5 p-5 sm:p-6">
            <SectionHeader number="05" icon={FileText} title="Brief & Catatan" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Brief proyek"><textarea className="studio-textarea" value={form.brief} onChange={event => setValue('brief', event.target.value)} /></Field>
              <Field label="Catatan internal"><textarea className="studio-textarea" value={form.notes} onChange={event => setValue('notes', event.target.value)} /></Field>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/app/studio/projects/${projectId}`)} disabled={saving}>Batal</Button>
          <Button type="submit" disabled={saving || !isDirty}><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
        </div>
      </form>

      {guard.dialog}
    </div>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--nexus-charcoal)]">{value}</p>
      <p className="mt-0.5 text-[10px] text-[var(--nexus-muted)]">Hanya baca</p>
    </div>
  );
}
