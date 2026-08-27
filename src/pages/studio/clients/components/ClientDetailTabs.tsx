import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, History, Plus, Star, Trash2, UserRound } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { formatCurrency } from '../../../../lib/utils';
import { studioClientsApi } from '../../../../services/api/studio-clients.api';
import type {
  ClientActivityEntry, ClientCommercialSummary, ClientContact, ClientDetailResponse, ClientInvoice,
  ClientProjectRow, ClientQuotation, PaginatedClientProjects,
} from '../../../../types/studio-clients';
import { EmptyState, Field, RoleBadge, SectionHeader, formatDateOnly, formatDateTime } from './ClientsUI';

interface TabProps {
  clientId: number;
  detail: ClientDetailResponse;
  canWrite: boolean;
  reload: () => Promise<void>;
  onError: (message: string) => void;
}

const run = async (action: () => Promise<unknown>, reload: () => Promise<void>, onError: (message: string) => void, setBusy: (busy: boolean) => void) => {
  setBusy(true);
  try { await action(); await reload(); }
  catch (error) { onError(error instanceof Error ? error.message : 'Aksi gagal dijalankan.'); }
  finally { setBusy(false); }
};

const projectStatusLabels: Record<string, string> = {
  lead: 'Prospek', quotation: 'Penawaran', approved: 'Disetujui', in_progress: 'Sedang Dikerjakan',
  review: 'Tinjauan', completed: 'Selesai', paid: 'Lunas', cancelled: 'Dibatalkan',
};

/** Identity, other UNI-NEXUS roles, primary contact, and derived business summary — all real data. */
export function SummaryTab({ detail }: TabProps) {
  const { client } = detail;
  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBlock label="Jenis" value={client.party_kind === 'individual' ? 'Perorangan' : client.party_kind === 'company' ? 'Perusahaan' : 'Institusi'} />
          <InfoBlock label="Nama Legal" value={client.legal_name || '-'} />
          <InfoBlock label="Email" value={client.email || '-'} />
          <InfoBlock label="Telepon" value={client.phone || '-'} />
          <InfoBlock label="Website" value={client.website || '-'} link={client.website || undefined} />
          <InfoBlock label="NPWP / Tax ID" value={client.tax_id || '-'} />
          <InfoBlock
            label="Alamat"
            value={[client.address_line1, client.address_line2, client.city, client.province, client.postal_code].filter(Boolean).join(', ') || 'Alamat belum diisi'}
          />
          <InfoBlock label="Klien sejak" value={formatDateOnly(client.relationship_since)} />
          <InfoBlock label="Dibuat" value={formatDateTime(client.created_at)} />
        </div>
      </Card>

      <Card>
        <div className="space-y-3 p-5">
          <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Peran pada UNI-NEXUS</h2>
          <div className="flex flex-wrap gap-1.5">
            {detail.other_roles.map(role => <span key={role.role_code}><RoleBadge label={role.label} isPrimary={role.role_code === 'studio_client'} /></span>)}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="space-y-3 p-5">
            <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Kontak Utama</h2>
            {detail.primary_contact ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--nexus-cream-soft)] text-[var(--nexus-muted)]"><UserRound className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--nexus-charcoal)]">{detail.primary_contact.full_name}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">{detail.primary_contact.job_title || 'Tidak ada jabatan'}</p>
                  <p className="mt-1 text-xs text-[var(--nexus-muted)]">{detail.primary_contact.email || '-'} · {detail.primary_contact.phone || detail.primary_contact.whatsapp || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--nexus-muted)]">Belum ada kontak utama. {detail.contact_count === 0 ? 'Belum ada kontak sama sekali.' : ''}</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="space-y-3 p-5">
            <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Ringkasan Bisnis</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Total Proyek" value={String(detail.project_summary.total_projects)} />
              <Row label="Proyek Aktif" value={String(detail.project_summary.active_projects)} />
              <Row label="Proyek Selesai" value={String(detail.project_summary.completed_projects)} />
              <Row label="Proyek Dibatalkan" value={String(detail.project_summary.cancelled_projects)} />
              <Row label="Klien Berulang" value={detail.project_summary.repeat_client ? 'Ya' : 'Belum'} />
              <Row label="Proyek Terakhir" value={formatDateOnly(detail.project_summary.last_project_at)} />
            </dl>
          </div>
        </Card>
      </div>

      {client.notes && (
        <Card><div className="space-y-2 p-5"><h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Catatan</h2><p className="whitespace-pre-wrap text-sm leading-6 text-[var(--nexus-muted)]">{client.notes}</p></div></Card>
      )}
    </div>
  );
}

function InfoBlock({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 font-semibold text-[var(--nexus-yellow-deep)] hover:underline">{value} <ExternalLink className="h-3 w-3" /></a>
      ) : (
        <p className="mt-1 font-semibold text-[var(--nexus-charcoal)]">{value}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-[var(--nexus-muted)]">{label}</dt><dd className="font-semibold text-[var(--nexus-charcoal)]">{value}</dd></div>;
}

/** PIC / Contact Person management with server-enforced single-primary semantics. */
export function ContactsTab({ clientId, canWrite, reload, onError }: TabProps) {
  const [contacts, setContacts] = React.useState<ClientContact[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [draft, setDraft] = React.useState({ full_name: '', job_title: '', email: '', phone: '', whatsapp: '', notes: '', is_primary: false });
  const [pendingDelete, setPendingDelete] = React.useState<ClientContact | null>(null);

  const loadContacts = React.useCallback(async () => setContacts(await studioClientsApi.getContacts(clientId)), [clientId]);
  React.useEffect(() => { void loadContacts(); }, [loadContacts]);

  const reloadBoth = async () => { await Promise.all([loadContacts(), reload()]); };

  if (!contacts) return <Card><div className="p-8 text-center text-sm text-[var(--nexus-muted)]">Memuat kontak...</div></Card>;

  return (
    <Card>
      <div className="space-y-5 p-5">
        <SectionHeader
          title="Kontak"
          description="Hanya satu kontak yang dapat menjadi kontak utama pada satu waktu."
          action={canWrite ? <Button size="sm" variant="outline" onClick={() => setShowForm(current => !current)}><Plus className="h-4 w-4" /> Tambah Kontak</Button> : undefined}
        />

        {showForm && canWrite && (
          <div className="grid gap-4 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4 md:grid-cols-2">
            <Field label="Nama kontak" required><input className="studio-input" value={draft.full_name} onChange={event => setDraft(current => ({ ...current, full_name: event.target.value }))} /></Field>
            <Field label="Jabatan"><input className="studio-input" value={draft.job_title} onChange={event => setDraft(current => ({ ...current, job_title: event.target.value }))} /></Field>
            <Field label="Email"><input type="email" className="studio-input" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} /></Field>
            <Field label="Telepon"><input className="studio-input" value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} /></Field>
            <Field label="WhatsApp"><input className="studio-input" value={draft.whatsapp} onChange={event => setDraft(current => ({ ...current, whatsapp: event.target.value }))} /></Field>
            <Field label="Catatan"><input className="studio-input" value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></Field>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--nexus-charcoal)] md:col-span-2"><input type="checkbox" checked={draft.is_primary} onChange={event => setDraft(current => ({ ...current, is_primary: event.target.checked }))} /> Jadikan kontak utama</label>
            <div className="flex gap-2 md:col-span-2">
              <Button size="sm" disabled={busy || !draft.full_name.trim()} onClick={() => void run(async () => {
                await studioClientsApi.createContact(clientId, {
                  full_name: draft.full_name.trim(), job_title: draft.job_title.trim() || null, email: draft.email.trim() || null,
                  phone: draft.phone.trim() || null, whatsapp: draft.whatsapp.trim() || null, is_primary: draft.is_primary, notes: draft.notes.trim() || null,
                });
                setDraft({ full_name: '', job_title: '', email: '', phone: '', whatsapp: '', notes: '', is_primary: false });
                setShowForm(false);
              }, reloadBoth, onError, setBusy)}>Simpan</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)} disabled={busy}>Batal</Button>
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <EmptyState title="Belum Ada Kontak" description="Tambahkan PIC atau contact person untuk klien ini." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map(contact => (
              <div key={contact.id} className="rounded-lg border border-[var(--nexus-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-[var(--nexus-charcoal)]">{contact.full_name}{contact.is_primary && <Badge variant="info">Utama</Badge>}</p>
                    <p className="text-xs text-[var(--nexus-muted)]">{contact.job_title || 'Tidak ada jabatan'}</p>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 items-center gap-1">
                      {!contact.is_primary && (
                        <button type="button" className="rounded-md p-1.5 text-[var(--nexus-muted)] hover:bg-[var(--nexus-cream-soft)] hover:text-[var(--nexus-yellow-deep)]" title="Jadikan kontak utama" disabled={busy}
                          onClick={() => void run(() => studioClientsApi.updateContact(clientId, contact.id, { is_primary: true }), reloadBoth, onError, setBusy)}>
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title="Hapus kontak" disabled={busy} onClick={() => setPendingDelete(contact)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <dl className="mt-3 space-y-1 text-xs text-[var(--nexus-muted)]">
                  <div>Email: {contact.email || '-'}</div>
                  <div>Telepon: {contact.phone || '-'}</div>
                  <div>WhatsApp: {contact.whatsapp || '-'}</div>
                  {contact.notes && <div>Catatan: {contact.notes}</div>}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-xl border border-[var(--nexus-border)] bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">Hapus Kontak</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">
              Hapus kontak "{pendingDelete.full_name}"?
              {pendingDelete.is_primary ? ' Kontak lain yang tersisa akan otomatis dipromosikan menjadi kontak utama.' : ''}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={busy}>Batal</Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700" disabled={busy}
                onClick={() => { const contact = pendingDelete; setPendingDelete(null); void run(() => studioClientsApi.deleteContact(clientId, contact.id), reloadBoth, onError, setBusy); }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Project history for this client with All / Active / Completed / Cancelled filters. */
export function ProjectsTab({ clientId }: TabProps) {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [result, setResult] = React.useState<PaginatedClientProjects | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void studioClientsApi.getProjects(clientId, status, 1, 20).then(response => { if (!cancelled) setResult(response); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, status]);

  const tabs: Array<{ key: typeof status; label: string }> = [
    { key: 'all', label: 'Semua' }, { key: 'active', label: 'Aktif' }, { key: 'completed', label: 'Selesai' }, { key: 'cancelled', label: 'Dibatalkan' },
  ];

  return (
    <Card>
      <div className="space-y-5 p-5">
        <div className="flex gap-1 rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] p-1">
          {tabs.map(tab => <button key={tab.key} type="button" className={`studio-tab${status === tab.key ? ' is-active' : ''}`} onClick={() => setStatus(tab.key)}>{tab.label}</button>)}
        </div>

        {loading ? <div className="py-10 text-center text-sm text-[var(--nexus-muted)]">Memuat proyek...</div>
          : !result || result.items.length === 0 ? <EmptyState title="Belum Ada Proyek" description="Proyek klien ini akan muncul di sini setelah dibuat." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="studio-table-head"><tr><th>Kode</th><th>Nama Proyek</th><th>Tipe</th><th>Status</th><th>Prioritas</th><th>Mulai</th><th>Deadline</th><th>PM</th><th className="text-right">Nilai Kontrak</th></tr></thead>
                <tbody>
                  {result.items.map((project: ClientProjectRow) => (
                    <tr key={project.id} className="studio-table-row cursor-pointer" onClick={() => navigate(`/app/studio/projects/${project.id}`)}>
                      <td className="studio-code">{project.project_code}</td>
                      <td className="max-w-56 truncate font-medium text-[var(--nexus-charcoal)]">{project.project_name}</td>
                      <td>{project.project_type || '-'}</td>
                      <td><Badge variant={project.status_code === 'cancelled' ? 'error' : ['completed', 'paid'].includes(project.status_code) ? 'success' : 'info'}>{projectStatusLabels[project.status_code] || project.status_code}</Badge></td>
                      <td className="capitalize">{project.priority_code}</td>
                      <td>{formatDateOnly(project.start_date)}</td>
                      <td>{formatDateOnly(project.deadline_at)}</td>
                      <td className="max-w-32 truncate">{project.manager_name || '-'}</td>
                      <td className="text-right font-semibold">{formatCurrency(project.contract_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </Card>
  );
}

/** Read-only commercial view: existing quotations/invoices only, never authored here. */
export function CommercialTab({ clientId }: TabProps) {
  const [summary, setSummary] = React.useState<ClientCommercialSummary | null>(null);
  const [quotations, setQuotations] = React.useState<ClientQuotation[] | null>(null);
  const [invoices, setInvoices] = React.useState<ClientInvoice[] | null>(null);

  React.useEffect(() => {
    void studioClientsApi.getCommercialSummary(clientId).then(setSummary);
    void studioClientsApi.getQuotations(clientId).then(setQuotations);
    void studioClientsApi.getInvoices(clientId).then(setInvoices);
  }, [clientId]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MoneyTile label="Nilai Kontrak Komitmen" value={summary ? formatCurrency(summary.committed_contract_value) : '—'} hint="Approved/dikerjakan/tinjauan/selesai/lunas." />
        <MoneyTile label="Pipeline" value={summary ? formatCurrency(summary.pipeline_value) : '—'} hint="Prospek & penawaran." />
        <MoneyTile label="Total Ditagih" value={summary ? formatCurrency(summary.total_invoiced) : '—'} hint={summary ? `${summary.invoice_count} invoice.` : ''} />
        <MoneyTile label="Total Terbayar" value={summary ? formatCurrency(summary.total_paid) : '—'} hint="Dari data invoice." />
        <MoneyTile label="Outstanding" value={summary ? formatCurrency(summary.outstanding) : '—'} hint={summary ? `${summary.active_quotation_count} penawaran aktif.` : ''} />
      </div>

      <Card>
        <div className="space-y-4 p-5">
          <SectionHeader title="Penawaran" description="Dikelola oleh modul Penawaran & Penagihan." />
          {!quotations ? <p className="text-sm text-[var(--nexus-muted)]">Memuat...</p> : quotations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/60 p-4 text-sm text-[var(--nexus-muted)]">Belum Ada Penawaran</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="studio-table-head"><tr><th>Nomor</th><th>Proyek</th><th>Terbit</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {quotations.map(quotation => (
                  <tr key={quotation.id} className="studio-table-row">
                    <td className="studio-code">{quotation.quotation_number}</td>
                    <td>{quotation.project_code || '-'}</td>
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
          {!invoices ? <p className="text-sm text-[var(--nexus-muted)]">Memuat...</p> : invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/60 p-4 text-sm text-[var(--nexus-muted)]">Belum Ada Invoice</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="studio-table-head"><tr><th>Nomor</th><th>Proyek</th><th>Terbit</th><th>Jatuh Tempo</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Terbayar</th><th className="text-right">Sisa</th></tr></thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="studio-table-row">
                    <td className="studio-code">{invoice.invoice_number}</td>
                    <td>{invoice.project_code || '-'}</td>
                    <td>{formatDateOnly(invoice.issue_date)}</td>
                    <td>{formatDateOnly(invoice.due_date)}</td>
                    <td><Badge variant={invoice.status_code === 'paid' ? 'success' : invoice.status_code === 'void' ? 'error' : 'outline'}>{invoice.status_code}</Badge></td>
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

/** Client audit trail merged with project status history — nothing fabricated. */
export function ActivityTab({ clientId }: TabProps) {
  const [activity, setActivity] = React.useState<ClientActivityEntry[] | null>(null);

  React.useEffect(() => { void studioClientsApi.getActivity(clientId).then(setActivity); }, [clientId]);

  return (
    <Card>
      <div className="space-y-5 p-5">
        <h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">Aktivitas Klien</h2>
        {!activity ? <p className="text-sm text-[var(--nexus-muted)]">Memuat...</p> : activity.length === 0 ? (
          <p className="text-sm text-[var(--nexus-muted)]">Belum ada aktivitas tercatat.</p>
        ) : (
          <ol className="space-y-4">
            {activity.map(entry => (
              <li key={entry.id} className="flex gap-3">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--nexus-cream-soft)] text-[var(--nexus-muted)]"><History className="h-3.5 w-3.5" /></span>
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
  );
}
