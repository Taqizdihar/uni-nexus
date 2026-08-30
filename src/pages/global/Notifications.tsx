import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, MailOpen, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { formatNotificationTime, notificationModuleIcon, notificationModuleLabel, relativeNotificationTime, safeNotificationActionUrl, severityClasses, severityLabel, type AppNotification, type NotificationsList, type NotificationSeverity } from '../../lib/notifications';

const severityOptions: Array<'all' | NotificationSeverity> = ['all', 'info', 'success', 'warning', 'error', 'critical'];

export function Notifications() {
  const navigate = useNavigate();
  const { unreadCount, criticalUnreadCount, todayCount, markRead, markUnread, markAllRead, refresh, refreshVersion } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [status, setStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [workspace, setWorkspace] = useState<'all' | 'craft' | 'studio' | 'global'>('all');
  const [severity, setSeverity] = useState<'all' | NotificationSeverity>('all');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [moduleMetadata, setModuleMetadata] = useState<Array<{ code: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ status, workspace, severity, page: String(page), limit: '20' });
    if (module) params.set('module', module);
    if (query) params.set('q', query);
    try {
      const response = await api.get<NotificationsList>(`/notifications?${params.toString()}`);
      const lastPage = Math.max(1, response.pagination.total_pages);
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(response.items); setPagination(response.pagination);
    } catch { setError('Notifikasi tidak dapat dimuat.'); }
    finally { setLoading(false); }
  }, [module, page, query, severity, status, workspace]);

  const loadMetadata = useCallback(async () => {
    try {
      const response = await api.get<{ modules: Array<{ code: string }> }>('/notifications/meta');
      setModuleMetadata(response.modules);
    } catch {
      // The list remains usable if metadata is temporarily unavailable.
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshVersion]);
  useEffect(() => { void loadMetadata(); }, [loadMetadata, refreshVersion]);
  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setQuery(search.trim()); }, 250); return () => window.clearTimeout(timer); }, [search]);
  const availableModules = moduleMetadata.map((item) => item.code);

  const updateLocalRead = (id: number, isRead: boolean) => setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: isRead, read_at: isRead ? new Date().toISOString() : null } : item));
  const openNotification = async (notification: AppNotification) => {
    const action = safeNotificationActionUrl(notification.action_url);
    try { await markRead(notification); updateLocalRead(notification.id, true); await load(); }
    catch { setError('Status notifikasi tidak dapat diperbarui.'); }
    if (action) action.startsWith('/app/') ? navigate(action) : window.open(action, '_blank', 'noopener,noreferrer');
  };
  const toggleRead = async (notification: AppNotification, event: MouseEvent) => {
    event.stopPropagation();
    try {
      if (notification.is_read) { await markUnread(notification); updateLocalRead(notification.id, false); }
      else { await markRead(notification); updateLocalRead(notification.id, true); }
      await load();
    } catch { await refresh(); setError('Status notifikasi tidak dapat diperbarui.'); }
  };
  const markEverythingRead = async () => {
    try { await markAllRead(); await load(); }
    catch { setError('Notifikasi tidak dapat diperbarui.'); }
  };

  return <div className="space-y-5 pb-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-2xl font-bold text-[var(--nexus-charcoal)]">Notifikasi</h1><p className="mt-1 text-sm text-gray-500">Pusat pemberitahuan dan aktivitas penting UNI-NEXUS</p></div>
      <button onClick={() => void markEverythingRead()} disabled={!unreadCount} className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--nexus-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--nexus-charcoal)] shadow-sm transition hover:bg-[var(--nexus-cream-soft)] disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="h-4 w-4" />Tandai Semua Dibaca</button>
    </section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[['Belum Dibaca', unreadCount, 'text-[var(--nexus-yellow-deep)]'], ['Kritis Belum Dibaca', criticalUnreadCount, 'text-red-700'], ['Hari Ini', todayCount, 'text-[var(--nexus-charcoal)]']].map(([label, count, colour]) => <div key={String(label)} className="rounded-lg border border-[var(--nexus-border)] bg-white px-4 py-3 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className={`mt-1 text-2xl font-bold ${colour}`}>{count}</p></div>)}
    </section>

    <section className="rounded-lg border border-[var(--nexus-border)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul atau pesan..." className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--nexus-yellow)]" /></div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as typeof status); }} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="all">Semua status</option><option value="unread">Belum dibaca</option><option value="read">Sudah dibaca</option></select>
          <select value={workspace} onChange={(event) => { setPage(1); setWorkspace(event.target.value as typeof workspace); }} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="all">Semua workspace</option><option value="craft">Craft</option><option value="studio">Studio</option><option value="global">Global</option></select>
          <select value={severity} onChange={(event) => { setPage(1); setSeverity(event.target.value as typeof severity); }} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm">{severityOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'Semua tingkat' : severityLabel(option)}</option>)}</select>
          <select value={module} onChange={(event) => { setPage(1); setModule(event.target.value); }} className="max-w-48 rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"><option value="">Semua modul</option>{availableModules.map((code) => <option key={code} value={code}>{notificationModuleLabel(code)}</option>)}</select>
        </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-lg border border-[var(--nexus-border)] bg-white shadow-sm">
      {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500"><LoaderCircle className="h-5 w-5 animate-spin" />Memuat notifikasi...</div> : error ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500"><p>{error}</p><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" />Coba lagi</button></div> : !items.length ? <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500"><MailOpen className="h-8 w-8 text-gray-300" /><p>{status === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Belum ada notifikasi.'}</p></div> : <ul className="divide-y divide-gray-100">{items.map((notification) => {
        const Icon = notificationModuleIcon(notification.module_code);
        return <li key={notification.id}><div role="button" tabIndex={0} onClick={() => void openNotification(notification)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openNotification(notification); } }} className={`group flex w-full cursor-pointer gap-3 px-4 py-4 text-left transition hover:bg-[var(--nexus-cream-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--nexus-yellow)] ${notification.is_read ? '' : 'bg-amber-50/35'}`}>
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${severityClasses(notification.severity_code)}`}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><span className={`text-sm ${notification.is_read ? 'font-medium text-gray-700' : 'font-semibold text-[var(--nexus-charcoal)]'}`}>{notification.title}</span>{!notification.is_read && <span className="h-2 w-2 rounded-full bg-[var(--nexus-yellow-deep)]" aria-label="Belum dibaca" />}</span><span title={formatNotificationTime(notification.created_at)} className="shrink-0 text-xs text-gray-400">{relativeNotificationTime(notification.created_at)}</span></span><span className="mt-1 block text-sm text-gray-600">{notification.message}</span><span className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500">{notification.workspace?.name || 'Global'}</span><span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500">{notificationModuleLabel(notification.module_code)}</span><span className={`rounded border px-1.5 py-0.5 text-xs ${severityClasses(notification.severity_code)}`}>{severityLabel(notification.severity_code)}</span></span></span>
          <button type="button" onClick={(event) => void toggleRead(notification, event)} className="self-center rounded p-2 text-xs text-gray-400 opacity-100 transition hover:bg-white hover:text-[var(--nexus-charcoal)] sm:opacity-0 sm:group-hover:opacity-100">{notification.is_read ? 'Belum dibaca' : 'Tandai dibaca'}</button>
        </div></li>;
      })}</ul>}
      {!loading && !error && pagination.total_pages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500"><span>Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}</span><span className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-gray-200 p-1 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)} className="rounded border border-gray-200 p-1 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></span></div>}
    </section>
  </div>;
}
