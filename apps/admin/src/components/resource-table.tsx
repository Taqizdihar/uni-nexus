import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { FieldDefinition, ResourceDefinition } from '@uni-nexus/shared';
import { api, type Envelope, type Page, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { display, recordName, resourcePath, titleCase } from '../lib/format';
import { Badge, EmptyState, ErrorState, Spinner } from './ui';

export function RelationLabel({ field, value }: { field: FieldDefinition; value: unknown }) {
  const { workspace } = useAuth();
  const query = useQuery({ queryKey: ['record', workspace!.id, field.reference, String(value)], enabled: !!value && !!field.reference, staleTime: 60_000, queryFn: async () => (await api<Envelope<Row>>(`/${field.reference}/${value}`, { workspace: workspace!.id })).data, retry: false });
  if (!value) return <>—</>;
  if (query.isPending) return <span className="subtle">Memuat…</span>;
  if (!query.data) return <span className="subtle">Catatan tertaut #{String(value)}</span>;
  if (field.reference === 'users' || field.reference === 'roles') return <>{recordName(query.data)}</>;
  return <Link className="table-link" to={`${resourcePath(field.reference!)}/${value}`} onClick={(event) => event.stopPropagation()}>{recordName(query.data)}</Link>;
}

export function FieldValue({ field, value }: { field?: FieldDefinition; value: unknown }) {
  if (field?.type === 'relation') return <RelationLabel field={field} value={value} />;
  if (field?.type === 'select' && value) return <Badge value={value} />;
  if (field?.type === 'boolean') return <span className={value ? 'yes-value' : 'subtle'}>{value ? 'Ya' : 'Tidak'}</span>;
  return <>{display(value, field)}</>;
}

export function ResourceTable({ resource, filters = {}, compact = false }: { resource: ResourceDefinition; filters?: Record<string, string>; compact?: boolean }) {
  const { workspace } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(compact ? '' : searchParams.get('search') || '');
  const [debounced, setDebounced] = useState(search);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(compact ? '' : searchParams.get('status') || '');
  const [sort, setSort] = useState('created_at');
  const [direction, setDirection] = useState('desc');
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const pageSize = compact ? 8 : 20;
  const directFilters = compact ? filters : { ...Object.fromEntries([...searchParams.entries()].filter(([key]) => resource.fields.some((field) => field.name === key) && key !== 'status')), ...filters };
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort, direction, ...directFilters });
  if (debounced) params.set('search', debounced);
  if (status) params.set('status', status);
  const query = useQuery({ queryKey: ['records', workspace!.id, resource.key, params.toString()], queryFn: () => api<Page>(`/${resource.key}?${params}`, { workspace: workspace!.id }) });
  const statusField = resource.fields.find((field) => field.name === 'status' && field.type === 'select');
  const columns = resource.columns.slice(0, compact ? 4 : 6);
  const createParams = new URLSearchParams(directFilters).toString();
  const createLink = `${resourcePath(resource.key)}/new${createParams ? `?${createParams}` : ''}`;
  const createAction = !resource.readOnly && <Link className="button primary small" to={createLink}><Plus size={15} />Tambah {resource.singular.toLowerCase()}</Link>;
  const changeSort = (column: string) => { setSort(column); setDirection(sort === column && direction === 'asc' ? 'desc' : 'asc'); setPage(1); };
  return <div className={`resource-table ${compact ? 'compact-table' : 'panel'}`}>
    <div className="table-toolbar"><div className="search-field"><Search size={17} /><input aria-label={`Cari ${resource.title.toLowerCase()}`} placeholder={`Cari ${resource.title.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button aria-label="Hapus pencarian" onClick={() => setSearch('')}><X size={14} /></button>}</div><div className="table-filters">{statusField && <select aria-label="Filter berdasarkan status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{statusField.options?.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select>}{compact ? createAction : <span className="record-count">{query.data?.meta.total ?? '—'} catatan</span>}</div></div>
    {!compact && Object.keys(directFilters).length > 0 && <div className="active-filters"><span>Menampilkan catatan tertaut</span><button onClick={() => { setSearchParams({}); setPage(1); }}><X size={13} />Hapus Filter</button></div>}
    {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : !query.data.data.length ? <EmptyState title={search || status ? 'Tidak ada catatan yang cocok' : `Belum ada ${resource.title.toLowerCase()}`} description={search || status ? 'Coba kata kunci lain atau hapus filter status.' : `Tambahkan ${resource.singular.toLowerCase()} pertama Anda untuk mulai membangun workspace.`} action={search || status ? <button className="button secondary small" onClick={() => { setSearch(''); setStatus(''); }}>Hapus Pencarian & Filter</button> : createAction} /> : <><div className="table-scroll"><table><thead><tr>{columns.map((name) => <th key={name}><button className="sort-button" onClick={() => changeSort(name)}>{resource.fields.find((field) => field.name === name)?.label || titleCase(name)}{sort === name ? direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} />}</button></th>)}<th><span className="sr-only">Buka catatan</span></th></tr></thead><tbody>{query.data.data.map((row) => <tr key={row.id}>{columns.map((name, index) => <td key={name} className={index === 0 ? 'primary-cell' : ''}>{index === 0 && resource.fields.find((field) => field.name === name)?.type !== 'relation' ? <Link className="record-link" to={`${resourcePath(resource.key)}/${row.id}`}><FieldValue field={resource.fields.find((field) => field.name === name)} value={row[name]} /></Link> : <FieldValue field={resource.fields.find((field) => field.name === name)} value={row[name]} />}</td>)}<td className="row-action"><Link aria-label={`Buka ${recordName(row)}`} to={`${resourcePath(resource.key)}/${row.id}`}><ChevronRight size={17} /></Link></td></tr>)}</tbody></table></div><div className="pagination"><span>Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, query.data.meta.total)} dari {query.data.meta.total}</span><div><button className="icon-button" aria-label="Halaman sebelumnya" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><span>Halaman {page} dari {Math.max(1, query.data.meta.totalPages)}</span><button className="icon-button" aria-label="Halaman berikutnya" disabled={page >= query.data.meta.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div></>}
  </div>;
}
