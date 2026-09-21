import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { ROLE_LABELS, type RoleCode } from '@uni-nexus/shared';
import { SafeImage } from './safe-image';
import { useOnlineUsers, type OnlineUser } from '../lib/presence';
import { PresenceBadge } from './presence-badge';

const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const roleLabel = (role: OnlineUser['role']) => (role ? ROLE_LABELS[role.code as RoleCode] ?? role.name : '');

function OnlineAvatar({ user, overflow }: { user?: OnlineUser; overflow?: number }) {
  if (overflow !== undefined) return <span className="online-avatar online-avatar-overflow">+{overflow}</span>;
  if (!user) return null;
  return (
    <span className="online-avatar" title={user.full_name}>
      <SafeImage source={user.photo_url} alt="" fallback={<span className="online-avatar-initials">{initials(user.full_name)}</span>} />
      <span className="online-dot" />
    </span>
  );
}

export function OnlineUsers() {
  const { data, isPending } = useOnlineUsers();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const users = data ?? [];
  const visible = users.slice(0, 3);
  const overflow = users.length - visible.length;
  const statusLine = users.length === 0 ? 'Belum ada anggota lain yang aktif saat ini.' : users.length === 1 ? '1 anggota sedang menggunakan UNI-NEXUS' : `${users.length} anggota sedang menggunakan UNI-NEXUS`;
  return (
    <div className="online-cluster" ref={containerRef}>
      <button type="button" className="online-cluster-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Sedang aktif — ${users.length} anggota`}>
        {visible.length === 0 ? (
          <span className="online-avatar online-avatar-empty"><Users size={14} /></span>
        ) : (
          visible.map((user) => <OnlineAvatar user={user} key={user.id} />)
        )}
        {overflow > 0 && <OnlineAvatar overflow={overflow} />}
      </button>
      {open && (
        <div className="online-popover" role="dialog" aria-label="Sedang Aktif">
          <div className="online-popover-heading">
            <strong>Sedang Aktif</strong>
            <p>{statusLine}</p>
          </div>
          <div className="online-popover-list">
            {isPending ? (
              <p className="online-popover-empty">Memuat anggota aktif…</p>
            ) : users.length === 0 ? (
              <p className="online-popover-empty">Belum ada anggota lain yang aktif saat ini.</p>
            ) : (
              users.map((user) => (
                <div className="online-popover-item" key={user.id}>
                  <OnlineAvatar user={user} />
                  <div>
                    <strong>{user.full_name}</strong>
                    <small>{roleLabel(user.role)}</small>
                    <small className="online-username">@{user.username}</small>
                  </div>
                  <PresenceBadge status={user.presence_status} size={20} ring={false} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
