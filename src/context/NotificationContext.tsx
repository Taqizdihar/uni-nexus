import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { AppNotification, NotificationsList, NotificationSummary } from '../lib/notifications';
import { useAuth } from './AuthContext';

type NotificationContextValue = {
  unreadCount: number;
  criticalUnreadCount: number;
  todayCount: number;
  recentNotifications: AppNotification[];
  isLoading: boolean;
  error: string | null;
  refreshVersion: number;
  refreshSummary: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (notification: AppNotification) => Promise<void>;
  markUnread: (notification: AppNotification) => Promise<void>;
  markAllRead: () => Promise<number>;
};
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<NotificationSummary>({ unread_count: 0, critical_unread_count: 0, today_count: 0 });
  const [recentNotifications, setRecentNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refreshSummary = useCallback(async () => {
    if (!user) return;
    const data = await api.get<NotificationSummary>('/notifications/summary');
    setSummary(data);
  }, [user]);
  const refreshRecent = useCallback(async () => {
    if (!user) return;
    const data = await api.get<NotificationsList>('/notifications?status=all&page=1&limit=6');
    setRecentNotifications(data.items);
  }, [user]);
  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true); setError(null);
    try {
      await Promise.all([refreshSummary(), refreshRecent()]);
      setRefreshVersion((current) => current + 1);
    }
    catch { setError('Notifikasi tidak dapat dimuat.'); }
    finally { setIsLoading(false); }
  }, [refreshRecent, refreshSummary, user]);

  useEffect(() => {
    if (!user) { setSummary({ unread_count: 0, critical_unread_count: 0, today_count: 0 }); setRecentNotifications([]); return; }
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    window.addEventListener('focus', onFocus); document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh, user]);

  const markRead = useCallback(async (notification: AppNotification) => {
    if (notification.is_read) return;
    setRecentNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item));
    setSummary((current) => ({ ...current, unread_count: Math.max(0, current.unread_count - 1), critical_unread_count: notification.severity_code === 'critical' ? Math.max(0, current.critical_unread_count - 1) : current.critical_unread_count }));
    try { await api.patch(`/notifications/${notification.id}/read`, {}); }
    catch (error) { await refresh(); throw error; }
  }, [refresh]);
  const markUnread = useCallback(async (notification: AppNotification) => {
    if (!notification.is_read) return;
    setRecentNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: false, read_at: null } : item));
    setSummary((current) => ({ ...current, unread_count: current.unread_count + 1, critical_unread_count: notification.severity_code === 'critical' ? current.critical_unread_count + 1 : current.critical_unread_count }));
    try { await api.patch(`/notifications/${notification.id}/unread`, {}); }
    catch (error) { await refresh(); throw error; }
  }, [refresh]);
  const markAllRead = useCallback(async () => {
    try {
      const result = await api.post<{ affected_count: number }>('/notifications/mark-all-read', {});
      setRecentNotifications((items) => items.map((item) => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })));
      setSummary((current) => ({ ...current, unread_count: 0, critical_unread_count: 0 }));
      return result.affected_count;
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [refresh]);
  const value = useMemo(() => ({ unreadCount: summary.unread_count, criticalUnreadCount: summary.critical_unread_count, todayCount: summary.today_count, recentNotifications, isLoading, error, refreshVersion, refreshSummary, refreshRecent, refresh, markRead, markUnread, markAllRead }), [summary, recentNotifications, isLoading, error, refreshVersion, refreshSummary, refreshRecent, refresh, markRead, markUnread, markAllRead]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
