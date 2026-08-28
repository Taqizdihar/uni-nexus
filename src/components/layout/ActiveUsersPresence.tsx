import React, { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { usePresence } from '../../context/PresenceContext';

export function ActiveUsersPresence() {
  const { active_users, active_count } = usePresence();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const collaborators = active_users.filter(user => !user.is_self);
  const visible = collaborators.slice(0, 4);
  const overflow = collaborators.length - visible.length;

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const outside = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', keydown); document.addEventListener('mousedown', outside);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('mousedown', outside); };
  }, []);

  const description = active_count === 1 ? '1 pengguna aktif' : `${active_count} pengguna aktif`;
  return (
    <div ref={root} data-testid="active-users-presence" className="relative shrink-0">
      <button type="button" onClick={() => setOpen(value => !value)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Pengguna aktif: ${description}`} className="flex items-center min-h-8 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--nexus-yellow)]/30">
        <span className="hidden min-[900px]:flex -space-x-2 px-1">
          {visible.map(user => <span key={user.id} title={`${user.full_name} · ${user.role?.name || 'Pengguna'}`} className="rounded-full ring-2 ring-white"><UserAvatar user={user} size="md" /></span>)}
          {overflow > 0 && <span className="w-8 h-8 rounded-full ring-2 ring-white bg-[var(--nexus-charcoal)] text-white text-[10px] font-bold inline-flex items-center justify-center">+{overflow}</span>}
          {!collaborators.length && <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center"><Users className="w-4 h-4" /></span>}
        </span>
        <span className="min-[900px]:hidden inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-600"><Users className="w-4 h-4" /><span>{active_count}</span></span>
        <span className="w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white -ml-1" aria-hidden="true" />
      </button>
      {open && (
        <section role="dialog" aria-label="Pengguna Aktif" className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><p className="font-semibold text-sm text-[var(--nexus-charcoal)]">Pengguna Aktif</p><span className="text-xs text-gray-500">{description}</span></header>
          <div className="max-h-72 overflow-y-auto p-2">
            {active_users.length ? active_users.map(user => <div key={user.id} className="flex gap-3 items-center px-2 py-2 rounded-lg">
              <span className="relative"><UserAvatar user={user} size="lg" /><span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-800 truncate">{user.full_name} {user.is_self && <span className="text-xs text-gray-500">(Anda)</span>}</p><p className="text-xs text-gray-500 truncate">{user.role?.name || 'Pengguna'} · {user.workspaces.map(value => value === 'craft' ? 'Craft' : 'Studio').join(', ') || '—'}</p></div>
              <span className="text-[10px] font-medium text-emerald-700 whitespace-nowrap">aktif sekarang</span>
            </div>) : <p className="text-sm text-gray-500 px-3 py-5 text-center">Belum ada pengguna aktif.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
