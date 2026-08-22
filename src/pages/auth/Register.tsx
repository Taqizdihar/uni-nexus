import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // 1. Register
      await api.post('/auth/register', formData);
      
      // 2. Auto Login after register
      const loginResponse = await api.post<any>('/auth/login', {
        usernameOrEmail: formData.email,
        password: formData.password
      });
      
      login(loginResponse.token, loginResponse.user);
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal membuat akun. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark-theme flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--nexus-yellow)]/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <Link to="/" className="text-2xl font-bold tracking-[0.2em] text-white mb-8 glow-text">
          UNI-NEXUS
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
