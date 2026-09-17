import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, ArrowRight, Box, Download, File, LoaderCircle, Pencil, Plus, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ResourceDefinition } from '@uni-nexus/shared';
import { api, body, download, message, type Envelope, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, recordName, resourceKey, resourcePath, titleCase } from '../lib/format';
import { useResources } from '../lib/resources';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';
import { ResourceTable, FieldValue } from '../components/resource-table';
import { ResourceForm, uploadResources } from '../components/resource-form';

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

type CostSummary = { estimatedHpp: string; actualHpp: string; sellingPrice: string; margin: string; materialCost: string; wasteCost: string; packagingCost: string };
function CostOverview() {
  const { workspace } = useAuth();
  const query = useQuery({ queryKey: ['costs-summary', workspace!.id], queryFn: async () => (await api<Envelope<CostSummary>>('/costs/summary', { workspace: workspace!.id })).data });
  if (query.isPending) return <Spinner label="Calculating recorded costs…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <><div className="metric-grid cost-metrics">{[{ label: 'Estimated HPP', value: query.data.estimatedHpp }, { label: 'Actual HPP', value: query.data.actualHpp }, { label: 'Selling price', value: query.data.sellingPrice }, { label: 'Recorded margin', value: query.data.margin }].map((item) => <div className="metric-card" key={item.label}><div className="metric-top">{item.label}</div><strong className="cost-metric-value">{money(item.value)}</strong></div>)}</div><div className="cost-breakdown"><span>Material <strong>{money(query.data.materialCost)}</strong></span><span>Waste <strong>{money(query.data.wasteCost)}</strong></span><span>Packaging <strong>{money(query.data.packagingCost)}</strong></span></div></>;
}

function FilePanel({ resource, record }: { resource: ResourceDefinition; record: Row }) {
  const { workspace } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const upload = useMutation({ mutationFn: (file: globalThis.File) => { const form = new FormData(); form.append('file', file); return api(`/files/${resource.key}/${record.id}`, { workspace: workspace!.id, method: 'POST', body: form }); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['record', workspace!.id, resource.key, record.id] }); toast('File uploaded.'); }, onError: (error) => toast(message(error), true) });
  const getFile = async () => { setDownloading(true); try { await download(resource.key, record, workspace!.id); } catch (error) { toast(message(error), true); } finally { setDownloading(false); } };
  return <section className="panel file-panel"><div><span className="file-icon"><File size={24} /></span><div><h3>{String(record.original_filename || record.file_name || 'Private attachment')}</h3><p>Workspace access is required to download this file.</p></div></div><div className="button-row"><button className="button secondary small" onClick={() => void getFile()} disabled={downloading}>{downloading ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}Download</button><label className="button secondary small upload-button">{upload.isPending ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}Upload file<input type="file" aria-label="Upload or replace attachment" disabled={upload.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ''; }} /></label></div></section>;
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
  const convert = () => action.mutate({ path: `/quotations/${record.id}/convert` }, { onSuccess: (result) => { toast('Quotation converted to an order.'); navigate(`/app/orders/${result.data.id}`); } });
  const createProduct = () => action.mutate({ path: `/design-assets/${record.id}/create-product`, payload: { name: productName } }, { onSuccess: (result) => { toast('Private draft product created from the design.'); navigate(`/app/products/${result.data.id}`); } });
  const changeArchive = () => action.mutate({ path: `/products/${record.id}`, method: 'PATCH', payload: { status: archived ? 'ACTIVE' : 'ARCHIVED', ...(resource.fields.some((field) => field.name === 'is_active') ? { is_active: archived } : {}) } }, { onSuccess: () => toast(archived ? 'Product activated.' : 'Product archived.') });
  return <><Link className="back-link" to={resourcePath(resource.key)}><ArrowLeft size={16} />{resource.title}</Link><PageHeader eyebrow={`${resource.singular.toUpperCase()} · #${record.id}`} title={recordName(record)} description={resource.description} actions={<>{canArchive && <button className="button secondary" onClick={changeArchive} disabled={action.isPending}><Archive size={16} />{archived ? 'Activate' : 'Archive'}</button>}{resource.key === 'quotations' && record.status === 'ACCEPTED' && <button className="button primary" onClick={convert} disabled={action.isPending}><ArrowRight size={16} />Convert to order</button>}{resource.key === 'design-assets' && <button className="button secondary" onClick={() => setProductDialog(true)}><Box size={16} />Create product from design</button>}{!resource.readOnly && <Link className="button primary" to={`${resourcePath(resource.key)}/${record.id}/edit`}><Pencil size={15} />Edit {resource.singular.toLowerCase()}</Link>}</>} />
    <div className="record-meta">{record.status ? <Badge value={record.status} /> : null}<span>Created {record.created_at ? new Date(String(record.created_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>{record.updated_at ? <span>Updated {new Date(String(record.updated_at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span> : null}</div>
    <nav className="section-tabs detail-tabs" aria-label="Record sections"><button className={tab === 'details' ? 'selected' : ''} onClick={() => setTab('details')}>Overview</button>{relations.map((relation) => <button key={`${relation.resource}:${relation.foreignKey}`} className={tab === `${relation.resource}:${relation.foreignKey}` ? 'selected' : ''} onClick={() => setTab(`${relation.resource}:${relation.foreignKey}`)}>{relation.label}</button>)}</nav>
    {tab === 'details' ? <>{uploadResources.has(resource.key) && <FilePanel resource={resource} record={record} />}<section className="panel detail-panel"><div className="panel-heading"><div><h2>{resource.singular} details</h2><p>The information your team needs, in one place.</p></div></div><dl className="detail-grid">{resource.fields.filter((field) => !['created_at', 'updated_at'].includes(field.name)).map((field) => <div className={`detail-field ${['textarea', 'json'].includes(field.type) ? 'full-width' : ''}`} key={field.name}><dt>{field.label}</dt><dd className={field.type === 'json' ? 'json-value' : undefined}><FieldValue field={field} value={record[field.name]} /></dd></div>)}</dl></section>{relations.length > 0 && <div className="related-shortcuts">{relations.map((relation) => <button key={`${relation.resource}:${relation.foreignKey}`} onClick={() => setTab(`${relation.resource}:${relation.foreignKey}`)}><span>{relation.label}</span><ArrowRight size={16} /></button>)}</div>}</> : related && relatedResource ? <div className="panel"><div className="panel-heading"><div><h2>{related.label}</h2><p>Records connected to this {resource.singular.toLowerCase()}.</p></div></div><ResourceTable key={tab} resource={relatedResource} compact filters={{ [related.foreignKey]: record.id }} /></div> : null}
    {productDialog && <div className="modal-backdrop" onClick={() => setProductDialog(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setProductDialog(false)}><X size={19} /></button><div className="empty-icon"><Box size={25} /></div><h2 id="product-dialog-title">Give this design a second life.</h2><p>Create a private draft product with this design attached. Review its IP and license before publishing it to your catalog.</p><label className="field"><span>Product name</span><input value={productName} onChange={(event) => setProductName(event.target.value)} autoFocus maxLength={190} /></label><div className="form-actions"><button className="button secondary" onClick={() => setProductDialog(false)}>Cancel</button><button className="button primary" disabled={action.isPending || !productName.trim()} onClick={createProduct}>{action.isPending ? 'Creating…' : 'Create draft product'}</button></div></section></div>}
  </>;
}

export function ResourcePage({ mode = 'list' }: { mode?: 'list' | 'new' | 'detail' | 'edit' }) {
  const params = useParams();
  const key = resourceKey(params.resource || '');
  const metadata = useResources();
  const { workspace } = useAuth();
  const resource = metadata.data?.find((item) => item.key === key);
  const record = useQuery({ queryKey: ['record', workspace!.id, key, params.id], enabled: !!resource && !!params.id && (mode === 'detail' || mode === 'edit'), queryFn: async () => (await api<Envelope<Row>>(`/${key}/${params.id}`, { workspace: workspace!.id })).data });
  if (metadata.isPending) return <Spinner />;
  if (metadata.isError) return <ErrorState error={metadata.error} retry={() => void metadata.refetch()} />;
  if (!resource) return <EmptyState title="This page isn’t available" description="The module may not be available for your workspace or role." action={<Link className="button secondary" to="/app/dashboard">Back to overview</Link>} />;
  if (mode === 'new' || mode === 'edit') {
    if (resource.readOnly) return <EmptyState title="This record is read only" description="These records are managed automatically by the application." action={<Link className="button secondary" to={resourcePath(resource.key)}>Back to {resource.title.toLowerCase()}</Link>} />;
    if (mode === 'edit' && record.isPending) return <Spinner />;
    if (mode === 'edit' && record.isError) return <ErrorState error={record.error} />;
    return <ResourceForm key={`${key}:${params.id || 'new'}`} resource={resource} record={mode === 'edit' ? record.data : undefined} />;
  }
  if (mode === 'detail') {
    if (record.isPending) return <Spinner />;
    if (record.isError) return <ErrorState error={record.error} retry={() => void record.refetch()} />;
    return <RecordDetail key={`${key}:${params.id}`} resource={resource} record={record.data} resources={metadata.data} />;
  }
  return <><PageHeader eyebrow={resource.group.toUpperCase()} title={resource.key === 'production-costs' ? 'Costing & HPP' : resource.title} description={resource.description} actions={!resource.readOnly && <Link className="button primary" to={`${resourcePath(key)}/new`}><Plus size={17} />New {resource.singular.toLowerCase()}</Link>} /><ResourceNavigation resource={resource} resources={metadata.data} />{key === 'production-costs' && <CostOverview />}<ResourceTable key={key} resource={resource} />{resource.key === 'audit-logs' && <p className="helper-note">Audit records are read only and are created automatically when records change.</p>}{resource.key === 'notification-settings' && <p className="helper-note">In-app notifications are available. Email and WhatsApp delivery are reserved for future integrations.</p>}</>;
}
