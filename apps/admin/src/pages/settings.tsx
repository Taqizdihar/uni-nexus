import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, KeyRound, LoaderCircle, Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, body, message, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
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
    .object({ current_password: z.string().min(1, 'Enter your current password.'), new_password: z.string().min(12, 'Use at least 12 characters.').max(128), confirm_password: z.string() })
    .refine((value) => value.new_password === value.confirm_password, { message: 'Passwords do not match.', path: ['confirm_password'] });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { current_password: '', new_password: '', confirm_password: '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api('/auth/password', { method: 'POST', body: body({ current_password: values.current_password, new_password: values.new_password }) }),
    onSuccess: () => { toast('Password updated.'); form.reset(); },
    onError: (error) => toast(message(error), true),
  });
  return <><section className="panel form-section"><div className="form-section-heading"><span>01</span><h2>Your profile</h2></div><dl className="detail-grid"><div className="detail-field"><dt>Full name</dt><dd>{session?.user.full_name}</dd></div><div className="detail-field"><dt>Email address</dt><dd>{session?.user.email}</dd></div></dl></section>
    <section className="panel form-section"><div className="form-section-heading"><KeyRound size={18} /><h2>Change password</h2></div>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" {...form.register('current_password')} />{form.formState.errors.current_password && <small className="field-error">{form.formState.errors.current_password.message}</small>}</label>
        <label className="field"><span>New password</span><input type="password" autoComplete="new-password" {...form.register('new_password')} />{form.formState.errors.new_password && <small className="field-error">{form.formState.errors.new_password.message}</small>}</label>
        <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" {...form.register('confirm_password')} />{form.formState.errors.confirm_password && <small className="field-error">{form.formState.errors.confirm_password.message}</small>}</label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Update password</button></div>
      </form>
    </section></>;
}

function WorkspaceTab() {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['workspaces-detail'], queryFn: async () => (await api<Envelope<WorkspaceDetail[]>>('/workspaces')).data });
  const current = query.data?.find((item) => item.id === workspace!.id);
  const schema = z.object({ name: z.string().trim().min(2, 'Enter a workspace name.').max(120), description: z.string().trim().max(5000).optional() });
  const form = useForm({ resolver: zodResolver(schema), values: { name: current?.name ?? '', description: current?.description ?? '' } });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api(`/workspaces/${workspace!.id}`, { method: 'PATCH', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['workspaces-detail'] }); await client.invalidateQueries({ queryKey: ['session'] }); toast('Workspace updated.'); },
    onError: (error) => toast(message(error), true),
  });
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <section className="panel form-section"><div className="form-section-heading"><Building2 size={18} /><h2>Workspace details</h2></div>
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <label className="field"><span>Workspace name</span><input {...form.register('name')} />{form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}</label>
      <label className="field full-width"><span>Description</span><textarea rows={4} {...form.register('description')} /></label>
      <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Save changes</button></div>
    </form>
  </section>;
}

function MembersTab() {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const members = useQuery({ queryKey: ['workspace-members', workspace!.id], queryFn: async () => (await api<Envelope<Member[]>>(`/workspaces/${workspace!.id}/members`, { workspace: workspace!.id })).data });
  const roles = useQuery({ queryKey: ['workspace-roles', workspace!.id], queryFn: async () => (await api<Envelope<Role[]>>(`/workspaces/${workspace!.id}/roles`, { workspace: workspace!.id })).data });
  const schema = z.object({ email: z.string().email('Enter a valid email address.'), role_id: z.string().min(1, 'Select a role.') });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', role_id: '' } });
  const invalidate = () => Promise.all([client.invalidateQueries({ queryKey: ['workspace-members', workspace!.id] }), client.invalidateQueries({ queryKey: ['session'] })]);
  const invite = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api(`/workspaces/${workspace!.id}/members`, { method: 'POST', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await invalidate(); toast('Member added.'); form.reset(); },
    onError: (error) => toast(message(error), true),
  });
  const update = useMutation({
    mutationFn: ({ id, ...values }: { id: string; role_id?: string; membership_status?: string }) => api(`/workspaces/${workspace!.id}/members/${id}`, { method: 'PATCH', body: body(values), workspace: workspace!.id }),
    onSuccess: async () => { await invalidate(); toast('Membership updated.'); },
    onError: (error) => toast(message(error), true),
  });
  if (members.isPending || roles.isPending) return <Spinner />;
  if (members.isError) return <ErrorState error={members.error} retry={() => void members.refetch()} />;
  if (roles.isError) return <ErrorState error={roles.error} retry={() => void roles.refetch()} />;
  return <><section className="panel form-section"><div className="form-section-heading"><UserPlus size={18} /><h2>Add a member</h2></div>
      <p className="page-description">The person must already have an account. Ask them to sign up before adding them to this workspace.</p>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => invite.mutate(values))} noValidate>
        <label className="field"><span>Email address</span><input type="email" {...form.register('email')} />{form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}</label>
        <label className="field"><span>Role</span><select {...form.register('role_id')}><option value="">Select a role</option>{roles.data.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select>{form.formState.errors.role_id && <small className="field-error">{form.formState.errors.role_id.message}</small>}</label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={invite.isPending}>{invite.isPending ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Add member</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Members</h2><p>{members.data.length} {members.data.length === 1 ? 'member' : 'members'} in this workspace</p></div></div>
      {!members.data.length ? <EmptyState title="No members yet" description="Add your first team member above." /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{members.data.map((member) => <tr key={member.id}><td className="primary-cell">{member.user.full_name}</td><td>{member.user.email}</td><td><select value={member.role?.id ?? ''} disabled={update.isPending} onChange={(event) => update.mutate({ id: member.id, role_id: event.target.value })}>{roles.data.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></td><td><select value={member.membership_status} disabled={update.isPending} onChange={(event) => update.mutate({ id: member.id, membership_status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></td></tr>)}</tbody></table></div>}
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
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['workspace-roles', workspace!.id] }); toast('Role enabled for this workspace.'); },
    onError: (error) => toast(message(error), true),
  });
  if (roles.isPending) return <Spinner />;
  if (roles.isError) return <ErrorState error={roles.error} retry={() => void roles.refetch()} />;
  return <><section className="panel form-section"><div className="form-section-heading"><ShieldCheck size={18} /><h2>Enable a role</h2></div>
      <p className="page-description">Roles control what a member can see and change. Owner and CEO access can only be granted by an existing owner or CEO.</p>
      <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <label className="field"><span>Role code</span><select {...form.register('code')}>{roleCodes.map((code) => <option value={code} key={code}>{titleCase(code)}</option>)}</select></label>
        <label className="field"><span>Display name</span><input placeholder="Optional" {...form.register('name')} /></label>
        <label className="field full-width"><span>Description</span><textarea rows={3} placeholder="Optional" {...form.register('description')} /></label>
        <div className="form-actions"><button className="button primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Enable role</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Roles</h2><p>Roles available for members in this workspace.</p></div></div>{!roles.data.length ? <EmptyState title="No roles yet" description="Enable a role above to start assigning it to members." /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Status</th></tr></thead><tbody>{roles.data.map((role) => <tr key={role.id}><td className="primary-cell">{role.name}</td><td>{role.code}</td><td>{role.description || '—'}</td><td><Badge value={role.is_active === false ? 'INACTIVE' : 'ACTIVE'} /></td></tr>)}</tbody></table></div>}</section></>;
}

function PreferencesTab() {
  const resources = useResources();
  if (resources.isPending) return <Spinner />;
  if (resources.isError) return <ErrorState error={resources.error} retry={() => void resources.refetch()} />;
  const resource = resources.data.find((item) => item.key === 'workspace-settings');
  if (!resource) return <EmptyState title="Preferences are unavailable" description="This module is not available for your workspace." />;
  return <ResourceTable resource={resource} />;
}

export function Settings() {
  const { workspace } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = ['OWNER', 'CEO', 'ADMIN', 'CTO'].includes((workspace?.role ?? '').toUpperCase());
  const tabs = [{ key: 'account', label: 'Account' }, ...(canManage ? [{ key: 'workspace', label: 'Workspace' }, { key: 'members', label: 'Members' }, { key: 'roles', label: 'Roles' }, { key: 'preferences', label: 'Preferences' }] : [])];
  const requested = searchParams.get('tab') || 'account';
  const tab = tabs.some((item) => item.key === requested) ? requested : 'account';
  return <><PageHeader eyebrow="YOUR WORKSPACE" title="Settings" description="Manage your account, workspace, and team access." />
    <nav className="section-tabs" aria-label="Settings sections">{tabs.map((item) => <button key={item.key} className={tab === item.key ? 'selected' : ''} onClick={() => setSearchParams(item.key === 'account' ? {} : { tab: item.key })}>{item.label}</button>)}</nav>
    {tab === 'account' && <AccountTab />}
    {tab === 'workspace' && <WorkspaceTab />}
    {tab === 'members' && <MembersTab />}
    {tab === 'roles' && <RolesTab />}
    {tab === 'preferences' && <PreferencesTab />}
  </>;
}
