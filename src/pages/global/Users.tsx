import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { 
  Users as UsersIcon, ShieldCheck, Clock, Ban, CheckCircle2, 
  XCircle, UserCog, Trash2, Search, Filter 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function Users() {
  const { user: currentUser, hasPermission, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, pending, suspended
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      // Fetch all for simplicity, then filter in frontend or we could pass filters
      const response = await api.get<any[]>('/users');
      setUsers(response);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async (forUserId?: number) => {
    try {
      const endpoint = forUserId ? `/users/roles/available?forUserId=${forUserId}` : '/users/roles/available';
      const response = await api.get<any[]>(endpoint);
      setRoles(response);
    } catch (error) {
      showFeedback('error', 'Gagal memuat daftar peran.');
    }
  };

  useEffect(() => {
    if (!authLoading && hasPermission('users.manage')) {
      fetchUsers();
      fetchRoles();
    }
  }, [authLoading, hasPermission]);

  const handleApprove = async () => {
    try {
      await api.post(`/users/${selectedUser.id}/approve`, { roleCode: selectedRole });
      setIsApproveModalOpen(false);
      fetchUsers();
      fetchRoles(); // Refresh roles to check singleton occupancy
      showFeedback('success', 'Pengguna berhasil disetujui.');
    } catch (error: any) {
      showFeedback('error', error.message || 'Gagal menyetujui pengguna');
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/users/${selectedUser.id}/reject`, { reason: rejectReason });
      setIsRejectModalOpen(false);
      fetchUsers();
      showFeedback('success', 'Pengguna berhasil ditolak.');
    } catch (error: any) {
      showFeedback('error', error.message || 'Gagal menolak pengguna');
    }
  };
  
  const handleUpdateRole = async () => {
    try {
      await api.patch(`/users/${selectedUser.id}/role`, { roleCode: selectedRole });
      setIsRoleModalOpen(false);
      fetchUsers();
      fetchRoles();
      showFeedback('success', 'Peran pengguna berhasil diperbarui.');
    } catch (error: any) {
      showFeedback('error', error.message || 'Gagal mengubah role');
    }
  };

  const handleUpdateStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/users/${userId}/status`, { status_code: newStatus });
      fetchUsers();
      showFeedback('success', newStatus === 'active' ? 'Akun berhasil diaktifkan kembali.' : 'Akun berhasil ditangguhkan.');
    } catch (error: any) {
      showFeedback('error', error.message || 'Gagal mengubah status');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteDialogOpen(false);
      fetchUsers();
      showFeedback('success', 'Pengguna berhasil dihapus.');
    } catch (error: any) {
      setIsDeleteDialogOpen(false);
      showFeedback('error', error.message || 'Gagal menghapus pengguna');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'active') {
      return user.status_code === 'active' && user.approval_status_code === 'approved';
    } else if (activeTab === 'pending') {
      return user.approval_status_code === 'pending';
    } else {
      return user.status_code === 'suspended' || user.approval_status_code === 'rejected';
    }
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-charcoal)] flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-[var(--nexus-yellow-deep)]" />
            Manajemen Pengguna
          </h1>
          <p className="text-gray-500 mt-1">Kelola akses, peran, dan persetujuan akun pengguna</p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {feedbackMsg.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-100 p-4 flex gap-4 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'active' ? 'bg-white text-[var(--nexus-yellow-deep)] shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Pengguna Aktif
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {users.filter(u => u.status_code === 'active' && u.approval_status_code === 'approved').length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <Clock className="w-4 h-4" />
            Menunggu Persetujuan
            {users.filter(u => u.approval_status_code === 'pending').length > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {users.filter(u => u.approval_status_code === 'pending').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('suspended')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'suspended' ? 'bg-white text-red-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <Ban className="w-4 h-4" />
            Ditangguhkan / Ditolak
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
            />
          </div>
        </div>

        {isLoading ? (
           <div className="p-8 text-center text-gray-500">Memuat data pengguna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4 font-semibold">Pengguna</th>
                  <th className="px-6 py-4 font-semibold">Peran & Akses</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Tanggal Daftar</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Tidak ada pengguna yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_path ? (
                            <img src={user.avatar_path} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[var(--nexus-yellow-deep)]/10 text-[var(--nexus-yellow-deep)] flex items-center justify-center font-bold text-sm">
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role ? (
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-gray-700">{user.role.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.approval_status_code === 'pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                            <Clock className="w-3.5 h-3.5" />
                            Menunggu
                          </span>
                        ) : user.approval_status_code === 'rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Ditolak
                          </span>
                        ) : user.status_code === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            <Ban className="w-3.5 h-3.5" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          {activeTab === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole('');
                                  setIsApproveModalOpen(true);
                                }}
                              >
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setRejectReason('');
                                  setIsRejectModalOpen(true);
                                }}
                              >
                                Tolak
                              </Button>
                            </>
                          )}
                          
                          {activeTab === 'active' && (
                            <>
                              {user.id === currentUser?.id ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200" title="Ini adalah akun Anda">
                                  Akun Anda
                                </span>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setSelectedRole(user.role?.code || '');
                                      fetchRoles(user.id);
                                      setIsRoleModalOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-[var(--nexus-yellow-deep)] transition-colors rounded-md hover:bg-[var(--nexus-cream-soft)]"
                                    title="Ubah Peran"
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(user.id, user.status_code)}
                                    className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors rounded-md hover:bg-orange-50"
                                    title="Tangguhkan"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          
                          {activeTab === 'suspended' && (
                             <>
                              {user.status_code === 'suspended' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(user.id, user.status_code)}
                                >
                                  Aktifkan Kembali
                                </Button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {isApproveModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Persetujuan Akun
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Pilih peran (role) untuk memberikan hak akses kepada <strong>{selectedUser.full_name}</strong>.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Peran Sistem</label>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                >
                  <option value="" disabled>-- Pilih Peran --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Batal</Button>
              <Button onClick={handleApprove} disabled={!selectedRole}>Setujui & Berikan Akses</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Tolak Permintaan Akun
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Anda akan menolak permintaan pembuatan akun dari <strong>{selectedUser.full_name}</strong>.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan (Opsional)</label>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                  rows={3}
                  placeholder="Bukan karyawan aktif..."
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Batal</Button>
              <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white">Tolak Akun</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Change Role Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[var(--nexus-charcoal)] flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[var(--nexus-yellow-deep)]" />
                Ubah Peran Pengguna
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Peran Baru</label>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-[var(--nexus-yellow)] focus:ring-1 focus:ring-[var(--nexus-yellow)]"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>{role.name}</option>
                  ))}
                  {/* Keep current role if not in available (e.g. singleton) to allow keeping it */}
                  {selectedUser.role && !roles.find(r => r.code === selectedUser.role.code) && (
                     <option value={selectedUser.role.code}>{selectedUser.role.name} (Saat Ini)</option>
                  )}
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Batal</Button>
              <Button onClick={handleUpdateRole}>Simpan Perubahan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog 
        open={isDeleteDialogOpen}
        title="Hapus Pengguna?"
        description={
          <>
            Pengguna <strong>{selectedUser?.full_name}</strong> akan dihapus dari akses aktif UNI-NEXUS. Riwayat sistem dan data terkait tetap dipertahankan.
          </>
        }
        confirmLabel="Hapus Pengguna"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
