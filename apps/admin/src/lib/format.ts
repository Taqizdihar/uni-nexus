import type { FieldDefinition } from '@uni-nexus/shared';
import type { Row } from './api';

export const titleCase = (text: string) => text.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
export const routeAliases: Record<string, string> = { 'custom-requests': 'requests', 'production-jobs': 'production', 'print-jobs': 'print-queue', 'filament-spools': 'filament', 'print-failures': 'failures', 'production-costs': 'costing', 'qc-inspections': 'qc', 'order-packaging': 'packaging', 'audit-logs': 'audit' };
export const resourcePath = (key: string) => `/app/${routeAliases[key] || key}`;
export const resourceKey = (segment: string) => Object.entries(routeAliases).find(([, route]) => route === segment)?.[0] || segment;
export function recordName(row: Row): string {
  for (const key of ['name', 'title', 'full_name', 'order_number', 'quotation_number', 'request_number', 'job_number', 'spool_code', 'file_name', 'original_filename', 'code', 'label', 'email']) {
    if (row[key]) return String(row[key]);
  }
  return `Record #${row.id}`;
}

/** Format database decimal strings without converting money to binary floats. */
export function money(value: unknown): string {
  const raw = String(value ?? '0');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return '—';
  const [integer = '0', fraction = ''] = raw.split('.');
  const grouped = BigInt(integer).toLocaleString('id-ID');
  const cents = fraction.replace(/0+$/, '');
  return `Rp${grouped}${cents ? `,${cents}` : ''}`;
}
export const isMoney = (name: string) => /price|cost|fee|amount|subtotal|discount|total_hpp/.test(name) && !/percent|method|type|component_id|costing/.test(name);
export function display(value: unknown, field?: FieldDefinition): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (field && isMoney(field.name) && /^-?\d+(\.\d+)?$/.test(String(value))) return money(value);
  if (field?.type === 'date' || field?.type === 'datetime' || (field && /_at$|_date$/.test(field.name))) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(field?.type === 'datetime' ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(date);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (field?.type === 'select') return titleCase(String(value));
  return String(value);
}
