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

/** Formats a UTC instant without allowing the Node process timezone to alter it. */
export const utcDateTimeSql = (value: DateInput) => toDate(value).toISOString().slice(0, 23).replace('T', ' ');

/** Stable business-date bucket used by daily system sensor reminders. */
export const jakartaBusinessDate = (value: DateInput = new Date()) => {
  const jakartaDate = new Date(toDate(value).getTime() + JAKARTA_OFFSET_MS);
  const year = jakartaDate.getUTCFullYear();
  const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
