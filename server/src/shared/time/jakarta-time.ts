const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateInput = Date | string | number;

const toDate = (value: DateInput) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date.');
  return date;
};

/** Returns the UTC instant at which the Jakarta calendar day starts. */
export const jakartaDayStartUtc = (value: DateInput) => {
  const jakartaDate = new Date(toDate(value).getTime() + JAKARTA_OFFSET_MS);
  return new Date(Date.UTC(jakartaDate.getUTCFullYear(), jakartaDate.getUTCMonth(), jakartaDate.getUTCDate()) - JAKARTA_OFFSET_MS);
};

export const jakartaDayBoundsUtc = (value: DateInput = new Date()): [Date, Date] => {
  const start = jakartaDayStartUtc(value);
  return [start, new Date(start.getTime() + DAY_MS)];
};

/** UTC value suitable for MySQL DATETIME(3) parameters regardless of Node's timezone. */
export const utcDateTimeSql = (value: DateInput) => toDate(value).toISOString().slice(0, 23).replace('T', ' ');

export const jakartaBusinessDate = (value: DateInput = new Date()) => {
  const jakartaDate = new Date(toDate(value).getTime() + JAKARTA_OFFSET_MS);
  return `${jakartaDate.getUTCFullYear()}-${String(jakartaDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jakartaDate.getUTCDate()).padStart(2, '0')}`;
};

/** Validates a YYYY-MM-DD calendar date and returns its Jakarta start in UTC. */
export const jakartaDateStartUtc = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Invalid Jakarta date.');
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS);
  const check = new Date(utc.getTime() + JAKARTA_OFFSET_MS);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new RangeError('Invalid Jakarta date.');
  return utc;
};

