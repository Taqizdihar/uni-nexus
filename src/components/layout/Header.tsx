import React, { useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Bell, Search, UserCircle, ArrowLeftRight } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Header() {
  const { activeWorkspace, setWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleWorkspaceToggle = () => {
    const nextWorkspace = activeWorkspace === 'craft' ? 'studio' : 'craft';
    setWorkspace(nextWorkspace);

    const currentPath = location.pathname;
    
    // Global routes mapping
    const globalRoutes = [
      '/app/dashboard',
      '/app/finance',
      '/app/documents',
      '/app/calendar',
      '/app/notifications',
      '/app/settings',
      '/app/audit-log',
      '/app/users',
      '/app/reports',
      '/app/automations',
      '/app/integrations',
      '/app/master-data'
    ];

    const isGlobal = globalRoutes.some(route => currentPath.startsWith(route));

    if (!isGlobal) {
      if (nextWorkspace === 'studio' && currentPath.startsWith('/app/craft')) {
        navigate('/app/studio/projects');
      } else if (nextWorkspace === 'craft' && currentPath.startsWith('/app/studio')) {
        navigate('/app/craft/orders');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[var(--nexus-border)] flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--nexus-yellow-deep)] transition-colors" />
          <input 
            id="global-search"
            type="text" 
            placeholder="Cari pesanan, proyek, klien..." 
            className="w-full pl-10 pr-12 py-2 bg-[var(--nexus-cream-soft)] border border-transparent rounded-md text-sm focus:outline-none focus:bg-white focus:border-[var(--nexus-yellow)] transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-60">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans font-medium text-gray-500 bg-white border border-gray-200 rounded">⌘</kbd>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans font-medium text-gray-500 bg-white border border-gray-200 rounded">K</kbd>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={handleWorkspaceToggle}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 hover:border-[var(--nexus-yellow)] hover:bg-[var(--nexus-cream-soft)] transition-all group"
          title="Ganti Ruang Kerja"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--nexus-charcoal)] transition-colors" />
          <span className="text-xs text-gray-500 font-medium tracking-wide">
            Ruang Kerja: <span className="text-[var(--nexus-charcoal)] font-bold">{activeWorkspace === 'craft' ? 'Uni-Inside Craft' : 'Uni-Inside Studio'}</span>
          </span>
        </button>

        <button className="relative text-gray-500 hover:text-[var(--nexus-charcoal)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="relative group cursor-pointer">
          <button className="text-gray-500 hover:text-[var(--nexus-charcoal)] transition-colors flex items-center">
            {user?.avatar_path ? (
               <img src={user.avatar_path} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
               <UserCircle className="w-6 h-6" />
            )}
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
             <div className="px-4 py-2 border-b border-gray-50">
               <p className="text-sm font-medium text-gray-800">{user?.full_name}</p>
               <p className="text-xs text-gray-500">{user?.role?.name || 'Pengguna'}</p>
             </div>
             <Link to="/app/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-[var(--nexus-cream-soft)] hover:text-[var(--nexus-yellow-deep)] transition-colors">
               Profil Saya
             </Link>
             <Link to="/app/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-[var(--nexus-cream-soft)] hover:text-[var(--nexus-yellow-deep)] transition-colors">
               Preferensi
             </Link>
             <button onClick={logout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
               Keluar
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
