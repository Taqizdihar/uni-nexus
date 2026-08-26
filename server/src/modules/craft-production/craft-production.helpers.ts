import { randomUUID } from 'crypto';
import { AppError } from '../../shared/errors/AppError';

export function parsePositiveId(value: unknown, code = 'INVALID_ID', label = 'ID'): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, code, `${label} tidak valid.`);
  }
  return parsed;
}

export function temporaryCode(prefix = 'TMP'): string {
  return `${prefix}-${randomUUID()}`;
}

export function paddedCode(prefix: string, id: number): string {
  return `${prefix}-${id.toString().padStart(6, '0')}`;
}

function parseProductionDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());
  const localMatch = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);
  // Browser datetime-local values intentionally have no offset. Production is an
  // Indonesia operation, so interpret those wall-clock values as Asia/Jakarta.
  if (localMatch) return new Date(`${localMatch[1]}T${localMatch[2]}:${localMatch[3] || '00'}+07:00`);
  return new Date(value);
}

export function toMysqlDateTime(value: string | Date): string {
  const date = parseProductionDate(value);
  if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATETIME', 'Tanggal/waktu tidak valid.');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}.000`;
}

export function addMinutes(value: string | Date, minutes: number): string {
  const date = parseProductionDate(value);
  date.setTime(date.getTime() + minutes * 60_000);
  return toMysqlDateTime(date);
}

export function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
