import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, ArrowRight, Box, Download, File, LoaderCircle, Pencil, Plus, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ResourceDefinition } from '@uni-nexus/shared';
import { api, body, download, message, type Envelope, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, recordName, resourceKey, resourcePath } from '../lib/format';
import { useResources } from '../lib/resources';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';
import { ResourceTable, FieldValue } from '../components/resource-table';
import { ResourceForm, uploadResources } from '../components/resource-form';
import { AddPrinterCatalogDialog, AddPrinterUnitDialog, FilamentGrid, PrinterGrid } from '../components/special-resource-grids';

const clusters: string[][] = [
  ['products', 'product-categories', 'product-variants', 'product-images', 'product-assets', 'product-sales-channels'],
  ['custom-requests', 'request-files', 'request-notes'],
  ['design-tasks', 'design-assets'],
  ['quotations', 'quotation-items'],
  ['orders', 'order-items'],
  ['print-jobs', 'slicing-results'],
  ['materials', 'filament-spools', 'material-usages'],
  ['experiments', 'experiment-measurements'],
  ['production-costs', 'cost-components'],
  ['qc-inspections', 'qc-check-items'],
  ['order-packaging', 'packaging-types'],
  ['ip-reviews', 'ip-review-checklists'],
];

function ResourceNavigation({ resource, resources }: { resource: ResourceDefinition; resources: ResourceDefinition[] }) {
  const cluster = clusters.find((items) => items.includes(resource.key));
  if (!cluster) return null;
  return <nav className="section-tabs" aria-label={`${resource.group} modules`}>{cluster.map((key) => { const item = resources.find((candidate) => candidate.key === key); return item && <Link key={key} className={key === resource.key ? 'selected' : ''} to={resourcePath(key)}>{item.title}</Link>; })}</nav>;
}

type CostSummary = { estimatedHpp: string | null; actualHpp: string; sellingPrice: string; margin: string; filamentCost: string; designCost: string; paintCost: string; materialCost: string; wasteCost: string; packagingCost: string };
function CostOverview() {
  const { workspace } = useAuth();
  const query = useQuery({ queryKey: ['costs-summary', workspace!.id], queryFn: async () => (await api<Envelope<CostSummary>>('/costs/summary', { workspace: workspace!.id })).data });
  if (query.isPending) return <Spinner label="Menghitung biaya tercatat…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <><div className="metric-grid cost-metrics">{[{ label: 'Estimasi HPP', value: query.data.estimatedHpp }, { label: 'HPP Aktual', value: query.data.actualHpp }, { label: 'Harga jual', value: query.data.sellingPrice }, { label: 'Margin tercatat', value: query.data.margin }].map((item) => <div className="metric-card" key={item.label}><div className="metric-top">{item.label}</div><strong className="cost-metric-value">{money(item.value)}</strong></div>)}</div><div className="cost-breakdown"><span>Filamen <strong>{money(query.data.filamentCost)}</strong></span><span>Desain <strong>{money(query.data.designCost)}</strong></span><span>Cat <strong>{money(query.data.paintCost)}</strong></span><span>Waste <strong>{money(query.data.wasteCost)}</strong></span><span>Pengemasan <strong>{money(query.data.packagingCost)}</strong></span></div></>;
}

function FilePanel({ resource, record }: { resource: ResourceDefinition; record: Row }) {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const upload = useMutation({ mutationFn: (file: globalThis.File) => { const form = new FormData(); form.append('file', file); return api(`/files/${resource.key}/${record.id}`, { workspace: workspace!.id, method: 'POST', body: form }); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['record', workspace!.id, resource.key, record.id] }); toast('Berkas diunggah.'); }, onError: (error) => toast(message(error), true) });
  const getFile = async () => { setDownloading(true); try { await download(resource.key, record, workspace!.id); } catch (error) { toast(message(error), true); } finally { setDownloading(false); } };
  return <section className="panel file-panel"><div><span className="file-icon"><File size={24} /></span><div><h3>{String(record.original_filename || record.file_name || 'Lampiran privat')}</h3><p>Akses workspace diperlukan untuk mengunduh berkas ini.</p></div></div><div className="button-row"><button className="button secondary small" onClick={() => void getFile()} disabled={downloading}>{downloading ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}Unduh</button><label className="button secondary small upload-button">{upload.isPending ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}Unggah Berkas<input type="file" aria-label="Unggah atau ganti lampiran" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ''; }} /></label></div></section>;
}

function RecordDetail({ resource, record, resources }: { resource: ResourceDefinition; record: Row; resources: ResourceDefinition[] }) {
  const [tab, setTab] = useState('details');
  const [productDialog, setProductDialog] = useState(false);
  const [productName, setProductName] = useState(recordName(record));
  const { workspace } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const action = useMutation({ mutationFn: ({ path, payload, method = 'POST' }: { path: string; payload?: unknown; method?: string }) => api<Envelope<Row>>(path, { method, body: body(payload || {}), workspace: workspace!.id }), onSuccess: async () => { await client.invalidateQueries({ predicate: (query) => !['session', 'resources'].includes(String(query.queryKey[0])) }); }, onError: (error) => toast(message(error), true) });
  const relations = resource.relations?.filter((relation) => resources.some((item) => item.key === relation.resource)) || [];
  const related = relations.find((relation) => `${relation.resource}:${relation.foreignKey}` === tab);
  const relatedResource = resources.find((item) => item.key === related?.resource);
  const canArchive = resource.key === 'products';
  const archived = record.status === 'ARCHIVED' || record.is_active === false;
  const convert = () => action.mutate({ path: `/quotations/${record.id}/convert` }, { onSuccess: (result) => { toast('Penawaran diubah menjadi pesanan.'); navigate(`/app/orders/${result.data.id}`); } });
  const createProduct = () => action.mutate({ path: `/design-assets/${record.id}/create-product`, payload: { name: productName } }, { onSuccess: (result) => { toast('Draf produk privat dibuat dari desain ini.'); navigate(`/app/products/${result.data.id}`); } });
  const changeArchive = () => action.mutate({ path: `/products/${record.id}`, method: 'PATCH', payload: { status: archived ? 'ACTIVE' : 'ARCHIVED', ...(resource.fields.some((field) => field.name === 'is_active') ? { is_active: archived } : {}) } }, { onSuccess: () => toast(archived ? 'Produk diaktifkan.' : 'Produk diarsipkan.') });
  return <><Link className="back-link" to={resourcePath(resource.key)}><ArrowLeft size={16} />{resource.title}</Link><PageHeader eyebrow={`${resource.singular.toUpperCase()} · #${record.id}`} title={recordName(record)} description={resource.description} actions={<>{canArchive && <button className="button secondary" onClick={changeArchive} disabled={action.isPending}><Archive size={16} />{archived ? 'Aktifkan' : 'Arsipkan'}</button>}{resource.key === 'quotations' && record.status === 'ACCEPTED' && <button className="button primary" onClick={convert} disabled={action.isPending}><ArrowRight size={16} />Ubah ke Pesanan</button>}{resource.key === 'design-assets' && <button className="button secondary" onClick={() => setProductDialog(true)}><Box size={16} />Buat Produk dari Desain</button>}{!resource.readOnly && <Link className="button primary" to={`${resourcePath(resource.key)}/${record.id}/edit`}><Pencil size={15} />Edit {resource.singular.toLowerCase()}</Link>}</>} />
    <div className="record-meta">{record.status ? <Badge value={record.status} /> : null}<span>Dibuat {record.created_at ? new Date(String(record.created_at)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>{record.updated_at ? <span>Diperbarui {new Date(String(record.updated_at)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span> : null}</div>
    <nav className="section-tabs detail-tabs" aria-label="Bagian catatan"><button className={tab === 'details' ? 'selected' : ''} onClick={() => setTab('details')}>Ringkasan</button>{relations.map((relation) => <button key={`${relation.resource}:${relation.foreignKey}`} className={tab === `${relation.resource}:${relation.foreignKey}` ? 'selected' : ''} onClick={() => setTab(`${relation.resource}:${relation.foreignKey}`)}>{relation.label}</button>)}</nav>
    {tab === 'details' ? <>{uploadResources.has(resource.key) && <FilePanel resource={resource} record={record} />}<section className="panel detail-panel"><div className="panel-heading"><div><h2>Detail {resource.singular}</h2><p>Informasi yang dibutuhkan tim Anda, dalam satu tempat.</p></div></div><dl className="detail-grid">{resource.fields.filter((field) => !['created_at', 'updated_at'].includes(field.name)).map((field) => <div className={`detail-field ${['textarea', 'json'].includes(field.type) ? 'full-width' : ''}`} key={field.name}><dt>{field.label}</dt><dd className={field.type === 'json' ? 'json-value' : undefined}><FieldValue field={field} value={record[field.name]} /></dd></div>)}</dl></section>{relations.length > 0 && <div className="related-shortcuts">{relations.map((relation) => <button key={`${relation.resource}:${relation.foreignKey}`} onClick={() => setTab(`${relation.resource}:${relation.foreignKey}`)}><span>{relation.label}</span><ArrowRight size={16} /></button>)}</div>}</> : related && relatedResource ? <div className="panel"><div className="panel-heading"><div><h2>{related.label}</h2><p>Catatan yang terhubung dengan {resource.singular.toLowerCase()} ini.</p></div></div><ResourceTable key={tab} resource={relatedResource} compact filters={{ [related.foreignKey]: record.id }} /></div> : null}
    {productDialog && <div className="modal-backdrop" onClick={() => setProductDialog(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" aria-label="Tutup dialog" onClick={() => setProductDialog(false)}><X size={19} /></button><div className="empty-icon"><Box size={25} /></div><h2 id="product-dialog-title">Beri kehidupan kedua untuk desain ini.</h2><p>Buat draf produk privat dengan desain ini terlampir. Tinjau IP dan lisensinya sebelum dipublikasikan ke katalog Anda.</p><label className="field"><span>Nama produk</span><input value={productName} onChange={(event) => setProductName(event.target.value)} autoFocus maxLength={190} /></label><div className="form-actions"><button className="button secondary" onClick={() => setProductDialog(false)}>Batal</button><button className="button primary" disabled={action.isPending || !productName.trim()} onClick={createProduct}>{action.isPending ? 'Membuat…' : 'Buat Draf Produk'}</button></div></section></div>}
  </>;
}

export function ResourcePage({ mode = 'list' }: { mode?: 'list' | 'new' | 'detail' | 'edit' }) {
  const params = useParams();
  const key = resourceKey(params.resource || '');
  const metadata = useResources();
  const { workspace } = useAuth();
  const isCto = workspace?.role.toUpperCase() === 'CTO';
  const resource = metadata.data?.find((item) => item.key === key);
  const record = useQuery({ queryKey: ['record', workspace!.id, key, params.id], enabled: !!resource && !!params.id && (mode === 'detail' || mode === 'edit'), queryFn: async () => (await api<Envelope<Row>>(`/${key}/${params.id}`, { workspace: workspace!.id })).data });
  if (metadata.isPending) return <Spinner />;
  if (metadata.isError) return <ErrorState error={metadata.error} retry={() => void metadata.refetch()} />;
  if (!resource) return <EmptyState title="Halaman ini tidak tersedia" description="Modul ini mungkin tidak tersedia untuk workspace atau jabatan Anda." action={<Link className="button secondary" to="/app/dashboard">Kembali ke Ringkasan</Link>} />;
  if (mode === 'new' || mode === 'edit') {
    if (resource.readOnly) return <EmptyState title="Catatan ini hanya dapat dibaca" description="Catatan ini dikelola secara otomatis oleh aplikasi." action={<Link className="button secondary" to={resourcePath(resource.key)}>Kembali ke {resource.title.toLowerCase()}</Link>} />;
    if (mode === 'new' && resource.key === 'printers') return <EmptyState title="Tambah unit melalui katalog" description="Pilih Tambah Printer untuk memilih data printer yang dikelola CTO." action={<Link className="button secondary" to={resourcePath(resource.key)}>Kembali ke Printer</Link>} />;
    if (mode === 'edit' && record.isPending) return <Spinner />;
    if (mode === 'edit' && record.isError) return <ErrorState error={record.error} />;
    return <ResourceForm key={`${key}:${params.id || 'new'}`} resource={resource} record={mode === 'edit' ? record.data : undefined} />;
  }
  if (mode === 'detail') {
    if (record.isPending) return <Spinner />;
    if (record.isError) return <ErrorState error={record.error} retry={() => void record.refetch()} />;
    return <RecordDetail key={`${key}:${params.id}`} resource={resource} record={record.data} resources={metadata.data} />;
  }
  const canCreate = !resource.readOnly && resource.key !== 'printers';
  return <><PageHeader eyebrow={resource.group.toUpperCase()} title={resource.title} description={resource.description} actions={resource.key === 'printers' ? <div className="button-row"><AddPrinterUnitDialog />{isCto && <AddPrinterCatalogDialog />}</div> : canCreate && <Link className="button primary" to={`${resourcePath(key)}/new`}><Plus size={17} />{`${resource.singular} Baru`}</Link>} /><ResourceNavigation resource={resource} resources={metadata.data} />{key === 'production-costs' && <CostOverview />}{key === 'printers' ? <PrinterGrid resource={resource} /> : key === 'filament-spools' ? <FilamentGrid resource={resource} /> : <ResourceTable key={key} resource={resource} />}{resource.key === 'audit-logs' && <p className="helper-note">Catatan audit hanya dapat dibaca dan dibuat secara otomatis saat catatan berubah.</p>}{resource.key === 'notification-settings' && <p className="helper-note">Notifikasi dalam aplikasi sudah tersedia. Pengiriman Email dan WhatsApp dicadangkan untuk integrasi mendatang.</p>}</>;
}
