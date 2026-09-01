import { AppError } from '../errors/AppError';

const parts = (value: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
const part = (items: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => items.find(item => item.type === type)?.value || '';

export const organizationBusinessDate = (value: Date = new Date(), timeZone = 'Asia/Jakarta') => {
  try { const result = parts(value, timeZone); return `${part(result, 'year')}-${part(result, 'month')}-${part(result, 'day')}`; }
  catch { throw new AppError(400, 'ORGANIZATION_TIMEZONE_INVALID', 'Zona waktu organisasi tidak valid.'); }
};

const offsetMilliseconds = (value: Date, timeZone: string) => {
  const label = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(value).find(item => item.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(label || '');
  if (!match) return 0;
  const valueMs = (Number(match[2]) * 60 + Number(match[3])) * 60_000;
  return match[1] === '+' ? valueMs : -valueMs;
};

/** UTC instant at the beginning of a YYYY-MM-DD organization calendar day. */
export const organizationDayStartUtc = (date: string, timeZone = 'Asia/Jakarta') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400, 'ORGANIZATION_DATE_INVALID', 'Tanggal bisnis tidak valid.');
  const [year, month, day] = date.split('-').map(Number);
  const approximate = new Date(Date.UTC(year, month - 1, day));
  return new Date(approximate.getTime() - offsetMilliseconds(approximate, timeZone));
};
