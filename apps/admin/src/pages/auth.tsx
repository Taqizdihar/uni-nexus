import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, api, body, message, type Envelope } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AnimatedBrandText } from '../components/public/animated-brand-text';
import { ErrorState, Spinner } from '../components/ui';

type Mode = 'login' | 'signup';
type AuthValues = {
  full_name?: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
  confirm_password?: string;
};
type AuthConfig = { allowPublicSignup: boolean };
type SignupResult = { status: 'PENDING'; message: string };

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
  const config = useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => (await api<Envelope<AuthConfig>>('/auth/config')).data,
    retry: false,
  });
  // Every field is typed uniformly (matching AuthValues) so mode-specific requirements are
  // enforced with superRefine instead of branching the zod schema's static shape per mode.
  const schema = z
    .object({
      full_name: z.string().trim().max(150).optional(),
      username: z.string().trim().max(30).optional(),
      email: z.string().trim().max(190),
      phone: z.string().trim().max(30).optional(),
      password: z.string().min(1, 'Masukkan kata sandi.').max(72),
      confirm_password: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (mode !== 'signup') {
        if (!value.email.trim())
          ctx.addIssue({ code: 'custom', path: ['email'], message: 'Masukkan email atau username.' });
        return;
      }
      if (!value.full_name || value.full_name.length < 2)
        ctx.addIssue({ code: 'custom', path: ['full_name'], message: 'Masukkan nama lengkap.' });
      if (!value.username || !/^[A-Za-z0-9._-]{3,30}$/.test(value.username))
        ctx.addIssue({ code: 'custom', path: ['username'], message: 'Gunakan 3-30 huruf, angka, titik, garis bawah, atau tanda hubung.' });
      if (!value.phone || !/^[0-9+()\-.\s]+$/.test(value.phone))
        ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Masukkan nomor telepon yang valid.' });
      if (!value.email || !z.string().email().safeParse(value.email).success)
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Masukkan alamat email yang valid.' });
      if (value.password.length < 12)
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Gunakan setidaknya 12 karakter.' });
      if (value.password !== value.confirm_password)
        ctx.addIssue({ code: 'custom', path: ['confirm_password'], message: 'Kata sandi tidak cocok.' });
    });
  const form = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', username: '', email: '', phone: '', password: '', confirm_password: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: AuthValues) => {
      const payload =
        mode === 'login'
          ? { email: values.email, password: values.password }
          : {
              full_name: values.full_name,
              username: values.username,
              email: values.email,
              phone: values.phone,
              password: values.password,
            };
      return api<Envelope<SignupResult> | Envelope<unknown>>('/auth/' + mode, {
        method: 'POST',
        body: body(payload),
      });
    },
    onSuccess: async (response) => {
      if (mode === 'signup') {
        const data = response.data as SignupResult | { user: unknown };
        if ('status' in data && data.status === 'PENDING') {
          navigate('/account-status', { state: { code: 'ACCOUNT_PENDING', message: data.message } });
          return;
        }
        // The one-time CTO bootstrap claim issues a session immediately instead of a pending status.
        await client.invalidateQueries({ queryKey: ['session'] });
        navigate('/app', { replace: true });
        return;
      }
      await client.invalidateQueries({ queryKey: ['session'] });
      navigate('/app', { replace: true });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(error.code)
      ) {
        const reason =
          error.details && typeof error.details === 'object' && 'reason' in error.details
            ? String((error.details as { reason?: unknown }).reason ?? '')
            : undefined;
        navigate('/account-status', { state: { code: error.code, message: error.message, reason } });
      }
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

  if (loading || config.isPending) return <Spinner label="Menghubungkan ke UNI-NEXUS…" />;
  if (session) return <Navigate to="/app" replace />;
  if (config.data && !config.data.allowPublicSignup && mode === 'signup') return <Navigate to="/login" replace />;

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

          {config.isError ? (
            <ErrorState error={config.error} retry={() => void config.refetch()} />
          ) : (
            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
              {mode === 'signup' && (
                <>
                  <label className="block">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</span>
                    <input type="text" autoComplete="name" placeholder="Budi Santoso" className="nexus-auth-input" {...form.register('full_name')} />
                    {form.formState.errors.full_name && <span className="nexus-field-error">{form.formState.errors.full_name.message}</span>}
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Username</span>
                    <input type="text" autoComplete="username" placeholder="budi.santoso" className="nexus-auth-input" {...form.register('username')} />
                    {form.formState.errors.username && <span className="nexus-field-error">{form.formState.errors.username.message}</span>}
                  </label>
                </>
              )}
              <label className="block">
                <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">{mode === 'login' ? 'Email atau Username' : 'Email'}</span>
                <input type={mode === 'login' ? 'text' : 'email'} autoComplete={mode === 'login' ? 'username' : 'email'} placeholder={mode === 'login' ? 'budi.santoso atau budi@example.com' : 'budi@example.com'} className="nexus-auth-input" {...form.register('email')} />
                {form.formState.errors.email && <span className="nexus-field-error">{form.formState.errors.email.message}</span>}
              </label>
              {mode === 'signup' && (
                <label className="block">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Nomor Telepon</span>
                  <input type="tel" autoComplete="tel" placeholder="+62 812-3456-7890" className="nexus-auth-input" {...form.register('phone')} />
                  {form.formState.errors.phone && <span className="nexus-field-error">{form.formState.errors.phone.message}</span>}
                </label>
              )}
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
              {mode === 'signup' && (
                <label className="block">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Konfirmasi Kata Sandi</span>
                  <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Ulangi kata sandi" className="nexus-auth-input" {...form.register('confirm_password')} />
                  {form.formState.errors.confirm_password && <span className="nexus-field-error">{form.formState.errors.confirm_password.message}</span>}
                </label>
              )}
              {mode === 'login' && (
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-700 bg-black/50 text-[var(--nexus-yellow)] focus:ring-[var(--nexus-yellow)]" />
                  Ingat Saya
                </label>
              )}
              {mutation.isError &&
                !(
                  mutation.error instanceof ApiError &&
                  ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(mutation.error.code)
                ) && <div className="nexus-form-error" role="alert">{message(mutation.error)}</div>}
              <button id={mode === 'login' ? 'login-submit-btn' : undefined} type="submit" className="nexus-auth-submit w-full mt-4" disabled={mutation.isPending}>
                {mutation.isPending && <LoaderCircle className="spin" size={18} />}
                {mutation.isPending ? (mode === 'signup' ? 'Membuat Akun…' : 'Memproses…') : copy[mode].button}
              </button>
            </form>
          )}

          {mode === 'login' && config.data?.allowPublicSignup && (
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
