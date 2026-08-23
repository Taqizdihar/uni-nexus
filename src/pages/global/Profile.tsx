import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, ShieldCheck, Key } from 'lucide-react';

export function Profile() {
  const { user, checkAuth } = useAuth();
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });
    
    try {
      await api.patch('/profile', profileData);
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui.' });
      await checkAuth(); // refresh user data in context
    } catch (error: any) {
      setProfileMsg({ type: 'error', text: error.message || 'Gagal memperbarui profil.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }
    
    setIsUpdatingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    
    try {
      await api.post('/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Kata sandi berhasil diubah.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Profil Saya</h1>
        <p className="text-gray-500 mt-1">Kelola informasi pribadi dan keamanan akun Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Profile Card */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-24 h-24 bg-[var(--nexus-yellow-deep)]/10 text-[var(--nexus-yellow-deep)] rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm mb-4">{user?.email}</p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--nexus-cream-soft)] text-[var(--nexus-yellow-deep)] border border-[var(--nexus-yellow)]/30">
              <ShieldCheck className="w-4 h-4" />
              {user?.role?.name || 'Pengguna'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          {/* Profile Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Informasi Pribadi
              </h3>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
              {profileMsg.text && (
                <div className={`p-3 rounded-lg text-sm ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {profileMsg.text}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={profileData.full_name}
                    onChange={e => setProfileData({...profileData, full_name: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    value={profileData.username}
                    onChange={e => setProfileData({...profileData, username: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={e => setProfileData({...profileData, email: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon (Opsional)</label>
                  <input 
                    type="tel" 
                    value={profileData.phone}
                    onChange={e => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Password Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] flex items-center gap-2">
                <Key className="w-5 h-5 text-gray-400" />
                Ubah Kata Sandi
              </h3>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
              {passwordMsg.text && (
                <div className={`p-3 rounded-lg text-sm ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {passwordMsg.text}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Saat Ini</label>
                <input 
                  type="password" 
                  required
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
