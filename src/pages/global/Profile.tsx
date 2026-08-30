import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, Image as ImageIcon, KeyRound, LoaderCircle, Mail, Pencil, Phone, ShieldCheck, Trash2, UserRound, XCircle } from 'lucide-react';
import { useAuth, type AuthUser } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import { resolvePublicStorageUrl } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { UserAvatar } from '../../components/common/UserAvatar';

type ProfileForm = Pick<AuthUser, 'full_name' | 'username' | 'email' | 'phone' | 'default_workspace_code'>;
type MediaKind = 'avatar' | 'banner';
type Feedback = { type: 'success' | 'error'; text: string } | null;
type DeletionRequest = { id: number; status_code: 'pending'; request_reason: string | null; requested_at: string };

const profileFormFromUser = (user: AuthUser): ProfileForm => ({
  full_name: user.full_name,
  username: user.username,
  email: user.email,
  phone: user.phone || '',
  default_workspace_code: user.default_workspace_code || 'craft',
});

const statusMeta = {
  default: { label: 'Default', className: 'bg-stone-100 text-stone-700 border-stone-200' },
  busy: { label: 'Sibuk', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  sick: { label: 'Sakit', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  leave: { label: 'Cuti', className: 'bg-sky-50 text-sky-700 border-sky-200' },
} as const;

const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum tersedia';
const messageFor = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

export function Profile() {
  const { user, checkAuth } = useAuth();
  const [profileData, setProfileData] = useState<ProfileForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [mediaModal, setMediaModal] = useState<MediaKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [isDeleteMediaOpen, setIsDeleteMediaOpen] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeletionSaving, setIsDeletionSaving] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !isEditing) setProfileData(profileFormFromUser(user));
  }, [isEditing, user]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!user) return;
    api.get<DeletionRequest | null>('/profile/deletion-request').then(setDeletionRequest).catch(() => setDeletionRequest(null));
  }, [user?.id]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(current => current?.text === text ? null : current), 5000);
  };

  const closeMediaModal = (force = false) => {
    if (isMediaSaving && !force) return;
    setMediaModal(null);
    setPreviewUrl(null);
    if (avatarInput.current) avatarInput.current.value = '';
    if (bannerInput.current) bannerInput.current.value = '';
  };

  const selectMedia = (kind: MediaKind, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxBytes = kind === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxBytes) {
      showFeedback('error', `Pilih gambar JPG, PNG, atau WEBP maksimal ${kind === 'avatar' ? '5' : '10'} MB.`);
      event.target.value = '';
      return;
    }
    setPreviewUrl(current => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(file); });
    setMediaModal(kind);
  };

  const uploadMedia = async () => {
    if (!mediaModal) return;
    const input = mediaModal === 'avatar' ? avatarInput.current : bannerInput.current;
    const file = input?.files?.[0];
    if (!file || isMediaSaving) { if (!file) showFeedback('error', 'Pilih gambar terlebih dahulu.'); return; }
    setIsMediaSaving(true);
    try {
      const form = new FormData();
      form.set(mediaModal === 'avatar' ? 'avatar' : 'banner', file);
      await api.post(`/profile/${mediaModal}`, form);
      await checkAuth();
      showFeedback('success', mediaModal === 'avatar' ? 'Foto profil berhasil diperbarui.' : 'Banner profil berhasil diperbarui.');
      closeMediaModal(true);
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal menyimpan gambar profil.')); }
    finally { setIsMediaSaving(false); }
  };

  const deleteMedia = async () => {
    if (!mediaModal || isMediaSaving) return;
    setIsMediaSaving(true);
    try {
      await api.delete(`/profile/${mediaModal}`);
      await checkAuth();
      showFeedback('success', mediaModal === 'avatar' ? 'Foto profil dihapus.' : 'Banner profil dihapus.');
      setIsDeleteMediaOpen(false);
      closeMediaModal(true);
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal menghapus media profil.')); }
    finally { setIsMediaSaving(false); }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileData || isSaving) return;
    setIsSaving(true);
    try {
      await api.patch<AuthUser>('/profile', profileData);
      await checkAuth();
      setIsEditing(false);
      showFeedback('success', 'Profil berhasil diperbarui.');
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal memperbarui profil.')); }
    finally { setIsSaving(false); }
  };

  const cancelProfileEdit = () => {
    if (user) setProfileData(profileFormFromUser(user));
    setIsEditing(false);
  };

  const saveProfileStatus = async (value: AuthUser['profile_status_code']) => {
    if (!value || value === user?.profile_status_code) return;
    try {
      await api.patch<AuthUser>('/profile/status', { profile_status_code: value });
      await checkAuth();
      showFeedback('success', 'Status profil diperbarui.');
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal memperbarui status profil.')); }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPasswordSaving) return;
    if (password.newPassword !== password.confirmPassword) { showFeedback('error', 'Konfirmasi kata sandi tidak cocok.'); return; }
    setIsPasswordSaving(true);
    try {
      await api.post('/profile/change-password', { currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordEditing(false);
      await checkAuth();
      showFeedback('success', 'Kata sandi berhasil diubah.');
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal mengubah kata sandi.')); }
    finally { setIsPasswordSaving(false); }
  };

  const submitDeletionRequest = async () => {
    if (isDeletionSaving) return;
    setIsDeletionSaving(true);
    try {
      const result = await api.post<DeletionRequest>('/profile/deletion-request', { reason: deletionReason });
      setDeletionRequest(result);
      setDeletionReason('');
      setIsDeletionModalOpen(false);
      showFeedback('success', 'Pengajuan penghapusan akun berhasil dikirim untuk ditinjau CEO, COO, atau CTO.');
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal mengirim pengajuan penghapusan.')); }
    finally { setIsDeletionSaving(false); }
  };

  const revokeDeletionRequest = async () => {
    if (isRevoking) return;
    setIsRevoking(true);
    try {
      await api.post('/profile/deletion-request/revoke', {});
      setDeletionRequest(null);
      setIsRevokeDialogOpen(false);
      showFeedback('success', 'Pengajuan penghapusan berhasil ditarik kembali.');
    } catch (error) { showFeedback('error', messageFor(error, 'Gagal menarik pengajuan.')); }
    finally { setIsRevoking(false); }
  };

  if (!user || !profileData) return <div className="mx-auto max-w-6xl p-6 text-sm text-gray-500">Memuat profil…</div>;
  const bannerUrl = resolvePublicStorageUrl(user.profile_banner_path);
  const currentMediaUrl = mediaModal === 'avatar' ? resolvePublicStorageUrl(user.avatar_path) : resolvePublicStorageUrl(user.profile_banner_path);
  const hasStoredMedia = mediaModal === 'avatar' ? Boolean(user.avatar_path) : Boolean(user.profile_banner_path);
  const profileStatus = user.profile_status_code || 'default';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {feedback && <div className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`} role="status">{feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{feedback.text}</div>}

      <section className="overflow-hidden rounded-2xl border border-[var(--nexus-border)] bg-white shadow-sm">
        <div className="relative h-36 overflow-hidden sm:h-44 md:h-52">
          {bannerUrl ? <img src={bannerUrl} alt="Banner profil" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_15%_25%,rgba(255,225,90,.95),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(255,255,255,.45),transparent_18%),linear-gradient(120deg,#282725_0%,#49433a_46%,#d8a90b_100%)]"><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,transparent_40%,white_40%,white_42%,transparent_42%)] [background-size:38px_38px]" /></div>}
          <button type="button" onClick={() => setMediaModal('banner')} className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-white/40 bg-black/55 px-3 py-2 text-sm font-medium text-white shadow-sm backdrop-blur hover:bg-black/70"><ImageIcon className="h-4 w-4" /> Kelola Banner</button>
        </div>
        <div className="relative px-5 pb-6 pt-16 sm:px-8 sm:pt-20">
          <button type="button" onClick={() => setMediaModal('avatar')} aria-label="Kelola foto profil" className="absolute -top-14 left-5 rounded-full bg-white p-1.5 shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--nexus-yellow)]/40 sm:-top-16 sm:left-8">
            <UserAvatar user={user} size="xl" className="h-28 w-28 border-0 text-3xl sm:h-32 sm:w-32" />
            <span className="absolute bottom-1 right-1 rounded-full bg-[var(--nexus-yellow)] p-1.5 text-black shadow"><Camera className="h-4 w-4" /></span>
          </button>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-[var(--nexus-charcoal)] sm:text-3xl">{user.full_name}</h1>
              <p className="mt-1 truncate text-sm text-gray-500">@{user.username}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nexus-yellow)]/40 bg-[var(--nexus-cream-soft)] px-3 py-1 text-xs font-semibold text-[var(--nexus-charcoal)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--nexus-yellow-deep)]" />{user.role?.name || 'Pengguna'}</span>
                <label className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[profileStatus].className}`}>
                  <span>{statusMeta[profileStatus].label}</span><ChevronDown className="h-3.5 w-3.5" />
                  <select aria-label="Status profil" value={profileStatus} onChange={event => void saveProfileStatus(event.target.value as AuthUser['profile_status_code'])} className="absolute inset-0 cursor-pointer opacity-0">
                    {Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                <span className="inline-flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{user.email}</span></span>
                {user.phone && <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{user.phone}</span>}
              </div>
            </div>
            <Button type="button" onClick={() => setIsEditing(true)} className="shrink-0"><Pencil className="h-4 w-4" /> Edit Profil</Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="rounded-2xl border border-[var(--nexus-border)] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6"><h2 className="flex items-center gap-2 font-semibold text-[var(--nexus-charcoal)]"><UserRound className="h-5 w-5 text-[var(--nexus-yellow-deep)]" /> Informasi Pribadi</h2>{!isEditing && <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit Profil</Button>}</div>
          {isEditing ? (
            <form onSubmit={saveProfile} className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" value={profileData.full_name} onChange={value => setProfileData({ ...profileData, full_name: value })} />
                <Field label="Username" value={profileData.username} onChange={value => setProfileData({ ...profileData, username: value })} />
                <Field label="Email" type="email" value={profileData.email} onChange={value => setProfileData({ ...profileData, email: value })} />
                <Field label="Nomor Telepon" value={profileData.phone || ''} onChange={value => setProfileData({ ...profileData, phone: value })} />
                <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium text-gray-700">Default Workspace</span><select value={profileData.default_workspace_code} onChange={event => setProfileData({ ...profileData, default_workspace_code: event.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--nexus-yellow)] focus:outline-none"><option value="craft">Uni-Inside Craft</option><option value="studio">Uni-Inside Studio</option></select></label>
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={cancelProfileEdit} disabled={isSaving}>Batal</Button><Button type="submit" disabled={isSaving}>{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button></div>
            </form>
          ) : <dl className="grid gap-x-6 gap-y-5 p-5 text-sm sm:grid-cols-2 sm:p-6"><ReadOnly label="Nama Lengkap" value={user.full_name} /><ReadOnly label="Username" value={`@${user.username}`} /><ReadOnly label="Email" value={user.email} /><ReadOnly label="Nomor Telepon" value={user.phone || 'Belum diatur'} /><ReadOnly label="Default Workspace" value={user.default_workspace_code === 'studio' ? 'Uni-Inside Studio' : 'Uni-Inside Craft'} /><ReadOnly label="Peran" value={user.role?.name || 'Pengguna'} /></dl>}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--nexus-border)] bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h2 className="flex items-center gap-2 font-semibold text-[var(--nexus-charcoal)]"><KeyRound className="h-5 w-5 text-[var(--nexus-yellow-deep)]" /> Keamanan Akun</h2></div><div className="p-5"><p className="text-sm leading-6 text-gray-600">Jaga kata sandi Anda tetap rahasia dan gunakan kata sandi yang unik.</p><p className="mt-2 text-xs text-gray-400">Terakhir diubah: {dateTime(user.password_changed_at)}</p>{isPasswordEditing ? <form onSubmit={savePassword} className="mt-4 space-y-3"><Field label="Kata Sandi Lama" type="password" value={password.currentPassword} onChange={value => setPassword({ ...password, currentPassword: value })} required /><Field label="Kata Sandi Baru" type="password" value={password.newPassword} onChange={value => setPassword({ ...password, newPassword: value })} minLength={6} required /><Field label="Konfirmasi Kata Sandi Baru" type="password" value={password.confirmPassword} onChange={value => setPassword({ ...password, confirmPassword: value })} minLength={6} required /><div className="flex flex-wrap gap-2 pt-1"><Button type="button" size="sm" variant="outline" disabled={isPasswordSaving} onClick={() => { setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' }); setIsPasswordEditing(false); }}>Batal</Button><Button type="submit" size="sm" disabled={isPasswordSaving}>{isPasswordSaving ? 'Menyimpan...' : 'Simpan Kata Sandi'}</Button></div></form> : <Button type="button" className="mt-4" size="sm" variant="outline" onClick={() => setIsPasswordEditing(true)}><KeyRound className="h-4 w-4" /> Ganti Kata Sandi</Button>}</div></section>
          <section className="rounded-2xl border border-red-200 bg-red-50/40 shadow-sm"><div className="border-b border-red-100 px-5 py-4"><h2 className="flex items-center gap-2 font-semibold text-red-800"><Trash2 className="h-5 w-5" /> Penghapusan Akun</h2></div><div className="p-5">{deletionRequest ? <><p className="text-sm font-medium text-amber-800">Menunggu Peninjauan</p><p className="mt-1 text-xs leading-5 text-gray-600">Diajukan {dateTime(deletionRequest.requested_at)}{deletionRequest.request_reason ? ` · ${deletionRequest.request_reason}` : ''}</p><Button type="button" size="sm" variant="outline" className="mt-4 border-red-200 text-red-700 hover:bg-red-100" onClick={() => setIsRevokeDialogOpen(true)}>Tarik Kembali Pengajuan</Button></> : <><p className="text-sm leading-6 text-gray-600">Penghapusan tidak langsung menonaktifkan akun. Pengajuan akan ditinjau CEO, COO, atau CTO dan akses normal tetap berjalan sementara menunggu.</p><Button type="button" size="sm" className="mt-4 bg-red-600 text-white hover:bg-red-700" onClick={() => setIsDeletionModalOpen(true)}><Trash2 className="h-4 w-4" /> Ajukan Penghapusan Akun</Button></>}</div></section>
        </div>
      </div>

      <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => selectMedia('avatar', event)} />
      <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => selectMedia('banner', event)} />
      <Modal open={Boolean(mediaModal)} title={mediaModal === 'avatar' ? 'Foto Profil' : 'Banner Profil'} onClose={closeMediaModal} busy={isMediaSaving} className="max-w-2xl"><div className="space-y-5 p-5"><div className={`overflow-hidden rounded-xl bg-[var(--nexus-cream-soft)] ${mediaModal === 'avatar' ? 'mx-auto flex h-56 w-56 items-center justify-center rounded-full' : 'h-52'}`}>{previewUrl || currentMediaUrl ? <img src={previewUrl || currentMediaUrl || ''} alt="Pratinjau media profil" className="h-full w-full object-cover" /> : mediaModal === 'avatar' ? <UserAvatar user={user} size="xl" className="h-full w-full text-5xl" /> : <div className="h-full w-full bg-[linear-gradient(120deg,#282725,#d8a90b)]" />}</div><div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => (mediaModal === 'avatar' ? avatarInput.current : bannerInput.current)?.click()} disabled={isMediaSaving}>{previewUrl ? 'Pilih Gambar Lain' : mediaModal === 'avatar' ? 'Ganti Foto' : 'Ganti Banner'}</Button>{previewUrl && <Button type="button" onClick={() => void uploadMedia()} disabled={isMediaSaving}>{isMediaSaving ? 'Mengunggah...' : 'Simpan Gambar'}</Button>}{hasStoredMedia && <Button type="button" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setIsDeleteMediaOpen(true)} disabled={isMediaSaving}><Trash2 className="h-4 w-4" /> Hapus {mediaModal === 'avatar' ? 'Foto' : 'Banner'}</Button>}</div></div></Modal>
      <Modal open={isDeletionModalOpen} title="Ajukan Penghapusan Akun" onClose={() => !isDeletionSaving && setIsDeletionModalOpen(false)} busy={isDeletionSaving}><div className="space-y-4 p-5"><p className="text-sm leading-6 text-gray-600">Pengajuan ini tidak langsung menghapus akun. Akses normal tetap berjalan hingga CEO, COO, atau CTO meninjau permintaan Anda.</p><label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Alasan (opsional)</span><textarea value={deletionReason} maxLength={500} rows={4} onChange={event => setDeletionReason(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--nexus-yellow)] focus:outline-none" /></label><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIsDeletionModalOpen(false)} disabled={isDeletionSaving}>Batal</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={() => void submitDeletionRequest()} disabled={isDeletionSaving}>{isDeletionSaving ? 'Mengirim...' : 'Kirim Pengajuan'}</Button></div></div></Modal>
      <ConfirmDialog open={isDeleteMediaOpen} title={`Hapus ${mediaModal === 'avatar' ? 'foto profil' : 'banner profil'}?`} description="Media akan dihapus dari profil Anda." confirmLabel="Hapus" variant="danger" isLoading={isMediaSaving} onConfirm={() => void deleteMedia()} onCancel={() => setIsDeleteMediaOpen(false)} />
      <ConfirmDialog open={isRevokeDialogOpen} title="Tarik kembali pengajuan?" description="Akun Anda akan tetap aktif dan pengajuan ini tidak akan diteruskan untuk ditinjau." confirmLabel="Tarik Pengajuan" variant="warning" isLoading={isRevoking} onConfirm={() => void revokeDeletionRequest()} onCancel={() => setIsRevokeDialogOpen(false)} />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, minLength }: { label: string; value: string | null | undefined; onChange: (value: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><input type={type} value={value || ''} required={required} minLength={minLength} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[var(--nexus-yellow)] focus:outline-none" /></label>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt><dd className="mt-1 break-words font-medium text-gray-800">{value}</dd></div>;
}
