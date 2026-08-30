import React, { useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Clock, ShieldCheck, Trash2, UserCog, Users as UsersIcon, XCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';

type Role = { id: number; code: string; name: string };
type ManagedUser = { id: number; full_name: string; username: string; email: string; avatar_path: string | null; profile_status_code?: string; status_code: string; approval_status_code: string; created_at: string; role?: { code: string; name: string } };
type DeletionRequest = { id: number; user_id: number; full_name: string; username: string; email: string; avatar_path: string | null; profile_status_code?: string; requested_at: string; request_reason: string | null; role: { code: string; name: string } | null };
type ReactivationRequest = { id: number; deleted_user_id: number; requested_full_name: string; requested_username: string; requested_email: string; requested_phone: string | null; requested_default_workspace_code: string; requested_at: string; archived_full_name: string; archived_username: string; archived_email: string; avatar_path: string | null; archived_role: { code: string; name: string } | null };
type PendingAccessItem = { kind: 'signup'; user: ManagedUser } | { kind: 'reactivation'; request: ReactivationRequest };
type Tab = 'active' | 'pending' | 'suspended' | 'deletions';
type Feedback = { type: 'success' | 'error'; text: string } | null;

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const getMessage = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

export function Users() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [reactivationRequests, setReactivationRequests] = useState<ReactivationRequest[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedSignup, setSelectedSignup] = useState<ManagedUser | null>(null);
  const [selectedReactivation, setSelectedReactivation] = useState<ReactivationRequest | null>(null);
  const [selectedDeletion, setSelectedDeletion] = useState<DeletionRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [roleCode, setRoleCode] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isDeletionDetailOpen, setIsDeletionDetailOpen] = useState(false);
  const [isDeletionConfirmOpen, setIsDeletionConfirmOpen] = useState(false);
  const [isManagementDeleteOpen, setIsManagementDeleteOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const isExecutive = ['CEO', 'COO', 'CTO'].includes(currentUser?.role?.code || '');

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(current => current?.text === text ? null : current), 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRows, roleRows, deletionRows, reactivationRows] = await Promise.all([
        api.get<ManagedUser[]>('/users'), api.get<Role[]>('/users/roles/available'),
        api.get<DeletionRequest[]>('/users/deletion-requests'), api.get<ReactivationRequest[]>('/users/reactivation-requests'),
      ]);
      setUsers(userRows); setRoles(roleRows); setDeletionRequests(deletionRows); setReactivationRequests(reactivationRows);
    } catch (error) { showFeedback('error', getMessage(error, 'Gagal memuat manajemen pengguna.')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && currentUser?.permissions?.includes('users.manage')) void fetchData();
  }, [authLoading, currentUser?.id]);

  const pendingItems = useMemo<PendingAccessItem[]>(() => [
    ...users.filter(user => user.approval_status_code === 'pending').map(user => ({ kind: 'signup' as const, user })),
    ...reactivationRequests.map(request => ({ kind: 'reactivation' as const, request })),
  ], [reactivationRequests, users]);
  const matches = (parts: Array<string | null | undefined>) => parts.some(part => part?.toLowerCase().includes(query.toLowerCase()));
  const activeUsers = users.filter(user => user.status_code === 'active' && user.approval_status_code === 'approved' && matches([user.full_name, user.email, user.username]));
  const suspendedUsers = users.filter(user => (user.status_code === 'suspended' || user.approval_status_code === 'rejected') && matches([user.full_name, user.email, user.username]));
  const visiblePending = pendingItems.filter(item => item.kind === 'signup' ? matches([item.user.full_name, item.user.email, item.user.username]) : matches([item.request.requested_full_name, item.request.requested_email, item.request.archived_email]));
  const visibleDeletion = deletionRequests.filter(request => matches([request.full_name, request.email, request.username]));

  const perform = async (work: () => Promise<void>, success: string) => {
    if (isMutating) return;
    setIsMutating(true);
    try { await work(); await fetchData(); showFeedback('success', success); }
    catch (error) { showFeedback('error', getMessage(error, 'Tindakan tidak dapat diproses.')); }
    finally { setIsMutating(false); }
  };

  const approveSignup = () => selectedSignup && void perform(async () => { await api.post(`/users/${selectedSignup.id}/approve`, { roleCode }); setIsApprovalOpen(false); }, 'Akun berhasil disetujui.');
  const rejectSignup = () => selectedSignup && void perform(async () => { await api.post(`/users/${selectedSignup.id}/reject`, { reason: reviewNote }); setIsRejectOpen(false); }, 'Pengajuan akun ditolak.');
  const approveReactivation = () => selectedReactivation && void perform(async () => { await api.post(`/users/reactivation-requests/${selectedReactivation.id}/approve`, { roleCode, review_note: reviewNote }); setIsApprovalOpen(false); }, 'Aktivasi ulang akun berhasil disetujui.');
  const rejectReactivation = () => selectedReactivation && void perform(async () => { await api.post(`/users/reactivation-requests/${selectedReactivation.id}/reject`, { review_note: reviewNote }); setIsRejectOpen(false); }, 'Pengajuan aktivasi ulang ditolak.');
  const reviewDeletion = (decision: 'approve' | 'reject') => selectedDeletion && void perform(async () => { await api.post(`/users/deletion-requests/${selectedDeletion.id}/${decision}`, { review_note: reviewNote }); setIsDeletionConfirmOpen(false); setIsDeletionDetailOpen(false); }, decision === 'approve' ? 'Akun berhasil diarsipkan.' : 'Pengajuan penghapusan ditolak.');
  const saveRole = () => selectedUser && void perform(async () => { await api.patch(`/users/${selectedUser.id}/role`, { roleCode }); setIsRoleOpen(false); }, 'Peran pengguna diperbarui.');
  const toggleStatus = (user: ManagedUser) => void perform(async () => { await api.patch(`/users/${user.id}/status`, { status_code: user.status_code === 'active' ? 'suspended' : 'active' }); }, user.status_code === 'active' ? 'Akun ditangguhkan.' : 'Akun diaktifkan kembali.');
  const archiveDirectly = () => selectedUser && void perform(async () => { await api.delete(`/users/${selectedUser.id}`); setIsManagementDeleteOpen(false); }, 'Akun berhasil diarsipkan.');

  const openSignupApproval = (user: ManagedUser) => { setSelectedSignup(user); setSelectedReactivation(null); setRoleCode(''); setReviewNote(''); setIsApprovalOpen(true); };
  const openReactivationApproval = (request: ReactivationRequest) => { setSelectedReactivation(request); setSelectedSignup(null); setRoleCode(''); setReviewNote(''); setIsApprovalOpen(true); };
  const openSignupReject = (user: ManagedUser) => { setSelectedSignup(user); setSelectedReactivation(null); setReviewNote(''); setIsRejectOpen(true); };
  const openReactivationReject = (request: ReactivationRequest) => { setSelectedReactivation(request); setSelectedSignup(null); setReviewNote(''); setIsRejectOpen(true); };

  const tabs: Array<{ value: Tab; label: string; icon: React.ElementType; count?: number }> = [
    { value: 'active', label: 'Pengguna Aktif', icon: ShieldCheck, count: users.filter(user => user.status_code === 'active' && user.approval_status_code === 'approved').length },
    { value: 'pending', label: 'Menunggu Persetujuan', icon: Clock, count: pendingItems.length },
    { value: 'suspended', label: 'Ditangguhkan / Ditolak', icon: Ban },
    { value: 'deletions', label: 'Pengajuan Penghapusan', icon: Trash2, count: deletionRequests.length },
  ];

  return <div className="p-4 sm:p-8"><div className="mb-7"><h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--nexus-charcoal)]"><UsersIcon className="h-6 w-6 text-[var(--nexus-yellow-deep)]" /> Manajemen Pengguna</h1><p className="mt-1 text-sm text-gray-500">Kelola akses, peran, persetujuan, dan pengajuan siklus hidup akun.</p></div>
    {feedback && <div role="status" className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{feedback.text}</div>}
    <section className="overflow-hidden rounded-2xl border border-[var(--nexus-border)] bg-white shadow-sm"><div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/70 p-3">{tabs.map(item => { const Icon = item.icon; return <button key={item.value} type="button" onClick={() => setTab(item.value)} className={`mr-2 inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.value ? 'border border-gray-200 bg-white text-[var(--nexus-yellow-deep)] shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}><Icon className="h-4 w-4" />{item.label}{item.count ? <span className="rounded-full bg-[var(--nexus-yellow)]/20 px-2 py-0.5 text-xs text-[var(--nexus-charcoal)]">{item.count}</span> : null}</button>; })}</div>
      <div className="border-b border-gray-100 p-4"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, username, atau email..." className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--nexus-yellow)] focus:outline-none" /></div>
      {loading ? <div className="p-10 text-center text-sm text-gray-500">Memuat data pengguna…</div> : tab === 'pending' ? <PendingList items={visiblePending} onApproveSignup={openSignupApproval} onRejectSignup={openSignupReject} onApproveReactivation={openReactivationApproval} onRejectReactivation={openReactivationReject} /> : tab === 'deletions' ? <DeletionList items={visibleDeletion} onOpen={request => { setSelectedDeletion(request); setReviewNote(''); setIsDeletionDetailOpen(true); }} /> : <UsersTable users={tab === 'active' ? activeUsers : suspendedUsers} tab={tab} currentUserId={currentUser?.id} onRole={user => { setSelectedUser(user); setRoleCode(user.role?.code || ''); setIsRoleOpen(true); }} onStatus={toggleStatus} onDelete={user => { setSelectedUser(user); setIsManagementDeleteOpen(true); }} />}
    </section>

    <Modal open={isApprovalOpen} title={selectedReactivation ? 'Setujui Aktivasi Ulang' : 'Persetujuan Akun'} onClose={() => !isMutating && setIsApprovalOpen(false)} busy={isMutating}><div className="space-y-4 p-5">{selectedReactivation ? <IdentitySummary title="Akun arsip" name={selectedReactivation.archived_full_name} username={selectedReactivation.archived_username} email={selectedReactivation.archived_email} avatar_path={selectedReactivation.avatar_path} extra={<p className="mt-3 text-sm text-gray-600">Permintaan baru: <strong>{selectedReactivation.requested_full_name}</strong> · @{selectedReactivation.requested_username} · {selectedReactivation.requested_email}</p>} /> : selectedSignup && <IdentitySummary title="Pengajuan akun" name={selectedSignup.full_name} username={selectedSignup.username} email={selectedSignup.email} avatar_path={selectedSignup.avatar_path} />}<RoleSelect roles={roles} value={roleCode} onChange={setRoleCode} /><label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Catatan peninjauan (opsional)</span><textarea value={reviewNote} maxLength={500} rows={3} onChange={event => setReviewNote(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIsApprovalOpen(false)} disabled={isMutating}>Batal</Button><Button type="button" onClick={selectedReactivation ? approveReactivation : approveSignup} disabled={!roleCode || isMutating}>{isMutating ? 'Memproses...' : 'Setujui & Berikan Akses'}</Button></div></div></Modal>
    <Modal open={isRejectOpen} title={selectedReactivation ? 'Tolak Aktivasi Ulang' : 'Tolak Pengajuan Akun'} onClose={() => !isMutating && setIsRejectOpen(false)} busy={isMutating}><div className="space-y-4 p-5"><p className="text-sm text-gray-600">{selectedReactivation ? 'Akun arsip akan tetap tidak aktif; kata sandi yang diajukan akan dihapus.' : 'Pengajuan akun ini akan ditolak.'}</p><label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Catatan peninjauan (opsional)</span><textarea value={reviewNote} maxLength={500} rows={3} onChange={event => setReviewNote(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)} disabled={isMutating}>Batal</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={selectedReactivation ? rejectReactivation : rejectSignup} disabled={isMutating}>{isMutating ? 'Memproses...' : 'Tolak Pengajuan'}</Button></div></div></Modal>
    <Modal open={isRoleOpen} title="Ubah Peran Pengguna" onClose={() => !isMutating && setIsRoleOpen(false)} busy={isMutating}><div className="space-y-4 p-5">{selectedUser && <IdentitySummary title="Pengguna" name={selectedUser.full_name} username={selectedUser.username} email={selectedUser.email} avatar_path={selectedUser.avatar_path} />}<RoleSelect roles={roles} value={roleCode} onChange={setRoleCode} currentRole={selectedUser?.role} /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIsRoleOpen(false)} disabled={isMutating}>Batal</Button><Button type="button" onClick={saveRole} disabled={!roleCode || isMutating}>Simpan Perubahan</Button></div></div></Modal>
    <Modal open={isDeletionDetailOpen} title="Pengajuan Penghapusan Akun" onClose={() => !isMutating && setIsDeletionDetailOpen(false)} busy={isMutating}><div className="space-y-4 p-5">{selectedDeletion && <><IdentitySummary title="Akun yang meminta penghapusan" name={selectedDeletion.full_name} username={selectedDeletion.username} email={selectedDeletion.email} avatar_path={selectedDeletion.avatar_path} extra={<p className="mt-3 text-sm text-gray-600">Diajukan: {formatDate(selectedDeletion.requested_at)}<br />Alasan: {selectedDeletion.request_reason || 'Tidak ada alasan'}</p>} /><label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Catatan peninjauan (opsional)</span><textarea value={reviewNote} maxLength={500} rows={3} onChange={event => setReviewNote(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>{!isExecutive && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Hanya CEO, COO, atau CTO yang dapat menyetujui atau menolak pengajuan ini.</p>}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" className="text-red-700" onClick={() => reviewDeletion('reject')} disabled={isMutating || !isExecutive}>Tolak Pengajuan</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={() => setIsDeletionConfirmOpen(true)} disabled={isMutating || !isExecutive}>Setujui Penghapusan</Button></div></>}</div></Modal>
    <ConfirmDialog open={isDeletionConfirmOpen} title="Setujui penghapusan akun?" description="Akun akan diarsipkan, aksesnya dicabut, dan foto/banner publiknya dibersihkan setelah perubahan database tersimpan." confirmLabel="Arsipkan Akun" variant="danger" isLoading={isMutating} onConfirm={() => reviewDeletion('approve')} onCancel={() => setIsDeletionConfirmOpen(false)} />
    <ConfirmDialog open={isManagementDeleteOpen} title="Arsipkan pengguna?" description={<>Pengguna <strong>{selectedUser?.full_name}</strong> akan kehilangan akses aktif; riwayat ERP tetap dipertahankan.</>} confirmLabel="Arsipkan Pengguna" variant="danger" isLoading={isMutating} onConfirm={archiveDirectly} onCancel={() => setIsManagementDeleteOpen(false)} />
  </div>;
}

function UsersTable({ users, tab, currentUserId, onRole, onStatus, onDelete }: { users: ManagedUser[]; tab: Tab; currentUserId?: number; onRole: (user: ManagedUser) => void; onStatus: (user: ManagedUser) => void; onDelete: (user: ManagedUser) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Pengguna</th><th className="px-5 py-3">Peran</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Terdaftar</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100">{users.length ? users.map(user => <tr key={user.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><UserAvatar user={user} size="lg" /><div><p className="font-medium text-gray-900">{user.full_name}</p><p className="text-xs text-gray-500">@{user.username} · {user.email}</p></div></div></td><td className="px-5 py-4">{user.role?.name || <span className="text-gray-400">Belum ditentukan</span>}</td><td className="px-5 py-4"><StatusPill user={user} /></td><td className="px-5 py-4 text-gray-500">{formatDate(user.created_at)}</td><td className="px-5 py-4 text-right">{user.id === currentUserId ? <span className="text-xs text-gray-400">Akun Anda</span> : <div className="flex justify-end gap-2">{tab === 'active' && <><button type="button" title="Ubah peran" onClick={() => onRole(user)} className="rounded p-2 text-gray-500 hover:bg-[var(--nexus-cream-soft)]"><UserCog className="h-4 w-4" /></button><button type="button" title="Tangguhkan" onClick={() => onStatus(user)} className="rounded p-2 text-orange-600 hover:bg-orange-50"><Ban className="h-4 w-4" /></button></>}{tab === 'suspended' && user.status_code === 'suspended' && <Button type="button" size="sm" variant="outline" onClick={() => onStatus(user)}>Aktifkan</Button>}<button type="button" title="Arsipkan" onClick={() => onDelete(user)} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>}</td></tr>) : <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Tidak ada pengguna yang ditemukan.</td></tr>}</tbody></table></div>;
}

function PendingList({ items, onApproveSignup, onRejectSignup, onApproveReactivation, onRejectReactivation }: { items: PendingAccessItem[]; onApproveSignup: (user: ManagedUser) => void; onRejectSignup: (user: ManagedUser) => void; onApproveReactivation: (request: ReactivationRequest) => void; onRejectReactivation: (request: ReactivationRequest) => void }) {
  return <div className="divide-y divide-gray-100">{items.length ? items.map(item => item.kind === 'signup' ? <div key={`signup-${item.user.id}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><UserAvatar user={item.user} size="lg" /><div><p className="font-medium text-gray-900">{item.user.full_name}</p><p className="text-xs text-gray-500">@{item.user.username} · {item.user.email}</p><p className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">Pendaftaran Baru</p></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onRejectSignup(item.user)} className="text-red-700">Tolak</Button><Button size="sm" onClick={() => onApproveSignup(item.user)}>Setujui</Button></div></div> : <div key={`reactivation-${item.request.id}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><UserAvatar user={{ full_name: item.request.archived_full_name, avatar_path: item.request.avatar_path }} size="lg" /><div><p className="font-medium text-gray-900">{item.request.requested_full_name}</p><p className="text-xs text-gray-500">Meminta @ {item.request.requested_username} · {item.request.requested_email}</p><p className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">Aktivasi Ulang</p></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onRejectReactivation(item.request)} className="text-red-700">Tolak</Button><Button size="sm" onClick={() => onApproveReactivation(item.request)}>Tinjau</Button></div></div>) : <div className="p-10 text-center text-sm text-gray-500">Tidak ada pengajuan akses yang menunggu.</div>}</div>;
}

function DeletionList({ items, onOpen }: { items: DeletionRequest[]; onOpen: (request: DeletionRequest) => void }) {
  return <div className="divide-y divide-gray-100">{items.length ? items.map(item => <button key={item.id} type="button" onClick={() => onOpen(item)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-gray-50"><div className="flex min-w-0 items-center gap-3"><UserAvatar user={item} size="lg" /><div className="min-w-0"><p className="truncate font-medium text-gray-900">{item.full_name}</p><p className="truncate text-xs text-gray-500">@{item.username} · {item.email}</p><p className="mt-1 text-xs text-gray-500">{formatDate(item.requested_at)}{item.request_reason ? ` · ${item.request_reason}` : ''}</p></div></div><span className="shrink-0 text-sm font-medium text-[var(--nexus-yellow-deep)]">Tinjau</span></button>) : <div className="p-10 text-center text-sm text-gray-500">Tidak ada pengajuan penghapusan yang menunggu.</div>}</div>;
}

function IdentitySummary({ title, name, username, email, avatar_path, extra }: { title: string; name: string; username: string; email: string; avatar_path: string | null; extra?: React.ReactNode }) {
  return <div className="rounded-xl bg-[var(--nexus-cream-soft)] p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p><div className="flex items-center gap-3"><UserAvatar user={{ full_name: name, avatar_path }} size="lg" /><div className="min-w-0"><p className="truncate font-medium text-gray-900">{name}</p><p className="truncate text-xs text-gray-500">@{username} · {email}</p></div></div>{extra}</div>;
}

function RoleSelect({ roles, value, onChange, currentRole }: { roles: Role[]; value: string; onChange: (value: string) => void; currentRole?: { code: string; name: string } }) {
  const entries = currentRole && !roles.some(role => role.code === currentRole.code) ? [...roles, { id: -1, code: currentRole.code, name: `${currentRole.name} (Saat Ini)` }] : roles;
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Pilih Peran Sistem</span><select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="" disabled>-- Pilih Peran --</option>{entries.map(role => <option key={role.id} value={role.code}>{role.name}</option>)}</select></label>;
}

function StatusPill({ user }: { user: ManagedUser }) {
  if (user.approval_status_code === 'rejected') return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700">Ditolak</span>;
  if (user.status_code === 'active') return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">Aktif</span>;
  if (user.status_code === 'suspended') return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-700">Ditangguhkan</span>;
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">Tidak Aktif</span>;
}
