import React from 'react';
import { AlertTriangle, ArrowLeft, FileText, Inbox, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { cn, formatCurrency } from '../../../../lib/utils';
import type { StudioInvoiceStatus, StudioQuotationStatus, StudioScheduleStatus } from '../../../../types/studio-billing';

export const money = (amount: number, currency = 'IDR') => currency === 'IDR' ? formatCurrency(amount || 0) : new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(amount || 0);
export const dateOnly = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
export const inputDate = (value?: string | null) => value ? value.slice(0, 10) : '';

export function StudioBillingHeader({ eyebrow = 'BISNIS STUDIO', title, description, back, actions }: { eyebrow?: string; title: string; description: string; back?: () => void; actions?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-3"><>{back && <Button variant="ghost" size="sm" className="mt-1 px-2" onClick={back} aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>}</><div><p className="text-[11px] font-bold tracking-[.16em] text-[var(--nexus-yellow-deep)]">{eyebrow}</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">{title}</h1><p className="mt-1 max-w-3xl text-sm text-[var(--nexus-muted)]">{description}</p></div></div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}

export function Kpi({ label, value, hint, tone = 'default' }: { label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'warning' | 'danger' | 'success' }) {
  const tones = { default: 'border-[var(--nexus-border)]', warning: 'border-amber-200 bg-amber-50/30', danger: 'border-red-200 bg-red-50/30', success: 'border-emerald-200 bg-emerald-50/30' };
  return <Card className={cn('p-4', tones[tone])}><p className="text-[10px] font-bold uppercase tracking-[.11em] text-[var(--nexus-muted)]">{label}</p><p className="mt-2 text-xl font-bold text-[var(--nexus-charcoal)]">{value}</p>{hint && <p className="mt-1 text-xs text-[var(--nexus-muted)]">{hint}</p>}</Card>;
}

const quotationLabels: Record<StudioQuotationStatus, string> = { draft: 'Draft', sent: 'Dikirim', accepted: 'Diterima', rejected: 'Ditolak', expired: 'Kedaluwarsa', cancelled: 'Dibatalkan' };
const quotationTone: Record<StudioQuotationStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = { draft: 'default', sent: 'info', accepted: 'success', rejected: 'error', expired: 'warning', cancelled: 'default' };
const invoiceLabels: Record<StudioInvoiceStatus, string> = { draft: 'Draft', issued: 'Terbit', partial: 'Sebagian Dibayar', paid: 'Lunas', overdue: 'Terlambat', void: 'Void', refunded: 'Dikembalikan' };
const invoiceTone: Record<StudioInvoiceStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = { draft: 'default', issued: 'info', partial: 'warning', paid: 'success', overdue: 'error', void: 'default', refunded: 'warning' };
const scheduleLabels: Record<StudioScheduleStatus, string> = { pending: 'Menunggu', partial: 'Sebagian', paid: 'Lunas', overdue: 'Terlambat', cancelled: 'Dibatalkan' };

export function QuotationStatusBadge({ status }: { status: StudioQuotationStatus | string }) { const value = status as StudioQuotationStatus; return <Badge variant={quotationTone[value] || 'default'}>{quotationLabels[value] || status}</Badge>; }
export function InvoiceStatusBadge({ status }: { status: StudioInvoiceStatus | string }) { const value = status as StudioInvoiceStatus; return <Badge variant={invoiceTone[value] || 'default'}>{invoiceLabels[value] || status}</Badge>; }
export function ScheduleStatusBadge({ status }: { status: StudioScheduleStatus | string }) { const value = status as StudioScheduleStatus; return <Badge variant={value === 'paid' ? 'success' : value === 'overdue' ? 'error' : value === 'partial' ? 'warning' : 'default'}>{scheduleLabels[value] || status}</Badge>; }

export function LoadingState({ label = 'Memuat data penagihan...' }: { label?: string }) { return <div className="flex min-h-72 items-center justify-center text-sm text-[var(--nexus-muted)]"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--nexus-yellow)] border-t-transparent" />{label}</div>; }
export function ErrorBanner({ message, onDismiss }: { message?: string | null; onDismiss?: () => void }) { if (!message) return null; return <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p className="flex-1">{message}</p>{onDismiss && <button type="button" className="rounded p-1 hover:bg-red-100" onClick={onDismiss}><X className="h-4 w-4" /></button>}</div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <Card className="p-10 text-center"><Inbox className="mx-auto h-10 w-10 text-[var(--nexus-muted)]" /><h2 className="mt-3 font-semibold text-[var(--nexus-charcoal)]">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-[var(--nexus-muted)]">{description}</p>{action && <div className="mt-4">{action}</div>}</Card>; }

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) { return <label className={cn('block', className)}><span className="mb-1.5 block text-xs font-semibold text-[var(--nexus-charcoal)]">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-[var(--nexus-muted)]">{hint}</span>}</label>; }
export const inputClass = 'h-10 w-full rounded-lg border border-[var(--nexus-border)] bg-white px-3 text-sm text-[var(--nexus-charcoal)] outline-none transition focus:border-[var(--nexus-yellow-deep)] focus:ring-2 focus:ring-[var(--nexus-yellow)]/25 disabled:bg-gray-50 disabled:text-gray-500';

export function ReasonDialog({ open, title, description, label = 'Alasan', confirmLabel, tone = 'default', busy, error, onCancel, onConfirm }: { open: boolean; title: string; description: string; label?: string; confirmLabel: string; tone?: 'default' | 'danger'; busy?: boolean; error?: string | null; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { if (open) setReason(''); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white shadow-xl"><div className="p-6"><h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">{title}</h2><p className="mt-2 text-sm text-[var(--nexus-muted)]">{description}</p><label className="mt-4 block"><span className="text-xs font-semibold">{label}</span><textarea className="mt-1.5 min-h-24 w-full rounded-lg border border-[var(--nexus-border)] p-3 text-sm outline-none focus:border-[var(--nexus-yellow-deep)]" value={reason} onChange={event => setReason(event.target.value)} placeholder="Jelaskan alasan tindakan ini..." /></label><ErrorBanner message={error} /></div><div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-gray-50 px-6 py-4"><Button variant="outline" onClick={onCancel} disabled={busy}>Batal</Button><Button className={tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : ''} onClick={() => onConfirm(reason)} disabled={busy || reason.trim().length < 3}>{busy ? 'Memproses...' : confirmLabel}</Button></div></div></div>;
}

export function CommercialTotals({ subtotal, discount, tax, total, currency = 'IDR', balance }: { subtotal: number; discount: number; tax: number; total: number; currency?: string; balance?: number }) { return <div className="space-y-2 text-sm"><TotalRow label="Subtotal" value={money(subtotal, currency)} />{discount > 0 && <TotalRow label="Diskon" value={`- ${money(discount, currency)}`} />}{tax > 0 && <TotalRow label="Pajak" value={money(tax, currency)} /> }<div className="border-t border-[var(--nexus-border)] pt-2"><TotalRow label="Total" value={money(total, currency)} strong /></div>{balance !== undefined && <TotalRow label="Sisa Tagihan" value={money(balance, currency)} strong />}</div>; }
function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className={cn('flex items-center justify-between gap-4', strong ? 'font-bold text-[var(--nexus-charcoal)]' : 'text-[var(--nexus-muted)]')}><span>{label}</span><span>{value}</span></div>; }

export function ActivityTimeline({ entries }: { entries: Array<{ id: number; action_code: string; description: string | null; created_at: string; user_name: string | null }> }) { if (!entries.length) return <p className="text-sm text-[var(--nexus-muted)]">Belum ada aktivitas yang tercatat.</p>; return <ol className="space-y-4 border-l border-[var(--nexus-border)] pl-4">{entries.map(entry => <li key={entry.id} className="relative"><span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[var(--nexus-yellow)]" /><p className="text-sm font-medium text-[var(--nexus-charcoal)]">{entry.description || entry.action_code}</p><p className="mt-0.5 text-xs text-[var(--nexus-muted)]">{dateOnly(entry.created_at)} • {entry.user_name || 'Sistem'}</p></li>)}</ol>; }

export function DocumentEmpty({ type }: { type: 'quotation' | 'invoice' }) { return <div className="flex items-center gap-3 rounded-lg bg-[var(--nexus-cream-soft)] p-3 text-sm text-[var(--nexus-muted)]"><FileText className="h-4 w-4" />PDF resmi akan tersimpan saat {type === 'quotation' ? 'penawaran dikirim' : 'invoice diterbitkan'}.</div>; }
