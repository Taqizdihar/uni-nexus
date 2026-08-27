import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Ban, CalendarClock, History, Pencil, RefreshCw, User } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioProjectsApi } from '../../../services/api/studio-projects.api';
import type { ProjectActivityEntry, ProjectDetailResponse, ProjectStatus } from '../../../types/studio-projects';
import { CommercialTab, ServicesTab, TeamTab, WorkTab } from './components/ProjectDetailTabs';
import {
  AttentionChip, ErrorBanner, Kpi, LoadingState, ProjectPaymentBadge, ProjectPriorityBadge,
  ProjectProgressBar, ProjectStatusBadge, ReasonDialog, StudioPageHeader, formatDateOnly,
  formatDateTime, statusLabels,
} from './components/ProjectsUI';

type TabKey = 'summary' | 'services' | 'work' | 'team' | 'commercial' | 'activity';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'summary', label: 'Ringkasan' },
  { key: 'services', label: 'Layanan & Scope' },
  { key: 'work', label: 'Tahapan & Deliverable' },
  { key: 'team', label: 'Tim' },
  { key: 'commercial', label: 'Komersial' },
  { key: 'activity', label: 'Aktivitas' },
];

/** Backwards or closing transitions must be explained before they are applied. */
const REASON_REQUIRED_TRANSITIONS: Record<string, ProjectStatus[]> = {
  completed: ['review'],
  quotation: ['lead'],
};

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const projectId = Number(useParams().id);
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('studio.projects.write');

  const [detail, setDetail] = React.useState<ProjectDetailResponse | null>(null);
  const [activity, setActivity] = React.useState<ProjectActivityEntry[]>([]);
  const [tab, setTab] = React.useState<TabKey>('summary');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = React.useState<ProjectStatus | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const projectDetail = await studioProjectsApi.getProject(projectId);
    setDetail(projectDetail);
  }, [projectId]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat proyek.');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  React.useEffect(() => {
    if (tab !== 'activity') return;
    void (async () => {
      try {
        setActivity(await studioProjectsApi.getActivity(projectId));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat aktivitas proyek.');
      }
    })();
  }, [tab, projectId, detail]);

  if (loading) return <LoadingState label="Memuat detail proyek..." />;
  if (!detail) return <ErrorBanner message={error || 'Proyek tidak ditemukan.'} />;

  const { project } = detail;
  const reasonRequired = pendingStatus ? (REASON_REQUIRED_TRANSITIONS[project.status_code] || []).includes(pendingStatus) : false;
  const daysToDeadline = project.deadline_at ? Math.ceil((new Date(project.deadline_at).getTime() - Date.now()) / 86400000) : null;

  const applyStatus = async (status: ProjectStatus, reason: string) => {
    setDialogBusy(true);
    setDialogError(null);
    try {
      await studioProjectsApi.changeStatus(projectId, status, reason || null);
      setPendingStatus(null);
      await load();
    } catch (requestError) {
      setDialogError(requestError instanceof Error ? requestError.message : 'Gagal mengubah status proyek.');
    } finally {
      setDialogBusy(false);
    }
  };

  const applyCancel = async (reason: string) => {
    setDialogBusy(true);
    setDialogError(null);
    try {
      await studioProjectsApi.cancelProject(projectId, reason);
      setCancelling(false);
      await load();
    } catch (requestError) {
      setDialogError(requestError instanceof Error ? requestError.message : 'Gagal membatalkan proyek.');
    } finally {
      setDialogBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        eyebrow={project.project_code}
        title={project.project_name}
        description={`Klien: ${project.client_name}${project.project_type ? ` · ${project.project_type}` : ''}`}
        back={() => navigate('/app/studio/projects')}
        actions={canWrite ? (
          <>
            {project.status_code !== 'cancelled' && (
              <Button variant="outline" onClick={() => navigate(`/app/studio/projects/${projectId}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
            )}
            {project.available_transitions.map(status => (
              <Button key={status} variant={status === 'completed' || status === 'paid' ? 'primary' : 'outline'} onClick={() => { setDialogError(null); setPendingStatus(status); }}>
                <RefreshCw className="h-4 w-4" /> {statusLabels[status]}
              </Button>
            ))}
            {project.can_cancel && (
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => { setDialogError(null); setCancelling(true); }}>
                <Ban className="h-4 w-4" /> Batalkan Proyek
              </Button>
            )}
          </>
        ) : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <ProjectStatusBadge value={project.status_code} />
        <ProjectPriorityBadge value={project.priority_code} />
        <ProjectPaymentBadge value={project.payment_status_code} />
        {project.is_overdue && <AttentionChip tone="danger" icon={AlertTriangle}>Melewati deadline</AttentionChip>}
        {!project.is_overdue && daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 3 && !['completed', 'paid', 'cancelled'].includes(project.status_code) && (
          <AttentionChip tone="warning" icon={CalendarClock}>{daysToDeadline === 0 ? 'Deadline hari ini' : `Deadline ${daysToDeadline} hari lagi`}</AttentionChip>
        )}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Deadline" hint={project.start_date ? `Mulai ${formatDateOnly(project.start_date)}` : 'Belum ada tanggal mulai'}>
          <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-[var(--nexus-yellow-deep)]" />{formatDateOnly(project.deadline_at)}</span>
        </Kpi>
        <Kpi label="Project Manager" hint={`${project.member_count} anggota tim aktif`}>
          <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-[var(--nexus-muted)]" />{project.manager_name || 'Belum ditugaskan'}</span>
        </Kpi>
        <Kpi label="Progres Tahapan"><ProjectProgressBar progress={project.progress} /></Kpi>
        <Kpi label="Nilai Kontrak" hint={project.contract_value_matches_services ? 'Sesuai subtotal layanan.' : `Subtotal layanan ${formatCurrency(project.service_subtotal)}`}>
          {formatCurrency(project.contract_value)}
        </Kpi>
        <Kpi label="Estimasi Biaya" hint="Perencanaan proyek.">{formatCurrency(project.estimated_cost)}</Kpi>
        <Kpi label="Biaya Aktual" hint="Bersumber dari Keuangan Studio.">{formatCurrency(project.actual_cost)}</Kpi>
        <Kpi label="Total Ditagih" hint={`${detail.commercial.invoice_summary.count} invoice`}>{formatCurrency(detail.commercial.invoice_summary.total_invoiced)}</Kpi>
        <Kpi label="Jumlah Terbayar" hint={`Outstanding ${formatCurrency(detail.commercial.invoice_summary.outstanding)}`}>{formatCurrency(project.paid_amount)}</Kpi>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-1">
        {tabs.map(item => (
          <button key={item.key} type="button" className={`studio-tab${tab === item.key ? ' is-active' : ''}`} onClick={() => setTab(item.key)} aria-pressed={tab === item.key}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-5">
          <Card>
            <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoBlock label="Klien" value={project.client_name} detail={`${project.client_code} · ${project.client_phone || project.client_email || project.client_kind}`} />
              <InfoBlock label="Tipe proyek" value={project.project_type || 'Belum ditentukan'} detail={`${project.service_count} baris layanan`} />
              <InfoBlock label="Layanan utama" value={project.primary_service || 'Belum ada layanan'} detail={project.service_count > 1 ? `+${project.service_count - 1} layanan lain` : undefined} />
              <InfoBlock label="Tanggal mulai" value={formatDateOnly(project.start_date)} detail={project.completed_at ? `Selesai ${formatDateTime(project.completed_at)}` : undefined} />
              <InfoBlock label="Deadline" value={formatDateTime(project.deadline_at)} />
              <InfoBlock label="Dibuat oleh" value={project.created_by_name || '-'} detail={formatDateTime(project.created_at)} />
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <div className="space-y-2 p-5">
                <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Brief Proyek</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--nexus-muted)]">{project.brief || 'Brief belum diisi.'}</p>
              </div>
            </Card>
            <Card>
              <div className="space-y-2 p-5">
                <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Catatan Internal</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--nexus-muted)]">{project.notes || 'Belum ada catatan internal.'}</p>
              </div>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Tahapan" hint={`${project.milestone_done} selesai`}>{project.milestone_total} tahapan</Kpi>
            <Kpi label="Deliverable" hint={`${project.deliverable_done} disetujui/diserahkan`}>{project.deliverable_total} deliverable</Kpi>
            <Kpi label="Tim" hint={`${detail.externals.filter(item => !item.end_date).length} kolaborator eksternal aktif`}>{project.member_count} anggota internal</Kpi>
          </div>
        </div>
      )}

      {tab === 'services' && <ServicesTab detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'work' && <WorkTab detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'team' && <TeamTab detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'commercial' && <CommercialTab detail={detail} />}

      {tab === 'activity' && (
        <Card>
          <div className="space-y-5 p-5">
            <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Aktivitas Proyek</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--nexus-muted)]">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="space-y-4">
                {activity.map(entry => (
                  <li key={entry.id} className="flex gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--nexus-cream-soft)] text-[var(--nexus-muted)]">
                      <History className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 border-b border-[var(--nexus-border)] pb-3">
                      <p className="text-sm font-medium text-[var(--nexus-charcoal)]">{entry.title}</p>
                      {entry.detail && <p className="mt-1 border-l-2 border-[var(--nexus-yellow)] pl-3 text-xs leading-5 text-[var(--nexus-muted)]">{entry.detail}</p>}
                      <p className="mt-1 text-[11px] text-[var(--nexus-muted)]">{formatDateTime(entry.at)}{entry.actor ? ` · ${entry.actor}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      )}

      <ReasonDialog
        open={pendingStatus !== null}
        title={`Ubah Status ke ${pendingStatus ? statusLabels[pendingStatus] : ''}`}
        description={pendingStatus === 'paid'
          ? 'Status Lunas hanya dapat dipilih jika data pembayaran resmi menyatakan proyek ini sudah lunas.'
          : `Status proyek akan berubah dari ${statusLabels[project.status_code]} ke ${pendingStatus ? statusLabels[pendingStatus] : ''}.`}
        label="Alasan"
        required={reasonRequired}
        confirmLabel="Ubah Status"
        busy={dialogBusy}
        error={dialogError}
        onCancel={() => { setPendingStatus(null); setDialogError(null); }}
        onConfirm={reason => { if (pendingStatus) void applyStatus(pendingStatus, reason); }}
      />

      <ReasonDialog
        open={cancelling}
        title="Batalkan Proyek"
        description="Proyek tidak dihapus. Klien, layanan, tim, tahapan, deliverable, dan riwayat komersial tetap tersimpan."
        label="Alasan pembatalan"
        required
        confirmLabel="Batalkan Proyek"
        tone="danger"
        busy={dialogBusy}
        error={dialogError}
        onCancel={() => { setCancelling(false); setDialogError(null); }}
        onConfirm={reason => void applyCancel(reason)}
      />
    </div>
  );
}

function InfoBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--nexus-charcoal)]">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-[var(--nexus-muted)]">{detail}</p>}
    </div>
  );
}
