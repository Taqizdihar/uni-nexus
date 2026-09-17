import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Box, Check, Layers3, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, body, message, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorState, Spinner, useToast } from '../components/ui';

type Mode = 'login' | 'signup' | 'setup';
type AuthValues = { full_name?: string; email: string; password: string; workspace_name?: string };
type SetupStatus = { setupRequired: boolean; allowPublicSignup: boolean };
const copy = {
  login: { eyebrow: 'WELCOME BACK', title: 'Your workshop, connected.', description: 'Sign in to keep every request, print, and delivery moving.', button: 'Sign in to workspace' },
  signup: { eyebrow: 'JOIN THE TEAM', title: 'Create your account.', description: 'Set up your internal account. A workspace administrator will grant you access.', button: 'Create account' },
  setup: { eyebrow: 'LET’S GET STARTED', title: 'Make room for great work.', description: 'Create your owner account and the first workspace for your team.', button: 'Create workspace' },
};

export function AuthPage({ mode }: { mode: Mode }) {
  const { session, loading } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const status = useQuery({ queryKey: ['setup-status'], queryFn: async () => (await api<Envelope<SetupStatus>>('/setup/status')).data, retry: false });
  const schema = z.object({
    email: z.string().email('Enter a valid email address.'),
    password: mode === 'login' ? z.string().min(1, 'Enter your password.') : z.string().min(12, 'Use at least 12 characters.').max(128),
    full_name: mode === 'login' ? z.string().optional() : z.string().trim().min(2, 'Enter your full name.').max(150),
    workspace_name: mode === 'setup' ? z.string().trim().min(2, 'Enter a workspace name.').max(150) : z.string().optional(),
  });
  const form = useForm<AuthValues>({ resolver: zodResolver(schema), defaultValues: { full_name: '', email: '', password: '', workspace_name: '3D Printing' } });
  const mutation = useMutation({ mutationFn: (values: AuthValues) => api(mode === 'setup' ? '/setup' : `/auth/${mode}`, { method: 'POST', body: body(values) }), onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['session'] });
    await client.invalidateQueries({ queryKey: ['setup-status'] });
    if (mode === 'signup') toast('Account created. Sign in to view your workspace access.');
    navigate(mode === 'signup' ? '/login' : '/app', { replace: true });
  } });
  if (loading || status.isPending) return <Spinner label="Connecting to UNI-NEXUS…" />;
  if (session) return <Navigate to="/app" replace />;
  if (status.data?.setupRequired && mode !== 'setup') return <Navigate to="/setup" replace />;
  if (status.data && !status.data.setupRequired && mode === 'setup') return <Navigate to="/login" replace />;
  if (status.data && !status.data.allowPublicSignup && mode === 'signup') return <Navigate to="/login" replace />;
  return <div className="auth-layout">
    <aside className="auth-story"><Link className="brand" to="/login"><span className="brand-mark"><Layers3 size={24} /></span><span>UNI<span className="brand-light">NEXUS</span><small>THE OPERATIONS WORKSPACE</small></span></Link>
      <div className="auth-story-content"><div className="outline-tag"><span /> Built for the work behind the print</div><h2>From a good idea.<br />To a great<br /><em>finished product.</em></h2><p>One shared place for your team, your machines, and everything in between.</p><div className="auth-flow">{['Request', 'Design', 'Print', 'Deliver'].map((item, index) => <span key={item}>{index > 0 && <ArrowRight size={14} />}<span>{item}</span></span>)}</div></div>
      <div className="auth-foot"><Box size={17} /><span>Made for 3D printing teams.</span><span className="auth-version">UNI-NEXUS / 01</span></div>
    </aside>
    <main className="auth-main"><div className="auth-mobile-brand"><Layers3 size={25} /> UNI-NEXUS</div><div className="auth-form-wrap"><p className="eyebrow">{copy[mode].eyebrow}</p><h1>{copy[mode].title}</h1><p className="page-description">{copy[mode].description}</p>
      {status.isError ? <ErrorState error={status.error} retry={() => void status.refetch()} /> : <form className="auth-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        {mode !== 'login' && <label className="field"><span>Full name</span><input autoComplete="name" placeholder="Your full name" {...form.register('full_name')} />{form.formState.errors.full_name && <small className="field-error">{form.formState.errors.full_name.message}</small>}</label>}
        <label className="field"><span>Email address</span><input autoComplete="email" type="email" placeholder="you@company.com" {...form.register('email')} />{form.formState.errors.email && <small className="field-error">{form.formState.errors.email.message}</small>}</label>
        <label className="field"><span>Password</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" placeholder={mode === 'login' ? 'Enter your password' : 'At least 12 characters'} {...form.register('password')} />{form.formState.errors.password && <small className="field-error">{form.formState.errors.password.message}</small>}</label>
        {mode === 'setup' && <label className="field"><span>Workspace name</span><input {...form.register('workspace_name')} />{form.formState.errors.workspace_name && <small className="field-error">{form.formState.errors.workspace_name.message}</small>}</label>}
        {mutation.isError && <div className="form-error" role="alert">{message(mutation.error)}</div>}
        <button className="button primary auth-submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" size={18} /> : mode === 'setup' ? <Check size={18} /> : null}{copy[mode].button}<ArrowRight size={17} /></button>
      </form>}
      {mode === 'login' && status.data?.allowPublicSignup && <p className="auth-switch">New to the team? <Link to="/signup">Create an account</Link></p>}
      {mode === 'signup' && <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>}
      <p className="auth-security"><ShieldCheck size={16} />{mode === 'setup' ? 'This setup is available only until the first account is created.' : 'A secure, internal workspace for your team.'}</p>
    </div><p className="auth-copyright">© {new Date().getFullYear()} UNI-NEXUS. A little more connected.</p></main>
  </div>;
}
