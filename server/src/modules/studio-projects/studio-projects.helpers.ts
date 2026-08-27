import { getBusinessUnitByCode } from '../../shared/utils/business-unit';
import { AppError } from '../../shared/errors/AppError';
import type { ProjectProgress, ProjectStatus } from './studio-projects.types';

export type { BusinessUnitContext } from '../../shared/utils/business-unit';

export const getStudioBusinessUnit = () => getBusinessUnitByCode('STUDIO');
export const getStudioBusinessUnitId = async () => (await getStudioBusinessUnit()).id;

/** Studio operates in WIB; planning dates default to the local calendar day. */
export const STUDIO_LOCAL_DATE_SQL = `DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`;

export const parseNumericId = (value: unknown, label: string): number => {
  const id = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ID', `${label} tidak valid.`);
  return id;
};

/** Accepts `datetime-local` and ISO strings, storing them the way Craft already does. */
export const toSqlDateTime = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.replace('T', ' ').padEnd(19, ':00').slice(0, 19);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new AppError(400, 'INVALID_DATE', 'Format tanggal tidak valid.');
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
};

export const toSqlDate = (value?: string | null): string | null => {
  const dateTime = toSqlDateTime(value);
  return dateTime ? dateTime.slice(0, 10) : null;
};

export const toNumber = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

/** Money is rounded to whole cents before it is stored or compared. */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Progress is always derived — there is no stored progress column.
 * Milestones win over deliverables; a finished project is always 100%.
 */
export const deriveProgress = (
  status: ProjectStatus | string,
  milestoneTotal: number,
  milestoneDone: number,
  deliverableTotal: number,
  deliverableDone: number,
): ProjectProgress => {
  if (status === 'completed' || status === 'paid') {
    const total = milestoneTotal || deliverableTotal;
    return { source: 'status', completed: total, total, percent: 100 };
  }
  if (milestoneTotal > 0) {
    return { source: 'milestones', completed: milestoneDone, total: milestoneTotal, percent: Math.round((milestoneDone / milestoneTotal) * 100) };
  }
  if (deliverableTotal > 0) {
    return { source: 'deliverables', completed: deliverableDone, total: deliverableTotal, percent: Math.round((deliverableDone / deliverableTotal) * 100) };
  }
  return { source: 'none', completed: 0, total: 0, percent: null };
};

/**
 * Stored deliverable files keep a randomized `<random>__<original>` name.
 * This recovers the human-readable half for display and downloads.
 */
export const displayFileName = (storedName?: string | null): string | null => {
  if (!storedName) return null;
  const separator = storedName.indexOf('__');
  return separator === -1 ? storedName : storedName.slice(separator + 2) || storedName;
};

/** Only http(s) links are accepted for deliverables — never javascript:, data: or file:. */
export const assertSafeExternalUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError(400, 'INVALID_EXTERNAL_URL', 'Tautan hasil kerja harus berupa URL http:// atau https:// yang valid.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError(400, 'INVALID_EXTERNAL_URL', 'Tautan hasil kerja harus berupa URL http:// atau https:// yang valid.');
  }
  if (trimmed.length > 500) throw new AppError(400, 'INVALID_EXTERNAL_URL', 'Tautan hasil kerja terlalu panjang (maksimal 500 karakter).');
  return trimmed;
};
