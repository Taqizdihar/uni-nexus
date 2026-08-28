import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { getAvatarUrl } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { User, Mail, Lock, ShieldCheck, Key, Camera, Trash2 } from 'lucide-react';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarMsg({ type: '', text: '' });
    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'Format tidak didukung. Gunakan JPG, PNG, atau WEBP.' });
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarMsg({ type: 'error', text: 'File terlalu besar. Maksimal 5 MB.' });
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setIsUploadingAvatar(true);
    try {
      const form = new FormData();
      form.set('avatar', file);
      await api.post('/profile/avatar', form);
      setAvatarMsg({ type: 'success', text: 'Upload berhasil.' });
      await checkAuth();
    } catch (error: any) {
      setAvatarMsg({ type: 'error', text: error.message || 'Gagal mengunggah foto profil.' });
    } finally {
      URL.revokeObjectURL(objectUrl);
      setAvatarPreview(null);
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    setIsDeletingAvatar(true);
    setAvatarMsg({ type: '', text: '' });
    try {
      await api.delete('/profile/avatar');
      await checkAuth();
    } catch (error: any) {
      setAvatarMsg({ type: 'error', text: error.message || 'Gagal menghapus foto profil.' });
    } finally {
      setIsDeletingAvatar(false);
      setConfirmDeleteAvatar(false);
    }
  };

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
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              {(avatarPreview || getAvatarUrl(user?.avatar_path)) ? (
                <img
                  src={avatarPreview || getAvatarUrl(user?.avatar_path)}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-[var(--nexus-yellow-deep)]/10 text-[var(--nexus-yellow-deep)] rounded-full flex items-center justify-center text-3xl font-bold">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs">...</div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--nexus-yellow)] text-black flex items-center justify-center shadow-sm hover:bg-[var(--nexus-yellow-deep)] disabled:opacity-50"
                aria-label="Ubah foto profil"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />

            <h2 className="text-lg font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm mb-3">{user?.email}</p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--nexus-cream-soft)] text-[var(--nexus-yellow-deep)] border border-[var(--nexus-yellow)]/30 mb-4">
              <ShieldCheck className="w-4 h-4" />
              {user?.role?.name || 'Pengguna'}
            </div>

            {avatarMsg.text && (
              <div className={`mb-3 p-2 rounded-lg text-xs ${avatarMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {avatarMsg.text}
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar}>
                <Camera className="w-3.5 h-3.5" /> Ubah Foto
              </Button>
              {user?.avatar_path && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDeleteAvatar(true)} disabled={isDeletingAvatar}>
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </Button>
              )}
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDeleteAvatar}
          title="Hapus Foto Profil"
          description="Foto profil Anda akan dihapus dan digantikan dengan inisial nama. Lanjutkan?"
          variant="danger"
          confirmLabel="Hapus"
          isLoading={isDeletingAvatar}
          onConfirm={handleAvatarDelete}
          onCancel={() => setConfirmDeleteAvatar(false)}
        />

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
