import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { CornerDownLeft } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        navigate('/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen dark-theme flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <header className="px-8 py-6 flex items-center justify-between relative z-10">
        <div></div> {/* Empty left side, no UNI-NEXUS lettermark */}
        <div className="flex gap-4 items-center">
          <Link to="/register" className="text-sm font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-wider">
            Daftar
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 text-center">
        <div className="space-y-6 max-w-4xl">
          <p className="text-[var(--nexus-yellow)] tracking-[0.3em] text-xs font-semibold uppercase">
            Nexus Creationis et Productionis
          </p>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white glow-text">
            UNI-NEXUS
          </h1>
          
          <div className="text-2xl md:text-3xl text-gray-400 font-light tracking-wide space-x-4">
            <span className="text-white">Nexus.</span>
            <span>Ordo.</span>
            <span className="text-[var(--nexus-yellow)]">Opus.</span>
          </div>
          
          <p className="text-gray-400 max-w-2xl mx-auto pt-8 text-lg font-light leading-relaxed">
            Sistem terpusat untuk pengelolaan operasional dan keuangan Uni-Inside Studio. 
            Menghubungkan proses produksi 3D dan layanan kreatif dalam satu ekosistem terpadu.
          </p>

          <div className="pt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login" className="inline-flex items-center justify-center rounded-full group px-8 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nexus-yellow)] bg-[var(--nexus-yellow)] text-black hover:bg-[var(--nexus-yellow-deep)] hover:shadow-[0_0_20px_rgba(255,212,59,0.3)]">
              <CornerDownLeft className="mr-2 w-4 h-4" />
              Tekan Enter untuk Masuk
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-gray-600 relative z-10 tracking-wider">
        © {new Date().getFullYear()} UNI-INSIDE STUDIO. HAK CIPTA DILINDUNGI.
      </footer>
    </div>
  );
}
