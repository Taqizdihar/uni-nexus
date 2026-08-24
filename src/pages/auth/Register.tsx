import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

import { AnimatedBrandText } from '../../components/common/AnimatedBrandText';

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ 
    full_name: '', 
    username: '', 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successPending, setSuccessPending] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await api.post<any>('/auth/register', formData);
      
      if (response.bootstrap) {
         // Auto Login only for Bootstrap CTO
         const loginResponse = await api.post<any>('/auth/login', {
           usernameOrEmail: formData.email,
           password: formData.password
         });
         
         login(loginResponse.token, loginResponse.user);
         navigate('/app/dashboard');
      } else {
         // Show pending approval screen for normal users
         setSuccessPending(true);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat akun. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (successPending) {
    return (
      <div className="min-h-screen dark-theme flex flex-col relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <Link to="/" className="flex flex-col items-center group mb-6">
            <span className="text-5xl md:text-6xl font-bold tracking-[0.2em] text-white glow-text">
              <AnimatedBrandText text="UNI-NEXUS" />
            </span>
          </Link>
          <div className="w-full max-w-md bg-[var(--nexus-charcoal)]/50 backdrop-blur-md p-8 rounded-2xl border border-gray-800 text-center">
             <div className="w-16 h-16 bg-[var(--nexus-yellow)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[var(--nexus-yellow)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <h2 className="text-xl font-semibold text-white mb-4">Permintaan Akun Berhasil Dikirim</h2>
             <p className="text-sm text-gray-400 mb-8 leading-relaxed">
               Akun Anda telah berhasil dibuat dan sedang menunggu persetujuan dari manajemen Uni-Inside. Anda belum dapat masuk ke UNI-NEXUS hingga akun disetujui.
             </p>
             <div className="flex flex-col gap-3">
               <Link to="/" className="w-full">
                 <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800">Kembali ke Halaman Utama</Button>
               </Link>
               <Link to="/login" className="w-full">
                 <Button className="w-full">Masuk</Button>
               </Link>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark-theme flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <Link to="/" className="flex flex-col items-center group mb-6">
          <span className="text-5xl md:text-6xl font-bold tracking-[0.2em] text-white glow-text">
            <AnimatedBrandText text="UNI-NEXUS" />
          </span>
        </Link>
        
        <div className="w-full max-w-md bg-[var(--nexus-charcoal)]/50 backdrop-blur-md p-8 rounded-2xl border border-gray-800">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">Buat Akun</h2>
            <p className="text-sm text-gray-400">Bergabung dengan sistem operasional Uni-Inside</p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <input 
                type="text" 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors text-sm"
                placeholder="Budi Santoso"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors text-sm"
                placeholder="budi"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors text-sm"
                placeholder="budi@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Kata Sandi</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--nexus-yellow)] transition-colors text-sm"
                placeholder="Buat kata sandi"
                required
                minLength={6}
              />
            </div>
            
            <Button type="submit" className="w-full mt-6" size="lg" disabled={isLoading}>
              {isLoading ? 'Membuat Akun...' : 'Buat Akun'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Sudah memiliki akun? <Link to="/login" className="text-[var(--nexus-yellow)] hover:text-white transition-colors">Masuk</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
