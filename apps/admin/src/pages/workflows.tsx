import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock3,
  Factory,
  FileText,
  Layers3,
  Package,
  Palette,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PRODUCTION_WORKFLOW_TABS,
  SALES_WORKFLOW_STAGE_LABELS,
  SALES_WORKFLOW_TABS,
  type SalesWorkflowStage,
} from '@uni-nexus/shared';
import { api, body, message, type Envelope, type Page, type Row } from '../lib/api';
import { useAuth } from '../lib/auth';
import { display, money, titleCase } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, useToast } from '../components/ui';

type WorkflowRow = {
  workflow_key: string;
  custom_request_id: string | null;
  order_id: string | null;
  request_number: string | null;
  order_number: string | null;
  customer: { id: string; full_name: string };
  title: string;
  stage: SalesWorkflowStage;
  stage_label: string;
  status: string;
  priority: string | null;
  assigned: { id: string; name: string; role: 'DESIGNER' | 'OPERATOR' } | null;
  target_date: string | null;
  value: string | null;
  payment_status: string | null;
  source: string | null;
  updated_at: string | null;
  next_action: string;
};
type ListMeta = { page: number; pageSize: number; total: number; totalPages: number };
type SalesList = { data: WorkflowRow[]; meta: ListMeta; counts: Record<string, number> };
type ProductionRow = {
  id: string;
  workflow_key: string;
  tab: string;
  job_number: string | null;
  print_job_number: string | null;
  order_number: string | null;
  request_number: string | null;
  customer: { id: string; full_name: string };
  title: string;
  status: string;
  priority: string | null;
  printer: string | null;
  print_profile: string | null;
  material: string | null;
  operator: { id: string; name: string } | null;
  queue_position: number | null;
  target_date: string | null;
  estimated_print_minutes: number | null;
  source: string | null;
  updated_at: string | null;
  attention_reason: string | null;
};
type ProductionList = { data: ProductionRow[]; meta: ListMeta; counts: Record<string, number> };
type PriceBreakdown = {
  unit_price?: string;
  billable_weight_gram?: string;
  rule_type?: string;
  lines?: Array<{ key: string; label: string; amount: string }>;
  material_price?: string;
  base_price?: string;
  design_fee?: string;
  finishing_fee?: string;
  fixed_price?: string;
  custom_unit_price?: string;
};
type QuoteItem = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  material_id?: string | null;
  billable_weight_gram?: string | null;
  pricing_rule_name_snapshot?: string | null;
  pricing_rule_type_snapshot?: string | null;
  pricing_breakdown_json?: PriceBreakdown | null;
  materials?: { name?: string | null } | null;
};
type Quote = {
  id: string;
  quotation_number?: string | null;
  revision_no: number;
  status: string;
  total_price: string;
  subtotal: string;
  discount_amount: string;
  additional_cost: string;
  valid_until?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  notes?: string | null;
  quotation_items: QuoteItem[];
};
type Detail = {
  workflow: WorkflowRow;
  request: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
  quotations: Quote[];
  design_tasks: Array<Record<string, unknown>>;
  production_jobs: Array<Record<string, unknown>>;
  packaging: Array<Record<string, unknown>>;
  ip_reviews: Array<Record<string, unknown>>;
  hpp: {
    estimatedHpp: string | null;
    actualHpp: string;
    sellingPrice: string;
    margin: string;
    marginPercent: string | null;
    filamentCost: string;
    designCost: string;
    paintCost: string;
    wasteCost: string;
    materialUsageGram: string;
    filamentUsageGram: string;
    packagingCost: string;
  } | null;
  activity: Array<Record<string, unknown>>;
};
type PricingRule = Row & {
  id: string;
  name: string;
  rule_type: string;
  material_id?: string | null;
  price_per_gram?: string | null;
  minimum_price?: string | null;
};
type Material = Row & { id: string; name: string; material_type?: string | null };
type PricePreview = {
  unit_price: string;
  pricing_breakdown_json: PriceBreakdown;
  pricing_rule_name_snapshot: string;
  pricing_rule_type_snapshot: string;
  billable_weight_gram: string | null;
};

const stageEmpty: Record<string, { title: string; description: string }> = {
  ALL: {
    title: 'Belum ada alur pesanan',
    description: 'Permintaan dan pesanan pelanggan akan muncul di sini.',
  },
  REQUEST: {
    title: 'Belum ada permintaan baru.',
    description: 'Permintaan yang baru masuk atau masih ditinjau akan muncul di sini.',
  },
  DESIGN: {
    title: 'Tidak ada pekerjaan desain yang sedang aktif.',
    description: 'Tugas desain yang menunggu, dikerjakan, atau ditinjau akan muncul di sini.',
  },
  QUOTATION: {
    title: 'Tidak ada penawaran yang sedang diproses.',
    description: 'Draf, penawaran yang disetujui, dan yang telah dikirim akan muncul di sini.',
  },
  READY_FOR_PRODUCTION: {
    title: 'Belum ada pesanan yang siap diproduksi.',
    description: 'Pesanan yang telah dikonfirmasi dan belum dimulai akan muncul di sini.',
  },
  PRODUCTION: {
    title: 'Tidak ada pekerjaan produksi aktif.',
    description: 'Antrean, proses cetak, dan pekerjaan produksi akan muncul di sini.',
  },
  COMPLETION: {
    title: 'Tidak ada pekerjaan yang menunggu QC atau pengemasan.',
    description: 'Hasil cetak yang masuk tahap penyelesaian akan muncul di sini.',
  },
  COMPLETED: {
    title: 'Belum ada pesanan selesai.',
    description: 'Pesanan yang telah ditutup akan muncul di sini.',
  },
  CANCELLED: {
    title: 'Tidak ada pesanan atau permintaan yang dibatalkan.',
    description: 'Permintaan atau pesanan dengan status terminal akan muncul di sini.',
  },
};
const productionEmpty: Record<string, { title: string; description: string }> = {
  ALL: {
    title: 'Belum ada pekerjaan produksi',
    description: 'Pekerjaan produksi yang dibuat dari pesanan akan muncul di sini.',
  },
  NEEDS_PROCESSING: {
    title: 'Tidak ada pekerjaan yang perlu diproses.',
    description: 'Produksi yang belum masuk antrean cetak akan muncul di sini.',
  },
  PRINT_QUEUE: {
    title: 'Antrean cetak kosong.',
    description: 'Tugas cetak yang telah dijadwalkan akan muncul di sini.',
  },
  PRINTING: {
    title: 'Tidak ada printer yang sedang mencetak.',
    description: 'Cetakan aktif akan muncul di sini.',
  },
  ATTENTION: {
    title: 'Tidak ada pekerjaan yang memerlukan perhatian.',
    description: 'Kegagalan cetak, reprint, dan QC bermasalah akan muncul di sini.',
  },
  QC: {
    title: 'Tidak ada hasil cetak menunggu QC.',
    description: 'Cetakan selesai yang perlu diperiksa akan muncul di sini.',
  },
  PACKAGING: {
    title: 'Tidak ada pesanan menunggu pengemasan.',
    description: 'Pesanan yang lulus QC akan muncul di sini.',
  },
  COMPLETED: {
    title: 'Belum ada produksi selesai.',
    description: 'Pekerjaan produksi yang selesai akan muncul di sini.',
  },
};

const statusLabel = (value: string | null | undefined) =>
  value ? titleCase(value) : 'Belum ada status';
const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : '—';
const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';
const code = (row: Pick<WorkflowRow, 'request_number' | 'order_number'>) =>
  row.order_number || row.request_number || 'Belum bernomor';
const todayIso = () => new Date().toISOString().slice(0, 10);
const deadlineClass = (value: string | null) => {
  const target = value?.slice(0, 10);
  if (!target) return '';
  const today = todayIso();
  if (target < today) return 'overdue';
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  return target <= horizon.toISOString().slice(0, 10) ? 'near-deadline' : '';
};

function queryString(
  params: URLSearchParams,
  overrides: Record<string, string | null | undefined> = {},
) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(overrides)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!next.get('page')) next.set('page', '1');
  if (!next.get('pageSize')) next.set('pageSize', '20');
  return next;
}

function WorkflowTabs({
  active,
  counts,
  onSelect,
}: {
  active: string;
  counts: Record<string, number>;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="workflow-tabs" role="tablist" aria-label="Tahap pesanan">
      {SALES_WORKFLOW_TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={active === tab.key ? 'selected' : ''}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
          <span>{counts[tab.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

function FilterBar({
  params,
  setParams,
  production = false,
}: {
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
  production?: boolean;
}) {
  const change = (key: string, value: string) =>
    setParams(queryString(params, { [key]: value, page: '1' }));
  return (
    <div className="workflow-filter-bar panel">
      <label className="workflow-search">
        <span className="sr-only">Cari</span>
        <input
          value={params.get('search') || ''}
          placeholder={
            production ? 'Cari job, pesanan, pelanggan…' : 'Cari nomor, pesanan, atau pelanggan…'
          }
          onChange={(event) => change('search', event.target.value)}
        />
      </label>
      <label>
        <span>Pelanggan</span>
        <input
          value={params.get('customer') || ''}
          placeholder="Nama pelanggan"
          onChange={(event) => change('customer', event.target.value)}
        />
      </label>
      <label>
        <span>Status</span>
        <input
          value={params.get('status') || ''}
          placeholder="Contoh: PRINTING"
          onChange={(event) => change('status', event.target.value)}
        />
      </label>
      <label>
        <span>Ditugaskan</span>
        <input
          value={params.get('assigned') || ''}
          placeholder="Nama designer/operator"
          onChange={(event) => change('assigned', event.target.value)}
        />
      </label>
      <label>
        <span>Tanggal target</span>
        <input
          type="date"
          value={params.get('targetDate') || ''}
          onChange={(event) => change('targetDate', event.target.value)}
        />
      </label>
      <label>
        <span>Deadline</span>
        <select
          value={params.get('deadline') || ''}
          onChange={(event) => change('deadline', event.target.value)}
        >
          <option value="">Semua</option>
          <option value="OVERDUE">Terlambat</option>
          <option value="UPCOMING">7 hari ke depan</option>
        </select>
      </label>
      <label>
        <span>Prioritas</span>
        <select
          value={params.get('priority') || ''}
          onChange={(event) => change('priority', event.target.value)}
        >
          <option value="">Semua</option>
          {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((value) => (
            <option key={value}>{titleCase(value)}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Sumber</span>
        <select
          value={params.get('source') || ''}
          onChange={(event) => change('source', event.target.value)}
        >
          <option value="">Semua</option>
          {[
            'CUSTOMER_APP',
            'WHATSAPP',
            'SHOPEE',
            'TOKOPEDIA',
            'TIKTOK_SHOP',
            'SHOPIFY',
            'OFFLINE',
            'OTHER',
          ].map((value) => (
            <option key={value}>{titleCase(value)}</option>
          ))}
        </select>
      </label>
      {!production && (
        <label>
          <span>Pembayaran</span>
          <select
            value={params.get('paymentStatus') || ''}
            onChange={(event) => change('paymentStatus', event.target.value)}
          >
            <option value="">Semua</option>
            {['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'].map((value) => (
              <option key={value}>{titleCase(value)}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Urutkan</span>
        <select
          value={params.get('sort') || 'updated_at'}
          onChange={(event) => change('sort', event.target.value)}
        >
          <option value="updated_at">Terakhir diperbarui</option>
          <option value="target_date">Tanggal target</option>
          {!production && <option value="value">Nilai pesanan</option>}
        </select>
      </label>
      <label>
        <span>Arah</span>
        <select
          value={params.get('direction') || 'desc'}
          onChange={(event) => change('direction', event.target.value)}
        >
          <option value="desc">Terbaru / tertinggi</option>
          <option value="asc">Terlama / terendah</option>
        </select>
      </label>
      <button
        className="button secondary small"
        type="button"
        onClick={() => setParams(queryString(new URLSearchParams(), { page: '1' }))}
      >
        Atur Ulang Filter
      </button>
    </div>
  );
}

function Pagination({
  meta,
  params,
  setParams,
}: {
  meta: ListMeta;
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="workflow-pagination">
      <span>
        Menampilkan {(meta.page - 1) * meta.pageSize + 1}–
        {Math.min(meta.page * meta.pageSize, meta.total)} dari {meta.total}
      </span>
      <div>
        <button
          className="button secondary small"
          disabled={meta.page === 1}
          onClick={() => setParams(queryString(params, { page: String(meta.page - 1) }))}
        >
          Sebelumnya
        </button>
        <button
          className="button secondary small"
          disabled={meta.page >= meta.totalPages}
          onClick={() => setParams(queryString(params, { page: String(meta.page + 1) }))}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function SalesRows({ rows }: { rows: WorkflowRow[] }) {
  return (
    <div className="workflow-list">
      {rows.map((row) => (
        <Link
          to={`/app/pesanan/${row.workflow_key}`}
          className="workflow-row"
          key={row.workflow_key}
        >
          <div className="workflow-identity">
            <strong>{code(row)}</strong>
            <span>{row.title}</span>
            <small>{row.customer.full_name}</small>
          </div>
          <div>
            <span className="workflow-label">Tahap</span>
            <Badge value={row.stage} />
            <small>{row.stage_label}</small>
          </div>
          <div>
            <span className="workflow-label">Status</span>
            <strong>{statusLabel(row.status)}</strong>
            <small>
              {row.assigned
                ? `${row.assigned.role === 'DESIGNER' ? 'Designer' : 'Operator'}: ${row.assigned.name}`
                : 'Belum ditugaskan'}
            </small>
          </div>
          <div>
            <span className="workflow-label">Deadline</span>
            <strong className={deadlineClass(row.target_date)}>
              {formatDate(row.target_date)}
            </strong>
            <small>{row.priority ? titleCase(row.priority) : 'Prioritas normal'}</small>
          </div>
          <div>
            <span className="workflow-label">Nilai</span>
            <strong>{row.value ? money(row.value) : '—'}</strong>
            <small>
              {row.payment_status
                ? `Bayar: ${titleCase(row.payment_status)}`
                : titleCase(row.source || '')}
            </small>
          </div>
          <span className="workflow-next">
            {row.next_action}
            <ArrowRight size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SalesWorkflowWorkspace() {
  const { workspace } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = params.get('stage') || 'ALL';
  const queryParams = queryString(params, { stage: active === 'ALL' ? null : active });
  const query = useQuery({
    queryKey: ['sales-workflows', workspace!.id, queryParams.toString()],
    queryFn: () => api<SalesList>(`/workflows/orders?${queryParams}`, { workspace: workspace!.id }),
  });
  const setWorkflowParams = (next: URLSearchParams) => setParams(next);
  const empty = stageEmpty[active] ?? stageEmpty.ALL!;
  return (
    <>
      <PageHeader
        eyebrow="PENJUALAN"
        title="Pesanan"
        description="Satu ruang kerja untuk memantau permintaan pelanggan hingga pesanan selesai."
        actions={
          <Link className="button primary" to="/app/requests/new">
            <Plus size={17} />
            Permintaan Baru
          </Link>
        }
      />
      <WorkflowTabs
        active={active}
        counts={query.data?.counts ?? {}}
        onSelect={(stage) =>
          setParams(queryString(params, { stage: stage === 'ALL' ? null : stage, page: '1' }))
        }
      />
      <FilterBar params={params} setParams={setWorkflowParams} />
      {query.isPending ? (
        <Spinner label="Memuat alur pesanan…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.data.length ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          action={
            <Link className="button primary small" to="/app/requests/new">
              <Plus size={15} />
              Permintaan Baru
            </Link>
          }
        />
      ) : (
        <>
          <SalesRows rows={query.data.data} />
          <Pagination meta={query.data.meta} params={params} setParams={setWorkflowParams} />
        </>
      )}
    </>
  );
}

function ProductionRows({ rows }: { rows: ProductionRow[] }) {
  return (
    <div className="workflow-list production-workflow-list">
      {rows.map((row) => (
        <Link to={`/app/pesanan/${row.workflow_key}`} className="workflow-row" key={row.id}>
          <div className="workflow-identity">
            <strong>{row.print_job_number || row.job_number || 'Job Produksi'}</strong>
            <span>{row.title}</span>
            <small>
              {row.order_number || row.request_number || 'Pesanan'} · {row.customer.full_name}
            </small>
          </div>
          <div>
            <span className="workflow-label">Cetak</span>
            <Badge value={row.status} />
            <small>{row.printer || 'Printer belum dipilih'}</small>
          </div>
          <div>
            <span className="workflow-label">Antrean</span>
            <strong>{row.queue_position ? `#${row.queue_position}` : 'Belum diantrekan'}</strong>
            <small>{row.print_profile || 'Profil belum dipilih'}</small>
          </div>
          <div>
            <span className="workflow-label">Deadline</span>
            <strong className={deadlineClass(row.target_date)}>
              {formatDate(row.target_date)}
            </strong>
            <small>
              {row.estimated_print_minutes
                ? `±${row.estimated_print_minutes} menit`
                : row.material || 'Durasi belum diestimasi'}
            </small>
          </div>
          <div>
            <span className="workflow-label">Penanggung jawab</span>
            <strong>{row.operator?.name || 'Belum ditugaskan'}</strong>
            <small>
              {row.attention_reason
                ? `Perhatian: ${titleCase(row.attention_reason)}`
                : row.material || 'Material belum dicatat'}
            </small>
          </div>
          <span className="workflow-next">
            Buka pesanan
            <ArrowRight size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ProductionWorkflowWorkspace() {
  const { workspace } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') || 'ALL';
  const queryParams = queryString(params, { tab: active === 'ALL' ? null : active });
  const query = useQuery({
    queryKey: ['production-workflows', workspace!.id, queryParams.toString()],
    queryFn: () =>
      api<ProductionList>(`/workflows/production?${queryParams}`, { workspace: workspace!.id }),
  });
  const empty = productionEmpty[active] ?? productionEmpty.ALL!;
  return (
    <>
      <PageHeader
        eyebrow="OPERASIONAL"
        title="Produksi"
        description="Pantau pekerjaan dari persiapan, antrean cetak, QC, hingga pengemasan."
      />
      <div className="workflow-tabs" role="tablist" aria-label="Status produksi">
        {PRODUCTION_WORKFLOW_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            className={active === tab.key ? 'selected' : ''}
            onClick={() =>
              setParams(queryString(params, { tab: tab.key === 'ALL' ? null : tab.key, page: '1' }))
            }
          >
            {tab.label}
            <span>{query.data?.counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>
      <FilterBar params={params} setParams={setParams} production />
      {query.isPending ? (
        <Spinner label="Memuat pekerjaan produksi…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.data.length ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <>
          <ProductionRows rows={query.data.data} />
          <Pagination meta={query.data.meta} params={params} setParams={setParams} />
        </>
      )}
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PricingBreakdown({ item }: { item: QuoteItem }) {
  const breakdown = item.pricing_breakdown_json;
  return (
    <div className="pricing-breakdown">
      <div>
        <strong>{item.materials?.name || 'Item penawaran'}</strong>
        <span>{item.pricing_rule_name_snapshot || 'Harga manual'}</span>
      </div>
      {item.billable_weight_gram && (
        <p>
          Berat ditagihkan: <strong>{item.billable_weight_gram} g</strong>
        </p>
      )}
      {breakdown?.lines?.map((line) => (
        <div className="pricing-line" key={line.key}>
          <span>{line.label}</span>
          <strong>{money(line.amount)}</strong>
        </div>
      ))}
      <div className="pricing-line total">
        <span>Harga / unit</span>
        <strong>{money(breakdown?.unit_price || item.unit_price)}</strong>
      </div>
    </div>
  );
}

function PricingItemDialog({ quotation, onClose }: { quotation: Quote; onClose: () => void }) {
  const { workspace } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [data, setData] = useState({
    description: '',
    quantity: '1',
    pricingRuleId: '',
    materialId: '',
    billableWeightGram: '',
    manualUnitPrice: '',
  });
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const rules = useQuery({
    queryKey: ['pricing-rules', workspace!.id],
    queryFn: () =>
      api<Page<PricingRule>>('/pricing-rules?page=1&pageSize=100&sort=name&direction=asc', {
        workspace: workspace!.id,
      }),
  });
  const materials = useQuery({
    queryKey: ['materials', workspace!.id],
    queryFn: () =>
      api<Page<Material>>('/materials?page=1&pageSize=100&sort=name&direction=asc', {
        workspace: workspace!.id,
      }),
  });
  const selectedRule = rules.data?.data.find((rule) => rule.id === data.pricingRuleId);
  const estimate = useMutation({
    mutationFn: () =>
      api<Envelope<PricePreview>>('/workflows/pricing/estimate', {
        method: 'POST',
        workspace: workspace!.id,
        body: body({
          pricingRuleId: data.pricingRuleId,
          ...(data.materialId ? { materialId: data.materialId } : {}),
          ...(data.billableWeightGram ? { billableWeightGram: data.billableWeightGram } : {}),
          ...(data.manualUnitPrice ? { manualUnitPrice: data.manualUnitPrice } : {}),
        }),
      }),
    onSuccess: (result) => setPreview(result.data),
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/workflows/quotations/${quotation.id}/items`, {
        method: 'POST',
        workspace: workspace!.id,
        body: body({
          description: data.description,
          quantity: data.quantity || '1',
          pricingRuleId: data.pricingRuleId,
          ...(data.materialId ? { materialId: data.materialId } : {}),
          ...(data.billableWeightGram ? { billableWeightGram: data.billableWeightGram } : {}),
          ...(data.manualUnitPrice ? { manualUnitPrice: data.manualUnitPrice } : {}),
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['sales-workflow'] });
      await client.invalidateQueries({ queryKey: ['sales-workflows'] });
      toast('Item harga ditambahkan ke penawaran.');
      onClose();
    },
  });
  const calculate = (event: FormEvent) => {
    event.preventDefault();
    if (!data.pricingRuleId) return;
    estimate.mutate();
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal pricing-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Hitung item penawaran"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close" onClick={onClose} aria-label="Tutup">
          <X size={18} />
        </button>
        <h2>Hitung item penawaran</h2>
        <p>
          Pilih material dan aturan harga. Nilai yang disimpan akan menjadi snapshot penawaran ini.
        </p>
        <form onSubmit={calculate}>
          <div className="form-grid">
            <label className="field full-width">
              <span>Deskripsi item</span>
              <input
                value={data.description}
                onChange={(event) => setData({ ...data, description: event.target.value })}
                placeholder="Contoh: Gantungan Kunci Hexagon"
                required
              />
            </label>
            <label className="field">
              <span>Aturan Harga</span>
              <select
                value={data.pricingRuleId}
                onChange={(event) => {
                  setPreview(null);
                  setData({ ...data, pricingRuleId: event.target.value });
                }}
                required
              >
                <option value="">Pilih aturan harga</option>
                {rules.data?.data.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} · {titleCase(rule.rule_type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Material</span>
              <select
                value={data.materialId}
                onChange={(event) => {
                  setPreview(null);
                  setData({ ...data, materialId: event.target.value });
                }}
                required={selectedRule?.rule_type === 'PER_GRAM' || !!selectedRule?.material_id}
              >
                <option value="">Pilih material</option>
                {materials.data?.data.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Berat Ditagihkan (g)</span>
              <input
                inputMode="decimal"
                value={data.billableWeightGram}
                onChange={(event) => {
                  setPreview(null);
                  setData({ ...data, billableWeightGram: event.target.value });
                }}
                disabled={selectedRule?.rule_type === 'CUSTOM'}
              />
            </label>
            <label className="field">
              <span>Kuantitas</span>
              <input
                inputMode="decimal"
                value={data.quantity}
                onChange={(event) => setData({ ...data, quantity: event.target.value })}
                required
              />
            </label>
            {selectedRule?.rule_type === 'CUSTOM' && (
              <label className="field full-width">
                <span>Harga per Unit Kustom</span>
                <input
                  inputMode="decimal"
                  value={data.manualUnitPrice}
                  onChange={(event) => {
                    setPreview(null);
                    setData({ ...data, manualUnitPrice: event.target.value });
                  }}
                  required
                  placeholder="0"
                />
              </label>
            )}
          </div>
          {estimate.isError && <p className="form-error">{message(estimate.error)}</p>}
          <div className="form-actions">
            <button
              className="button secondary"
              type="submit"
              disabled={estimate.isPending || !data.pricingRuleId}
            >
              {estimate.isPending ? 'Menghitung…' : 'Hitung Harga'}
            </button>
            <button
              className="button primary"
              type="button"
              disabled={save.isPending || !data.pricingRuleId || !data.description.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Menyimpan…' : 'Tambahkan Item'}
            </button>
          </div>
        </form>
        {preview && (
          <PricingBreakdown
            item={{
              id: 'preview',
              description: data.description,
              quantity: data.quantity,
              unit_price: preview.unit_price,
              amount: preview.unit_price,
              billable_weight_gram: preview.billable_weight_gram,
              pricing_rule_name_snapshot: preview.pricing_rule_name_snapshot,
              pricing_rule_type_snapshot: preview.pricing_rule_type_snapshot,
              pricing_breakdown_json: preview.pricing_breakdown_json,
            }}
          />
        )}
      </section>
    </div>
  );
}

function HppPanel({ hpp, orderId }: { hpp: NonNullable<Detail['hpp']>; orderId: string }) {
  const { workspace } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<'HPP_DESIGN' | 'HPP_PAINT' | null>(null);
  const [amount, setAmount] = useState('0');
  const save = useMutation({
    mutationFn: (componentCode: 'HPP_DESIGN' | 'HPP_PAINT') =>
      api(`/workflows/orders/${orderId}/hpp`, {
        method: 'POST',
        workspace: workspace!.id,
        body: body({ componentCode, amount }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['sales-workflow', workspace!.id] });
      await client.invalidateQueries({ queryKey: ['sales-workflows'] });
      setEditing(null);
      toast('HPP berhasil diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  const beginEdit = (component: 'HPP_DESIGN' | 'HPP_PAINT', current: string) => {
    setEditing(component);
    setAmount(current);
  };
  const field = (code: 'HPP_DESIGN' | 'HPP_PAINT', label: string, value: string) => (
    <div className="hpp-line" key={code}>
      <span>{label}</span>
      {editing === code ? (
        <form
          className="hpp-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(code);
          }}
        >
          <input
            aria-label={`${label} HPP`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
          />
          <button className="button primary small" type="submit" disabled={save.isPending}>
            Simpan
          </button>
          <button className="button secondary small" type="button" onClick={() => setEditing(null)}>
            Batal
          </button>
        </form>
      ) : (
        <>
          <strong>{money(value)}</strong>
          <button className="button secondary small" type="button" onClick={() => beginEdit(code, value)}>
            Edit
          </button>
        </>
      )}
    </div>
  );
  return (
    <section className="hpp-panel">
      <div className="hpp-panel-heading">
        <div>
          <h3>Biaya &amp; HPP</h3>
          <p>HPP Aktual v1 hanya memakai pemakaian filamen normal, desain, dan cat.</p>
        </div>
      </div>
      <div className="hpp-lines">
        <div className="hpp-line"><span>Filamen</span><strong>{money(hpp.filamentCost)}</strong><small>Otomatis dari pemakaian filamen · {hpp.filamentUsageGram} g</small></div>
        {field('HPP_DESIGN', 'Biaya Desain HPP', hpp.designCost)}
        {field('HPP_PAINT', 'Biaya Cat HPP', hpp.paintCost)}
      </div>
      <div className="hpp-total"><span>HPP Aktual</span><strong>{money(hpp.actualHpp)}</strong></div>
      <div className="hpp-commercial">
        <div><span>Harga Jual</span><strong>{money(hpp.sellingPrice)}</strong></div>
        <div><span>Margin Kotor</span><strong>{money(hpp.margin)}</strong></div>
        <div><span>Margin %</span><strong>{hpp.marginPercent == null ? '—' : `${hpp.marginPercent}%`}</strong></div>
      </div>
      <p className="helper-note">Waste {money(hpp.wasteCost)} · Pengemasan {money(hpp.packagingCost)} — informasional, tidak masuk HPP v1.</p>
    </section>
  );
}

function ContextualActions({ detail }: { detail: Detail }) {
  const { workspace } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [spoolId, setSpoolId] = useState('');
  const [usageType, setUsageType] = useState('MODEL');
  const [weightGram, setWeightGram] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const workflow = detail.workflow;
  const quote = detail.quotations[0];
  const requestId = workflow.custom_request_id;
  const orderId = workflow.order_id;
  const request = detail.request as { id?: string; status?: string } | null;
  const design = detail.design_tasks[0] as { id?: string; status?: string } | undefined;
  const order = detail.order as {
    id?: string;
    status?: string;
    order_items?: Array<{ id?: string }>;
  } | null;
  const production = detail.production_jobs[0] as
    | { id?: string; order_item_id?: string; print_jobs?: Array<{ id?: string; status?: string }> }
    | undefined;
  const orderItemId = order?.order_items?.[0]?.id;
  const latestPrint = (
    production?.print_jobs as Array<{ id?: string; status?: string }> | undefined
  )?.[0];
  const packaging = detail.packaging[0] as { status?: string } | undefined;
  const ipReview = detail.ip_reviews[0] as { id?: string; status?: string } | undefined;
  const spoolOptions = useQuery({
    queryKey: ['workflow-filament-spools', workspace?.id],
    enabled: usageOpen && !!workspace,
    queryFn: () => api<{ data: Array<{ id: string; spool_code?: string | null; brand?: string | null; color_name?: string | null; remaining_weight_gram: string; cost_per_gram: string; materials?: { name?: string | null } | null }> }>('/workflows/filament-spools', { workspace: workspace!.id }),
    staleTime: 30_000,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['sales-workflow'] }),
      client.invalidateQueries({ queryKey: ['sales-workflows'] }),
      client.invalidateQueries({ queryKey: ['production-workflows'] }),
    ]);
  };
  const revision = useMutation({
    mutationFn: () =>
      api(`/workflows/quotations/${quote!.id}/revision`, {
        method: 'POST',
        workspace: workspace!.id,
      }),
    onSuccess: async () => {
      await refresh();
      toast('Revisi penawaran dibuat sebagai draf baru.');
    },
    onError: (error) => toast(message(error), true),
  });
  const conversion = useMutation({
    mutationFn: () =>
      api(`/quotations/${quote!.id}/convert`, { method: 'POST', workspace: workspace!.id }),
    onSuccess: async () => {
      await refresh();
      toast('Penawaran berhasil dikonversi menjadi pesanan.');
    },
    onError: (error) => toast(message(error), true),
  });
  const statusChange = useMutation({
    mutationFn: ({ resource, id, status }: { resource: string; id: string; status: string }) =>
      api(
        resource === 'orders' && status === 'COMPLETED'
          ? `/workflows/orders/${id}/complete`
          : `/${resource}/${id}`,
        {
          method: resource === 'orders' && status === 'COMPLETED' ? 'POST' : 'PATCH',
          workspace: workspace!.id,
          ...(resource === 'orders' && status === 'COMPLETED' ? {} : { body: body({ status }) }),
        },
      ),
    onSuccess: async () => {
      await refresh();
      toast('Status berhasil diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  const recordUsage = useMutation({
    mutationFn: () =>
      api(`/workflows/print-jobs/${latestPrint!.id}/material-usages`, {
        method: 'POST',
        workspace: workspace!.id,
        body: body({ filamentSpoolId: spoolId, usageType, weightGram, notes: usageNotes || undefined }),
      }),
    onSuccess: async () => {
      await refresh();
      await client.invalidateQueries({ queryKey: ['workflow-filament-spools', workspace!.id] });
      setUsageOpen(false);
      setWeightGram('');
      setUsageNotes('');
      toast('Pemakaian filamen dicatat dan stok diperbarui.');
    },
    onError: (error) => toast(message(error), true),
  });
  const links: ReactNode[] = [];
  const transition = (
    key: string,
    resource: string,
    id: string | undefined,
    status: string,
    label: string,
    Icon = Check,
  ) => {
    if (!id) return;
    links.push(
      <button
        className="button secondary small"
        key={key}
        disabled={statusChange.isPending}
        onClick={() => statusChange.mutate({ resource, id, status })}
      >
        <Icon size={15} />
        {label}
      </button>,
    );
  };
  if (workflow.stage === 'REQUEST' && requestId) {
    links.push(
      <Link
        className="button primary small"
        key="design"
        to={`/app/design-tasks/new?custom_request_id=${requestId}`}
      >
        <Palette size={15} />
        Tugaskan Designer
      </Link>,
    );
    links.push(
      <Link className="button secondary small" key="request" to={`/app/requests/${requestId}/edit`}>
        <Settings2 size={15} />
        Kelola Permintaan
      </Link>,
    );
    if (request?.status === 'NEW')
      transition(
        'review-request',
        'custom-requests',
        request.id,
        'UNDER_REVIEW',
        'Mulai Tinjau',
        Settings2,
      );
    if (request?.status === 'UNDER_REVIEW') {
      transition('feasible', 'custom-requests', request.id, 'FEASIBLE', 'Tandai Feasible', Check);
      transition(
        'more-info',
        'custom-requests',
        request.id,
        'NEED_INFORMATION',
        'Minta Informasi',
        FileText,
      );
      transition('cancel-request', 'custom-requests', request.id, 'CANCELLED', 'Batalkan');
    }
    if (request?.status === 'NEED_INFORMATION')
      transition(
        'resume-review',
        'custom-requests',
        request.id,
        'UNDER_REVIEW',
        'Lanjutkan Tinjau',
        Settings2,
      );
    if (request?.status === 'FEASIBLE')
      transition(
        'estimate',
        'custom-requests',
        request.id,
        'ESTIMATING',
        'Mulai Estimasi',
        ReceiptText,
      );
  }
  if (workflow.stage === 'DESIGN' && requestId) {
    if (design?.status === 'PENDING')
      transition('start-design', 'design-tasks', design.id, 'IN_PROGRESS', 'Mulai Desain', Palette);
    if (design?.status === 'IN_PROGRESS') {
      transition(
        'review-design',
        'design-tasks',
        design.id,
        'REVIEW',
        'Review Desain',
        ClipboardCheck,
      );
      transition(
        'finish-design',
        'design-tasks',
        design.id,
        'COMPLETED',
        'Selesaikan Desain',
        Check,
      );
    }
    if (design?.status === 'REVIEW') {
      transition(
        'resume-design',
        'design-tasks',
        design.id,
        'IN_PROGRESS',
        'Revisi Desain',
        RefreshCw,
      );
      transition(
        'approve-design',
        'design-tasks',
        design.id,
        'COMPLETED',
        'Selesaikan Desain',
        Check,
      );
    }
    if (design?.id)
      links.push(
        <Link
          className="button secondary small"
          key="asset"
          to={`/app/design-assets/new?design_task_id=${design.id}`}
        >
          <Plus size={15} />
          Tambah Aset Desain
        </Link>,
      );
    links.push(
      <Link
        className="button primary small"
        key="quote"
        to={`/app/quotations/new?custom_request_id=${requestId}&customer_id=${workflow.customer.id}`}
      >
        <ReceiptText size={15} />
        Buat Penawaran
      </Link>,
    );
  }
  if (workflow.stage === 'QUOTATION' && !quote && requestId)
    links.push(
      <Link
        className="button primary small"
        key="create-quote"
        to={`/app/quotations/new?custom_request_id=${requestId}&customer_id=${workflow.customer.id}`}
      >
        <ReceiptText size={15} />
        Buat Penawaran
      </Link>,
    );
  if (workflow.stage === 'QUOTATION' && quote) {
    if (quote.status === 'DRAFT') {
      links.push(
        <button className="button primary small" key="price" onClick={() => setPricingOpen(true)}>
          <ReceiptText size={15} />
          Hitung Harga
        </button>,
      );
      transition('approve-quote', 'quotations', quote.id, 'APPROVED', 'Setujui Internal', Check);
    }
    if (quote.status === 'APPROVED')
      transition('send-quote', 'quotations', quote.id, 'SENT', 'Kirim Penawaran', ReceiptText);
    if (quote.status === 'SENT') {
      transition('accept-quote', 'quotations', quote.id, 'ACCEPTED', 'Tandai Diterima', Check);
      transition('decline-quote', 'quotations', quote.id, 'DECLINED', 'Tandai Ditolak', X);
    }
    links.push(
      <button
        className="button secondary small"
        key="revision"
        disabled={revision.isPending}
        onClick={() => revision.mutate()}
      >
        <RefreshCw size={15} />
        Buat Revisi
      </button>,
    );
    if (quote.status === 'ACCEPTED')
      links.push(
        <button
          className="button primary small"
          key="convert"
          disabled={conversion.isPending}
          onClick={() => conversion.mutate()}
        >
          <Check size={15} />
          Buat Pesanan
        </button>,
      );
  }
  if (workflow.stage === 'READY_FOR_PRODUCTION' && orderItemId)
    links.push(
      <Link
        className="button primary small"
        key="production"
        to={`/app/production/new?order_item_id=${orderItemId}`}
      >
        <Factory size={15} />
        Siapkan Produksi
      </Link>,
    );
  if (workflow.stage === 'PRODUCTION' && production?.id) {
    links.push(
      <Link
        className="button primary small"
        key="print"
        to={`/app/print-queue/new?production_job_id=${production.id}`}
      >
        <Printer size={15} />
        {latestPrint?.status === 'FAILED' ? 'Cetak Ulang' : 'Tambah ke Antrean'}
      </Link>,
    );
    if (latestPrint?.status === 'QUEUED')
      transition('start-print', 'print-jobs', latestPrint.id, 'PRINTING', 'Mulai Cetak', Printer);
    if (latestPrint?.status === 'PAUSED')
      transition(
        'resume-print',
        'print-jobs',
        latestPrint.id,
        'PRINTING',
        'Lanjutkan Cetak',
        Printer,
      );
    if (latestPrint?.status === 'PRINTING')
      transition(
        'finish-print',
        'print-jobs',
        latestPrint.id,
        'SUCCESS',
        'Selesaikan Cetak',
        Check,
      );
    if (latestPrint?.id)
      links.push(
        <Link
          className="button secondary small"
          key="failure"
          to={`/app/failures/new?print_job_id=${latestPrint.id}`}
        >
          <FileText size={15} />
          Catat Kegagalan
        </Link>,
      );
  }
  if ((workflow.stage === 'PRODUCTION' || workflow.stage === 'COMPLETION') && latestPrint?.id)
    links.push(
      <button className="button secondary small" key="material-usage" onClick={() => setUsageOpen(true)}>
        <Layers3 size={15} />
        Catat Pemakaian Filamen
      </button>,
    );
  if (workflow.stage === 'COMPLETION' && production?.id) {
    links.push(
      <Link
        className="button primary small"
        key="qc"
        to={`/app/qc/new?production_job_id=${production.id}`}
      >
        <ClipboardCheck size={15} />
        Lakukan QC
      </Link>,
    );
    if (orderId)
      links.push(
        <Link
          className="button secondary small"
          key="packaging"
          to={`/app/packaging/new?order_id=${orderId}`}
        >
          <Package size={15} />
          Mulai Pengemasan
        </Link>,
      );
    if (order?.status === 'PACKAGING' && packaging?.status === 'PACKED')
      transition('complete-order', 'orders', order.id, 'COMPLETED', 'Selesaikan Pesanan', Check);
    if (order?.status === 'READY')
      transition(
        'complete-ready-order',
        'orders',
        order.id,
        'COMPLETED',
        'Selesaikan Pesanan',
        Check,
      );
  }
  if (ipReview?.id)
    links.push(
      <Link
        className="button secondary small"
        key="ip-review"
        to={`/app/ip-reviews/${ipReview.id}`}
      >
        <ShieldCheck size={15} />
        Status IP: {titleCase(ipReview.status || 'NEEDS_REVIEW')}
      </Link>,
    );
  else if (requestId)
    links.push(
      <Link
        className="button secondary small"
        key="new-ip-review"
        to={`/app/ip-reviews/new?custom_request_id=${requestId}`}
      >
        <ShieldCheck size={15} />
        Review IP
      </Link>,
    );
  return (
    <>
      {links.length > 0 && <div className="workflow-actions">{links}</div>}
      {pricingOpen && quote && (
        <PricingItemDialog quotation={quote} onClose={() => setPricingOpen(false)} />
      )}
      {usageOpen && latestPrint?.id && (
        <div className="modal-backdrop" onClick={() => setUsageOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="material-usage-title" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" aria-label="Tutup" onClick={() => setUsageOpen(false)}><X size={19} /></button>
            <h2 id="material-usage-title">Catat Pemakaian Filamen</h2>
            <p>Pemakaian dicatat ke pekerjaan cetak dan langsung mengurangi stok roll secara atomik.</p>
            <label className="field"><span>Roll Filamen</span><select value={spoolId} onChange={(event) => setSpoolId(event.target.value)}><option value="">Pilih roll filamen</option>{spoolOptions.data?.data.map((spool) => <option key={spool.id} value={spool.id}>{[spool.materials?.name, spool.brand, spool.color_name, spool.spool_code].filter(Boolean).join(' · ')} — sisa {spool.remaining_weight_gram} g · {money(spool.cost_per_gram)}/g</option>)}</select></label>
            {spoolOptions.isError && <small className="field-error">{message(spoolOptions.error)}</small>}
            <label className="field"><span>Berat Dipakai (g)</span><input inputMode="decimal" value={weightGram} onChange={(event) => setWeightGram(event.target.value)} placeholder="Contoh: 42.000" /></label>
            <label className="field"><span>Jenis Pemakaian</span><select value={usageType} onChange={(event) => setUsageType(event.target.value)}><option value="MODEL">Model</option><option value="SUPPORT">Support</option><option value="WASTE">Waste</option><option value="PURGE">Purge</option><option value="OTHER">Lainnya</option></select></label>
            <label className="field"><span>Catatan</span><textarea value={usageNotes} onChange={(event) => setUsageNotes(event.target.value)} rows={3} /></label>
            <div className="form-actions"><button className="button secondary" onClick={() => setUsageOpen(false)}>Batal</button><button className="button primary" disabled={recordUsage.isPending || !spoolId || !weightGram} onClick={() => recordUsage.mutate()}>{recordUsage.isPending ? 'Menyimpan…' : 'Simpan Pemakaian'}</button></div>
          </section>
        </div>
      )}
    </>
  );
}

function Timeline({ stage }: { stage: SalesWorkflowStage }) {
  const steps: Array<{ label: string; stages: SalesWorkflowStage[] }> = [
    {
      label: 'Permintaan',
      stages: [
        'REQUEST',
        'DESIGN',
        'QUOTATION',
        'READY_FOR_PRODUCTION',
        'PRODUCTION',
        'COMPLETION',
        'COMPLETED',
      ],
    },
    {
      label: 'Desain',
      stages: [
        'DESIGN',
        'QUOTATION',
        'READY_FOR_PRODUCTION',
        'PRODUCTION',
        'COMPLETION',
        'COMPLETED',
      ],
    },
    {
      label: 'Penawaran',
      stages: ['QUOTATION', 'READY_FOR_PRODUCTION', 'PRODUCTION', 'COMPLETION', 'COMPLETED'],
    },
    { label: 'Pesanan', stages: ['READY_FOR_PRODUCTION', 'PRODUCTION', 'COMPLETION', 'COMPLETED'] },
    { label: 'Produksi', stages: ['PRODUCTION', 'COMPLETION', 'COMPLETED'] },
    { label: 'QC', stages: ['COMPLETION', 'COMPLETED'] },
    { label: 'Pengemasan', stages: ['COMPLETION', 'COMPLETED'] },
  ];
  return (
    <div className="workflow-timeline" aria-label="Progres alur pesanan">
      {steps.map((step) => (
        <div
          className={
            step.stages.includes(stage) ? (step.stages[0] === stage ? 'current' : 'complete') : ''
          }
          key={step.label}
        >
          <span>{step.stages[0] === stage ? '●' : step.stages.includes(stage) ? '✓' : '○'}</span>
          <small>{step.label}</small>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <section className="panel workflow-section">
      <div className="panel-heading">
        <div>
          <h2>
            <Icon size={17} />
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SalesWorkflowDetail() {
  const { workspace } = useAuth();
  const { workflowKey = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['sales-workflow', workspace!.id, workflowKey],
    queryFn: async () =>
      (
        await api<Envelope<Detail>>(`/workflows/orders/${workflowKey}`, {
          workspace: workspace!.id,
        })
      ).data,
  });
  if (query.isPending) return <Spinner label="Memuat ruang kerja pesanan…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const detail = query.data;
  const {
    workflow,
    request,
    order,
    quotations,
    design_tasks: designs,
    production_jobs: production,
    packaging,
    ip_reviews: ipReviews,
    hpp,
    activity,
  } = detail;
  const qcRecords = production.flatMap((job) => {
    const direct = (job.qc_inspections as Array<Record<string, unknown>> | undefined) || [];
    const printLevel = (
      (job.print_jobs as Array<Record<string, unknown>> | undefined) || []
    ).flatMap(
      (print) => (print.qc_inspections as Array<Record<string, unknown>> | undefined) || [],
    );
    return [...direct, ...printLevel];
  });
  return (
    <>
      <button className="back-link" onClick={() => navigate('/app/pesanan')}>
        <ArrowLeft size={16} />
        Kembali ke Pesanan
      </button>
      <PageHeader
        eyebrow="PESANAN TERPUSAT"
        title={workflow.title}
        description={`${code(workflow)} · ${workflow.customer.full_name}`}
        actions={<ContextualActions detail={detail} />}
      />
      <Timeline stage={workflow.stage} />
      <div className="workflow-detail-grid">
        <Section title="Ringkasan" icon={ClipboardCheck}>
          <dl className="workflow-facts">
            <Fact label="Tahap">
              <Badge value={workflow.stage} /> {workflow.stage_label}
            </Fact>
            <Fact label="Status">{statusLabel(workflow.status)}</Fact>
            <Fact label="Pelanggan">
              <Link to={`/app/customers/${workflow.customer.id}`}>
                {workflow.customer.full_name}
              </Link>
            </Fact>
            <Fact label="Deadline">{formatDate(workflow.target_date)}</Fact>
            <Fact label="Sumber">{titleCase(workflow.source || '—')}</Fact>
            <Fact label="Prioritas">{titleCase(workflow.priority || 'NORMAL')}</Fact>
            <Fact label="Penanggung jawab">{workflow.assigned?.name || 'Belum ditugaskan'}</Fact>
            <Fact label="Terakhir diperbarui">{formatDateTime(workflow.updated_at)}</Fact>
          </dl>
        </Section>
        {request && (
          <Section title="Permintaan" icon={FileText}>
            <dl className="workflow-facts">
              <Fact label="Deskripsi">{String(request.description || 'Tidak ada deskripsi.')}</Fact>
              <Fact label="Jumlah">{String(request.requested_quantity || '—')}</Fact>
              <Fact label="Ukuran">
                {[
                  request.requested_length_mm,
                  request.requested_width_mm,
                  request.requested_height_mm,
                ]
                  .filter(Boolean)
                  .join(' × ') || 'Belum dicatat'}
                {request.requested_height_mm ? ' mm' : ''}
              </Fact>
              <Fact label="Warna">{String(request.preferred_color || 'Tidak ada preferensi')}</Fact>
              <Fact label="Material pilihan">
                {String(
                  (request.materials as { name?: string } | undefined)?.name || 'Belum dipilih',
                )}
              </Fact>
              <Fact label="Produk terkait">
                {String(
                  (request.products as { name?: string } | undefined)?.name || 'Belum dipilih',
                )}
              </Fact>
              <Fact label="Catatan">
                {String(
                  (request.request_notes as Array<{ note?: string }> | undefined)
                    ?.map((note) => note.note)
                    .join(' · ') || '—',
                )}
              </Fact>
              <Fact label="Lampiran">
                {String(
                  (request.request_files as Array<{ file_name?: string }> | undefined)
                    ?.map((file) => file.file_name)
                    .join(', ') || 'Tidak ada',
                )}
              </Fact>
            </dl>
          </Section>
        )}
        {designs.length > 0 && (
          <Section title="Desain" icon={Palette}>
            <div className="workflow-records">
              {designs.map((task) => (
                <div key={String(task.id)}>
                  <Badge value={task.status} />
                  <strong>
                    {(task.users as { full_name?: string } | undefined)?.full_name ||
                      'Designer belum ditugaskan'}
                  </strong>
                  <span>
                    {titleCase(String(task.priority || 'NORMAL'))} · mulai{' '}
                    {formatDateTime(String(task.started_at || ''))}
                  </span>
                  <small>
                    Aset:{' '}
                    {String(
                      (task.design_assets as Array<{ file_name?: string }> | undefined)
                        ?.map((asset) => asset.file_name)
                        .join(', ') || 'Belum ada aset',
                    )}
                  </small>
                  <small>{String(task.notes || '')}</small>
                </div>
              ))}
            </div>
          </Section>
        )}
        {quotations.length > 0 && (
          <Section title="Harga & Penawaran" icon={ReceiptText}>
            <div className="workflow-records">
              {quotations.map((quote) => (
                <article className="quote-workspace-card" key={quote.id}>
                  <div>
                    <strong>
                      {quote.quotation_number || `Penawaran #${quote.id}`} · Revisi{' '}
                      {quote.revision_no}
                    </strong>
                    <Badge value={quote.status} />
                  </div>
                  <span>
                    Subtotal {money(quote.subtotal)} · Total {money(quote.total_price)} · berlaku
                    hingga {formatDate(quote.valid_until || null)}
                  </span>
                  <small>
                    Diskon {money(quote.discount_amount)} · Biaya tambahan{' '}
                    {money(quote.additional_cost)}
                    {quote.sent_at ? ` · dikirim ${formatDateTime(quote.sent_at)}` : ''}
                    {quote.accepted_at ? ` · diterima ${formatDateTime(quote.accepted_at)}` : ''}
                    {quote.declined_at ? ` · ditolak ${formatDateTime(quote.declined_at)}` : ''}
                  </small>
                  {quote.quotation_items.map((item) => (
                    <div className="quote-item" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <span>
                          {item.quantity} × {money(item.unit_price)} = {money(item.amount)}
                        </span>
                      </div>
                      <PricingBreakdown item={item} />
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </Section>
        )}
        {order && (
          <Section title="Pesanan" icon={Truck}>
            <dl className="workflow-facts">
              <Fact label="Nomor pesanan">{String(order.order_number || '—')}</Fact>
              <Fact label="Pembayaran">{<Badge value={order.payment_status} />}</Fact>
              <Fact label="Total">{money(order.total_price)}</Fact>
              <Fact label="Pengiriman">
                {String(order.shipping_name || order.shipping_address || 'Belum dicatat')}
              </Fact>
              <Fact label="Catatan pelanggan">{String(order.customer_notes || '—')}</Fact>
              <Fact label="Catatan internal">{String(order.internal_notes || '—')}</Fact>
            </dl>
            {!!(order.order_items as Array<Record<string, unknown>> | undefined)?.length && (
              <div className="workflow-records">
                {(order.order_items as Array<Record<string, unknown>>).map((item) => (
                  <div key={String(item.id)}>
                    <strong>{String(item.item_name || 'Item pesanan')}</strong>
                    <span>
                      {String(item.quantity || 0)} × {money(String(item.unit_price || 0))} ={' '}
                      {money(String(item.total_price || 0))}
                    </span>
                    <small>{String(item.description || '')}</small>
                  </div>
                ))}
              </div>
            )}
            {hpp && (
              <HppPanel hpp={hpp} orderId={String(order.id)} />
            )}
          </Section>
        )}
        {production.length > 0 && (
          <Section title="Produksi" icon={Factory}>
            <div className="workflow-records">
              {production.map((job) => (
                <article className="production-workspace-card" key={String(job.id)}>
                  <div>
                    <strong>{String(job.job_number || `Job #${job.id}`)}</strong>
                    <Badge value={job.status} />
                  </div>
                  <span>
                    {titleCase(String(job.priority || 'NORMAL'))} ·{' '}
                    {(job.users as { full_name?: string } | undefined)?.full_name ||
                      'Operator belum ditugaskan'}
                  </span>
                  {(job.print_jobs as Array<Record<string, unknown>> | undefined)?.map((print) => (
                    <div className="print-attempt" key={String(print.id)}>
                      <Printer size={15} />
                      <span>
                        <strong>{String(print.print_job_number || `Cetak #${print.id}`)}</strong> ·{' '}
                        {titleCase(String(print.status || ''))} ·{' '}
                        {String(
                          (print.printers as { name?: string } | undefined)?.name ||
                            'Printer belum dipilih',
                        )}
                        {(print.print_profiles as { name?: string } | undefined)?.name
                          ? ` · ${(print.print_profiles as { name: string }).name}`
                          : ''}
                      </span>
                      <small>
                        {[
                          print.estimated_print_minutes
                            ? `estimasi ${print.estimated_print_minutes} menit`
                            : null,
                          print.actual_print_minutes
                            ? `aktual ${print.actual_print_minutes} menit`
                            : null,
                          print.estimated_weight_gram
                            ? `estimasi ${print.estimated_weight_gram} g`
                            : null,
                          print.actual_weight_gram ? `aktual ${print.actual_weight_gram} g` : null,
                          (print.slicing_results as { total_weight_gram?: string } | undefined)
                            ?.total_weight_gram
                            ? `slicing ${(print.slicing_results as { total_weight_gram: string }).total_weight_gram} g`
                            : null,
                          (
                            print.print_failures as Array<{ failure_type?: string }> | undefined
                          )?.[0]?.failure_type
                            ? `kegagalan ${titleCase(String((print.print_failures as Array<{ failure_type: string }>)[0]!.failure_type))}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Belum ada estimasi cetak'}
                      </small>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </Section>
        )}
        {(packaging.length > 0 || production.length > 0) && (
          <Section title="Penyelesaian" icon={Package}>
            <div className="workflow-records">
              {qcRecords.map((qc) => (
                <div key={`qc-${String(qc.id)}`}>
                  <Badge value={qc.result} />
                  <strong>QC {formatDateTime(String(qc.inspected_at || ''))}</strong>
                  <small>{String(qc.notes || '')}</small>
                </div>
              ))}
              {packaging.map((pack) => (
                <div key={`pack-${String(pack.id)}`}>
                  <Badge value={pack.status} />
                  <strong>
                    {String(
                      (pack.packaging_types as { name?: string } | undefined)?.name || 'Pengemasan',
                    )}
                  </strong>
                  <small>{String(pack.notes || '')}</small>
                </div>
              ))}
            </div>
          </Section>
        )}
        {ipReviews.length > 0 && (
          <Section title="IP & Lisensi" icon={ShieldCheck}>
            <div className="workflow-records">
              {ipReviews.map((review) => (
                <div key={String(review.id)}>
                  <Badge value={review.status} />
                  <strong>Status review IP</strong>
                  <span>Ditinjau {formatDateTime(String(review.reviewed_at || ''))}</span>
                  <small>{String(review.notes || '')}</small>
                </div>
              ))}
            </div>
          </Section>
        )}
        <Section title="Riwayat" icon={Clock3}>
          <div className="activity-list">
            {activity.length ? (
              activity.map((item) => (
                <div className="activity-item" key={String(item.id)}>
                  <span className="activity-icon">
                    <Clock3 size={16} />
                  </span>
                  <div>
                    <strong>
                      {titleCase(String(item.action || 'Pembaruan'))} ·{' '}
                      {titleCase(String(item.entity_type || ''))}
                    </strong>
                    <small>
                      {formatDateTime(String(item.created_at || ''))}
                      {(item.users as { full_name?: string } | undefined)?.full_name
                        ? ` · ${(item.users as { full_name: string }).full_name}`
                        : ''}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada riwayat penting untuk workflow ini.</p>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
