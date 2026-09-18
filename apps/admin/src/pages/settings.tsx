import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, KeyRound, LoaderCircle, Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, body, message, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { isSingletonExecutiveRole, ROLE_CODES, ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import { titleCase } from '../lib/format';
import { useResources } from '../lib/resources';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';
import { ResourceTable } from '../components/resource-table';

type Role = { id: string; name: string; code: string; description?: string | null; is_active?: boolean };
type Member = { id: string; membership_status: string; joined_at: string; user: { id: string; full_name: string; email: string; account_status?: string }; role: Role | null };
type WorkspaceDetail = { id: string; name: string; code: string; description: string | null; role: string };
const roleCodes = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'DESIGNER',
  'OPERATOR',
  'CEO',
  'COO',
  'CTO',
  'CVO',
  '3D_DESIGNER',
  'STAFF_OF_SPECIALTY',
  'STAFF',
] as const;

function AccountTab() {
  const { session } = useAuth();
  const toast = useToast();
  const schema = z
    .object({ current_password: z.string().min(1, 'Masukkan kata sandi Anda saat ini.'), new_password: z.string().min(12, 'Gunakan minimal 12 karakter.').max(128), confirm_password: z.string() })
    .refine((value) => value.new_password === value.confirm_password, { message: 'Kata sandi tidak cocok.', path: ['confirm_password'] });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { current_password: '', new_password: '', confirm_password: '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api('/auth/password', { method: 'POST', body: body({ current_password: values.current_password, new_password: values.new_password }) }),
    onSuccess: () => { toast('Kata sandi diperbarui.'); form.reset(); },
    onError: (error) => toast(message(error), true),
  });
  return <><section className="panel form-section"><div className="form-section-heading"><span>01</span><h2>Profil Anda</h2></div><dl className="detail-grid"><div className="detail-field"><dt>Nama lengkap</dt><dd>{session?.user.full_name}</dd></div><div className="detail-field"><dt>Alamat email</dt><dd>{session?.user.email}</dd></div></dl></section>
    <section className="panel form-section"><div className="form-section-heading"><KeyRound size={18} /><h2>Ganti Kata Sandi</h2></div>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <label className="field"><span>Kata sandi saat ini</span><input type="password" autoComplete="current-password" {...form.register('current_password')} />{form.formState.errors.current_password && <small className="field-error">{form.formState.errors.current_password.message}</small>}</label>
        <label className="field"><span>Kata sandi baru</span><input type="password" autoComplete="new-password" {...form.register('new_password')} />{form.formState.errors.new_password && <small className="field-error">{form.formState.errors.new_password.message}</small>}</label>
        <label className="field"><span>Konfirmasi kata sandi baru</span><input type="password" autoComplete="new-password" {...form.register('confirm_password')} />{form.formState.errors.confirm_password && <small className="field-error">{form.formState.errors.confirm_password.message}</small>}</label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Perbarui Kata Sandi</button></div>
      </form>
    </section></>;
}

function WorkspaceTab() {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['workspaces-detail'], queryFn: async () => (await api<Envelope<WorkspaceDetail[]>>('/workspaces')).data });
  const current = query.data?.find((item) => item.id === workspace!.id);
  const schema = z.object({ name: z.string().trim().min(2, 'Masukkan nama workspace.').max(120), description: z.string().trim().max(5000).optional() });
  const form = useForm({ resolver: zodResolver(schema), values: { name: current?.name ?? '', description: current?.description ?? '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api(`/workspaces/${workspace!.id}`, { method: 'PATCH', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['workspaces-detail'] }); await client.invalidateQueries({ queryKey: ['session'] }); toast('Workspace diperbarui.'); },
    onError: (error) => toast(message(error), true),
  });
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <section className="panel form-section"><div className="form-section-heading"><Building2 size={18} /><h2>Detail Workspace</h2></div>
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label className="field"><span>Nama workspace</span><input {...form.register('name')} />{form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}</label>
      <label className="field full-width"><span>Deskripsi</span><textarea rows={4} {...form.register('description')} /></label>
      <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Simpan Perubahan</button></div>
    </form>
  </section>;
}

function MembersTab() {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const members = useQuery({ queryKey: ['workspace-members', workspace!.id], queryFn: async () => (await api<Envelope<Member[]>>(`/workspaces/${workspace!.id}/members`, { workspace: workspace!.id })).data });
  const roles = useQuery({ queryKey: ['workspace-roles', workspace!.id], queryFn: async () => (await api<Envelope<Role[]>>(`/workspaces/${workspace!.id}/roles`, { workspace: workspace!.id })).data });
  const schema = z.object({ email: z.string().email('Masukkan alamat email yang valid.'), role_id: z.string().min(1, 'Pilih jabatan.') });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', role_id: '' } });
  const invalidate = () => Promise.all([client.invalidateQueries({ queryKey: ['workspace-members', workspace!.id] }), client.invalidateQueries({ queryKey: ['session'] })]);
  const invite = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api(`/workspaces/${workspace!.id}/members`, { method: 'POST', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await invalidate(); toast('Anggota ditambahkan.'); form.reset(); },
    onError: (error) => toast(message(error), true),
  });
  const update = useMutation({
    mutationFn: ({ id, ...values }: { id: string; role_id?: string; membership_status?: string }) => api(`/workspaces/${workspace!.id}/members/${id}`, { method: 'PATCH', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await invalidate(); toast('Keanggotaan diperbarui.'); },
    onError: (error) => toast(message(error), true),
  });
  if (members.isPending || roles.isPending) return <Spinner />;
  if (members.isError) return <ErrorState error={members.error} retry={() => void members.refetch()} />;
  if (roles.isError) return <ErrorState error={roles.error} retry={() => void roles.refetch()} />;
  // Executive seats (CEO/COO/CTO/CVO) are only granted through User Management's approval flow;
  // Settings must not offer them as an ordinary membership choice, nor legacy non-app role codes.
  const assignableRoles = roles.data.filter(
    (role) => (ROLE_CODES as readonly string[]).includes(role.code) && !isSingletonExecutiveRole(role.code),
  );
  return <><section className="panel form-section"><div className="form-section-heading"><UserPlus size={18} /><h2>Tambah Anggota</h2></div>
      <p className="page-description">Orang tersebut harus sudah memiliki akun. Minta mereka mendaftar sebelum ditambahkan ke workspace ini.</p>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => invite.mutate(values))} noValidate>
        <label className="field"><span>Alamat email</span><input type="email" {...form.register('email')} />{form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}</label>
        <label className="field"><span>Jabatan</span><select {...form.register('role_id')}><option value="">Pilih Jabatan</option>{assignableRoles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select>{form.formState.errors.role_id && <small className="field-error">{form.formState.errors.role_id.message}</small>}</label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={invite.isPending}>{invite.isPending ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Tambah Anggota</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Anggota</h2><p>{members.data.length} anggota di workspace ini</p></div></div>
      {!members.data.length ? <EmptyState title="Belum ada anggota" description="Tambahkan anggota tim pertama Anda di atas." /> : <div className="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Jabatan</th><th>Status</th></tr></thead><tbody>{members.data.map((member) => {
        const isExecutiveMember = !!member.role && isSingletonExecutiveRole(member.role.code);
        return <tr key={member.id}><td className="primary-cell">{member.user.full_name}</td><td>{member.user.email}</td>
          <td>{isExecutiveMember ? <><span className="badge blue"><span className="badge-dot" />{member.role!.name}</span><br /><small className="helper-note">Jabatan eksekutif dikelola melalui Manajemen Pengguna.</small></> : <select value={member.role?.id ?? ''} disabled={update.isPending} onChange={(event) => update.mutate({ id: member.id, role_id: event.target.value })}>{assignableRoles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select>}</td>
          <td>{isExecutiveMember ? <Badge value={member.membership_status} /> : <select value={member.membership_status} disabled={update.isPending} onChange={(event) => update.mutate({ id: member.id, membership_status: event.target.value })}><option value="ACTIVE">Aktif</option><option value="INACTIVE">Nonaktif</option></select>}</td>
        </tr>;
      })}</tbody></table></div>}
    </section></>;
}

function RolesTab() {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const roles = useQuery({ queryKey: ['workspace-roles', workspace!.id], queryFn: async () => (await api<Envelope<Role[]>>(`/workspaces/${workspace!.id}/roles`, { workspace: workspace!.id })).data });
  const schema = z.object({ code: z.enum(roleCodes), name: z.string().trim().max(100).optional(), description: z.string().trim().max(5000).optional() });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { code: 'OPERATOR' as (typeof roleCodes)[number], name: '', description: '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api(`/workspaces/${workspace!.id}/roles`, { method: 'POST', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['workspace-roles', workspace!.id] }); toast('Jabatan diaktifkan untuk workspace ini.'); },
    onError: (error) => toast(message(error), true),
  });
  if (roles.isPending) return <Spinner />;
  if (roles.isError) return <ErrorState error={roles.error} retry={() => void roles.refetch()} />;
  return <><section className="panel form-section"><div className="form-section-heading"><ShieldCheck size={18} /><h2>Aktifkan Jabatan</h2></div>
      <p className="page-description">Jabatan mengatur apa yang bisa dilihat dan diubah oleh anggota. Akses Owner dan CEO hanya dapat diberikan oleh Owner atau CEO yang sudah ada.</p>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <label className="field"><span>Kode jabatan</span><select {...form.register('code')}>{roleCodes.map((code) => <option value={code} key={code}>{ROLE_LABELS[code as RoleCode] ?? titleCase(code)}</option>)}</select></label>
        <label className="field"><span>Nama tampilan</span><input placeholder="Opsional" {...form.register('name')} /></label>
        <label className="field full-width"><span>Deskripsi</span><textarea rows={3} placeholder="Opsional" {...form.register('description')} /></label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Aktifkan Jabatan</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Jabatan</h2><p>Jabatan yang tersedia untuk anggota di workspace ini.</p></div></div>{!roles.data.length ? <EmptyState title="Belum ada jabatan" description="Aktifkan jabatan di atas untuk mulai menetapkannya ke anggota." /> : <div className="table-scroll"><table><thead><tr><th>Nama</th><th>Kode</th><th>Deskripsi</th><th>Status</th></tr></thead><tbody>{roles.data.map((role) => <tr key={role.id}><td className="primary-cell">{role.name}</td><td>{role.code}</td><td>{role.description || '—'}</td><td><Badge value={role.is_active === false ? 'INACTIVE' : 'ACTIVE'} /></td></tr>)}</tbody></table></div>}</section></>;
}

function PreferencesTab() {
  const resources = useResources();
  if (resources.isPending) return <Spinner />;
  if (resources.isError) return <ErrorState error={resources.error} retry={() => void resources.refetch()} />;
  const resource = resources.data.find((item) => item.key === 'workspace-settings');
  if (!resource) return <EmptyState title="Preferensi tidak tersedia" description="Modul ini tidak tersedia untuk workspace Anda." />;
  return <ResourceTable resource={resource} />;
}

export function Settings() {
  const { workspace } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = ['OWNER', 'CEO', 'ADMIN', 'CTO'].includes((workspace?.role ?? '').toUpperCase());
  const tabs = [{ key: 'account', label: 'Akun' }, ...(canManage ? [{ key: 'workspace', label: 'Workspace' }, { key: 'members', label: 'Anggota' }, { key: 'roles', label: 'Jabatan' }, { key: 'preferences', label: 'Preferensi' }] : [])];
  const requested = searchParams.get('tab') || 'account';
  const tab = tabs.some((item) => item.key === requested) ? requested : 'account';
  return <><PageHeader eyebrow="WORKSPACE ANDA" title="Pengaturan" description="Kelola akun, workspace, dan akses tim Anda." />
    <nav className="section-tabs" aria-label="Bagian pengaturan">{tabs.map((item) => <button key={item.key} className={tab === item.key ? 'selected' : ''} onClick={() => setSearchParams(item.key === 'account' ? {} : { tab: item.key })}>{item.label}</button>)}</nav>
    {tab === 'account' && <AccountTab />}
    {tab === 'workspace' && <WorkspaceTab />}
    {tab === 'members' && <MembersTab />}
    {tab === 'roles' && <RolesTab />}
    {tab === 'preferences' && <PreferencesTab />}
  </>;
}
