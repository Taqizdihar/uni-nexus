import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

import { AnimatedBrandText } from '../../components/common/AnimatedBrandText';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // If focus is already on an input or button, let native form submission handle it
        if (
          document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'BUTTON'
        ) {
          return;
        }
        e.preventDefault();
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
          submitBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await api.post<any>('/auth/login', formData);
      login(response.token, response.user);
      
      const from = location.state?.from?.pathname || '/app/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark-theme flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <Link to="/" className="flex flex-col items-center group mb-8">
          <span className="text-5xl md:text-6xl font-bold tracking-tight text-white glow-text">
            <AnimatedBrandText text="UNI-NEXUS" glow />
          </span>
        </Link>
        
        <div className="w-full max-w-md bg-[var(--nexus-charcoal)]/50 backdrop-blur-md p-8 rounded-2xl border border-gray-800">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">Masuk ke UNI-NEXUS</h2>
            <p className="text-sm text-gray-400">Nexus Creationis et Productionis</p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Email atau Nama Pengguna</label>
              <input 
                type="text" 
                value={formData.usernameOrEmail}
                onChange={(e) => setFormData({ ...formData, usernameOrEmail: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors"
                placeholder="Email atau Nama Pengguna"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Kata Sandi</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors"
                placeholder="Kata Sandi"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-700 bg-black/50 text-[var(--nexus-yellow)] focus:ring-[var(--nexus-yellow)]" />
                Ingat Saya
              </label>
            </div>
            
            <Button id="login-submit-btn" type="submit" className="w-full mt-4" size="lg" disabled={isLoading}>
              {isLoading ? 'Masuk...' : 'Tekan Enter untuk Masuk'}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            Belum memiliki akun? <Link to="/register" className="text-[var(--nexus-yellow)] hover:text-white transition-colors">Daftar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
