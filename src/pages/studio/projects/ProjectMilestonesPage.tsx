import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, ListChecks, RefreshCw, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { studioProjectsApi, studioReferencesApi } from '../../../services/api/studio-projects.api';
import type {
  MilestoneBoardEntry, MilestoneBoardResponse, StudioClientOption, StudioUserOption,
} from '../../../types/studio-projects';
import {
  AttentionChip, EmptyState, ErrorBanner, Field, LoadingState, MilestoneStatusBadge,
  ProjectPriorityBadge, StudioPageHeader, formatDateTime, milestoneLabels,
} from './components/ProjectsUI';

const groups: Array<{ key: keyof MilestoneBoardResponse['groups']; label: string; description: string; tone: 'danger' | 'warning' | 'neutral' }> = [
  { key: 'overdue', label: 'Terlambat', description: 'Sudah melewati jatuh tempo dan belum selesai.', tone: 'danger' },
  { key: 'due_soon', label: 'Jatuh Tempo 7 Hari', description: 'Perlu perhatian minggu ini.', tone: 'warning' },
  { key: 'in_progress', label: 'Sedang Berjalan', description: 'Sedang dikerjakan tim.', tone: 'neutral' },
  { key: 'upcoming', label: 'Mendatang', description: 'Belum dimulai atau masih jauh.', tone: 'neutral' },
  { key: 'completed', label: 'Selesai', description: 'Tahapan yang sudah dituntaskan.', tone: 'neutral' },
];

const emptyFilters = { project_id: '', client_id: '', manager_id: '', status: '', due_from: '', due_to: '' };

export function ProjectMilestonesPage() {
  const navigate = useNavigate();
  const [board, setBoard] = React.useState<MilestoneBoardResponse | null>(null);
  const [filters, setFilters] = React.useState(emptyFilters);
  const [clients, setClients] = React.useState<StudioClientOption[]>([]);
  const [users, setUsers] = React.useState<StudioUserOption[]>([]);
  const [projects, setProjects] = React.useState<Array<{ id: number; project_code: string; project_name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const [clientOptions, userOptions, projectList] = await Promise.all([
          studioReferencesApi.getClients(undefined, 200),
          studioReferencesApi.getUsers(),
          studioProjectsApi.getProjects({ limit: 100, sort_by: 'created', sort_order: 'desc' }),
        ]);
        setClients(clientOptions);
        setUsers(userOptions);
        setProjects(projectList.items.map(project => ({ id: project.id, project_code: project.project_code, project_name: project.project_name })));
      } catch { /* filters degrade to free selection */ }
    })();
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setBoard(await studioProjectsApi.getMilestoneBoard(filters));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat tahapan proyek.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => { void load(); }, [load]);

  const setFilter = (key: keyof typeof emptyFilters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        title="Tahapan Proyek"
        description="Pantau seluruh tahapan lintas proyek Studio: mana yang terlambat, jatuh tempo pekan ini, dan mana yang sedang berjalan."
        actions={<Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Muat Ulang</Button>}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Card>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="Proyek">
            <select className="studio-filter-select" value={filters.project_id} onChange={event => setFilter('project_id', event.target.value)}>
              <option value="">Semua proyek</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.project_code} — {project.project_name}</option>)}
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
          <Field label="Status">
            <select className="studio-filter-select" value={filters.status} onChange={event => setFilter('status', event.target.value)}>
              <option value="">Semua status</option>
              {Object.entries(milestoneLabels).filter(([value]) => value !== 'late').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Jatuh tempo dari"><input type="date" className="studio-filter-select" value={filters.due_from} onChange={event => setFilter('due_from', event.target.value)} /></Field>
          <Field label="Jatuh tempo sampai"><input type="date" className="studio-filter-select" value={filters.due_to} onChange={event => setFilter('due_to', event.target.value)} /></Field>
        </div>
        {activeFilterCount > 0 && (
          <div className="border-t border-[var(--nexus-border)] px-4 py-2">
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nexus-muted)] hover:text-[var(--nexus-charcoal)]" onClick={() => setFilters(emptyFilters)}>
              <X className="h-3.5 w-3.5" /> Reset filter
            </button>
          </div>
        )}
      </Card>

      {loading ? <LoadingState label="Memuat tahapan..." /> : !board || board.items.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum Ada Tahapan"
            description={activeFilterCount ? 'Tidak ada tahapan yang cocok dengan filter saat ini.' : 'Tahapan akan muncul setelah ditambahkan pada proyek Studio.'}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {groups.map(group => (
              <div key={group.key} className="studio-kpi">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{group.label}</p>
                <p className={`mt-1.5 text-lg font-bold ${group.key === 'overdue' && board.groups.overdue.length > 0 ? 'text-red-600' : 'text-[var(--nexus-charcoal)]'}`}>
                  {board.groups[group.key].length}
                </p>
              </div>
            ))}
          </div>

          {groups.map(group => (
            board.groups[group.key].length > 0 && (
              <Card key={group.key}>
                <div className="space-y-3 p-5">
                  <div className="flex items-baseline justify-between gap-3 border-b border-[var(--nexus-border)] pb-3">
                    <div>
                      <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[var(--nexus-charcoal)]">
                        {group.key === 'overdue' ? <AlertTriangle className="h-4 w-4 text-red-600" />
                          : group.key === 'due_soon' ? <CalendarClock className="h-4 w-4 text-amber-600" />
                          : group.key === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : group.key === 'in_progress' ? <ListChecks className="h-4 w-4 text-[var(--nexus-yellow-deep)]" />
                          : <Clock className="h-4 w-4 text-[var(--nexus-muted)]" />}
                        {group.label}
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--nexus-muted)]">{group.description}</p>
                    </div>
                    <span className="text-xs font-bold text-[var(--nexus-muted)]">{board.groups[group.key].length}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead className="studio-table-head"><tr><th>Tahapan</th><th>Proyek</th><th>Klien</th><th>Project Manager</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
                      <tbody>
                        {board.groups[group.key].map((milestone: MilestoneBoardEntry) => (
                          <tr key={milestone.id} className="studio-table-row cursor-pointer" onClick={() => navigate(`/app/studio/projects/${milestone.project_id}`)}>
                            <td className="font-medium text-[var(--nexus-charcoal)]">{milestone.title}</td>
                            <td>
                              <span className="studio-code">{milestone.project_code}</span>
                              <span className="mt-0.5 block max-w-56 truncate text-xs text-[var(--nexus-muted)]">{milestone.project_name}</span>
                            </td>
                            <td className="max-w-44 truncate">{milestone.client_name}</td>
                            <td className="max-w-40 truncate">{milestone.manager_name || '-'}</td>
                            <td>
                              <span className="text-xs">{formatDateTime(milestone.due_at)}</span>
                              {milestone.is_overdue && <span className="mt-1 block"><AttentionChip tone="danger" icon={AlertTriangle}>Terlambat</AttentionChip></span>}
                            </td>
                            <td className="space-y-1">
                              <MilestoneStatusBadge value={milestone.status_code} overdue={milestone.is_overdue} />
                              <ProjectPriorityBadge value={milestone.priority_code} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )
          ))}
        </div>
      )}
    </div>
  );
}
