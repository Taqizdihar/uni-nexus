import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldAlert, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  ACCOUNT_STATUS_LABELS,
  ROLE_LABELS,
  type AccountStatus,
  type AllowedAccountActions,
  type ExecutiveSlot,
  type RoleCode,
} from '@uni-nexus/shared';
import { ApiError, api, body, message, type Envelope, type Page } from '../lib/api';
import { SafeImage } from '../components/safe-image';
import { EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';

import { AccountActionModal } from '../components/account-action-modal';
import { accountActionMessage, formatAccountDate } from '../lib/account-lifecycle';
import { DeactivationRequests, type RequestPage } from './deactivation-requests';

type Account = {
  allowed_actions: AllowedAccountActions;
  roles: RoleCode[];
  photo_url: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  reactivated_at: string | null;
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  bio: string | null;
  account_status: AccountStatus;
  presence_status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  approved_by: { id: string; full_name: string } | null;
  rejected_by: { id: string; full_name: string } | null;
};
type RoleRef = { id: string; code: string; name: string };
type WorkspaceRef = { id: string; name: string; code: string };
type Reference = { roles: RoleRef[]; executive_slots: ExecutiveSlot[]; workspaces: WorkspaceRef[] };
type Summary = { PENDING: number; ACTIVE: number; REJECTED: number; SUSPENDED: number };

const tabs = [
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'REJECTED', label: 'Ditolak' },
  { key: 'SUSPENDED', label: 'Nonaktif' },
  { key: 'ALL', label: 'Semua' },
  { key: 'REQUESTS', label: 'Permintaan Penghapusan' },
] as const;

const statusTone: Record<Account['account_status'], string> = { PENDING: 'amber', ACTIVE: 'green', REJECTED: 'red', SUSPENDED: 'amber' };
const statusLabel = ACCOUNT_STATUS_LABELS;
function AccountStatusBadge({ status }: { status: Account['account_status'] }) {
  return <span className={`badge ${statusTone[status]}`}><span className="badge-dot" />{statusLabel[status]}</span>;
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function AccountAvatar({ account, large }: { account: Account; large?: boolean }) {
  return (
    <span className={`avatar${large ? ' lg' : ''}`}>
      <SafeImage source={account.photo_url} alt="" fallback={initials(account.full_name)} />
    </span>
  );
}

function ExecutiveSlotSummary({ slots }: { slots: ExecutiveSlot[] }) {
  return (
    <div className="executive-slot-summary">
      <span className="executive-slot-summary-label">Jabatan Eksekutif</span>
      {slots.map((slot) => (
        <span key={slot.code} className={`executive-slot-chip ${slot.status === 'OCCUPIED' ? 'occupied' : 'vacant'}`}>
          {slot.code} <em>{slot.status === 'OCCUPIED' ? 'Terisi' : 'Kosong'}</em>
        </span>
      ))}
    </div>
  );
}

function ApproveModal({ account, reference, onClose }: { account: Account; reference: Reference; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [roleCode, setRoleCode] = useState('');
  const [workspaceId, setWorkspaceId] = useState(reference.workspaces[0]?.id ?? '');
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['user-management'] }),
      client.invalidateQueries({ queryKey: ['user-management-summary'] }),
      client.invalidateQueries({ queryKey: ['user-management-reference'] }),
    ]);
  const mutation = useMutation({
    mutationFn: () => api(`/user-management/${account.id}/approve`, { method: 'POST', body: body({ role_code: roleCode, workspace_id: workspaceId }) }),
    onSuccess: async () => {
      await invalidate();
      toast(`${account.full_name} disetujui.`);
      onClose();
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.code === 'EXECUTIVE_ROLE_OCCUPIED') {
        const occupiedCode = (error.details as { role_code?: RoleCode } | undefined)?.role_code;
        toast(`Jabatan ${occupiedCode ? ROLE_LABELS[occupiedCode] : 'ini'} baru saja terisi oleh anggota lain. Pilih jabatan lain.`, true);
        setRoleCode('');
        await client.invalidateQueries({ queryKey: ['user-management-reference'] });
        return;
      }
      toast(message(error), true);
    },
  });
  return (
    <AccountActionModal
      title="Setujui Akun"
      confirmLabel="Setujui Akun"
      confirmTone="primary"
      confirmDisabled={!roleCode || !workspaceId}
      busy={mutation.isPending}
      showReason={false}
      wide
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
    >
      <div className="approve-identity">
        <AccountAvatar account={account} large />
        <div>
          <strong>{account.full_name}</strong>
          <p>@{account.username} · {account.email}{account.phone ? ` · ${account.phone}` : ''}</p>
          <p>Mendaftar {formatAccountDate(account.created_at)}</p>
        </div>
      </div>
      <label className="field">
        <span>Jabatan</span>
        <select value={roleCode} onChange={(event) => setRoleCode(event.target.value)} aria-label="Jabatan">
          <option value="">Pilih Jabatan…</option>
          {reference.roles.map((role) => (
            <option value={role.code} key={role.id}>{ROLE_LABELS[role.code as RoleCode] ?? role.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Workspace</span>
        <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} aria-label="Workspace">
          {reference.workspaces.map((workspace) => (
            <option value={workspace.id} key={workspace.id}>{workspace.name}</option>
          ))}
        </select>
      </label>
    </AccountActionModal>
  );
}

function ApproveButton({ account, reference }: { account: Account; reference: Reference }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button primary small" type="button" onClick={() => setOpen(true)}>
        <UserCheck size={14} />Setujui
      </button>
      {open && <ApproveModal account={account} reference={reference} onClose={() => setOpen(false)} />}
    </>
  );
}

function RejectButton({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (reason: string) => api(`/user-management/${account.id}/reject`, { method: 'POST', body: body({ reason }) }),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['user-management'] }),
        client.invalidateQueries({ queryKey: ['user-management-summary'] }),
      ]);
      toast(`${account.full_name} ditolak.`);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <>
      <button className="button danger small" type="button" onClick={() => { mutation.reset(); setOpen(true); }}>
        <UserX size={14} />Tolak
      </button>
      {open && (
        <AccountActionModal
          title="Tolak Permintaan Akun"
          confirmLabel="Tolak Registrasi"
          busy={mutation.isPending}
          reasonLabel="Alasan penolakan"
          minimumReason={1}
          error={mutation.isError ? message(mutation.error) : undefined}
          onClose={() => setOpen(false)}
          onConfirm={(reason) => mutation.mutate(reason)}
        >
          <p>Pendaftaran akun <strong>{account.full_name}</strong> akan ditolak. Alasan ini akan dicatat pada akun tersebut.</p>
        </AccountActionModal>
      )}
    </>
  );
}

function LifecycleButton({ account, action, label }: { account: Account; action: 'deactivate' | 'reactivate'; label: string }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient(), toast = useToast();
  const mutation = useMutation({
    mutationFn: (reason: string) => api(`/user-management/${account.id}/${action}`, { method: 'POST', body: body(action === 'deactivate' ? { reason } : { note: reason }) }),
    onSuccess: async () => {
      setOpen(false);
      toast(`${account.full_name}: ${action === 'deactivate' ? 'Nonaktif' : 'diaktifkan kembali'}.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['user-management'] }),
        client.invalidateQueries({ queryKey: ['user-management-summary'] }),
        client.invalidateQueries({ queryKey: ['deactivation-requests'] }),
      ]);
    },
    onError: (error) => { toast(accountActionMessage(error), true); void client.invalidateQueries({ queryKey: ['user-management'] }); },
  });
  return <>
    <button className={`button ${action === 'deactivate' ? 'danger' : 'primary'} small`} type="button" onClick={() => { mutation.reset(); setOpen(true); }}><ShieldAlert size={14} />{label}</button>
    {open && <AccountActionModal title={`${label}: ${account.full_name}`} confirmLabel={label} busy={mutation.isPending}
      confirmTone={action === 'deactivate' ? 'danger' : 'primary'}
      reasonLabel={action === 'deactivate' ? 'Alasan penonaktifan' : 'Catatan (opsional)'} minimumReason={action === 'deactivate' ? 10 : 0}
      error={mutation.isError ? accountActionMessage(mutation.error) : undefined} onClose={() => setOpen(false)} onConfirm={(reason) => mutation.mutate(reason)}>
      <p>{action === 'deactivate' ? 'Menonaktifkan akun akan mencegah pengguna masuk dan menggunakan UNI-NEXUS. Data akun, role, histori, dan membership tidak akan dihapus.' : 'Mengaktifkan kembali akun akan memulihkan akses UNI-NEXUS dengan role dan membership yang sudah tersimpan.'}</p>
    </AccountActionModal>}
  </>;
}

/**
 * Only the actions actually rendered in this table decide "Dilindungi" — deactivation-request
 * flags belong to the separate Permintaan Penghapusan workflow and must not count here, or a
 * protected account like the real CTO would show no row action yet also fail to show the badge.
 */
function isAccountLocked(account: Account) {
  const { approve_registration, reject_registration, deactivate, reactivate } = account.allowed_actions;
  return !(approve_registration || reject_registration || deactivate || reactivate);
}

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const requested = searchParams.get('tab') || 'PENDING';
  const tab = tabs.some((item) => item.key === requested) ? requested : 'PENDING';
  const requests = useQuery({ queryKey: ['deactivation-requests', 'count'], queryFn: () => api<RequestPage>('/user-management/deactivation-requests?status=PENDING&pageSize=1'), refetchInterval: 30000 });
  const summary = useQuery({
    queryKey: ['user-management-summary'],
    queryFn: async () => (await api<Envelope<Summary>>('/user-management/summary')).data,
  });
  const reference = useQuery({
    queryKey: ['user-management-reference'],
    queryFn: async () => (await api<Envelope<Reference>>('/user-management/reference')).data,
  });
  const list = useQuery({
    queryKey: ['user-management', tab, search],
    enabled: tab !== 'REQUESTS',
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== 'ALL') params.set('status', tab);
      if (search) params.set('search', search);
      return await api<Page<Account>>(`/user-management?${params.toString()}`);
    },
  });
  return (
    <>
      <PageHeader eyebrow="AKUN INTERNAL" title="Manajemen Pengguna" description="Tinjau, setujui, atau tolak akun yang meminta akses ke UNI-NEXUS." />
      {reference.data && <ExecutiveSlotSummary slots={reference.data.executive_slots} />}
      {summary.data && (
        <div className="summary-cards">
          <div className="summary-card"><strong>{summary.data.PENDING}</strong><span>Menunggu</span></div>
          <div className="summary-card active"><strong>{summary.data.ACTIVE}</strong><span>Aktif</span></div>
          <div className="summary-card rejected"><strong>{summary.data.REJECTED}</strong><span>Ditolak</span></div>
          <div className="summary-card suspended"><strong>{summary.data.SUSPENDED}</strong><span>Nonaktif</span></div>
        </div>
      )}
      <nav className="section-tabs" aria-label="Status akun">
        {tabs.map((item) => (
          <button key={item.key} className={tab === item.key ? 'selected' : ''} onClick={() => setSearchParams(item.key === 'PENDING' ? {} : { tab: item.key })}>
            {item.label}{item.key === 'REQUESTS' && requests.data && <span className="badge amber" style={{ marginLeft: 8 }}>{requests.data.pending_count}</span>}
          </button>
        ))}
      </nav>
      {requests.isError && <ErrorState error={requests.error} retry={() => void requests.refetch()} />}
      {tab === 'REQUESTS' ? <DeactivationRequests /> : (
        <div className="resource-table panel">
          <div className="table-toolbar">
            <div className="search-field">
              <Search size={16} />
              <input placeholder="Cari berdasarkan nama, username, atau email" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari akun" />
            </div>
            {list.data && <span className="record-count">{list.data.meta.total} akun</span>}
          </div>
          {list.isPending || reference.isPending ? (
            <Spinner label="Memuat akun…" />
          ) : list.isError ? (
            <ErrorState error={list.error} retry={() => void list.refetch()} />
          ) : reference.isError ? (
            <ErrorState error={reference.error} retry={() => void reference.refetch()} />
          ) : !list.data.data.length ? (
            <EmptyState title="Tidak ada akun di sini" description="Tidak ada yang cocok dengan filter ini saat ini." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Anggota</th><th>Username</th><th>Email</th><th>Telepon</th><th>Mendaftar</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {list.data.data.map((account) => (
                    <tr key={account.id}>
                      <td className="primary-cell">
                        <div className="account-cell">
                          <AccountAvatar account={account} large />
                          <div>
                            <strong>{account.full_name}</strong>
                            {account.roles.length > 0 && <small>{account.roles.map((role) => ROLE_LABELS[role]).join(', ')}</small>}
                          </div>
                        </div>
                      </td>
                      <td>@{account.username}</td>
                      <td>{account.email}</td>
                      <td>{account.phone || '—'}</td>
                      <td>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(account.created_at))}</td>
                      <td><AccountStatusBadge status={account.account_status} />{account.deactivated_at && <p className="helper-note">Dinonaktifkan: {formatAccountDate(account.deactivated_at)}<br />{account.deactivation_reason}</p>}{account.reactivated_at && <p className="helper-note">Diaktifkan: {formatAccountDate(account.reactivated_at)}</p>}</td>
                      <td>
                        <div className="button-row">
                          {account.allowed_actions.approve_registration && reference.data && <ApproveButton account={account} reference={reference.data} />}
                          {account.allowed_actions.reject_registration && <RejectButton account={account} />}
                          {account.allowed_actions.deactivate && <LifecycleButton account={account} action="deactivate" label="Nonaktifkan" />}
                          {account.allowed_actions.reactivate && <LifecycleButton account={account} action="reactivate" label="Aktifkan Kembali" />}
                        </div>
                        {isAccountLocked(account) && account.account_status !== 'REJECTED' && (
                          <span className="protected-indicator"><ShieldCheck size={14} />Dilindungi</span>
                        )}
                        {account.account_status === 'REJECTED' && account.rejection_reason && (
                          <span className="helper-note">Alasan: {account.rejection_reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
