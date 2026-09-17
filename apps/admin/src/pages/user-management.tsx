import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Search, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, body, message, type Envelope, type Page } from '../lib/api';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';

type Account = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  bio: string | null;
  account_status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
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
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'ALL', label: 'All' },
] as const;

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
      toast(`${account.full_name} approved.`);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="button-row" style={{ marginTop: 10 }}>
      <select value={roleId} onChange={(event) => setRoleId(event.target.value)} aria-label="Role">
        <option value="">Select role…</option>
        {reference.roles.map((role) => (
          <option value={role.id} key={role.id}>{role.name}</option>
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
        {mutation.isPending ? <LoaderCircle className="spin" size={14} /> : <UserCheck size={14} />}Approve
      </button>
    </div>
  );
}

function RejectRow({ account }: { account: Account }) {
  const client = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => api(`/user-management/${account.id}/reject`, { method: 'POST', body: body({ reason }) }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['user-management'] }),
        client.invalidateQueries({ queryKey: ['user-management-summary'] }),
      ]);
      toast(`${account.full_name} rejected.`);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="button-row" style={{ marginTop: 10 }}>
      <input
        placeholder="Rejection reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        style={{ minWidth: 220 }}
      />
      <button
        className="button danger small"
        type="button"
        disabled={!reason.trim() || mutation.isPending}
        onClick={() => {
          if (window.confirm(`Reject ${account.full_name}'s account?`)) mutation.mutate();
        }}
      >
        {mutation.isPending ? <LoaderCircle className="spin" size={14} /> : <UserX size={14} />}Reject
      </button>
    </div>
  );
}

function LifecycleButton({ account, action, label }: { account: Account; action: 'suspend' | 'reactivate'; label: string }) {
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => api(`/user-management/${account.id}/${action}`, { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['user-management'] }),
        client.invalidateQueries({ queryKey: ['user-management-summary'] }),
      ]);
      toast(`${account.full_name}: ${label.toLowerCase()}d.`);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <button
      className={`button ${action === 'suspend' ? 'danger' : 'primary'} small`}
      type="button"
      disabled={mutation.isPending}
      onClick={() => {
        if (action === 'suspend' && !window.confirm(`Suspend ${account.full_name}'s account?`)) return;
        mutation.mutate();
      }}
    >
      {mutation.isPending ? <LoaderCircle className="spin" size={14} /> : <ShieldAlert size={14} />}{label}
    </button>
  );
}

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const requested = searchParams.get('tab') || 'PENDING';
  const tab = tabs.some((item) => item.key === requested) ? requested : 'PENDING';
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
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== 'ALL') params.set('status', tab);
      if (search) params.set('search', search);
      return await api<Page<Account>>(`/user-management?${params.toString()}`);
    },
  });
  return (
    <>
      <PageHeader eyebrow="INTERNAL ACCOUNTS" title="Manajemen Pengguna" description="Review, approve, or reject accounts requesting access to UNI-NEXUS." />
      {summary.data && (
        <div className="summary-cards">
          <div className="summary-card"><strong>{summary.data.PENDING}</strong><span>Pending</span></div>
          <div className="summary-card active"><strong>{summary.data.ACTIVE}</strong><span>Active</span></div>
          <div className="summary-card rejected"><strong>{summary.data.REJECTED}</strong><span>Rejected</span></div>
          <div className="summary-card suspended"><strong>{summary.data.SUSPENDED}</strong><span>Suspended</span></div>
        </div>
      )}
      <nav className="section-tabs" aria-label="Account status">
        {tabs.map((item) => (
          <button key={item.key} className={tab === item.key ? 'selected' : ''} onClick={() => setSearchParams(item.key === 'PENDING' ? {} : { tab: item.key })}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <div className="nexus-password-field">
          <input placeholder="Search by name, username, or email" value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 34 }} />
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
        </div>
      </div>
      {list.isPending || reference.isPending ? (
        <Spinner label="Loading accounts…" />
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : reference.isError ? (
        <ErrorState error={reference.error} retry={() => void reference.refetch()} />
      ) : !list.data.data.length ? (
        <EmptyState title="No accounts here" description="Nothing matches this filter right now." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Signed up</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.data.data.map((account) => (
                <tr key={account.id}>
                  <td className="primary-cell">{account.full_name}</td>
                  <td>@{account.username}</td>
                  <td>{account.email}</td>
                  <td>{account.phone || '—'}</td>
                  <td>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(account.created_at))}</td>
                  <td><Badge value={account.account_status} /></td>
                  <td style={{ minWidth: 260 }}>
                    {account.account_status === 'PENDING' && reference.data && (
                      <>
                        <ApproveRow account={account} reference={reference.data} />
                        <RejectRow account={account} />
                      </>
                    )}
                    {account.account_status === 'ACTIVE' && <LifecycleButton account={account} action="suspend" label="Suspend" />}
                    {account.account_status === 'SUSPENDED' && <LifecycleButton account={account} action="reactivate" label="Reactivate" />}
                    {account.account_status === 'REJECTED' && account.rejection_reason && (
                      <span className="helper-note">Reason: {account.rejection_reason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
