import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, body, message, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AnimatedBrandText } from '../components/public/animated-brand-text';
import { ErrorState, Spinner, useToast } from '../components/ui';

type Mode = 'login' | 'signup' | 'setup';
type AuthValues = { full_name?: string; email: string; password: string; workspace_name?: string };
type SetupStatus = { setupRequired: boolean; allowPublicSignup: boolean };

const copy = {
  login: {
    title: 'Masuk ke UNI-NEXUS',
    description: 'Nexus Creationis et Productionis',
    button: 'Tekan Enter untuk Masuk',
  },
  signup: {
    title: 'Buat Akun',
    description: 'Bergabung dengan sistem operasional Uni-Inside',
    button: 'Buat Akun',
  },
  setup: {
    title: 'Siapkan UNI-NEXUS',
    description: 'Buat akun pemilik dan workspace pertama untuk tim Anda.',
    button: 'Buat Workspace',
  },
};

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={'flex flex-col items-center group ' + (compact ? 'mb-6' : 'mb-8')}>
      <span className="text-5xl md:text-6xl font-bold tracking-tight text-white glow-text nexus-brand-font">
        <AnimatedBrandText text="UNI-NEXUS" glow />
      </span>
    </Link>
  );
}

export function AuthPage({ mode }: { mode: Mode }) {
  const [showPassword, setShowPassword] = useState(false);
  const { session, loading } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const status = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => (await api<Envelope<SetupStatus>>('/setup/status')).data,
    retry: false,
  });
  const schema = z.object({
    email: z.string().email('Masukkan alamat email yang valid.'),
    password: mode === 'login' ? z.string().min(1, 'Masukkan kata sandi.') : z.string().min(12, 'Gunakan setidaknya 12 karakter.').max(128),
    full_name: mode === 'login' ? z.string().optional() : z.string().trim().min(2, 'Masukkan nama lengkap.').max(150).optional(),
    workspace_name: mode === 'setup' ? z.string().trim().min(2, 'Masukkan nama workspace.').max(150).optional() : z.string().optional(),
  });
  const form = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', workspace_name: '3D Printing' },
  });
  const mutation = useMutation({
    mutationFn: (values: AuthValues) => {
      const payload: AuthValues = mode === 'login'
        ? { email: values.email, password: values.password }
        : mode === 'signup'
          ? { full_name: values.full_name, email: values.email, password: values.password }
          : values;
      return api(mode === 'setup' ? '/setup' : '/auth/' + mode, { method: 'POST', body: body(payload) });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['session'] });
      await client.invalidateQueries({ queryKey: ['setup-status'] });
      if (mode === 'signup') toast('Akun berhasil dibuat. Masuk untuk melihat akses workspace Anda.');
      navigate(mode === 'signup' ? '/login' : '/app', { replace: true });
    },
  });

  useEffect(() => {
    if (mode !== 'login') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'BUTTON') return;
      event.preventDefault();
      document.getElementById('login-submit-btn')?.click();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  if (loading || status.isPending) return <Spinner label="Menghubungkan ke UNI-NEXUS…" />;
  if (session) return <Navigate to="/app" replace />;
  if (status.data?.setupRequired && mode !== 'setup') return <Navigate to="/setup" replace />;
  if (status.data && !status.data.setupRequired && mode === 'setup') return <Navigate to="/login" replace />;
  if (status.data && !status.data.allowPublicSignup && mode === 'signup') return <Navigate to="/login" replace />;

  return (
    <div className="nexus-auth min-h-screen dark-theme flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <BrandLink compact={mode !== 'login'} />
        <div className="w-full max-w-md bg-[var(--nexus-charcoal)]/50 backdrop-blur-md p-8 rounded-2xl border border-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-white mb-2">{copy[mode].title}</h1>
            <p className="text-sm text-gray-400">{copy[mode].description}</p>
          </div>

          {status.isError ? (
            <ErrorState error={status.error} retry={() => void status.refetch()} />
          ) : (
            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
              {mode !== 'login' && (
                <label className="block">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</span>
                  <input type="text" autoComplete="name" placeholder="Budi Santoso" className="nexus-auth-input" {...form.register('full_name')} />
                  {form.formState.errors.full_name && <span className="nexus-field-error">{form.formState.errors.full_name.message}</span>}
                </label>
              )}
              <label className="block">
                <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Email</span>
                <input type="email" autoComplete="email" placeholder="budi@example.com" className="nexus-auth-input" {...form.register('email')} />
                {form.formState.errors.email && <span className="nexus-field-error">{form.formState.errors.email.message}</span>}
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Kata Sandi</span>
                <div className="nexus-password-field">
                  <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Kata Sandi' : 'Buat kata sandi'} className="nexus-auth-input" {...form.register('password')} />
                  <button
                    type="button"
                    className="nexus-password-toggle"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.password && <span className="nexus-field-error">{form.formState.errors.password.message}</span>}
              </label>
              {mode === 'setup' && (
                <label className="block">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Nama Workspace</span>
                  <input type="text" className="nexus-auth-input" {...form.register('workspace_name')} />
                  {form.formState.errors.workspace_name && <span className="nexus-field-error">{form.formState.errors.workspace_name.message}</span>}
                </label>
              )}
              {mode === 'login' && (
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-700 bg-black/50 text-[var(--nexus-yellow)] focus:ring-[var(--nexus-yellow)]" />
                  Ingat Saya
                </label>
              )}
              {mutation.isError && <div className="nexus-form-error" role="alert">{message(mutation.error)}</div>}
              <button id={mode === 'login' ? 'login-submit-btn' : undefined} type="submit" className="nexus-auth-submit w-full mt-4" disabled={mutation.isPending}>
                {mutation.isPending && <LoaderCircle className="spin" size={18} />}
                {mutation.isPending ? (mode === 'signup' ? 'Membuat Akun…' : 'Memproses…') : copy[mode].button}
              </button>
            </form>
          )}

          {mode === 'login' && status.data?.allowPublicSignup && (
            <div className="mt-8 text-center text-sm text-gray-500">
              Belum memiliki akun? <Link to="/signup" className="text-[var(--nexus-yellow)] hover:text-white transition-colors">Daftar</Link>
            </div>
          )}
          {mode === 'signup' && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Sudah memiliki akun? <Link to="/login" className="text-[var(--nexus-yellow)] hover:text-white transition-colors">Masuk</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
