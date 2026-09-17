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
  return <><PageHeader eyebrow="TETAP TERHUBUNG" title="Notifikasi" description="Pembaruan yang menjaga pekerjaan tim Anda tetap berjalan." actions={<><Link className="button secondary" to="/app/notification-settings"><Settings2 size={16} />Preferensi</Link><button className="button primary" disabled={mutation.isPending} onClick={() => mutation.mutate(undefined)}><CheckCheck size={17} />Tandai Semua Dibaca</button></>} /><div className="section-tabs"><button className={!unread ? 'selected' : ''} onClick={() => { setUnread(false); setPage(1); }}>Semua notifikasi</button><button className={unread ? 'selected' : ''} onClick={() => { setUnread(true); setPage(1); }}>Belum dibaca</button></div><section className="panel">{query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : !query.data.data.length ? <EmptyState title={unread ? 'Semua sudah dibaca' : 'Masih sepi, dengan cara yang baik'} description="Pembaruan tentang permintaan, pesanan, kegagalan cetak, dan kontrol kualitas akan muncul di sini." /> : <><div className="notification-list">{query.data.data.map((item) => { const target = resources.data?.find((resource) => resource.key === String(item.entity_type).replace(/_/g, '-') || resource.table === item.entity_type); return <article key={item.id} className={`notification-item ${item.read_at ? '' : 'unread'}`}><span className="activity-icon"><Bell size={18} /></span><div><h3>{String(item.title)}</h3><p>{String(item.message || '')}</p><small>{display(item.created_at, { name: 'created_at', label: 'Date', type: 'datetime' })}{target && item.entity_id ? <Link to={`${resourcePath(target.key)}/${item.entity_id}`}>Buka catatan</Link> : null}</small></div>{!item.read_at && <button className="icon-button" disabled={mutation.isPending} onClick={() => mutation.mutate(item.id)} aria-label={`Tandai ${item.title} sebagai dibaca`}><Check size={18} /></button>}</article>; })}</div><div className="pagination"><span>{query.data.meta.total} notifikasi</span><div><button className="icon-button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button><span>Halaman {page} dari {Math.max(1, query.data.meta.totalPages)}</span><button className="icon-button" disabled={page >= query.data.meta.totalPages} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={16} /></button></div></div></>}</section></>;
}
