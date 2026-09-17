import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, body, message, type Page } from '../lib/api';
import { useAuth } from '../lib/auth';
import { display, resourcePath } from '../lib/format';
import { useResources } from '../lib/resources';
import { EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';

export function Notifications() {
  const { workspace } = useAuth();
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const toast = useToast();
  const resources = useResources();
  const query = useQuery({ queryKey: ['notifications', workspace!.id, unread, page], queryFn: () => api<Page>(`/notifications?page=${page}&pageSize=20${unread ? '&unread=true' : ''}`, { workspace: workspace!.id }) });
  const mutation = useMutation({ mutationFn: (id?: string) => api(id ? `/notifications/${id}` : '/notifications/read-all', { method: id ? 'PATCH' : 'POST', body: body(id ? { read_at: new Date().toISOString() } : {}), workspace: workspace!.id }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['notifications', workspace!.id] }), client.invalidateQueries({ queryKey: ['unread', workspace!.id] })]); }, onError: (error) => toast(message(error), true) });
  return <><PageHeader eyebrow="KEEP IN THE LOOP" title="Notifications" description="The updates that keep your team’s work moving." actions={<><Link className="button secondary" to="/app/notification-settings"><Settings2 size={16} />Preferences</Link><button className="button primary" disabled={mutation.isPending} onClick={() => mutation.mutate(undefined)}><CheckCheck size={17} />Mark all as read</button></>} /><div className="section-tabs"><button className={!unread ? 'selected' : ''} onClick={() => { setUnread(false); setPage(1); }}>All notifications</button><button className={unread ? 'selected' : ''} onClick={() => { setUnread(true); setPage(1); }}>Unread</button></div><section className="panel">{query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : !query.data.data.length ? <EmptyState title={unread ? 'You’re all caught up' : 'A little quiet, in a good way'} description="Updates about requests, orders, print failures, and quality checks will appear here." /> : <><div className="notification-list">{query.data.data.map((item) => { const target = resources.data?.find((resource) => resource.key === String(item.entity_type).replace(/_/g, '-') || resource.table === item.entity_type); return <article key={item.id} className={`notification-item ${item.read_at ? '' : 'unread'}`}><span className="activity-icon"><Bell size={18} /></span><div><h3>{String(item.title)}</h3><p>{String(item.message || '')}</p><small>{display(item.created_at, { name: 'created_at', label: 'Date', type: 'datetime' })}{target && item.entity_id ? <Link to={`${resourcePath(target.key)}/${item.entity_id}`}>Open record</Link> : null}</small></div>{!item.read_at && <button className="icon-button" disabled={mutation.isPending} onClick={() => mutation.mutate(item.id)} aria-label={`Mark ${item.title} as read`}><Check size={18} /></button>}</article>; })}</div><div className="pagination"><span>{query.data.meta.total} notifications</span><div><button className="icon-button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {page} of {Math.max(1, query.data.meta.totalPages)}</span><button className="icon-button" disabled={page >= query.data.meta.totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div></>}</section></>;
}
