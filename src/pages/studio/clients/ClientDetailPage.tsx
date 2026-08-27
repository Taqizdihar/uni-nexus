import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Pencil, Plus, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioClientsApi } from '../../../services/api/studio-clients.api';
import type { ClientDetailResponse } from '../../../types/studio-clients';
import { ActivityTab, CommercialTab, ContactsTab, ProjectsTab, SummaryTab } from './components/ClientDetailTabs';
import {
  ErrorBanner, Kpi, LoadingState, PartyKindBadge, ReasonDialog, RelationshipStatusBadge, StudioPageHeader,
} from './components/ClientsUI';

type TabKey = 'summary' | 'contacts' | 'projects' | 'commercial' | 'activity';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'summary', label: 'Ringkasan' },
  { key: 'contacts', label: 'Kontak' },
  { key: 'projects', label: 'Proyek' },
  { key: 'commercial', label: 'Komersial' },
  { key: 'activity', label: 'Aktivitas' },
];

export function ClientDetailPage() {
  const navigate = useNavigate();
  const clientId = Number(useParams().id);
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('studio.clients.write');
  const canCreateProject = hasPermission('studio.projects.write');

  const [detail, setDetail] = React.useState<ClientDetailResponse | null>(null);
  const [tab, setTab] = React.useState<TabKey>('summary');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deactivating, setDeactivating] = React.useState(false);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [activating, setActivating] = React.useState(false);

  const load = React.useCallback(async () => setDetail(await studioClientsApi.getClient(clientId)), [clientId]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); }
      catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memuat klien.'); }
      finally { setLoading(false); }
    })();
  }, [load]);

  if (loading) return <LoadingState label="Memuat profil klien..." />;
  if (!detail) return <ErrorBanner message={error || 'Klien tidak ditemukan.'} />;

  const { client } = detail;
  const isActive = client.relationship_status === 'active';
  const canReactivate = client.relationship_status === 'role_inactive';

  const activate = async () => {
    setActivating(true);
    setError(null);
    try { await studioClientsApi.activateClient(clientId); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal mengaktifkan klien.'); }
    finally { setActivating(false); }
  };

  const deactivate = async (reason: string, confirmActiveProjects = false) => {
    setDialogBusy(true);
    setDialogError(null);
    try {
      await studioClientsApi.deactivateClient(clientId, reason || null, confirmActiveProjects);
      setDeactivating(false);
      await load();
    } catch (requestError) {
      if (requestError instanceof Error && (requestError as any).code === 'STUDIO_CLIENT_HAS_ACTIVE_PROJECTS') {
        setDialogError(`${requestError.message} Klik "Nonaktifkan Klien" sekali lagi untuk melanjutkan.`);
        // Second confirmation retries with confirm_active_projects=true.
        setDialogBusy(false);
        return;
      }
      setDialogError(requestError instanceof Error ? requestError.message : 'Gagal menonaktifkan klien.');
      setDialogBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        eyebrow={client.code}
        title={client.display_name}
        description={client.legal_name || (client.email && client.phone ? `${client.email} · ${client.phone}` : client.email || client.phone || 'Belum ada kontak umum')}
        back={() => navigate('/app/studio/clients')}
        actions={
          <>
            {canCreateProject && isActive && (
              <Button onClick={() => navigate(`/app/studio/projects/new?client=${clientId}`)}><Plus className="h-4 w-4" /> Proyek Baru</Button>
            )}
            {canWrite && <Button variant="outline" onClick={() => navigate(`/app/studio/clients/${clientId}/edit`)}><Pencil className="h-4 w-4" /> Edit Klien</Button>}
            {canWrite && isActive && (
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => { setDialogError(null); setDeactivating(true); }}>
                <XCircle className="h-4 w-4" /> Nonaktifkan
              </Button>
            )}
            {canWrite && canReactivate && (
              <Button variant="outline" onClick={() => void activate()} disabled={activating}>
                <CheckCircle2 className="h-4 w-4" /> {activating ? 'Mengaktifkan...' : 'Aktifkan'}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RelationshipStatusBadge value={client.relationship_status} />
        <PartyKindBadge value={client.party_kind} />
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Proyek" hint={`${detail.project_summary.active_projects} sedang aktif`}>{detail.project_summary.total_projects}</Kpi>
        <Kpi label="Nilai Kontrak Komitmen" hint="Approved ke atas.">{formatCurrency(detail.project_summary.committed_contract_value)}</Kpi>
        <Kpi label="Pipeline" hint="Prospek & penawaran.">{formatCurrency(detail.project_summary.pipeline_value)}</Kpi>
        <Kpi label="Kontak" hint={detail.primary_contact ? `Utama: ${detail.primary_contact.full_name}` : 'Belum ada kontak utama'}>{detail.contact_count} kontak</Kpi>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-1">
        {tabs.map(item => (
          <button key={item.key} type="button" className={`studio-tab${tab === item.key ? ' is-active' : ''}`} onClick={() => setTab(item.key)} aria-pressed={tab === item.key}>{item.label}</button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab clientId={clientId} detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'contacts' && <ContactsTab clientId={clientId} detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'projects' && <ProjectsTab clientId={clientId} detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'commercial' && <CommercialTab clientId={clientId} detail={detail} canWrite={canWrite} reload={load} onError={setError} />}
      {tab === 'activity' && <ActivityTab clientId={clientId} detail={detail} canWrite={canWrite} reload={load} onError={setError} />}

      <ReasonDialog
        open={deactivating}
        title="Nonaktifkan Klien Studio"
        description={
          detail.project_summary.active_projects > 0
            ? `Klien ini masih memiliki ${detail.project_summary.active_projects} proyek aktif. Proyek, kontak, dan riwayat komersial tetap tersimpan — hanya hubungan Klien Studio yang dinonaktifkan.`
            : 'Party, kontak, dan seluruh riwayat proyek/komersial tetap tersimpan — hanya hubungan Klien Studio yang dinonaktifkan.'
        }
        confirmLabel={dialogError ? 'Konfirmasi Tetap Nonaktifkan' : 'Nonaktifkan Klien'}
        tone="danger"
        busy={dialogBusy}
        error={dialogError}
        onCancel={() => { setDeactivating(false); setDialogError(null); }}
        onConfirm={reason => void deactivate(reason, Boolean(dialogError))}
      />
    </div>
  );
}
