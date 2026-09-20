import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Check,
  IdCard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pencil,
  PawPrint,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { DEACTIVATION_REQUEST_LABELS, ROLE_LABELS, type DeactivationRequestSummary, type RoleCode } from '@uni-nexus/shared';
import { AccountActionModal } from '../components/account-action-modal';
import { accountActionMessage, formatAccountDate } from '../lib/account-lifecycle';
import { api, assetUrl, body, message, type Envelope } from '../lib/api';
import { PresenceBadge, PresenceSelector, type PresenceStatus } from '../components/presence-badge';
import { ErrorState, Spinner, useToast } from '../components/ui';
import { WorkspaceUpdateModal } from '../components/workspace-update-modal';
import { displayPetName, handlePetImageError, resolvePetImage } from '../lib/pets';
import craftLogo from '../assets/branding/logos/uni-inside-craft/Uni-Inside Craft Light Mode.png';

type Tag = { id: string; tag_text: string };
type Pet = { id: string; builtin_key: string | null; code: string | null; name: string | null; display_name: string; subtitle: string | null; description: string | null; image_storage_provider: string | null; image_url: string | null };
type WorkspaceRef = { id: string; name: string; code: string };
type Membership = { workspace: WorkspaceRef; role: { code: string; name: string } | null };
type ProfileData = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  bio: string | null;
  presence_status: string;
  password_changed_at: string | null;
  tags: Tag[];
  pet: Pet | null;
  photo_url: string | null;
  banner_url: string | null;
  memberships: Membership[];
  default_workspace: WorkspaceRef | null;
  role: { code: string; name: string } | null;
};

function workspaceDisplayName(workspace: WorkspaceRef | null | undefined) {
  if (!workspace) return 'Belum ada';
  return workspace.name === '3D Printing' ? 'Craft' : workspace.name;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Shared by the presence and workspace popovers: close on an outside click or Escape. */
function useClosePopover(open: boolean, setOpen: (open: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return ref;
}

function AvatarPhotoModal({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api('/profile/assets/PROFILE_PHOTO', { method: 'POST', body: form });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      await client.invalidateQueries({ queryKey: ['online-presence'] });
      toast('Foto profil diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  const remove = useMutation({
    mutationFn: () => api('/profile/assets/PROFILE_PHOTO', { method: 'DELETE' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      toast('Foto profil dihapus.');
      onClose();
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="modal-backdrop avatar-modal-backdrop" onClick={onClose}>
      <section
        className="modal avatar-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close" aria-label="Tutup" onClick={onClose}>
          <X size={19} />
        </button>
        <h2 id="avatar-modal-title" className="sr-only">Foto Profil</h2>
        <div className="avatar-photo-modal-preview">
          {profile.photo_url ? (
            <img src={assetUrl(profile.photo_url)} alt={profile.full_name} />
          ) : (
            <div className="profile-avatar-initials" style={{ width: 220, height: 220, fontSize: 64, border: 'none' }}>
              {initials(profile.full_name)}
            </div>
          )}
        </div>
        <div className="avatar-photo-modal-actions">
          <button type="button" className="button primary" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <LoaderCircle className="spin" size={16} /> : <Camera size={16} />}Ganti Foto
          </button>
          {profile.photo_url && (
            <button type="button" className="button danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}Hapus Foto
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = '';
          }}
        />
      </section>
    </div>
  );
}

function Avatar({ profile }: { profile: ProfileData }) {
  const client = useQueryClient();
  const toast = useToast();
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const wrapRef = useClosePopover(presenceOpen, setPresenceOpen);
  const presence = useMutation({
    mutationFn: (status: PresenceStatus) =>
      api('/profile/presence', { method: 'POST', body: body({ presence_status: status }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      await client.invalidateQueries({ queryKey: ['online-presence'] });
      setPresenceOpen(false);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="profile-avatar-wrap" ref={wrapRef}>
      <button type="button" className="profile-avatar-trigger" aria-label="Lihat foto profil" onClick={() => setPhotoOpen(true)}>
        {profile.photo_url ? (
          <img className="profile-avatar" src={assetUrl(profile.photo_url)} alt={profile.full_name} />
        ) : (
          <div className="profile-avatar-initials">{initials(profile.full_name)}</div>
        )}
      </button>
      <button
        type="button"
        className="profile-presence-anchor"
        aria-label="Ubah status kehadiran"
        aria-expanded={presenceOpen}
        onClick={() => setPresenceOpen((value) => !value)}
      >
        <PresenceBadge status={profile.presence_status} size={32} />
      </button>
      {presenceOpen && (
        <div className="presence-popover" role="dialog" aria-label="Status kehadiran">
          <p className="presence-popover-heading">Atur Status Kehadiran</p>
          <PresenceSelector
            value={profile.presence_status}
            disabled={presence.isPending}
            onChange={(status) => presence.mutate(status)}
          />
        </div>
      )}
      {photoOpen && <AvatarPhotoModal profile={profile} onClose={() => setPhotoOpen(false)} />}
    </div>
  );
}

function BannerEdit() {
  const client = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api('/profile/assets/PROFILE_BANNER', { method: 'POST', body: form });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      toast('Banner profil diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <>
      <button type="button" className="profile-banner-edit" aria-label="Ganti banner profil" onClick={() => input.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? <LoaderCircle className="spin" size={16} /> : <Pencil size={16} />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
          event.target.value = '';
        }}
      />
    </>
  );
}

function TagsRow({ tags }: { tags: Tag[] }) {
  const client = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const add = useMutation({
    mutationFn: (tagText: string) => api('/profile/tags', { method: 'POST', body: body({ tag_text: tagText }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      setText('');
      setAdding(false);
    },
    onError: (error) => toast(message(error), true),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/profile/tags/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="tag-row">
      {tags.map((tag) => (
        <span className="tag-pill" key={tag.id}>
          {tag.tag_text}
          <button type="button" aria-label={`Hapus tag ${tag.tag_text}`} onClick={() => remove.mutate(tag.id)} disabled={remove.isPending}>
            <X size={12} />
          </button>
        </span>
      ))}
      {tags.length < 5 &&
        (adding ? (
          <form
            className="tag-add-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) add.mutate(text.trim());
            }}
          >
            <input autoFocus maxLength={40} value={text} onChange={(event) => setText(event.target.value)} placeholder="Tag baru" />
            <button type="submit" className="icon-button small" disabled={add.isPending} aria-label="Simpan tag">
              {add.isPending ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}
            </button>
            <button type="button" className="icon-button small" onClick={() => { setAdding(false); setText(''); }} aria-label="Batal">
              <X size={14} />
            </button>
          </form>
        ) : (
          <button type="button" className="tag-add" aria-label="Tambah tag" onClick={() => setAdding(true)}>
            <Plus size={14} />
          </button>
        ))}
    </div>
  );
}

function WorkspaceControl({ profile }: { profile: ProfileData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const current = profile.default_workspace ?? profile.memberships[0]?.workspace ?? null;
  return (
    <div className="profile-workspace">
      <button
        type="button"
        className="profile-workspace-toggle"
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        onClick={() => setModalOpen(true)}
      >
        <img src={craftLogo} alt="" className="workspace-toggle-logo" />
        <span className="workspace-toggle-name">{workspaceDisplayName(current)}</span>
        <span className="workspace-toggle-switch" />
      </button>
      <span className="profile-workspace-caption">Default Workspace</span>
      {modalOpen && <WorkspaceUpdateModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function PetSelectionModal({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(profile.pet?.id ?? '');
  const pets = useQuery({
    queryKey: ['profile-pets'],
    queryFn: async () => (await api<Envelope<Pet[]>>('/profile/pets')).data,
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  useEffect(() => {
    if (!selectedId && pets.data?.length) setSelectedId(pets.data.find((pet) => pet.builtin_key === 'UNI_INU')?.id ?? pets.data[0]!.id);
  }, [pets.data, selectedId]);
  const mutation = useMutation({
    mutationFn: (petId: string) => api('/profile/pet', { method: 'POST', body: body({ pet_id: petId }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['profile-pets'] });
      toast('Pet diperbarui.');
      onClose();
    },
    onError: (error) => toast(message(error), true),
  });
  const selected = pets.data?.find((pet) => pet.id === selectedId) ?? profile.pet;
  const selectedName = selected ? displayPetName(selected) : 'Pet';
  return (
    <div className="modal-backdrop pet-selection-backdrop" onClick={onClose}>
      <section className="modal pet-selection-modal" role="dialog" aria-modal="true" aria-labelledby="pet-selection-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button modal-close" aria-label="Tutup" onClick={onClose}><X size={19} /></button>
        <h2 id="pet-selection-title">Pilih Pet</h2>
        <div className="pet-selection-preview">
          <div className="pet-selection-preview-image">
            {selected && resolvePetImage(selected) ? <img src={resolvePetImage(selected)} alt={selectedName} onError={(event) => handlePetImageError(event, selected)} /> : <PawPrint size={58} strokeWidth={1.4} />}
          </div>
          <div className="pet-selection-preview-copy">
            <h3>{selectedName}</h3>
            {selected?.subtitle ? <p>{selected.subtitle}</p> : <p className="pet-muted">Belum ada subtitle.</p>}
            {selected?.description ? <p>{selected.description}</p> : <p className="pet-muted">Belum ada deskripsi.</p>}
          </div>
        </div>
        <h3 className="pet-selection-heading">Pet Tersedia</h3>
        {pets.isPending ? <Spinner label="Memuat Pet…" /> : pets.isError ? <ErrorState error={pets.error} retry={() => void pets.refetch()} /> : !pets.data?.length ? <p className="helper-note">Belum ada Pet yang tersedia.</p> : (
          <div className="pet-selection-grid" role="radiogroup" aria-label="Pet tersedia">
            {pets.data.map((pet) => {
              const name = displayPetName(pet);
              const selectedCard = pet.id === selectedId;
              return <button key={pet.id} type="button" className={`pet-selection-card${selectedCard ? ' selected' : ''}`} role="radio" aria-checked={selectedCard} onClick={() => setSelectedId(pet.id)}>
                <span className="pet-selection-card-image">{resolvePetImage(pet) ? <img src={resolvePetImage(pet)} alt={name} onError={(event) => handlePetImageError(event, pet)} /> : <PawPrint size={38} strokeWidth={1.4} />}</span>
                <span className="pet-selection-card-name">{name}</span>
                {selectedCard && <Check className="pet-selection-card-check" size={16} aria-hidden="true" />}
              </button>;
            })}
          </div>
        )}
        <div className="form-actions pet-selection-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button type="button" className="button primary" disabled={!selectedId || mutation.isPending || pets.isPending} onClick={() => mutation.mutate(selectedId)}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Pilih</button></div>
      </section>
    </div>
  );
}

function PetCardBlock({ profile }: { profile: ProfileData }) {
  const [editing, setEditing] = useState(false);
  const pet = profile.pet;
  const name = pet ? displayPetName(pet) : 'Pet belum tersedia';
  return (
    <div className="profile-pet-card">
      <span className="profile-pet-card-label">Pet Card</span>
      <button type="button" className="profile-pet-card-edit" aria-label="Ganti Pet" onClick={() => setEditing(true)}><Pencil size={13} /></button>
      <div className="profile-pet-card-media">
        {pet && resolvePetImage(pet) ? <img src={resolvePetImage(pet)} alt={name} onError={(event) => handlePetImageError(event, pet)} /> : <div className="pet-placeholder"><PawPrint size={36} strokeWidth={1.5} /></div>}
      </div>
      <h3>{name}</h3>
      {pet?.subtitle && <p>{pet.subtitle}</p>}
      {editing && <PetSelectionModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}

function IdentityForm({ profile }: { profile: ProfileData }) {
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const schema = z.object({
    full_name: z.string().trim().min(2).max(150),
    username: z.string().trim().regex(/^[A-Za-z0-9._-]{3,30}$/, 'Gunakan 3-30 huruf, angka, titik, garis bawah, atau tanda hubung.'),
    phone: z.string().trim().min(1).max(30).regex(/^[0-9+()\-.\s]+$/, 'Gunakan hanya angka dan tanda baca nomor telepon.'),
    bio: z.string().trim().max(500).optional(),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    values: { full_name: profile.full_name, username: profile.username, phone: profile.phone ?? '', bio: profile.bio ?? '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api('/profile', { method: 'PATCH', body: body(values) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      toast('Profil diperbarui.');
      setEditing(false);
    },
    onError: (error) => toast(message(error), true),
  });
  const errors = form.formState.errors;
  return (
    <form className="profile-info-column" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <div className="profile-info-list">
        <div className="profile-info-field">
          <div className={`profile-info-row${editing ? ' editable' : ''}`}>
            <IdCard size={16} strokeWidth={2} aria-hidden="true" />
            {editing ? <input aria-label="Nama Lengkap" {...form.register('full_name')} /> : <span>{profile.full_name}</span>}
          </div>
          {editing && errors.full_name && <small className="profile-info-error">{errors.full_name.message}</small>}
        </div>
        <div className="profile-info-field">
          <div className={`profile-info-row${editing ? ' editable' : ''}`}>
            <UserRound size={16} strokeWidth={2} aria-hidden="true" />
            {editing ? <input aria-label="Username" {...form.register('username')} /> : <span>@{profile.username}</span>}
          </div>
          {editing && errors.username && <small className="profile-info-error">{errors.username.message}</small>}
        </div>
        <div className="profile-info-field">
          <div className="profile-info-row">
            <Mail size={16} strokeWidth={2} aria-hidden="true" />
            <span>{profile.email}</span>
          </div>
        </div>
        <div className="profile-info-field">
          <div className={`profile-info-row${editing ? ' editable' : ''}`}>
            <Phone size={16} strokeWidth={2} aria-hidden="true" />
            {editing ? <input aria-label="Nomor Telepon" {...form.register('phone')} /> : <span>{profile.phone || 'Belum diisi.'}</span>}
          </div>
          {editing && errors.phone && <small className="profile-info-error">{errors.phone.message}</small>}
        </div>
        <div className="profile-info-field">
          <div className="profile-info-bio">
            {editing ? (
              <textarea rows={3} placeholder="Belum ada bio." {...form.register('bio')} />
            ) : (
              <p>{profile.bio || 'Belum ada bio.'}</p>
            )}
          </div>
          {editing && errors.bio && <small className="profile-info-error">{errors.bio.message}</small>}
        </div>
      </div>
      <div className="profile-info-actions">
        {editing ? (
          <>
            <button type="button" className="button secondary" onClick={() => { form.reset(); setEditing(false); }}>Batal</button>
            <button type="submit" className="button primary" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Simpan Perubahan
            </button>
          </>
        ) : (
          <button type="button" className="profile-edit-button" onClick={() => setEditing(true)}>
            <Pencil size={16} />Edit Profil
          </button>
        )}
      </div>
    </form>
  );
}

function SecurityCard({ passwordChangedAt }: { passwordChangedAt: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const schema = z
    .object({ current_password: z.string().min(1, 'Masukkan kata sandi Anda saat ini.'), new_password: z.string().min(12, 'Gunakan minimal 12 karakter.').max(72), confirm_password: z.string() })
    .refine((value) => value.new_password === value.confirm_password, { message: 'Kata sandi tidak cocok.', path: ['confirm_password'] });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { current_password: '', new_password: '', confirm_password: '' } });
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api('/auth/password', { method: 'POST', body: body({ current_password: values.current_password, new_password: values.new_password }) }),
    onSuccess: async () => {
      toast('Kata sandi diperbarui.');
      form.reset();
      setOpen(false);
      await client.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <section className="panel profile-security-card">
      <div className="panel-heading">
        <div className="profile-card-heading">
          <span className="profile-card-icon"><LockKeyhole size={19} strokeWidth={2} /></span>
          <div>
            <h2>Keamanan Akun</h2>
            <p>Jaga kata sandi Anda tetap rahasia dan gunakan kata sandi yang unik.</p>
          </div>
        </div>
      </div>
      <p className="security-note">
        Terakhir diubah:{' '}
        {passwordChangedAt
          ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(passwordChangedAt))
          : 'Belum pernah diubah'}
      </p>
      {!open ? (
        <button className="button secondary" type="button" style={{ marginTop: 12 }} onClick={() => setOpen(true)}><KeyRound size={16} />Ganti Sandi</button>
      ) : (
        <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <label className="field full-width"><span>Kata sandi saat ini</span><input type="password" autoComplete="current-password" {...form.register('current_password')} />
            {form.formState.errors.current_password && <small className="field-error">{form.formState.errors.current_password.message}</small>}
          </label>
          <label className="field"><span>Kata sandi baru</span><input type="password" autoComplete="new-password" {...form.register('new_password')} />
            {form.formState.errors.new_password && <small className="field-error">{form.formState.errors.new_password.message}</small>}
          </label>
          <label className="field"><span>Konfirmasi kata sandi baru</span><input type="password" autoComplete="new-password" {...form.register('confirm_password')} />
            {form.formState.errors.confirm_password && <small className="field-error">{form.formState.errors.confirm_password.message}</small>}
          </label>
          <div className="form-actions full-width">
            <button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Perbarui Kata Sandi</button>
            <button className="button secondary" type="button" onClick={() => setOpen(false)}>Batal</button>
          </div>
        </form>
      )}
    </section>
  );
}

function DangerCard() {
  const toast = useToast();
  const client = useQueryClient();
  const [modal, setModal] = useState<'submit' | 'withdraw' | null>(null);
  const query = useQuery({ queryKey: ['profile-deactivation-request'],
    queryFn: async () => (await api<Envelope<DeactivationRequestSummary | null>>('/profile/deactivation-request')).data,
    refetchInterval: 30000,
  });
  const pending = query.data?.request_status === 'PENDING';
  const mutation = useMutation({
    mutationFn: (reason: string) => modal === 'withdraw'
      ? api('/profile/deactivation-request/withdraw', { method: 'POST', body: body({ request_id: query.data?.id }) })
      : api('/profile/deactivation-request', { method: 'POST', body: body({ reason }) }),
    onSuccess: async () => {
      toast(modal === 'withdraw' ? 'Permintaan berhasil ditarik kembali.' : 'Permintaan diajukan. Akun Anda tetap Aktif selama menunggu peninjauan.');
      setModal(null);
      await Promise.all([client.invalidateQueries({ queryKey: ['profile-deactivation-request'] }), client.invalidateQueries({ queryKey: ['deactivation-requests'] })]);
    },
    onError: async (error) => { toast(accountActionMessage(error), true); await query.refetch(); },
  });
  return (
    <section className="panel danger-panel profile-danger-card">
      <div className="panel-heading">
        <div className="profile-card-heading">
          <span className="profile-card-icon danger"><Trash2 size={19} strokeWidth={2} /></span>
          <div><h2>Penghapusan Akun</h2></div>
        </div>
      </div>
      <p>Permintaan ini akan ditinjau sebelum akun dinonaktifkan. Data akun, role, histori, dan membership tetap tersimpan.</p>
      {query.isPending ? <Spinner label="Memuat permintaan…" /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <>
      {query.data && <div style={{ marginTop: 12 }}>
        <strong>{pending ? 'Permintaan Penghapusan Akun' : 'Permintaan Terakhir'}</strong>
        <p><span className="badge amber">{DEACTIVATION_REQUEST_LABELS[query.data.request_status]}</span></p>
        <p>Diajukan: {formatAccountDate(query.data.requested_at)}</p>
        {query.data.reviewed_at && <p>Ditinjau: {formatAccountDate(query.data.reviewed_at)}</p>}
        {query.data.review_note && <p>Catatan: {query.data.review_note}</p>}
      </div>}
      <button
        className="button danger"
        type="button"
        style={{ marginTop: 12 }}
        disabled={mutation.isPending}
        onClick={() => { mutation.reset(); setModal(pending ? 'withdraw' : 'submit'); }}
      >
        <Trash2 size={16} />{pending ? 'Tarik Kembali Permintaan' : 'Ajukan Penghapusan Akun'}
      </button>
      </>}
      {modal && <AccountActionModal title={modal === 'withdraw' ? 'Tarik Kembali Permintaan' : 'Ajukan Penghapusan Akun'}
        confirmLabel={modal === 'withdraw' ? 'Tarik Kembali Permintaan' : 'Ajukan Permintaan'} busy={mutation.isPending}
        showReason={modal === 'submit'} reasonLabel="Alasan (opsional)" error={mutation.isError ? accountActionMessage(mutation.error) : undefined}
        onClose={() => setModal(null)} onConfirm={(reason) => mutation.mutate(reason)}>
        {modal === 'withdraw' ? <p>Tarik kembali permintaan yang masih menunggu peninjauan? Akun Anda akan tetap Aktif.</p> : <>
          <p>Permintaan ini tidak akan menghapus data akun Anda secara permanen. Akun akan ditinjau terlebih dahulu. Jika permintaan disetujui, akun Anda akan dinonaktifkan dan Anda tidak dapat menggunakan UNI-NEXUS sampai akun diaktifkan kembali.</p>
          <p>Selama menunggu peninjauan, akun Anda tetap Aktif. Anda dapat menarik kembali permintaan sebelum disetujui dan tidak dapat masuk saat akun Nonaktif.</p>
        </>}
      </AccountActionModal>}
    </section>
  );
}

export function Profile() {
  const query = useQuery({ queryKey: ['profile'], queryFn: async () => (await api<Envelope<ProfileData>>('/profile')).data });
  if (query.isPending) return <Spinner label="Memuat profil…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const profile = query.data;
  return (
    <>
      <section className="panel profile-hero">
        <div className="profile-banner" style={profile.banner_url ? { backgroundImage: `url(${assetUrl(profile.banner_url)})` } : undefined}>
          <BannerEdit />
        </div>
        <div className="profile-body">
          <Avatar profile={profile} />
          <div className="profile-identity">
            <h1>{profile.full_name}</h1>
            <div className="profile-username-row">
              <span className="username">@{profile.username}</span>
              {profile.role && (
                <span className="role-pill">
                  <ShieldCheck size={13} strokeWidth={2.5} />
                  {ROLE_LABELS[profile.role.code as RoleCode] ?? profile.role.name}
                </span>
              )}
            </div>
            <p className="profile-bio">{profile.bio || 'Belum ada bio.'}</p>
            <TagsRow tags={profile.tags} />
          </div>
          <WorkspaceControl profile={profile} />
        </div>
      </section>

      <div className="profile-lower-grid">
        <section className="panel profile-main-panel">
          <div className="profile-info-grid">
            <PetCardBlock profile={profile} />
            <IdentityForm profile={profile} />
          </div>
        </section>
        <div className="profile-side-column">
          <SecurityCard passwordChangedAt={profile.password_changed_at} />
          <DangerCard />
        </div>
      </div>
    </>
  );
}
