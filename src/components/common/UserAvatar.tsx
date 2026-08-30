import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { resolvePublicStorageUrl } from '../../lib/storage';

interface UserAvatarProps {
  user: { id?: number; full_name?: string; avatar_path?: string | null };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const colors = ['bg-sky-700', 'bg-violet-700', 'bg-emerald-700', 'bg-rose-700', 'bg-amber-700', 'bg-cyan-700'];
export const getUserInitials = (name?: string) => (name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || '?';
const hash = (value: string) => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0);

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const dimensions = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-[11px]', lg: 'w-10 h-10 text-xs', xl: 'w-24 h-24 text-3xl' };
  const color = colors[hash(`${user.id || ''}:${user.full_name || ''}`) % colors.length];
  const avatarUrl = resolvePublicStorageUrl(user.avatar_path);
  useEffect(() => setBroken(false), [user.avatar_path]);
  if (avatarUrl && !broken) {
    return <img src={avatarUrl} alt="" onError={() => setBroken(true)} className={cn('rounded-full object-cover shrink-0', dimensions[size], className)} />;
  }
  return <span aria-hidden="true" className={cn('rounded-full shrink-0 inline-flex items-center justify-center text-white font-bold', color, dimensions[size], className)}>{getUserInitials(user.full_name)}</span>;
}
