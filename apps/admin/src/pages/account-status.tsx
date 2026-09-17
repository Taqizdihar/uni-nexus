import { CalendarClock, ShieldAlert, ShieldX } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatedBrandText } from '../components/public/animated-brand-text';

type StatusState = { code?: string; message?: string; reason?: string } | null;

const presentation = {
  ACCOUNT_PENDING: {
    icon: CalendarClock,
    title: 'Menunggu Persetujuan',
    body: 'UNI-NEXUS adalah sistem internal Uni-Inside. Seorang eksekutif berwenang (CEO, COO, CTO, atau CVO) perlu meninjau dan menyetujui akun Anda sebelum Anda dapat masuk.',
  },
  ACCOUNT_REJECTED: {
    icon: ShieldX,
    title: 'Registrasi Tidak Disetujui',
    body: 'Pendaftaran akun Anda tidak disetujui oleh tim internal.',
  },
  ACCOUNT_SUSPENDED: {
    icon: ShieldAlert,
    title: 'Akun Ditangguhkan',
    body: 'Akun Anda telah ditangguhkan sementara. Hubungi seorang eksekutif berwenang untuk informasi lebih lanjut.',
  },
} as const;

export function AccountStatusPage() {
  const location = useLocation();
  const state = location.state as StatusState;
  const code = state?.code;
  if (!code || !(code in presentation)) return <Navigate to="/login" replace />;
  const info = presentation[code as keyof typeof presentation];
  const Icon = info.icon;
  return (
    <div className="nexus-auth min-h-screen dark-theme flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <Link to="/" className="flex flex-col items-center group mb-6">
          <span className="text-5xl md:text-6xl font-bold tracking-tight text-white glow-text nexus-brand-font">
            <AnimatedBrandText text="UNI-NEXUS" glow />
          </span>
        </Link>
        <div className="w-full max-w-md bg-[var(--nexus-charcoal)]/50 backdrop-blur-md p-8 rounded-2xl border border-gray-800 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[var(--nexus-yellow)]">
            <Icon size={28} strokeWidth={1.7} />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">{info.title}</h1>
          <p className="text-sm text-gray-400 mb-1">{state?.message || info.body}</p>
          {code === 'ACCOUNT_PENDING' && (
            <p className="text-sm text-gray-500 mt-3">{presentation.ACCOUNT_PENDING.body}</p>
          )}
          {state?.reason && (
            <p className="mt-4 rounded-lg border border-gray-800 bg-black/30 px-4 py-3 text-sm text-gray-300">
              <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Alasan</span>
              {state.reason}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/login" className="nexus-auth-submit w-full justify-center">
              Kembali ke Masuk
            </Link>
            <Link to="/" className="text-sm text-gray-500 hover:text-white transition-colors">
              Kembali ke Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
