import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { getBusinessUnitByCode } from '../../shared/utils/business-unit';
import type { MetricValue, StudioAnalyticsContext, StudioAnalyticsFilters } from './studio-analytics.types';

export const STUDIO_TIME_ZONE = 'Asia/Jakarta';
export const ACTIVE_PROJECT_STATUSES = ['approved', 'in_progress', 'review'];
export const PROJECT_STATUSES = ['lead', 'quotation', 'approved', 'in_progress', 'review', 'completed', 'paid', 'cancelled'];
export const ACTIVE_INVOICE_SQL = "i.status_code NOT IN ('draft','void','refunded')";

export const number = (value: unknown) => Number(value ?? 0);
export const money = (value: unknown) => Math.round(number(value) * 100) / 100;
export const nullableNumber = (value: unknown) => value === null || value === undefined ? null : number(value);

export function jakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const pick = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

const addDays = (day: string, days: number) => {
  const value = new Date(`${day}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export function normalizeFilters(input: Partial<StudioAnalyticsFilters>) : StudioAnalyticsFilters {
  const endDate = input.endDate || jakartaDate();
  const startDate = input.startDate || addDays(endDate, -29);
  if (startDate > endDate) throw new AppError(400, 'ANALYTICS_INVALID_PERIOD', 'Tanggal akhir harus setelah tanggal mulai.');
  if (Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) > 3660) throw new AppError(400, 'ANALYTICS_RANGE_TOO_LARGE', 'Rentang analitik maksimal 10 tahun.');
  return { startDate, endDate, compare: Boolean(input.compare), currency: input.currency?.toUpperCase(), projectType: input.projectType, clientId: input.clientId, serviceId: input.serviceId, page: Math.max(1, input.page || 1), limit: Math.min(100, Math.max(1, input.limit || 20)) };
}

export function previousPeriod(filters: StudioAnalyticsFilters) {
  const span = Math.floor((Date.parse(`${filters.endDate}T00:00:00Z`) - Date.parse(`${filters.startDate}T00:00:00Z`)) / 86400000) + 1;
  const endDate = addDays(filters.startDate, -1);
  return { ...filters, startDate: addDays(endDate, -(span - 1)), endDate, compare: false };
}

export const dateBounds = (filters: StudioAnalyticsFilters) => [
  `${filters.startDate} 00:00:00.000`,
  `${filters.endDate} 23:59:59.999`,
] as const;
export const dateOnly = (filters: StudioAnalyticsFilters) => [filters.startDate, filters.endDate] as const;
export const period = (filters: StudioAnalyticsFilters) => ({ start_date: filters.startDate, end_date: filters.endDate, timezone: STUDIO_TIME_ZONE, currency: filters.currency || null });

export const metric = (label: string, value: number | null, definition: string, previous?: number | null, snapshot = false): MetricValue => ({
  label, value, definition, snapshot,
  ...(snapshot ? {} : { current_value: value, previous_value: previous ?? null, absolute_change: previous === undefined || previous === null || value === null ? null : value - previous, percent_change: previous === undefined || previous === null || previous === 0 || value === null ? null : ((value - previous) / Math.abs(previous)) * 100 }),
});

export async function studioAnalyticsContext(userId: number): Promise<StudioAnalyticsContext> {
  return { ...(await getBusinessUnitByCode('STUDIO')), userId };
}

/** Never silently merge currencies. A caller must choose one when Studio has multiple currencies. */
export async function assertSingleCurrency(ctx: StudioAnalyticsContext, filters: StudioAnalyticsFilters) {
  if (filters.currency) return;
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT currency_code FROM (
      SELECT currency_code FROM studio_projects WHERE business_unit_id=? AND deleted_at IS NULL
      UNION SELECT currency_code FROM quotations WHERE organization_id=? AND business_unit_id=? AND order_id IS NULL
      UNION SELECT currency_code FROM invoices WHERE organization_id=? AND business_unit_id=?
      UNION SELECT currency_code FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND status_code='posted'
    ) currencies WHERE currency_code IS NOT NULL AND currency_code<>'' LIMIT 2`,
    [ctx.id, ctx.organizationId, ctx.id, ctx.organizationId, ctx.id, ctx.organizationId, ctx.id],
  );
  if (rows.length > 1) throw new AppError(400, 'CURRENCY_FILTER_REQUIRED', 'Pilih mata uang untuk laporan karena data Studio memakai lebih dari satu mata uang.');
  if (rows.length === 1) filters.currency = String(rows[0].currency_code);
}

export const currencyClause = (alias: string, filters: StudioAnalyticsFilters, params: unknown[]) => {
  if (!filters.currency) return '';
  params.push(filters.currency);
  return ` AND ${alias}.currency_code=?`;
};

export const percentile = (values: number[], fraction: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * fraction;
  const lower = Math.floor(pos), upper = Math.ceil(pos);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
};

export const safeText = (value: unknown) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
