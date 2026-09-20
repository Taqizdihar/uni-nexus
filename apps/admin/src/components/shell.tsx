import { useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Bell, BookOpen, Boxes, ChevronDown, ClipboardList, FlaskConical, FolderKanban, Gauge, Layers3, LogOut, Menu, Printer, ScrollText, Search, Settings2, ShieldCheck, SlidersHorizontal, Spool, UserCog, UserCircle, Users, Wallet, X } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { REVIEWER_ROLE_CODES, ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import craftLogo from '../assets/branding/logos/uni-inside-craft/Uni-Inside Craft Light Mode.png';
import { api, assetUrl, message, type Page } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHeartbeat } from '../lib/presence';
import { titleCase } from '../lib/format';
import { AccountActionModal } from './account-action-modal';
import { OnlineUsers } from './online-users';
import { EmptyState, ErrorState, Spinner, useToast } from './ui';

type NavigationItem = { path: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };
const isReviewerRole = (role: string) => (REVIEWER_ROLE_CODES as readonly string[]).includes(role.toUpperCase());
function navigationFor(canReview: boolean): { label: string; items: NavigationItem[] }[] {
  return [
    { label: 'RINGKASAN', items: [{ path: 'dashboard', label: 'Ringkasan', icon: Gauge }] },
    { label: 'PENJUALAN', items: [{ path: 'pesanan', label: 'Pesanan', icon: ClipboardList }, { path: 'customers', label: 'Pelanggan', icon: Users }, { path: 'products', label: 'Katalog Produk', icon: Boxes }] },
    { label: 'OPERASIONAL', items: [{ path: 'produksi', label: 'Produksi', icon: FolderKanban }, { path: 'filament', label: 'Stok Filamen', icon: Spool }] },
    { label: 'MASTER & SETUP', items: [{ path: 'printers', label: 'Printer', icon: Printer }, { path: 'materials', label: 'Material', icon: Layers3 }, { path: 'print-profiles', label: 'Profil Cetak', icon: SlidersHorizontal }, { path: 'pricing-rules', label: 'Aturan Harga', icon: Wallet }] },
    { label: 'LAINNYA', items: [{ path: 'experiments', label: 'Eksperimen', icon: FlaskConical }, { path: 'costing', label: 'Biaya & HPP', icon: Wallet }, { path: 'ip-reviews', label: 'IP & Lisensi', icon: ShieldCheck }, { path: 'team', label: 'Tim', icon: Users }, ...(canReview ? [{ path: 'user-management', label: 'Manajemen Pengguna', icon: UserCog }] : []), { path: 'notifications', label: 'Notifikasi', icon: Bell }, { path: 'audit', label: 'Audit', icon: ScrollText }, { path: 'settings', label: 'Pengaturan', icon: Settings2 }] },
  ];
}

export function Shell() {
  const { session, loading, error, workspace, logout, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const toast = useToast();
  useHeartbeat();
  const unread = useQuery({ queryKey: ['unread', workspace?.id], enabled: !!workspace, queryFn: () => api<Page>('/notifications?unread=true&pageSize=1', { workspace: workspace!.id }), refetchInterval: 60_000 });
  const navigation = navigationFor(session?.workspaces.some((item) => isReviewerRole(item.role)) ?? false);
  const confirmSignout = () => {
    setLoggingOut(true);
    void logout()
      .catch((err: unknown) => toast(message(err), true))
      .finally(() => { setLoggingOut(false); setConfirmLogout(false); });
  };
  if (loading) return <Spinner label="Membuka workspace Anda…" />;
  if (error) return <div className="standalone-state"><ErrorState error={error} retry={() => void refresh()} /></div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  const logoutModal = confirmLogout && <AccountActionModal title="Keluar dari UNI-NEXUS" confirmLabel="Keluar" busy={loggingOut} showReason={false} onClose={() => setConfirmLogout(false)} onConfirm={confirmSignout}>
    <p>Anda akan keluar sebagai {session.user.email}. Anda perlu masuk kembali untuk melanjutkan.</p>
  </AccountActionModal>;
  if (!workspace) return <div className="standalone-state"><div className="panel"><EmptyState title="Akun Anda sudah siap" description="Minta administrator workspace Anda untuk menambahkan alamat email Anda ke tim. Workspace Anda akan muncul di sini setelah akses diberikan." action={<div className="button-row"><button className="button primary" onClick={() => void refresh()}>Periksa akses</button><button className="button secondary" onClick={() => setConfirmLogout(true)}>Keluar</button></div>} /><p className="pending-email">Masuk sebagai {session.user.email}</p></div>{logoutModal}</div>;
  const roleLabel = ROLE_LABELS[workspace.role.toUpperCase() as RoleCode] ?? titleCase(workspace.role);
  return <div className="app-layout">
    {open && <button className="sidebar-backdrop" aria-label="Tutup navigasi" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><Link to="/app/dashboard" className="brand" onClick={() => setOpen(false)}>UNI-NEXUS</Link>
      <nav className="sidebar-nav" aria-label="Navigasi utama">{navigation.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`/app/${path}`} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{path === 'notifications' && !!unread.data?.meta.total && <span className="nav-count">{unread.data.meta.total}</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><span className="live-dot" /><span>Operasional Internal</span><BookOpen size={14} /></div>
    </aside>
    <div className="app-main"><header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" aria-label="Buka navigasi" onClick={() => setOpen(true)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
        <div className="global-search" aria-disabled="true">
          <Search size={16} />
          <input type="text" placeholder="Cari pesanan, proyek, klien…" disabled aria-label="Pencarian (segera hadir)" />
          <span className="global-search-kbd">Ctrl K</span>
        </div>
      </div>
      <div className="topbar-right">
        <OnlineUsers />
        <button type="button" className="workspace-pill" disabled title="Workspace Studio belum tersedia." aria-describedby="workspace-pill-hint">
          <ArrowLeftRight size={14} className="workspace-pill-icon" />
          <span className="workspace-pill-label">WORKSPACE:</span>
          <img src={craftLogo} alt="" className="workspace-pill-logo" />
          <strong>Uni-Inside Craft</strong>
          <ChevronDown size={14} />
          <span className="sr-only" id="workspace-pill-hint">Workspace Studio belum tersedia.</span>
        </button>
        <Link className="icon-button notification-bell" to="/app/notifications" aria-label={`Notifikasi${unread.data ? `, ${unread.data.meta.total} belum dibaca` : ''}`}><Bell size={19} />{!!unread.data?.meta.total && <span />}</Link>
        <div className="user-menu">
          <button className="user-trigger" onClick={() => setUserOpen(!userOpen)} aria-expanded={userOpen} aria-label="Menu pengguna">
            <span className="avatar">{session.user.photo_url ? <img src={assetUrl(session.user.photo_url)} alt="" /> : session.user.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
            <span className="user-info"><strong>{session.user.full_name}</strong><small>{roleLabel}</small></span>
            <ChevronDown size={14} />
          </button>
          {userOpen && <div className="user-dropdown"><p>{session.user.email}</p><Link to="/app/profile" onClick={() => setUserOpen(false)}><UserCircle size={16} />Profil Saya</Link><Link to="/app/settings?tab=account" onClick={() => setUserOpen(false)}><Settings2 size={16} />Pengaturan Akun</Link><button onClick={() => { setUserOpen(false); setConfirmLogout(true); }}><LogOut size={16} />Keluar</button></div>}
        </div>
      </div>
    </header>
      <main className="page-content" key={workspace.id}><Outlet /></main>
      <footer className="app-footer"><span className="app-footer-brand">UNI-NEXUS</span><span>Nexus. Ordo. Opus.</span></footer>
    </div>
    {logoutModal}
  </div>;
}
