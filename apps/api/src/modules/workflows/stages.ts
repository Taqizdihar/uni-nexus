import type { ProductionWorkflowTab, SalesWorkflowStage } from '@uni-nexus/shared';

type StatusRecord = {
  status?: unknown;
  result?: unknown;
  completed_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

export type SalesWorkflowStageInput = {
  customRequest?: StatusRecord | null;
  designTasks?: StatusRecord[];
  quotations?: StatusRecord[];
  orders?: StatusRecord[];
  productionJobs?: StatusRecord[];
  printJobs?: StatusRecord[];
  qcInspections?: StatusRecord[];
  packaging?: StatusRecord[];
};

const statusOf = (record: StatusRecord | null | undefined) =>
  String(record?.status ?? record?.result ?? '').toUpperCase();
const someStatus = (records: StatusRecord[] | undefined, statuses: readonly string[]) =>
  (records ?? []).some((record) => statuses.includes(statusOf(record)));

function timestamp(record: StatusRecord): number {
  const value = record.updated_at ?? record.created_at ?? record.completed_at;
  const parsed = value == null ? NaN : new Date(String(value)).valueOf();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function latest(records: StatusRecord[] | undefined): StatusRecord | undefined {
  return (records ?? []).reduce<StatusRecord | undefined>(
    (current, record) => (!current || timestamp(record) >= timestamp(current) ? record : current),
    undefined,
  );
}

/**
 * Resolves a sales queue stage from source-of-truth records. The order is intentional:
 * terminal order states first, reprint work before completion, then active work flowing
 * backwards through production, quotation, design, and the original request.
 */
export function deriveSalesWorkflowStage(input: SalesWorkflowStageInput): SalesWorkflowStage {
  const orders = input.orders ?? [];
  const latestQuotation = latest(input.quotations);
  const latestPrint = latest(input.printJobs);
  const latestQc = latest(input.qcInspections);
  const requestStatus = statusOf(input.customRequest);
  const hasOrder = orders.length > 0;

  if (someStatus(orders, ['COMPLETED']) || orders.some((order) => order.completed_at != null))
    return 'COMPLETED';

  const hasActiveOrder = someStatus(orders, [
    'CONFIRMED',
    'IN_PRODUCTION',
    'ON_HOLD',
    'QC',
    'PACKAGING',
    'READY',
  ]);
  if (
    someStatus(orders, ['CANCELLED']) ||
    (!hasActiveOrder &&
      !hasOrder &&
      ['NOT_FEASIBLE', 'DECLINED', 'CANCELLED'].includes(requestStatus)) ||
    (!hasActiveOrder && !hasOrder && ['DECLINED', 'EXPIRED'].includes(statusOf(latestQuotation)))
  )
    return 'CANCELLED';

  // A failed print or an explicit QC reprint returns the job to the production queue.
  if (statusOf(latestPrint) === 'FAILED' || statusOf(latestQc) === 'REPRINT')
    return 'PRODUCTION';

  // Successful print output, QC, and packaging are the completion path. REWORK stays here
  // because it does not necessarily require a complete new print; REPRINT was handled above.
  if (
    someStatus(orders, ['QC', 'PACKAGING', 'READY']) ||
    someStatus(input.productionJobs, ['QC', 'PACKAGING']) ||
    statusOf(latestPrint) === 'SUCCESS' ||
    ['PASS', 'FAIL', 'REWORK'].includes(statusOf(latestQc)) ||
    someStatus(input.packaging, ['PENDING', 'PACKING', 'PACKED'])
  )
    return 'COMPLETION';

  if (
    someStatus(orders, ['IN_PRODUCTION', 'ON_HOLD']) ||
    someStatus(input.productionJobs, ['WAITING', 'QUEUED', 'IN_PROGRESS', 'PRINTING', 'ON_HOLD']) ||
    someStatus(input.printJobs, ['QUEUED', 'PRINTING', 'PAUSED'])
  )
    return 'PRODUCTION';

  if (hasOrder) return 'READY_FOR_PRODUCTION';

  if (someStatus(input.quotations, ['DRAFT', 'APPROVED', 'SENT', 'ACCEPTED'])) return 'QUOTATION';

  // Preserve a meaningful queue position for legacy/in-progress requests whose
  // quotation record has not been created or linked yet.
  if (['ESTIMATING', 'QUOTED', 'ACCEPTED'].includes(requestStatus)) return 'QUOTATION';

  if (
    someStatus(input.designTasks, ['PENDING', 'IN_PROGRESS', 'REVIEW']) ||
    someStatus(input.designTasks, ['COMPLETED'])
  )
    return 'DESIGN';

  return 'REQUEST';
}

export type ProductionWorkflowStageInput = {
  productionJob?: StatusRecord | null;
  printJobs?: StatusRecord[];
  qcInspections?: StatusRecord[];
  packaging?: StatusRecord[];
  order?: StatusRecord | null;
};

/** Maps the authoritative production records to the single operational queue tab. */
export function deriveProductionWorkflowTab(
  input: ProductionWorkflowStageInput,
): ProductionWorkflowTab {
  const jobStatus = statusOf(input.productionJob);
  const latestPrint = latest(input.printJobs);
  const latestQc = latest(input.qcInspections);
  if (statusOf(input.order) === 'COMPLETED' || jobStatus === 'COMPLETED') return 'COMPLETED';
  if (
    jobStatus === 'ON_HOLD' ||
    statusOf(latestPrint) === 'FAILED' ||
    ['FAIL', 'REWORK', 'REPRINT'].includes(statusOf(latestQc))
  )
    return 'ATTENTION';
  if (jobStatus === 'PACKAGING' || someStatus(input.packaging, ['PENDING', 'PACKING']))
    return 'PACKAGING';
  if (jobStatus === 'QC' || statusOf(latestPrint) === 'SUCCESS') return 'QC';
  if (['PRINTING', 'PAUSED'].includes(statusOf(latestPrint)) || jobStatus === 'PRINTING')
    return 'PRINTING';
  if (statusOf(latestPrint) === 'QUEUED' || jobStatus === 'QUEUED') return 'PRINT_QUEUE';
  return 'NEEDS_PROCESSING';
}
