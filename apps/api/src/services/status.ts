import { AppError } from '../lib/errors.js';

const transitions: Record<string, Record<string, string[]>> = {
  custom_requests: {
    NEW: ['UNDER_REVIEW', 'NEED_INFORMATION', 'CANCELLED'], UNDER_REVIEW: ['NEED_INFORMATION', 'FEASIBLE', 'NOT_FEASIBLE', 'CANCELLED'],
    NEED_INFORMATION: ['UNDER_REVIEW', 'CANCELLED'], FEASIBLE: ['ESTIMATING', 'CANCELLED'], NOT_FEASIBLE: ['UNDER_REVIEW', 'CANCELLED'],
    ESTIMATING: ['QUOTED', 'UNDER_REVIEW', 'CANCELLED'], QUOTED: ['ACCEPTED', 'DECLINED', 'ESTIMATING', 'CANCELLED'], ACCEPTED: [], DECLINED: ['UNDER_REVIEW'], CANCELLED: [],
  },
  quotations: { DRAFT: ['APPROVED', 'DECLINED'], APPROVED: ['SENT', 'DRAFT'], SENT: ['ACCEPTED', 'DECLINED', 'EXPIRED'], ACCEPTED: [], DECLINED: [], EXPIRED: [] },
  orders: { CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'], IN_PRODUCTION: ['QC', 'ON_HOLD', 'CANCELLED'], ON_HOLD: ['IN_PRODUCTION', 'CANCELLED'], QC: ['IN_PRODUCTION', 'PACKAGING', 'CANCELLED'], PACKAGING: ['READY', 'COMPLETED', 'CANCELLED'], READY: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
  design_tasks: { PENDING: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['REVIEW', 'COMPLETED', 'CANCELLED'], REVIEW: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
  production_jobs: { WAITING: ['QUEUED', 'IN_PROGRESS', 'CANCELLED'], QUEUED: ['IN_PROGRESS', 'PRINTING', 'ON_HOLD', 'CANCELLED'], IN_PROGRESS: ['PRINTING', 'QC', 'ON_HOLD', 'CANCELLED'], PRINTING: ['QC', 'ON_HOLD', 'CANCELLED'], ON_HOLD: ['QUEUED', 'IN_PROGRESS', 'CANCELLED'], QC: ['IN_PROGRESS', 'PACKAGING', 'COMPLETED', 'CANCELLED'], PACKAGING: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
  print_jobs: { QUEUED: ['PRINTING', 'CANCELLED'], PRINTING: ['PAUSED', 'SUCCESS', 'FAILED', 'CANCELLED'], PAUSED: ['PRINTING', 'FAILED', 'CANCELLED'], SUCCESS: [], FAILED: [], CANCELLED: [] },
  products: { DRAFT: ['ACTIVE', 'ARCHIVED'], ACTIVE: ['DRAFT', 'ARCHIVED'], ARCHIVED: ['DRAFT', 'ACTIVE'] },
  order_packaging: { PENDING: ['PACKING', 'PACKED'], PACKING: ['PENDING', 'PACKED'], PACKED: ['PENDING'] },
  ip_reviews: { NEEDS_REVIEW: ['CLEAR', 'RESTRICTED'], CLEAR: ['NEEDS_REVIEW'], RESTRICTED: ['NEEDS_REVIEW'] },
};
export function validateTransition(table: string, previous: unknown, next: unknown): void {
  if (next === undefined || next === previous) return;
  const states = transitions[table];
  if (!states) return;
  if (typeof next !== 'string' || !(next in states)) throw new AppError(422, `Invalid ${table.replaceAll('_', ' ')} status.`);
  if (previous != null && !states[String(previous)]?.includes(next)) throw new AppError(409, `Cannot move from ${String(previous)} to ${next}.`);
}
