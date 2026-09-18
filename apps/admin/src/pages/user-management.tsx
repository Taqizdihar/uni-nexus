import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Search, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS, type AccountStatus, type AllowedAccountActions, type RoleCode } from '@uni-nexus/shared';
import { api, body, message, type Envelope, type Page } from '../lib/api';
import { EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';

import { AccountActionModal } from '../components/account-action-modal';
import { accountActionMessage, formatAccountDate } from '../lib/account-lifecycle';
import { DeactivationRequests, type RequestPage } from './deactivation-requests';

type Account = {
  allowed_actions: AllowedAccountActions;
  roles: RoleCode[];
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
type Reference = { roles: RoleRef[]; workspaces: WorkspaceRef[] };
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

function ApproveRow({ account, reference }: { account: Account; reference: Reference }) {
  const client = useQueryClient();
  const toast = useToast();
  const [roleId, setRoleId] = useState('');
  const [workspaceId, setWorkspaceId] = useState(reference.workspaces[0]?.id ?? '');
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['user-management'] }),
      client.invalidateQueries({ queryKey: ['user-management-summary'] }),
    ]);
  const mutation = useMutation({
    mutationFn: () => {
      const role = reference.roles.find((item) => item.id === roleId);
      return api(`/user-management/${account.id}/approve`, {
        method: 'POST',
        body: body({ role_code: role?.code, workspace_id: workspaceId }),
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast(`${account.full_name} disetujui.`);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="button-row" style={{ marginTop: 10 }}>
      <select value={roleId} onChange={(event) => setRoleId(event.target.value)} aria-label="Jabatan">
        <option value="">Pilih Jabatan…</option>
        {reference.roles.map((role) => (
          <option value={role.id} key={role.id}>{ROLE_LABELS[role.code as RoleCode] ?? role.name}</option>
        ))}
      </select>
      <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} aria-label="Workspace">
        {reference.workspaces.map((workspace) => (
          <option value={workspace.id} key={workspace.id}>{workspace.name}</option>
        ))}
      </select>
      <button
        className="button primary small"
        type="button"
        disabled={!roleId || !workspaceId || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <LoaderCircle className="spin" size={14} /> : <UserCheck size={14} />}Setujui
      </button>
    </div>
  );
}

function RejectRow({ account }: { account: Account }) {
  const client = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api(`/user-management/${account.id}/reject`, { method: 'POST', body: body({ reason }) }),
    onSuccess: async () => {
      setConfirmOpen(false);
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
    <div className="button-row" style={{ marginTop: 10 }}>
      <input
        placeholder="Alasan penolakan"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        style={{ minWidth: 220 }}
      />
      <button
        className="button danger small"
        type="button"
        disabled={!reason.trim() || mutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {mutation.isPending ? <LoaderCircle className="spin" size={14} /> : <UserX size={14} />}Tolak
      </button>
    </div>
    {confirmOpen && <AccountActionModal title={`Tolak registrasi: ${account.full_name}`} confirmLabel="Tolak Registrasi" busy={mutation.isPending} showReason={false} onClose={() => setConfirmOpen(false)} onConfirm={() => mutation.mutate()}>
      <p>Pendaftaran akun ini akan ditolak dengan alasan: {reason}</p>
    </AccountActionModal>}
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
      reasonLabel={action === 'deactivate' ? 'Alasan penonaktifan' : 'Catatan (opsional)'} minimumReason={action === 'deactivate' ? 10 : 0}
      error={mutation.isError ? accountActionMessage(mutation.error) : undefined} onClose={() => setOpen(false)} onConfirm={(reason) => mutation.mutate(reason)}>
      <p>{action === 'deactivate' ? 'Menonaktifkan akun akan mencegah pengguna masuk dan menggunakan UNI-NEXUS. Data akun, role, histori, dan membership tidak akan dihapus.' : 'Mengaktifkan kembali akun akan memulihkan akses UNI-NEXUS dengan role dan membership yang sudah tersimpan.'}</p>
    </AccountActionModal>}
  </>;
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
      {tab === 'REQUESTS' ? <DeactivationRequests /> : <>
      <div className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <div className="nexus-password-field">
          <input placeholder="Cari berdasarkan nama, username, atau email" value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 34 }} />
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
        </div>
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
              <tr><th>Nama</th><th>Username</th><th>Email</th><th>Telepon</th><th>Mendaftar</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {list.data.data.map((account) => (
                <tr key={account.id}>
                  <td className="primary-cell">{account.full_name}<div className="helper-note">{account.roles.map((role) => ROLE_LABELS[role]).join(', ')}</div></td>
                  <td>@{account.username}</td>
                  <td>{account.email}</td>
                  <td>{account.phone || '—'}</td>
                  <td>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(account.created_at))}</td>
                  <td><AccountStatusBadge status={account.account_status} />{account.deactivated_at && <p className="helper-note">Dinonaktifkan: {formatAccountDate(account.deactivated_at)}<br />{account.deactivation_reason}</p>}{account.reactivated_at && <p className="helper-note">Diaktifkan: {formatAccountDate(account.reactivated_at)}</p>}</td>
                  <td style={{ minWidth: 260 }}>
                    {(account.allowed_actions.approve_registration || account.allowed_actions.reject_registration) && reference.data && (
                      <>
                        {account.allowed_actions.approve_registration && <ApproveRow account={account} reference={reference.data} />}
                        {account.allowed_actions.reject_registration && <RejectRow account={account} />}
                      </>
                    )}
                    {account.allowed_actions.deactivate && <LifecycleButton account={account} action="deactivate" label="Nonaktifkan" />}
                    {account.allowed_actions.reactivate && <LifecycleButton account={account} action="reactivate" label="Aktifkan Kembali" />}
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
      </>}
    </>
  );
}
