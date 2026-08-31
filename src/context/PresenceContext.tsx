import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, API_URL } from '../lib/api';
import { presenceApi } from '../services/api/presence.api';
import type { PresenceSnapshot } from '../types/presence';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';

interface PresenceContextValue extends PresenceSnapshot {
  refresh: () => Promise<void>;
}

const empty: PresenceSnapshot = { active_users: [], active_count: 0, ttl_seconds: 90, generated_at: '' };
const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);
const SESSION_KEY = 'uni-nexus.presence.session';

function sessionKey() {
  let key = sessionStorage.getItem(SESSION_KEY);
  if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, key); }
  return key;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>(empty);
  const key = useRef<string | null>(null);
  const running = Boolean(user && localStorage.getItem('token') && activeWorkspace !== 'global');

  const heartbeat = async () => {
    if (!running) return;
    try {
      const result = await presenceApi.heartbeat(key.current || (key.current = sessionKey()), activeWorkspace as 'craft' | 'studio');
      setSnapshot(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setSnapshot(empty);
    }
  };

  const refresh = async () => {
    if (!running) return;
    try { setSnapshot(await presenceApi.active()); } catch { /* Presence must not disrupt the application shell. */ }
  };

  useEffect(() => {
    if (!running) { setSnapshot(empty); return; }
    key.current = sessionKey();
    void heartbeat();
    const interval = window.setInterval(() => { if (!document.hidden) void heartbeat(); }, 30_000);
    const online = () => void heartbeat();
    const visible = () => { if (!document.hidden) { void heartbeat(); void refresh(); } };
    const pagehide = () => {
      const token = localStorage.getItem('token');
      if (!token || !key.current) return;
      void fetch(`${API_URL}/presence/leave`, { method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ session_key: key.current }) });
    };
    window.addEventListener('online', online); document.addEventListener('visibilitychange', visible); window.addEventListener('pagehide', pagehide);
    return () => { window.clearInterval(interval); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pagehide', pagehide); };
  }, [running, activeWorkspace]);

  const value = useMemo(() => ({ ...snapshot, refresh }), [snapshot]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('usePresence must be used within a PresenceProvider');
  return context;
}
