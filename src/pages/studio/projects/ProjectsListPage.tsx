import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, Filter, Plus, Search, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioProjectsApi, studioReferencesApi } from '../../../services/api/studio-projects.api';
import type {
  PaginatedProjects, ProjectListFilters, ProjectOverview, StudioClientOption, StudioServiceOption, StudioUserOption,
} from '../../../types/studio-projects';
import {
  AttentionChip, EmptyState, ErrorBanner, Field, Kpi, LoadingState, ProjectPaymentBadge,
  ProjectPriorityBadge, ProjectProgressBar, ProjectStatusBadge, StudioPageHeader,
  formatDateOnly, priorityLabels, statusLabels,
} from './components/ProjectsUI';

const PAGE_SIZE = 24;

const sortOptions = [
  { value: 'deadline:asc', label: 'Deadline Terdekat' },
  { value: 'created:desc', label: 'Terbaru' },
  { value: 'name:asc', label: 'Nama (A-Z)' },
  { value: 'value:desc', label: 'Nilai Kontrak Tertinggi' },
  { value: 'priority:desc', label: 'Prioritas Tertinggi' },
  { value: 'client:asc', label: 'Klien (A-Z)' },
];

const emptyFilters = {
  status: '', priority: '', project_type: '', client_id: '', manager_id: '',
  service_id: '', payment_status: '', start_date: '', end_date: '',
  deadline_from: '', deadline_to: '', overdue: false,
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('studio.projects.write');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filters, setFilters] = React.useState(emptyFilters);
  const [sort, setSort] = React.useState('deadline:asc');
  const [page, setPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);

  const [result, setResult] = React.useState<PaginatedProjects | null>(null);
  const [overview, setOverview] = React.useState<ProjectOverview | null>(null);
  const [clients, setClients] = React.useState<StudioClientOption[]>([]);
  const [users, setUsers] = React.useState<StudioUserOption[]>([]);
  const [services, setServices] = React.useState<StudioServiceOption[]>([]);
  const [projectTypes, setProjectTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    void (async () => {
      try {
        const [clientOptions, userOptions, serviceOptions, types, kpis] = await Promise.all([
          studioReferencesApi.getClients(undefined, 200),
          studioReferencesApi.getUsers(),
          studioReferencesApi.getServices(),
          studioProjectsApi.getProjectTypes(),
          studioProjectsApi.getOverview(),
        ]);
        setClients(clientOptions); setUsers(userOptions); setServices(serviceOptions);
        setProjectTypes(types); setOverview(kpis);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat data pendukung.');
      }
    })();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [sortBy, sortOrder] = sort.split(':');
      const payload: ProjectListFilters = {
        ...filters, page, limit: PAGE_SIZE, search: debouncedSearch || undefined,
        sort_by: sortBy, sort_order: sortOrder as 'asc' | 'desc',
      };
      try {
        const projects = await studioProjectsApi.getProjects(payload);
        if (!cancelled) { setResult(projects); setError(null); }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Gagal memuat daftar proyek.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters, page, sort, debouncedSearch]);

  const setFilter = (key: keyof typeof emptyFilters, value: string | boolean) => {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(([, value]) => value !== '' && value !== false).length;
  const projects = result?.items || [];
  const meta = result?.meta;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        title="Proyek"
        description="Kelola pekerjaan kreatif, deadline, tahapan, tim, dan hasil proyek Uni-Inside Studio."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowFilters(current => !current)}>
              <Filter className="h-4 w-4" /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            {canWrite && <Button onClick={() => navigate('/app/studio/projects/new')}><Plus className="h-4 w-4" /> Proyek Baru</Button>}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Proyek Aktif" hint="Disetujui, dikerjakan, dan tinjauan.">{overview ? overview.active_projects : '—'}</Kpi>
        <Kpi label="Deadline 7 Hari" hint="Jatuh tempo dalam sepekan.">{overview ? overview.due_in_7_days : '—'}</Kpi>
        <Kpi label="Terlambat" hint="Melewati deadline dan belum ditutup.">
          <span className={overview && overview.overdue > 0 ? 'text-red-600' : undefined}>{overview ? overview.overdue : '—'}</span>
        </Kpi>
        <Kpi label="Dalam Tinjauan" hint="Menunggu persetujuan klien.">{overview ? overview.in_review : '—'}</Kpi>
        <Kpi label="Selesai Bulan Ini" hint="Berdasarkan tanggal penyelesaian.">{overview ? overview.completed_this_month : '—'}</Kpi>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Card className="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="studio-input pl-10"
              placeholder="Cari kode, nama proyek, klien, tipe, atau brief..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[var(--nexus-muted)]" htmlFor="studio-project-sort">Urutkan</label>
            <select id="studio-project-sort" className="studio-filter-select w-52" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}>
              {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-4 border-b border-[var(--nexus-border)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">
              <select className="studio-filter-select" value={filters.status} onChange={event => setFilter('status', event.target.value)}>
                <option value="">Semua status</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Prioritas">
              <select className="studio-filter-select" value={filters.priority} onChange={event => setFilter('priority', event.target.value)}>
                <option value="">Semua prioritas</option>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Tipe proyek">
              <select className="studio-filter-select" value={filters.project_type} onChange={event => setFilter('project_type', event.target.value)}>
                <option value="">Semua tipe</option>
                {projectTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Klien">
              <select className="studio-filter-select" value={filters.client_id} onChange={event => setFilter('client_id', event.target.value)}>
                <option value="">Semua klien</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.display_name}</option>)}
              </select>
            </Field>
            <Field label="Project Manager">
              <select className="studio-filter-select" value={filters.manager_id} onChange={event => setFilter('manager_id', event.target.value)}>
                <option value="">Semua PM</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </select>
            </Field>
            <Field label="Layanan" hint={services.length ? undefined : 'Katalog layanan masih kosong.'}>
              <select className="studio-filter-select" value={filters.service_id} disabled={!services.length} onChange={event => setFilter('service_id', event.target.value)}>
                <option value="">Semua layanan</option>
                {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </Field>
            <Field label="Status pembayaran">
              <select className="studio-filter-select" value={filters.payment_status} onChange={event => setFilter('payment_status', event.target.value)}>
                <option value="">Semua</option>
                <option value="unpaid">Belum Dibayar</option>
                <option value="partial">Dibayar Sebagian</option>
                <option value="paid">Lunas</option>
              </select>
            </Field>
            <Field label="Mulai dari"><input type="date" className="studio-filter-select" value={filters.start_date} onChange={event => setFilter('start_date', event.target.value)} /></Field>
            <Field label="Mulai sampai"><input type="date" className="studio-filter-select" value={filters.end_date} onChange={event => setFilter('end_date', event.target.value)} /></Field>
            <Field label="Deadline dari"><input type="date" className="studio-filter-select" value={filters.deadline_from} onChange={event => setFilter('deadline_from', event.target.value)} /></Field>
            <Field label="Deadline sampai"><input type="date" className="studio-filter-select" value={filters.deadline_to} onChange={event => setFilter('deadline_to', event.target.value)} /></Field>
            <div className="flex items-end gap-3 pb-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)]">
                <input type="checkbox" checked={filters.overdue} onChange={event => setFilter('overdue', event.target.checked)} />
                Hanya yang terlambat
              </label>
              {activeFilterCount > 0 && (
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nexus-muted)] hover:text-[var(--nexus-charcoal)]" onClick={() => { setFilters(emptyFilters); setPage(1); }}>
                  <X className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">
          {loading ? <LoadingState /> : projects.length === 0 ? (
            <EmptyState
              title={debouncedSearch || activeFilterCount ? 'Tidak Ada Proyek Yang Cocok' : 'Belum Ada Proyek'}
              description={debouncedSearch || activeFilterCount
                ? 'Ubah kata kunci atau filter untuk menemukan proyek lain.'
                : 'Mulai dengan membuat proyek pertama untuk klien Uni-Inside Studio.'}
              action={canWrite && !debouncedSearch && !activeFilterCount
                ? <Button onClick={() => navigate('/app/studio/projects/new')}><Plus className="h-4 w-4" /> Proyek Baru</Button>
                : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {projects.map(project => (
                <article
                  key={project.id}
                  className="flex cursor-pointer flex-col rounded-xl border border-[var(--nexus-border)] bg-white p-5 transition hover:border-[var(--nexus-yellow-deep)] hover:shadow-md"
                  onClick={() => navigate(`/app/studio/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="studio-code">{project.project_code}</span>
                      <h3 className="mt-1 truncate font-bold text-[var(--nexus-charcoal)]">{project.project_name}</h3>
                      <p className="mt-0.5 truncate text-xs text-[var(--nexus-muted)]">{project.client_name}</p>
                    </div>
                    <Eye className="mt-1 h-4 w-4 shrink-0 text-[var(--nexus-muted)]" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <ProjectStatusBadge value={project.status_code} />
                    <ProjectPriorityBadge value={project.priority_code} />
                    <ProjectPaymentBadge value={project.payment_status_code} />
                    {project.is_overdue && <AttentionChip tone="danger" icon={AlertTriangle}>Terlambat</AttentionChip>}
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nexus-muted)]">Tipe</dt>
                      <dd className="truncate font-medium text-[var(--nexus-charcoal)]">{project.project_type || 'Belum ditentukan'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nexus-muted)]">Layanan</dt>
                      <dd className="min-w-0 truncate font-medium text-[var(--nexus-charcoal)]">
                        {project.primary_service || 'Belum ada'}{project.service_count > 1 ? ` +${project.service_count - 1}` : ''}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nexus-muted)]">Project Manager</dt>
                      <dd className="truncate font-medium text-[var(--nexus-charcoal)]">{project.manager_name || 'Belum ditugaskan'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nexus-muted)]">Deadline</dt>
                      <dd className="inline-flex items-center gap-1.5 font-medium text-[var(--nexus-charcoal)]">
                        <CalendarClock className="h-3.5 w-3.5 text-[var(--nexus-yellow-deep)]" />{formatDateOnly(project.deadline_at)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nexus-muted)]">Nilai Kontrak</dt>
                      <dd className="font-bold text-[var(--nexus-charcoal)]">{formatCurrency(project.contract_value)}</dd>
                    </div>
                  </dl>

                  <ProjectProgressBar progress={project.progress} className="mt-4 border-t border-[var(--nexus-border)] pt-3" />
                </article>
              ))}
            </div>
          )}
        </div>

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/40 px-4 py-3 sm:flex-row">
            <p className="text-xs text-[var(--nexus-muted)]">
              Menampilkan {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} proyek
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Sebelumnya</Button>
              <span className="text-xs font-semibold text-[var(--nexus-charcoal)]">Halaman {meta.page} / {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(current => current + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>

      {overview && overview.total_projects > 0 && (
        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--nexus-muted)]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {overview.pipeline} proyek masih pada tahap prospek/penawaran · Nilai kontrak proyek aktif {formatCurrency(overview.active_contract_value)}
        </p>
      )}
    </div>
  );
}
