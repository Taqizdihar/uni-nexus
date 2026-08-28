import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface UserAvatarProps {
  user: { id?: number; full_name?: string; avatar_path?: string | null };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colors = ['bg-sky-700', 'bg-violet-700', 'bg-emerald-700', 'bg-rose-700', 'bg-amber-700', 'bg-cyan-700'];
const initials = (name?: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || '?';
const hash = (value: string) => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0);

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const dimensions = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-[11px]', lg: 'w-10 h-10 text-xs' };
  const color = colors[hash(`${user.id || ''}:${user.full_name || ''}`) % colors.length];
  if (user.avatar_path && !broken) {
    return <img src={user.avatar_path} alt="" onError={() => setBroken(true)} className={cn('rounded-full object-cover shrink-0', dimensions[size], className)} />;
  }
  return <span aria-hidden="true" className={cn('rounded-full shrink-0 inline-flex items-center justify-center text-white font-bold', color, dimensions[size], className)}>{initials(user.full_name)}</span>;
}
