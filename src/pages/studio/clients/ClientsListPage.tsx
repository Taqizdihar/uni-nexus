import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Download, Filter, MapPin, Plus, Search, User, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../lib/utils';
import { studioClientsApi } from '../../../services/api/studio-clients.api';
import type { ClientListFilters, ClientSummary, PaginatedClients } from '../../../types/studio-clients';
import {
  EmptyState, ErrorBanner, Field, Kpi, LoadingState, PartyKindBadge, RelationshipStatusBadge,
  StudioPageHeader, formatDateOnly, partyKindLabels,
} from './components/ClientsUI';

const PAGE_SIZE = 20;

const sortOptions = [
  { value: 'name:asc', label: 'Nama (A-Z)' },
  { value: 'created:desc', label: 'Terbaru' },
  { value: 'last_project:desc', label: 'Proyek Terbaru' },
  { value: 'active_projects:desc', label: 'Proyek Aktif Terbanyak' },
  { value: 'contract_value:desc', label: 'Nilai Kontrak Tertinggi' },
  { value: 'outstanding:desc', label: 'Outstanding Tertinggi' },
];

const emptyFilters = {
  relationship_status: '', party_kind: '', city: '', has_active_project: false, repeat_client: false, has_outstanding: false,
};

export function ClientsListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('studio.clients.write');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filters, setFilters] = React.useState(emptyFilters);
  const [sort, setSort] = React.useState('name:asc');
  const [page, setPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);

  const [result, setResult] = React.useState<PaginatedClients | null>(null);
  const [summary, setSummary] = React.useState<ClientSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    void studioClientsApi.getSummary().then(setSummary).catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Gagal memuat ringkasan klien.'));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [sortBy, sortOrder] = sort.split(':');
      const payload: ClientListFilters = {
        ...filters, page, limit: PAGE_SIZE, search: debouncedSearch || undefined,
        relationship_status: (filters.relationship_status || undefined) as ClientListFilters['relationship_status'],
        sort_by: sortBy, sort_order: sortOrder as 'asc' | 'desc',
      };
      try {
        const clients = await studioClientsApi.getClients(payload);
        if (!cancelled) { setResult(clients); setError(null); }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Gagal memuat daftar klien.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters, page, sort, debouncedSearch]);

  const setFilter = (key: keyof typeof emptyFilters, value: string | boolean) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
  const activeFilterCount = Object.values(filters).filter(value => value !== '' && value !== false).length;
  const clients = result?.items || [];
  const meta = result?.meta;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const [sortBy, sortOrder] = sort.split(':');
      await studioClientsApi.exportClients({ ...filters, search: debouncedSearch || undefined, relationship_status: (filters.relationship_status || undefined) as ClientListFilters['relationship_status'], sort_by: sortBy, sort_order: sortOrder as 'asc' | 'desc' });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal mengekspor data klien.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <StudioPageHeader
        title="Klien"
        description="Kelola identitas, kontak, riwayat proyek, dan hubungan bisnis klien Uni-Inside Studio."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowFilters(current => !current)}><Filter className="h-4 w-4" /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Button>
            <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Mengekspor...' : 'Ekspor CSV'}</Button>
            {canWrite && <Button onClick={() => navigate('/app/studio/clients/new')}><Plus className="h-4 w-4" /> Tambah Klien</Button>}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Klien Aktif">{summary ? summary.active_clients : '—'}</Kpi>
        <Kpi label="Klien dengan Proyek Aktif">{summary ? summary.clients_with_active_project : '—'}</Kpi>
        <Kpi label="Klien Berulang" hint="≥2 proyek yang tidak dibatalkan.">{summary ? summary.repeat_clients : '—'}</Kpi>
        <Kpi label="Proyek Aktif">{summary ? summary.active_projects : '—'}</Kpi>
        <Kpi label="Piutang Studio">{summary ? formatCurrency(summary.outstanding_receivables) : '—'}</Kpi>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Card className="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="studio-input pl-10" placeholder="Cari kode, nama, email, telepon, NPWP, atau kontak..." value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[var(--nexus-muted)]" htmlFor="studio-client-sort">Urutkan</label>
            <select id="studio-client-sort" className="studio-filter-select w-52" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}>
              {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-4 border-b border-[var(--nexus-border)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status hubungan">
              <select className="studio-filter-select" value={filters.relationship_status} onChange={event => setFilter('relationship_status', event.target.value)}>
                <option value="">Semua status</option>
                <option value="active">Aktif</option>
                <option value="role_inactive">Nonaktif sebagai Klien Studio</option>
                <option value="party_inactive">Party Nonaktif</option>
              </select>
            </Field>
            <Field label="Jenis klien">
              <select className="studio-filter-select" value={filters.party_kind} onChange={event => setFilter('party_kind', event.target.value)}>
                <option value="">Semua jenis</option>
                {Object.entries(partyKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Kota"><input className="studio-filter-select" placeholder="Contoh: Jakarta" value={filters.city} onChange={event => setFilter('city', event.target.value)} /></Field>
            <div className="flex flex-wrap items-end gap-4 pb-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)]"><input type="checkbox" checked={filters.has_active_project} onChange={event => setFilter('has_active_project', event.target.checked)} /> Punya proyek aktif</label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)]"><input type="checkbox" checked={filters.repeat_client} onChange={event => setFilter('repeat_client', event.target.checked)} /> Klien berulang</label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)]"><input type="checkbox" checked={filters.has_outstanding} onChange={event => setFilter('has_outstanding', event.target.checked)} /> Ada outstanding</label>
              {activeFilterCount > 0 && (
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--nexus-muted)] hover:text-[var(--nexus-charcoal)]" onClick={() => { setFilters(emptyFilters); setPage(1); }}>
                  <X className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-auto p-4">
          {loading ? <LoadingState /> : clients.length === 0 ? (
            <EmptyState
              title={debouncedSearch || activeFilterCount ? 'Tidak Ada Klien Yang Cocok' : 'Belum Ada Klien'}
              description={debouncedSearch || activeFilterCount
                ? 'Ubah kata kunci atau filter untuk menemukan klien lain.'
                : 'Tambahkan klien pertama untuk mulai menghubungkan proyek dan riwayat bisnis Studio.'}
              action={canWrite && !debouncedSearch && !activeFilterCount ? <Button onClick={() => navigate('/app/studio/clients/new')}><Plus className="h-4 w-4" /> Tambah Klien</Button> : undefined}
            />
          ) : (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="studio-table-head">
                <tr><th>Klien</th><th>Kontak Utama</th><th>Jenis</th><th>Kota</th><th>Proyek Aktif</th><th>Total Proyek</th><th className="text-right">Nilai Kontrak</th><th className="text-right">Outstanding</th><th>Status</th></tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id} className="studio-table-row cursor-pointer" onClick={() => navigate(`/app/studio/clients/${client.id}`)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--nexus-cream-soft)] text-[var(--nexus-muted)]">
                          {client.party_kind === 'individual' ? <User className="h-4 w-4" /> : client.party_kind === 'company' ? <Building2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--nexus-charcoal)]">{client.display_name}{client.repeat_client && <span className="ml-1.5 text-[10px] font-bold text-[var(--nexus-yellow-deep)]">BERULANG</span>}</p>
                          <p className="studio-code">{client.code}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-medium text-[var(--nexus-charcoal)]">{client.primary_contact_name || '-'}</p>
                      <p className="text-xs text-[var(--nexus-muted)]">{client.primary_contact_email || client.primary_contact_phone || '-'}</p>
                    </td>
                    <td><PartyKindBadge value={client.party_kind} /></td>
                    <td>{client.city || '-'}</td>
                    <td>{client.active_project_count}</td>
                    <td>{client.total_project_count}{client.last_project_at && <span className="mt-0.5 block text-[10px] text-[var(--nexus-muted)]">Terakhir {formatDateOnly(client.last_project_at)}</span>}</td>
                    <td className="text-right font-semibold">{formatCurrency(client.committed_contract_value)}</td>
                    <td className="text-right">{client.outstanding_balance > 0 ? <span className="font-semibold text-red-600">{formatCurrency(client.outstanding_balance)}</span> : formatCurrency(0)}</td>
                    <td><RelationshipStatusBadge value={client.relationship_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/40 px-4 py-3 sm:flex-row">
            <p className="text-xs text-[var(--nexus-muted)]">Menampilkan {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} klien</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Sebelumnya</Button>
              <span className="text-xs font-semibold text-[var(--nexus-charcoal)]">Halaman {meta.page} / {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(current => current + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
