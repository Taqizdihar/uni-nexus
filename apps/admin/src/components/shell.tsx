import { useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, BookOpen, Box, Boxes, ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, FlaskConical, FolderKanban, Gauge, Layers3, LogOut, Menu, MessageSquare, Package, Palette, Printer, ReceiptText, ScrollText, Settings2, ShieldCheck, SlidersHorizontal, Spool, UserCog, UserCircle, Users, Wallet, X } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { REVIEWER_ROLE_CODES } from '@uni-nexus/shared';
import { api, message, type Page } from '../lib/api';
import { useAuth } from '../lib/auth';
import { titleCase } from '../lib/format';
import { EmptyState, ErrorState, Spinner, useToast } from './ui';

type NavigationItem = { path: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };
const isReviewerRole = (role: string) => (REVIEWER_ROLE_CODES as readonly string[]).includes(role.toUpperCase()) || role.toUpperCase() === 'CEO';
function navigationFor(role: string): { label: string; items: NavigationItem[] }[] {
  return [
    { label: 'WORKSPACE', items: [{ path: 'dashboard', label: 'Overview', icon: Gauge }, { path: 'customers', label: 'Customers', icon: Users }, { path: 'products', label: 'Product catalog', icon: Boxes }] },
    { label: 'PLAN & SELL', items: [{ path: 'requests', label: 'Custom requests', icon: MessageSquare }, { path: 'design-tasks', label: 'Design studio', icon: Palette }, { path: 'quotations', label: 'Quotations', icon: ReceiptText }, { path: 'orders', label: 'Orders', icon: ClipboardList }, { path: 'pricing-rules', label: 'Pricing rules', icon: Wallet }] },
    { label: 'MAKE & DELIVER', items: [{ path: 'production', label: 'Production', icon: FolderKanban }, { path: 'print-queue', label: 'Print queue', icon: Printer }, { path: 'printers', label: 'Printers', icon: Box }, { path: 'print-profiles', label: 'Print profiles', icon: SlidersHorizontal }, { path: 'materials', label: 'Materials', icon: Layers3 }, { path: 'filament', label: 'Filament stock', icon: Spool }, { path: 'failures', label: 'Print failures', icon: Activity }, { path: 'experiments', label: 'Experiments', icon: FlaskConical }, { path: 'costing', label: 'Costing & HPP', icon: Wallet }, { path: 'qc', label: 'Quality control', icon: ClipboardCheck }, { path: 'packaging', label: 'Packaging', icon: Package }, { path: 'ip-reviews', label: 'IP & licensing', icon: ShieldCheck }] },
    {
      label: 'PEOPLE',
      items: [
        { path: 'team', label: 'Team', icon: Users },
        ...(isReviewerRole(role) ? [{ path: 'user-management', label: 'User Management', icon: UserCog }] : []),
      ],
    },
    { label: 'ADMINISTRATION', items: [{ path: 'notifications', label: 'Notifications', icon: Bell }, { path: 'audit', label: 'Activity & audit', icon: ScrollText }, { path: 'settings', label: 'Settings', icon: Settings2 }] },
  ];
}

export function Shell() {
  const { session, loading, error, workspace, setWorkspace, logout, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const unread = useQuery({ queryKey: ['unread', workspace?.id], enabled: !!workspace, queryFn: () => api<Page>('/notifications?unread=true&pageSize=1', { workspace: workspace!.id }), refetchInterval: 60_000 });
  const navigation = navigationFor(workspace?.role ?? '');
  const current = navigation.flatMap((group) => group.items).find((item) => location.pathname.split('/')[2] === item.path);
  const signout = () => { void logout().catch((err: unknown) => toast(message(err), true)); };
  if (loading) return <Spinner label="Opening your workspace…" />;
  if (error) return <div className="standalone-state"><ErrorState error={error} retry={() => void refresh()} /></div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!workspace) return <div className="standalone-state"><div className="panel"><EmptyState title="Your account is ready" description="Ask your workspace administrator to add your email address to the team. Your workspace will appear here once access has been granted." action={<div className="button-row"><button className="button primary" onClick={() => void refresh()}>Check access</button><button className="button secondary" onClick={signout}>Sign out</button></div>} /><p className="pending-email">Signed in as {session.user.email}</p></div></div>;
  return <div className="app-layout">
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><Link to="/app/dashboard" className="brand" onClick={() => setOpen(false)}><span className="brand-mark"><Layers3 size={23} /></span><span>UNI<span className="brand-light">NEXUS</span><small>OPERATIONS, CONNECTED</small></span></Link>
      <div className="workspace-selector"><span className="workspace-icon"><Box size={20} /></span><label><small>Workspace</small><select aria-label="Current workspace" value={workspace.id} onChange={(event) => setWorkspace(event.target.value)}>{session.workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><ChevronDown size={15} /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">{navigation.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`/app/${path}`} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{path === 'notifications' && !!unread.data?.meta.total && <span className="nav-count">{unread.data.meta.total}</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><span className="live-dot" /><span>Internal operations</span><BookOpen size={14} /></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}>{open ? <X size={21} /> : <Menu size={21} />}</button><Link to="/app/dashboard">Workspace</Link><ChevronRight size={14} /><span>{current?.label || titleCase(location.pathname.split('/')[2] || 'Overview')}</span></div><div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span><Link className="icon-button notification-bell" to="/app/notifications" aria-label={`Notifications${unread.data ? `, ${unread.data.meta.total} unread` : ''}`}><Bell size={19} />{!!unread.data?.meta.total && <span />}</Link><div className="user-menu"><button className="user-trigger" onClick={() => setUserOpen(!userOpen)} aria-expanded={userOpen} aria-label="User menu"><span className="avatar">{session.user.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className="user-info"><strong>{session.user.full_name}</strong><small>{titleCase(workspace.role)}</small></span><ChevronDown size={14} /></button>{userOpen && <div className="user-dropdown"><p>{session.user.email}</p><Link to="/app/profile" onClick={() => setUserOpen(false)}><UserCircle size={16} />My Profile</Link><Link to="/app/settings?tab=account" onClick={() => setUserOpen(false)}><Settings2 size={16} />Account settings</Link><button onClick={signout}><LogOut size={16} />Sign out</button></div>}</div></div></header>
      <main className="page-content" key={workspace.id}><Outlet /></main>
      <footer className="app-footer"><span>UNI-NEXUS</span><span>Thoughtful operations. Better outcomes.</span></footer>
    </div>
  </div>;
}
