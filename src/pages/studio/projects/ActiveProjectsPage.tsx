import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Flame, ListChecks, Plus, RefreshCw } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioProjectsApi } from '../../../services/api/studio-projects.api';
import type { ActiveProjectsResponse, ProjectStatus, StudioProject } from '../../../types/studio-projects';
import {
  AttentionChip, EmptyState, ErrorBanner, LoadingState, ProjectPriorityBadge, ProjectProgressBar,
  ReasonDialog, StudioPageHeader, formatDateOnly, statusLabels,
} from './components/ProjectsUI';

const columns: Array<{ key: 'approved' | 'in_progress' | 'review'; label: string; hint: string }> = [
  { key: 'approved', label: 'Disetujui', hint: 'Siap dimulai' },
  { key: 'in_progress', label: 'Sedang Dikerjakan', hint: 'Produksi berjalan' },
  { key: 'review', label: 'Tinjauan', hint: 'Menunggu persetujuan klien' },
];

/** Explicit moves only — status validation stays on the server either way. */
const nextStatuses: Record<string, ProjectStatus[]> = {
  approved: ['in_progress'],
  in_progress: ['review'],
  review: ['in_progress', 'completed'],
};

export function ActiveProjectsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('studio.projects.write');

  const [board, setBoard] = React.useState<ActiveProjectsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<{ project: StudioProject; status: ProjectStatus } | null>(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setBoard(await studioProjectsApi.getActiveProjects());
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat proyek aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const applyStatus = async (reason: string) => {
    if (!pending) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      await studioProjectsApi.changeStatus(pending.project.id, pending.status, reason || null);
      setPending(null);
      await load();
    } catch (requestError) {
      setDialogError(requestError instanceof Error ? requestError.message : 'Gagal mengubah status proyek.');
    } finally {
      setDialogBusy(false);
    }
  };

  if (loading) return <LoadingState label="Memuat proyek aktif..." />;

  const total = board?.items.length || 0;

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        title="Proyek Aktif"
        description="Pekerjaan yang sedang berjalan: disetujui, sedang dikerjakan, dan menunggu tinjauan klien. Prospek dan penawaran tetap ada di Semua Proyek."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Muat Ulang</Button>
            {canWrite && <Button onClick={() => navigate('/app/studio/projects/new')}><Plus className="h-4 w-4" /> Proyek Baru</Button>}
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {total === 0 ? (
        <Card>
          <EmptyState
            title="Belum Ada Proyek Aktif"
            description="Proyek akan muncul di sini setelah statusnya menjadi Disetujui, Sedang Dikerjakan, atau Tinjauan."
            action={canWrite ? <Button onClick={() => navigate('/app/studio/projects')}>Lihat Semua Proyek</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map(column => {
            const items = board?.columns[column.key] || [];
            return (
              <section key={column.key} className="studio-kanban-column" aria-label={column.label}>
                <header className="mb-3 flex items-baseline justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">{column.label}</h2>
                    <p className="text-[11px] text-[var(--nexus-muted)]">{column.hint}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[var(--nexus-charcoal)] ring-1 ring-[var(--nexus-border)]">{items.length}</span>
                </header>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-white/60 p-4 text-center text-xs text-[var(--nexus-muted)]">Tidak ada proyek pada kolom ini.</p>
                  ) : items.map(project => {
                    const daysLeft = project.deadline_at ? Math.ceil((new Date(project.deadline_at).getTime() - Date.now()) / 86400000) : null;
                    const hoursLeft = project.deadline_at ? (new Date(project.deadline_at).getTime() - Date.now()) / 3600000 : null;
                    const openMilestones = project.milestone_total - project.milestone_done;
                    return (
                      <article key={project.id} className="rounded-lg border border-[var(--nexus-border)] bg-white p-4 shadow-sm">
                        <button type="button" className="w-full text-left" onClick={() => navigate(`/app/studio/projects/${project.id}`)}>
                          <span className="studio-code">{project.project_code}</span>
                          <h3 className="mt-1 truncate font-bold text-[var(--nexus-charcoal)]">{project.project_name}</h3>
                          <p className="mt-0.5 truncate text-xs text-[var(--nexus-muted)]">{project.client_name}</p>
                        </button>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <ProjectPriorityBadge value={project.priority_code} />
                          {project.is_overdue && <AttentionChip tone="danger" icon={AlertTriangle}>Terlambat</AttentionChip>}
                          {!project.is_overdue && hoursLeft !== null && hoursLeft <= 24 && <AttentionChip tone="danger" icon={CalendarClock}>Kurang dari 24 jam</AttentionChip>}
                          {!project.is_overdue && hoursLeft !== null && hoursLeft > 24 && daysLeft !== null && daysLeft <= 3 && <AttentionChip tone="warning" icon={CalendarClock}>{daysLeft} hari lagi</AttentionChip>}
                          {project.priority_code === 'critical' && <AttentionChip tone="danger" icon={Flame}>Prioritas kritis</AttentionChip>}
                          {openMilestones > 0 && <AttentionChip tone="neutral" icon={ListChecks}>{openMilestones} tahapan belum selesai</AttentionChip>}
                        </div>

                        <dl className="mt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between gap-2"><dt className="text-[var(--nexus-muted)]">Deadline</dt><dd className="font-medium text-[var(--nexus-charcoal)]">{formatDateOnly(project.deadline_at)}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-[var(--nexus-muted)]">Project Manager</dt><dd className="truncate font-medium text-[var(--nexus-charcoal)]">{project.manager_name || 'Belum ditugaskan'}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-[var(--nexus-muted)]">Nilai Kontrak</dt><dd className="font-semibold text-[var(--nexus-charcoal)]">{formatCurrency(project.contract_value)}</dd></div>
                        </dl>

                        <ProjectProgressBar progress={project.progress} className="mt-3" />

                        {canWrite && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--nexus-border)] pt-3">
                            {(nextStatuses[project.status_code] || []).map(status => (
                              <Button key={status} size="sm" variant="outline" onClick={() => { setDialogError(null); setPending({ project, status }); }}>
                                {statusLabels[status]}
                              </Button>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ReasonDialog
        open={pending !== null}
        title={pending ? `Ubah Status ke ${statusLabels[pending.status]}` : ''}
        description={pending ? `${pending.project.project_code} — ${pending.project.project_name}` : undefined}
        label="Alasan"
        confirmLabel="Ubah Status"
        busy={dialogBusy}
        error={dialogError}
        onCancel={() => { setPending(null); setDialogError(null); }}
        onConfirm={reason => void applyStatus(reason)}
      />
    </div>
  );
}
