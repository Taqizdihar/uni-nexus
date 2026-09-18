import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  KeyRound,
  LoaderCircle,
  Pencil,
  PawPrint,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import { api, assetUrl, body, message, type Envelope } from '../lib/api';
import { PresenceBadge, PresenceSelector, type PresenceStatus } from '../components/presence-badge';
import { ErrorState, Spinner, useToast } from '../components/ui';

type Tag = { id: string; tag_text: string };
type Pet = { id: string; name: string; subtitle: string | null; description: string | null; image_url: string | null };
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

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ profile }: { profile: ProfileData }) {
  const client = useQueryClient();
  const toast = useToast();
  const [presenceOpen, setPresenceOpen] = useState(false);
  const presence = useMutation({
    mutationFn: (status: PresenceStatus) =>
      api('/profile/presence', { method: 'POST', body: body({ presence_status: status }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      setPresenceOpen(false);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="profile-avatar-wrap">
      {profile.photo_url ? (
        <img className="profile-avatar" src={assetUrl(profile.photo_url)} alt={profile.full_name} />
      ) : (
        <div className="profile-avatar-initials">{initials(profile.full_name)}</div>
      )}
      <button
        type="button"
        className="profile-presence-anchor"
        aria-label="Ubah status kehadiran"
        onClick={() => setPresenceOpen((value) => !value)}
      >
        <PresenceBadge status={profile.presence_status} size={30} />
      </button>
      {presenceOpen && (
        <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 8, width: 280 }}>
          <PresenceSelector
            value={profile.presence_status}
            disabled={presence.isPending}
            onChange={(status) => presence.mutate(status)}
          />
        </div>
      )}
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

function WorkspaceCard({ profile }: { profile: ProfileData }) {
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (workspaceId: string) => api('/profile/default-workspace', { method: 'POST', body: body({ workspace_id: workspaceId }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      toast('Default Workspace diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="workspace-card">
      <div className="workspace-card-heading">Default Workspace</div>
      {profile.memberships.length === 0 ? (
        <p className="helper-note" style={{ marginTop: 0 }}>Belum ada workspace yang ditetapkan.</p>
      ) : (
        <select
          value={profile.default_workspace?.id ?? ''}
          disabled={mutation.isPending}
          onChange={(event) => mutation.mutate(event.target.value)}
        >
          {profile.memberships.map((member) => (
            <option value={member.workspace.id} key={member.workspace.id}>
              {member.workspace.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function PetCardBlock({ profile }: { profile: ProfileData }) {
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const pets = useQuery({
    queryKey: ['profile-pets'],
    queryFn: async () => (await api<Envelope<Pet[]>>('/profile/pets')).data,
    enabled: editing,
  });
  const mutation = useMutation({
    mutationFn: (petId: string | null) => api('/profile/pet', { method: 'POST', body: body({ pet_id: petId }) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
    onError: (error) => toast(message(error), true),
  });
  return (
    <div className="pet-card">
      <span className="pet-card-label">Pet Card</span>
      <button type="button" className="pet-card-edit" aria-label="Ganti Pet" onClick={() => setEditing((value) => !value)}>
        <Pencil size={13} />
      </button>
      {profile.pet ? (
        <img src={profile.pet.image_url ?? undefined} alt={profile.pet.name} />
      ) : (
        <div className="pet-placeholder">
          <PawPrint size={34} strokeWidth={1.5} />
        </div>
      )}
      <h3>{profile.pet?.name ?? 'Belum memilih Pet'}</h3>
      <p>{profile.pet?.subtitle ?? 'Pilih pendamping dari Edit Profil.'}</p>
      {editing && (
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          {pets.isPending ? (
            <Spinner label="Memuat pet…" />
          ) : !pets.data?.length ? (
            <p className="helper-note">Belum ada pet yang tersedia.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="button secondary small" type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(null)}>
                Tanpa pet
              </button>
              {pets.data.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className="button secondary small"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(pet.id)}
                >
                  {pet.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label className="field"><span>Nama Lengkap</span><input disabled={!editing} {...form.register('full_name')} />
        {form.formState.errors.full_name && <small className="field-error">{form.formState.errors.full_name.message}</small>}
      </label>
      <label className="field"><span>Username</span><input disabled={!editing} {...form.register('username')} />
        {form.formState.errors.username && <small className="field-error">{form.formState.errors.username.message}</small>}
      </label>
      <label className="field"><span>Email</span><input disabled value={profile.email} /></label>
      <label className="field"><span>Nomor Telepon</span><input disabled={!editing} {...form.register('phone')} />
        {form.formState.errors.phone && <small className="field-error">{form.formState.errors.phone.message}</small>}
      </label>
      <label className="field full-width"><span>Bio</span><textarea rows={3} disabled={!editing} placeholder="Belum ada bio." {...form.register('bio')} /></label>
      <div className="form-actions full-width">
        {editing ? (
          <>
            <button type="submit" className="button primary" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Simpan Perubahan
            </button>
            <button type="button" className="button secondary" onClick={() => { form.reset(); setEditing(false); }}>Batal</button>
          </>
        ) : (
          <button type="button" className="button primary" onClick={() => setEditing(true)}>
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
    <section className="panel">
      <div className="panel-heading"><div><h2>Keamanan Akun</h2><p>Jaga kata sandi Anda tetap rahasia dan gunakan kata sandi yang unik.</p></div></div>
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
  return (
    <section className="panel danger-panel">
      <div className="panel-heading"><div><h2>Penghapusan Akun</h2></div></div>
      <p>Menghapus akun Anda akan menghilangkan akses ke UNI-NEXUS. Alur permintaan penghapusan akun belum tersedia pada versi ini.</p>
      <button
        className="button danger"
        type="button"
        style={{ marginTop: 12 }}
        onClick={() => toast('Permintaan penghapusan akun belum diaktifkan. Hubungi seorang eksekutif berwenang jika diperlukan.', true)}
      >
        <Trash2 size={16} />Ajukan Penghapusan Akun
      </button>
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
              {profile.role && <span className="role-pill">{ROLE_LABELS[profile.role.code as RoleCode] ?? profile.role.name}</span>}
            </div>
            <p className="profile-bio">{profile.bio || 'Belum ada bio.'}</p>
            <TagsRow tags={profile.tags} />
          </div>
          <WorkspaceCard profile={profile} />
        </div>
      </section>

      <div className="profile-bottom-grid">
        <section className="panel">
          <div className="identity-panel-body">
            <PetCardBlock profile={profile} />
            <IdentityForm profile={profile} />
          </div>
        </section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SecurityCard passwordChangedAt={profile.password_changed_at} />
          <DangerCard />
        </div>
      </div>
    </>
  );
}
