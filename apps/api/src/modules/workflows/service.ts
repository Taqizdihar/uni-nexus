import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { costSummary } from '../../services/costing.js';
import { decimal } from '../../services/money.js';
import {
  SALES_WORKFLOW_STAGE_LABELS,
  SALES_WORKFLOW_TABS,
  type ProductionWorkflowTab,
  type SalesWorkflowStage,
} from '@uni-nexus/shared';
import { deriveProductionWorkflowTab, deriveSalesWorkflowStage } from './stages.js';

type Db = PrismaClient | Prisma.TransactionClient;
type Scalar = string | number | bigint | Date | null | undefined;
export type WorkflowVisibility = { canSeeSales: boolean; canSeeFinance: boolean };
const defaultVisibility: WorkflowVisibility = { canSeeSales: false, canSeeFinance: false };
type Named = {
  id: bigint;
  full_name?: string | null;
  name?: string | null;
  material_type?: string | null;
};
type StatusRecord = {
  id: bigint;
  status?: string | null;
  result?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  completed_at?: Date | null;
};

export type SalesWorkflowFilters = {
  page: number;
  pageSize: number;
  stage?: SalesWorkflowStage;
  search?: string;
  customer?: string;
  status?: string;
  targetDate?: string;
  deadline?: 'OVERDUE' | 'UPCOMING';
  priority?: string;
  assigned?: string;
  paymentStatus?: string;
  source?: string;
  sort?: 'updated_at' | 'target_date' | 'value';
  direction?: 'asc' | 'desc';
};

export type ProductionWorkflowFilters = Omit<SalesWorkflowFilters, 'stage'> & {
  tab?: ProductionWorkflowTab;
};

type WorkflowCustomer = {
  id: bigint;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address_text?: string | null;
};
type WorkflowRequest = StatusRecord & {
  request_number?: string | null;
  title?: string | null;
  description?: string | null;
  source?: string | null;
  target_date?: Date | null;
  requested_quantity?: number | null;
  requested_height_mm?: Scalar;
  requested_width_mm?: Scalar;
  requested_length_mm?: Scalar;
  preferred_color?: string | null;
  customers: WorkflowCustomer;
  materials?: Named | null;
  products?: Named | null;
  users_custom_requests_assigned_designer_idTousers?: Named | null;
  design_tasks: DesignTask[];
  quotations: Quotation[];
  orders: WorkflowOrder[];
  request_files?: WorkflowFile[];
  request_notes?: WorkflowNote[];
  design_assets?: WorkflowAsset[];
  ip_reviews?: IpReview[];
};
type DesignTask = StatusRecord & {
  priority?: string | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  notes?: string | null;
  users?: Named | null;
  design_assets?: WorkflowAsset[];
};
type QuoteItem = {
  id: bigint;
  description: string;
  quantity: Scalar;
  unit_price: Scalar;
  amount: Scalar;
  material_id?: bigint | null;
  billable_weight_gram?: Scalar;
  pricing_rule_id?: bigint | null;
  pricing_rule_name_snapshot?: string | null;
  pricing_rule_type_snapshot?: string | null;
  price_per_gram_snapshot?: Scalar;
  minimum_price_snapshot?: Scalar;
  design_fee_snapshot?: Scalar;
  finishing_fee_snapshot?: Scalar;
  pricing_breakdown_json?: unknown;
  pricing_calculated_at?: Date | null;
  products?: Named | null;
  product_variants?: Named | null;
  materials?: Named | null;
  pricing_rules?: { id: bigint; name: string; rule_type: string } | null;
};
type Quotation = StatusRecord & {
  quotation_number?: string | null;
  revision_no: number;
  total_price: Scalar;
  subtotal: Scalar;
  discount_amount: Scalar;
  additional_cost: Scalar;
  valid_until?: Date | null;
  sent_at?: Date | null;
  accepted_at?: Date | null;
  declined_at?: Date | null;
  notes?: string | null;
  quotation_items: QuoteItem[];
};
type WorkflowOrder = StatusRecord & {
  order_number?: string | null;
  customer_id: bigint;
  custom_request_id?: bigint | null;
  quotation_id?: bigint | null;
  order_source?: string | null;
  payment_status?: string | null;
  target_date?: Date | null;
  total_price: Scalar;
  subtotal: Scalar;
  discount_amount: Scalar;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  customer_notes?: string | null;
  internal_notes?: string | null;
  customers: WorkflowCustomer;
  custom_requests?: {
    id: bigint;
    request_number?: string | null;
    source?: string | null;
    target_date?: Date | null;
  } | null;
  quotations?: Quotation | null;
  order_items: OrderItem[];
  order_packaging: Packaging[];
  ip_reviews?: IpReview[];
};
type OrderItem = {
  id: bigint;
  item_name: string;
  description?: string | null;
  quantity: number;
  unit_price: Scalar;
  total_price: Scalar;
  products?: Named | null;
  product_variants?: Named | null;
  design_assets?: WorkflowAsset | null;
  production_jobs: ProductionJob[];
};
type ProductionJob = StatusRecord & {
  job_number?: string | null;
  priority?: string | null;
  assigned_operator_id?: bigint | null;
  planned_start?: Date | null;
  planned_end?: Date | null;
  actual_start?: Date | null;
  actual_end?: Date | null;
  notes?: string | null;
  users?: Named | null;
  print_jobs: PrintJob[];
  qc_inspections: QcInspection[];
  slicing_results: SlicingResult[];
  order_items?: OrderItem;
};
type PrintJob = StatusRecord & {
  print_job_number?: string | null;
  queue_position?: number | null;
  queued_at?: Date | null;
  started_at?: Date | null;
  estimated_weight_gram?: Scalar;
  actual_weight_gram?: Scalar;
  estimated_print_minutes?: number | null;
  actual_print_minutes?: number | null;
  notes?: string | null;
  printers?: Named | null;
  print_profiles?: { id: bigint; name: string; materials?: Named | null } | null;
  slicing_results?: SlicingResult | null;
  users?: Named | null;
  print_failures: PrintFailure[];
  qc_inspections: QcInspection[];
  material_usages?: Array<{
    id: bigint;
    usage_type: string;
    weight_gram: Scalar;
    total_cost: Scalar;
    cost_per_gram: Scalar;
    notes?: string | null;
    filament_spools?: {
      id: bigint;
      spool_code?: string | null;
      brand?: string | null;
      color_name?: string | null;
      materials?: Named | null;
    } | null;
  }>;
};
type QcInspection = StatusRecord & {
  result?: string | null;
  inspected_at?: Date | null;
  notes?: string | null;
  users?: Named | null;
};
type Packaging = StatusRecord & {
  quantity?: number | null;
  actual_cost?: Scalar;
  packed_at?: Date | null;
  notes?: string | null;
  packaging_types?: Named | null;
  users?: Named | null;
};
type PrintFailure = {
  id: bigint;
  failure_type: string;
  description?: string | null;
  failed_at_percentage?: Scalar;
  wasted_weight_gram?: Scalar;
  root_cause?: string | null;
  corrective_action?: string | null;
  created_at?: Date | null;
};
type SlicingResult = {
  id: bigint;
  slicer_name?: string | null;
  total_weight_gram?: Scalar;
  estimated_print_minutes?: number | null;
  model_weight_gram?: Scalar;
  support_weight_gram?: Scalar;
  is_selected?: boolean | null;
  created_at?: Date | null;
  print_profiles?: { id: bigint; name: string } | null;
  printers?: Named | null;
};
type WorkflowFile = { id: bigint; file_name: string; file_type: string; created_at?: Date | null };
type WorkflowNote = {
  id: bigint;
  note: string;
  is_internal: boolean;
  created_at?: Date | null;
  users?: Named | null;
};
type WorkflowAsset = {
  id: bigint;
  file_name: string;
  asset_type: string;
  external_url?: string | null;
  version_label?: string | null;
  is_final?: boolean | null;
  notes?: string | null;
  created_at?: Date | null;
};
type IpReview = StatusRecord & {
  reviewed_at?: Date | null;
  notes?: string | null;
  users?: Named | null;
};

const userSelect = { id: true, full_name: true } as const;
const customerSelect = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  address_text: true,
} as const;
const assetSelect = {
  id: true,
  file_name: true,
  asset_type: true,
  external_url: true,
  version_label: true,
  is_final: true,
  notes: true,
  created_at: true,
} as const;

// Queue lists intentionally use the compact graph below. Files, design versions, price
// breakdowns, slicing history, and audit history are fetched only by the detail endpoint.
const printListInclude = {
  printers: { select: { id: true, name: true } },
  print_profiles: {
    include: { materials: { select: { id: true, name: true, material_type: true } } },
  },
  slicing_results: { select: { id: true, estimated_print_minutes: true } },
  users: { select: userSelect },
  print_failures: { orderBy: { created_at: 'desc' as const } },
  qc_inspections: { orderBy: { created_at: 'desc' as const } },
} as const;
const productionListInclude = {
  users: { select: userSelect },
  print_jobs: { orderBy: { updated_at: 'desc' as const }, include: printListInclude },
  qc_inspections: { orderBy: { created_at: 'desc' as const } },
} as const;
const orderListInclude = {
  customers: { select: customerSelect },
  quotations: true,
  order_items: {
    include: {
      production_jobs: { orderBy: { updated_at: 'desc' as const }, include: productionListInclude },
    },
  },
  order_packaging: { orderBy: { updated_at: 'desc' as const } },
} as const;
const requestListInclude = {
  customers: { select: customerSelect },
  users_custom_requests_assigned_designer_idTousers: { select: userSelect },
  design_tasks: {
    orderBy: { updated_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
  quotations: { orderBy: { updated_at: 'desc' as const } },
  orders: { orderBy: { updated_at: 'desc' as const }, include: orderListInclude },
} as const;

const printInclude = {
  printers: { select: { id: true, name: true } },
  print_profiles: {
    include: { materials: { select: { id: true, name: true, material_type: true } } },
  },
  slicing_results: {
    include: {
      printers: { select: { id: true, name: true } },
      print_profiles: { select: { id: true, name: true } },
    },
  },
  users: { select: userSelect },
  print_failures: { orderBy: { created_at: 'desc' as const } },
  qc_inspections: {
    orderBy: { created_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
  material_usages: {
    orderBy: { created_at: 'desc' as const },
    include: {
      filament_spools: {
        select: {
          id: true,
          spool_code: true,
          brand: true,
          color_name: true,
          materials: { select: { id: true, name: true, material_type: true } },
        },
      },
    },
  },
} as const;
const productionInclude = {
  users: { select: userSelect },
  print_jobs: { orderBy: { updated_at: 'desc' as const }, include: printInclude },
  qc_inspections: {
    orderBy: { created_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
  slicing_results: {
    orderBy: { created_at: 'desc' as const },
    include: {
      printers: { select: { id: true, name: true } },
      print_profiles: { select: { id: true, name: true } },
    },
  },
} as const;
const orderInclude = {
  customers: { select: customerSelect },
  quotations: {
    include: {
      quotation_items: {
        include: {
          products: { select: { id: true, name: true } },
          product_variants: { select: { id: true, name: true } },
          materials: { select: { id: true, name: true, material_type: true } },
          pricing_rules: { select: { id: true, name: true, rule_type: true } },
        },
      },
    },
  },
  order_items: {
    include: {
      products: { select: { id: true, name: true } },
      product_variants: { select: { id: true, name: true } },
      design_assets: { select: assetSelect },
      production_jobs: { orderBy: { updated_at: 'desc' as const }, include: productionInclude },
    },
  },
  order_packaging: {
    orderBy: { updated_at: 'desc' as const },
    include: {
      packaging_types: { select: { id: true, name: true } },
      users: { select: userSelect },
    },
  },
  ip_reviews: {
    orderBy: { updated_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
} as const;
const requestInclude = {
  customers: { select: customerSelect },
  materials: { select: { id: true, name: true, material_type: true } },
  products: { select: { id: true, name: true } },
  users_custom_requests_assigned_designer_idTousers: { select: userSelect },
  design_tasks: {
    orderBy: { updated_at: 'desc' as const },
    include: { users: { select: userSelect }, design_assets: { select: assetSelect } },
  },
  quotations: {
    orderBy: { updated_at: 'desc' as const },
    include: {
      quotation_items: {
        include: {
          products: { select: { id: true, name: true } },
          product_variants: { select: { id: true, name: true } },
          materials: { select: { id: true, name: true, material_type: true } },
          pricing_rules: { select: { id: true, name: true, rule_type: true } },
        },
      },
    },
  },
  orders: { orderBy: { updated_at: 'desc' as const }, include: orderInclude },
  request_files: {
    orderBy: { created_at: 'desc' as const },
    select: { id: true, file_name: true, file_type: true, created_at: true },
  },
  request_notes: {
    orderBy: { created_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
  design_assets: { orderBy: { created_at: 'desc' as const }, select: assetSelect },
  ip_reviews: {
    orderBy: { updated_at: 'desc' as const },
    include: { users: { select: userSelect } },
  },
} as const;

const asText = (value: Scalar) => (value == null ? null : String(value));
const statusOf = (record: { status?: string | null; result?: string | null } | null | undefined) =>
  String(record?.status ?? record?.result ?? '').toUpperCase();
const dateOf = (value: Scalar) =>
  value instanceof Date ? value : value == null ? null : new Date(String(value));
const dateValue = (value: Scalar) => dateOf(value)?.valueOf() ?? Number.NEGATIVE_INFINITY;
const latest = <
  T extends { updated_at?: Date | null; created_at?: Date | null; completed_at?: Date | null },
>(
  records: T[],
) =>
  records.reduce<T | undefined>(
    (current, item) =>
      !current ||
      Math.max(
        dateValue(item.updated_at),
        dateValue(item.created_at),
        dateValue(item.completed_at),
      ) >=
        Math.max(
          dateValue(current.updated_at),
          dateValue(current.created_at),
          dateValue(current.completed_at),
        )
        ? item
        : current,
    undefined,
  );
const stringMoney = (value: Scalar) => (value == null ? null : decimal(value).toFixed(2));
const dateOnly = (value: Scalar) => {
  const date = dateOf(value);
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : null;
};

function productionJobsFor(orders: WorkflowOrder[]) {
  return orders.flatMap((order) => order.order_items.flatMap((item) => item.production_jobs));
}
function printJobsFor(jobs: ProductionJob[]) {
  return jobs.flatMap((job) => job.print_jobs);
}
function qcsFor(jobs: ProductionJob[]) {
  return jobs.flatMap((job) => [
    ...job.qc_inspections,
    ...job.print_jobs.flatMap((print) => print.qc_inspections),
  ]);
}
function packagingFor(orders: WorkflowOrder[]) {
  return orders.flatMap((order) => order.order_packaging);
}

function preferredOrder(orders: WorkflowOrder[]) {
  return orders.find((order) => !['COMPLETED', 'CANCELLED'].includes(statusOf(order))) ?? orders[0];
}

function workflowStatus(
  stage: SalesWorkflowStage,
  request: WorkflowRequest | undefined,
  order: WorkflowOrder | undefined,
  quotes: Quotation[],
  designs: DesignTask[],
  jobs: ProductionJob[],
  prints: PrintJob[],
  qcs: QcInspection[],
  packaging: Packaging[],
) {
  const candidates: Record<
    SalesWorkflowStage,
    Array<{ status?: string | null; result?: string | null } | undefined>
  > = {
    REQUEST: [request],
    DESIGN: [latest(designs)],
    QUOTATION: [latest(quotes)],
    READY_FOR_PRODUCTION: [order],
    PRODUCTION: [latest(prints), latest(jobs)],
    COMPLETION: [latest(packaging), latest(qcs), latest(jobs), latest(prints)],
    COMPLETED: [order],
    CANCELLED: [order, latest(quotes), request],
  };
  return statusOf(candidates[stage].find(Boolean));
}

function nextAction(stage: SalesWorkflowStage) {
  return (
    {
      REQUEST: 'Tugaskan designer',
      DESIGN: 'Lanjutkan desain',
      QUOTATION: 'Tindak lanjuti penawaran',
      READY_FOR_PRODUCTION: 'Siapkan produksi',
      PRODUCTION: 'Pantau produksi',
      COMPLETION: 'Selesaikan QC atau pengemasan',
      COMPLETED: 'Lihat riwayat',
      CANCELLED: 'Lihat alasan pembatalan',
    } satisfies Record<SalesWorkflowStage, string>
  )[stage];
}

export type SalesWorkflowRow = {
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
  target_date: Date | null;
  value: string | null;
  payment_status: string | null;
  source: string | null;
  updated_at: Date | null;
  next_action: string;
};

function toSalesWorkflow(
  request: WorkflowRequest | undefined,
  directOrder: WorkflowOrder | undefined,
  visibility: WorkflowVisibility = defaultVisibility,
): SalesWorkflowRow {
  const orders = request?.orders ?? (directOrder ? [directOrder] : []);
  const order = preferredOrder(orders);
  if (!request && !order)
    throw new AppError(404, 'Workflow tidak ditemukan.', 'WORKFLOW_NOT_FOUND');
  const jobs = productionJobsFor(orders);
  const prints = printJobsFor(jobs);
  const qcs = qcsFor(jobs);
  const packaging = packagingFor(orders);
  const quotes = request?.quotations ?? (order?.quotations ? [order.quotations] : []);
  const designs = request?.design_tasks ?? [];
  const stage = deriveSalesWorkflowStage({
    customRequest: request,
    designTasks: designs,
    quotations: quotes,
    orders,
    productionJobs: jobs,
    printJobs: prints,
    qcInspections: qcs,
    packaging,
  });
  const designer =
    latest(designs)?.users ?? request?.users_custom_requests_assigned_designer_idTousers;
  const operator = latest(jobs)?.users ?? latest(prints)?.users;
  const customer = request?.customers ?? order!.customers;
  const title =
    request?.title ??
    order?.order_items[0]?.item_name ??
    order?.order_number ??
    'Pesanan tanpa judul';
  const updateCandidates = [
    request?.updated_at,
    order?.updated_at,
    latest(designs)?.updated_at,
    latest(quotes)?.updated_at,
    latest(jobs)?.updated_at,
    latest(prints)?.updated_at,
    latest(packaging)?.updated_at,
  ].filter((value): value is Date => value instanceof Date);
  const updatedAt =
    updateCandidates.sort((left, right) => right.valueOf() - left.valueOf())[0] ?? null;
  const activeDesign = latest(designs);
  const activeJob = latest(jobs);
  return {
    workflow_key: request ? `request:${request.id}` : `order:${order!.id}`,
    custom_request_id: request ? String(request.id) : null,
    order_id: order ? String(order.id) : null,
    request_number: request?.request_number ?? null,
    order_number: order?.order_number ?? null,
    customer: { id: String(customer.id), full_name: customer.full_name },
    title,
    stage,
    stage_label: SALES_WORKFLOW_STAGE_LABELS[stage],
    status: workflowStatus(stage, request, order, quotes, designs, jobs, prints, qcs, packaging),
    priority: activeJob?.priority ?? activeDesign?.priority ?? null,
    assigned: designer?.full_name
      ? { id: String(designer.id), name: designer.full_name, role: 'DESIGNER' }
      : operator?.full_name
        ? { id: String(operator.id), name: operator.full_name, role: 'OPERATOR' }
        : null,
    target_date: order?.target_date ?? request?.target_date ?? null,
    value: visibility.canSeeSales || visibility.canSeeFinance
      ? stringMoney(order?.total_price ?? latest(quotes)?.total_price)
      : null,
    payment_status: visibility.canSeeSales || visibility.canSeeFinance ? order?.payment_status ?? null : null,
    source: order?.order_source ?? request?.source ?? null,
    updated_at: updatedAt,
    next_action: nextAction(stage),
  };
}

function includesText(value: Scalar, search: string | undefined) {
  return (
    !search ||
    String(value ?? '')
      .toLocaleLowerCase('id-ID')
      .includes(search.toLocaleLowerCase('id-ID'))
  );
}
function deadlineMatches(value: Date | null, filter: SalesWorkflowFilters) {
  if (!filter.deadline && !filter.targetDate) return true;
  const target = dateOnly(value);
  if (filter.targetDate && target !== filter.targetDate) return false;
  if (!filter.deadline || !target) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(`${target}T00:00:00`);
  if (filter.deadline === 'OVERDUE') return targetDate < today;
  const threshold = new Date(today);
  threshold.setDate(today.getDate() + 7);
  return targetDate >= today && targetDate <= threshold;
}

export function filterSalesWorkflows(rows: SalesWorkflowRow[], filters: SalesWorkflowFilters) {
  return rows.filter((row) => {
    const search = filters.search;
    const matchesSearch =
      !search ||
      [row.request_number, row.order_number, row.customer.full_name, row.title].some((value) =>
        includesText(value, search),
      );
    return (
      matchesSearch &&
      (!filters.stage || row.stage === filters.stage) &&
      includesText(row.customer.full_name, filters.customer) &&
      includesText(row.status, filters.status) &&
      deadlineMatches(row.target_date, filters) &&
      (!filters.priority || row.priority === filters.priority) &&
      includesText(row.assigned?.name, filters.assigned) &&
      (!filters.paymentStatus || row.payment_status === filters.paymentStatus) &&
      (!filters.source || row.source === filters.source)
    );
  });
}

function sortSalesWorkflows(rows: SalesWorkflowRow[], filters: SalesWorkflowFilters) {
  const direction = filters.direction === 'asc' ? 1 : -1;
  const column = filters.sort ?? 'updated_at';
  return [...rows].sort((left, right) => {
    const leftValue =
      column === 'value'
        ? Number(left.value ?? 0)
        : column === 'target_date'
          ? dateValue(left.target_date)
          : dateValue(left.updated_at);
    const rightValue =
      column === 'value'
        ? Number(right.value ?? 0)
        : column === 'target_date'
          ? dateValue(right.target_date)
          : dateValue(right.updated_at);
    return (leftValue - rightValue) * direction;
  });
}

export async function listSalesWorkflows(
  db: Db,
  workspaceId: bigint,
  filters: SalesWorkflowFilters,
  visibility: WorkflowVisibility = defaultVisibility,
) {
  const [requests, directOrders] = await Promise.all([
    db.custom_requests.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { updated_at: 'desc' },
      include: requestListInclude,
    }),
    db.orders.findMany({
      where: { workspace_id: workspaceId, custom_request_id: null },
      orderBy: { updated_at: 'desc' },
      include: orderListInclude,
    }),
  ]);
  const rows = [
    ...(requests as unknown as WorkflowRequest[]).map((request) =>
      toSalesWorkflow(request, undefined, visibility),
    ),
    ...(directOrders as unknown as WorkflowOrder[]).map((order) =>
      toSalesWorkflow(undefined, order, visibility),
    ),
  ];
  const filtered = sortSalesWorkflows(filterSalesWorkflows(rows, filters), filters);
  const counts = Object.fromEntries(
    SALES_WORKFLOW_TABS.map((tab) => [
      tab.key,
      tab.stage ? rows.filter((row) => row.stage === tab.stage).length : rows.length,
    ]),
  );
  const total = filtered.length;
  const start = (filters.page - 1) * filters.pageSize;
  return {
    data: filtered.slice(start, start + filters.pageSize),
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
    counts,
  };
}

function selectOrderForDetail(order: WorkflowOrder | undefined) {
  if (!order) return null;
  return order;
}

function workflowAuditTargets(
  request: WorkflowRequest | undefined,
  order: WorkflowOrder | undefined,
) {
  const targets: Prisma.audit_logsWhereInput[] = [];
  if (request) targets.push({ entity_type: 'custom_requests', entity_id: request.id });
  for (const quote of request?.quotations ?? (order?.quotations ? [order.quotations] : []))
    targets.push({ entity_type: 'quotations', entity_id: quote.id });
  for (const currentOrder of request?.orders ?? (order ? [order] : [])) {
    targets.push({ entity_type: 'orders', entity_id: currentOrder.id });
    for (const item of currentOrder.order_items)
      for (const job of item.production_jobs) {
        targets.push({ entity_type: 'production_jobs', entity_id: job.id });
        for (const print of job.print_jobs)
          targets.push({ entity_type: 'print_jobs', entity_id: print.id });
        for (const qc of job.qc_inspections)
          targets.push({ entity_type: 'qc_inspections', entity_id: qc.id });
      }
    for (const pack of currentOrder.order_packaging)
      targets.push({ entity_type: 'order_packaging', entity_id: pack.id });
  }
  return targets;
}

function redactQuotation(quotation: Record<string, unknown>, canSeeSales: boolean) {
  if (canSeeSales) return quotation;
  const { total_price: _total, subtotal: _subtotal, discount_amount: _discount, additional_cost: _additional, quotation_items, ...safe } = quotation;
  return {
    ...safe,
    quotation_items: Array.isArray(quotation_items)
      ? quotation_items.map((item) => {
          const { unit_price: _unit, amount: _amount, pricing_breakdown_json: _breakdown, price_per_gram_snapshot: _price, minimum_price_snapshot: _minimum, design_fee_snapshot: _design, finishing_fee_snapshot: _finishing, ...safeItem } = item as Record<string, unknown>;
          return safeItem;
        })
      : quotation_items,
  };
}

function redactOrder(order: Record<string, unknown>, canSeeSales: boolean) {
  if (canSeeSales) return order;
  const { total_price: _total, subtotal: _subtotal, discount_amount: _discount, payment_status: _payment, order_items, quotations, ...safe } = order;
  return {
    ...safe,
    order_items: Array.isArray(order_items)
      ? order_items.map((item) => {
          const { unit_price: _unit, total_price: _lineTotal, ...safeItem } = item as Record<string, unknown>;
          return safeItem;
        })
      : order_items,
    quotations: quotations && typeof quotations === 'object' ? redactQuotation(quotations as Record<string, unknown>, false) : quotations,
  };
}

export function redactWorkflowFinancials<T extends Record<string, any>>(
  data: T,
  visibility: WorkflowVisibility,
): T {
  const canSeeSales = visibility.canSeeSales || visibility.canSeeFinance;
  const request = data.request && typeof data.request === 'object' ? { ...data.request } : data.request;
  if (request && typeof request === 'object') {
    request.quotations = Array.isArray(request.quotations)
      ? request.quotations.map((quote: Record<string, unknown>) => redactQuotation(quote, canSeeSales))
      : request.quotations;
    request.orders = Array.isArray(request.orders)
      ? request.orders.map((order: Record<string, unknown>) => redactOrder(order, canSeeSales))
      : request.orders;
  }
  const order = data.order && typeof data.order === 'object' ? redactOrder({ ...data.order }, canSeeSales) : data.order;
  const quotations = Array.isArray(data.quotations)
    ? data.quotations.map((quote) => redactQuotation(quote as Record<string, unknown>, canSeeSales))
    : data.quotations;
  return {
    ...data,
    workflow: {
      ...data.workflow,
      value: canSeeSales ? data.workflow.value : null,
      payment_status: canSeeSales ? data.workflow.payment_status : null,
    },
    request,
    order,
    quotations,
    hpp: visibility.canSeeFinance ? data.hpp : null,
    activity: visibility.canSeeFinance
      ? data.activity
      : Array.isArray(data.activity)
        ? data.activity.map((entry: Record<string, unknown>) => {
            const { old_value_json: _old, new_value_json: _new, ...safeEntry } = entry;
            return safeEntry;
          })
        : data.activity,
  };
}

export async function salesWorkflowDetail(
  db: Db,
  workspaceId: bigint,
  key: string,
  visibility: WorkflowVisibility = defaultVisibility,
) {
  const match =
    /^(request|order):(\d+)$/.exec(key) ?? (/^\d+$/.test(key) ? ['order', 'order', key] : null);
  if (!match) throw new AppError(404, 'Workflow tidak ditemukan.', 'WORKFLOW_NOT_FOUND');
  const [, kind, rawId] = match;
  const id = BigInt(rawId!);
  const request =
    kind === 'request'
      ? ((await db.custom_requests.findFirst({
          where: { id, workspace_id: workspaceId },
          include: requestInclude,
        })) as unknown as WorkflowRequest | null)
      : null;
  const directOrder =
    kind === 'order'
      ? ((await db.orders.findFirst({
          where: { id, workspace_id: workspaceId },
          include: orderInclude,
        })) as unknown as WorkflowOrder | null)
      : null;
  if (!request && !directOrder)
    throw new AppError(404, 'Workflow tidak ditemukan.', 'WORKFLOW_NOT_FOUND');
  const row = toSalesWorkflow(request ?? undefined, directOrder ?? undefined, visibility);
  const order = selectOrderForDetail(
    preferredOrder(request?.orders ?? (directOrder ? [directOrder] : [])),
  );
  const targets = workflowAuditTargets(request ?? undefined, order ?? undefined);
  const [activity, hpp] = await Promise.all([
    targets.length
      ? db.audit_logs.findMany({
          where: { workspace_id: workspaceId, OR: targets },
          orderBy: { created_at: 'desc' },
          take: 40,
          include: { users: { select: { id: true, full_name: true } } },
        })
      : [],
    order ? costSummary(db, workspaceId, order.id) : Promise.resolve(null),
  ]);
  return redactWorkflowFinancials({
    data: {
      workflow: row,
      request,
      order,
      quotations: request?.quotations ?? (order?.quotations ? [order.quotations] : []),
      design_tasks: request?.design_tasks ?? [],
      production_jobs: productionJobsFor(request?.orders ?? (order ? [order] : [])),
      packaging: packagingFor(request?.orders ?? (order ? [order] : [])),
      ip_reviews: [...(request?.ip_reviews ?? []), ...(order?.ip_reviews ?? [])],
      hpp,
      activity,
    },
  }, visibility);
}

export type ProductionWorkflowRow = {
  id: string;
  workflow_key: string;
  tab: ProductionWorkflowTab;
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
  target_date: Date | null;
  estimated_print_minutes: number | null;
  source: string | null;
  updated_at: Date | null;
  attention_reason: string | null;
};

function toProductionRow(
  job: ProductionJob & { order_items: OrderItem & { orders: WorkflowOrder } },
): ProductionWorkflowRow {
  const item = job.order_items;
  const order = item.orders;
  const print = latest(job.print_jobs);
  const qcs = [
    ...job.qc_inspections,
    ...job.print_jobs.flatMap((current) => current.qc_inspections),
  ];
  const tab = deriveProductionWorkflowTab({
    productionJob: job,
    printJobs: job.print_jobs,
    qcInspections: qcs,
    packaging: order.order_packaging,
    order,
  });
  const failed = latest(job.print_jobs.flatMap((current) => current.print_failures));
  const workflowKey = order.custom_request_id
    ? `request:${order.custom_request_id}`
    : `order:${order.id}`;
  const material = print?.print_profiles?.materials?.name ?? null;
  const reason =
    tab === 'ATTENTION'
      ? (failed?.failure_type ?? statusOf(latest(qcs)) ?? statusOf(print) ?? statusOf(job))
      : null;
  return {
    id: String(job.id),
    workflow_key: workflowKey,
    tab,
    job_number: job.job_number ?? null,
    print_job_number: print?.print_job_number ?? null,
    order_number: order.order_number ?? null,
    request_number: order.custom_requests?.request_number ?? null,
    customer: { id: String(order.customers.id), full_name: order.customers.full_name },
    title: item.item_name,
    status: statusOf(print) || statusOf(job),
    priority: job.priority ?? null,
    printer: print?.printers?.name ?? null,
    print_profile: print?.print_profiles?.name ?? null,
    material,
    operator: (print?.users ?? job.users)?.full_name
      ? {
          id: String((print?.users ?? job.users)!.id),
          name: (print?.users ?? job.users)!.full_name!,
        }
      : null,
    queue_position: print?.queue_position ?? null,
    target_date: order.target_date ?? order.custom_requests?.target_date ?? null,
    estimated_print_minutes:
      print?.estimated_print_minutes ?? print?.slicing_results?.estimated_print_minutes ?? null,
    source: order.order_source ?? order.custom_requests?.source ?? null,
    updated_at: print?.updated_at ?? job.updated_at ?? null,
    attention_reason: reason,
  };
}

export async function listProductionWorkflows(
  db: Db,
  workspaceId: bigint,
  filters: ProductionWorkflowFilters,
) {
  const jobs = await db.production_jobs.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { updated_at: 'desc' },
    include: {
      ...productionListInclude,
      order_items: {
        include: {
          products: { select: { id: true, name: true } },
          orders: {
            include: {
              customers: { select: customerSelect },
              custom_requests: {
                select: { id: true, request_number: true, source: true, target_date: true },
              },
              order_packaging: {
                orderBy: { updated_at: 'desc' },
                include: {
                  packaging_types: { select: { id: true, name: true } },
                  users: { select: userSelect },
                },
              },
            },
          },
        },
      },
    },
  });
  const rows = (
    jobs as unknown as Array<ProductionJob & { order_items: OrderItem & { orders: WorkflowOrder } }>
  ).map(toProductionRow);
  const filtered = rows
    .filter((row) => {
      const matchesSearch =
        !filters.search ||
        [
          row.job_number,
          row.print_job_number,
          row.order_number,
          row.request_number,
          row.customer.full_name,
          row.title,
        ].some((value) => includesText(value, filters.search));
      return (
        matchesSearch &&
        (!filters.tab || row.tab === filters.tab) &&
        includesText(row.customer.full_name, filters.customer) &&
        includesText(row.status, filters.status) &&
        deadlineMatches(row.target_date, filters) &&
        (!filters.priority || row.priority === filters.priority) &&
        includesText(row.operator?.name, filters.assigned) &&
        (!filters.source || row.source === filters.source)
      );
    })
    .sort((left, right) => {
      const column = filters.sort === 'target_date' ? 'target_date' : 'updated_at';
      const leftValue =
        column === 'target_date' ? dateValue(left.target_date) : dateValue(left.updated_at);
      const rightValue =
        column === 'target_date' ? dateValue(right.target_date) : dateValue(right.updated_at);
      return (leftValue - rightValue) * (filters.direction === 'asc' ? 1 : -1);
    });
  const counts = Object.fromEntries([
    ['ALL', rows.length],
    ...(
      [
        'NEEDS_PROCESSING',
        'PRINT_QUEUE',
        'PRINTING',
        'ATTENTION',
        'QC',
        'PACKAGING',
        'COMPLETED',
      ] as const
    ).map((tab) => [tab, rows.filter((row) => row.tab === tab).length]),
  ]);
  const total = filtered.length;
  const start = (filters.page - 1) * filters.pageSize;
  return {
    data: filtered.slice(start, start + filters.pageSize),
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
    counts,
  };
}

export async function salesWorkflowCounts(db: Db, workspaceId: bigint) {
  const result = await listSalesWorkflows(db, workspaceId, { page: 1, pageSize: 1 });
  return result.counts;
}
