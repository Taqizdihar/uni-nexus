import React from 'react';
import { ArrowRight, Check, LucideIcon } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';
import type { OrderStatus, PaymentStatus, PriorityCode } from '../../../../types/craft-orders';

export const statusLabels: Record<OrderStatus, string> = {
  new: 'Baru', confirmed: 'Dikonfirmasi', waiting: 'Menunggu', ready: 'Siap Produksi',
  in_production: 'Diproduksi', qc: 'QC', completed: 'Selesai', packed: 'Dikemas',
  shipped: 'Dikirim', cancelled: 'Dibatalkan', returned: 'Dikembalikan',
};

export const priorityLabels: Record<PriorityCode, string> = { low: 'Rendah', normal: 'Normal', high: 'Tinggi', critical: 'Kritis' };
export const paymentLabels: Record<PaymentStatus, string> = { unpaid: 'Belum Dibayar', partial: 'Dibayar Sebagian', paid: 'Lunas', refunded: 'Dikembalikan', cancelled: 'Dibatalkan' };

export function OrderStatusBadge({ value }: { value: OrderStatus | string }) {
  const variant = ['cancelled', 'returned'].includes(value) ? 'error' : ['completed', 'packed', 'shipped'].includes(value) ? 'success' : value === 'ready' || value === 'in_production' ? 'warning' : value === 'qc' ? 'default' : 'info';
  return <Badge variant={variant} className={value === 'qc' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : undefined}>{statusLabels[value as OrderStatus] || value}</Badge>;
}

export function OrderPriorityBadge({ value }: { value: PriorityCode | string }) {
  const variant = value === 'critical' ? 'error' : value === 'high' ? 'warning' : value === 'normal' ? 'info' : 'default';
  return <Badge variant={variant}>{priorityLabels[value as PriorityCode] || value}</Badge>;
}

export function PaymentStatusBadge({ value }: { value: PaymentStatus | string }) {
  const variant = value === 'paid' ? 'success' : value === 'partial' ? 'warning' : value === 'refunded' ? 'error' : 'default';
  return <Badge variant={variant}>{paymentLabels[value as PaymentStatus] || value}</Badge>;
}

export function OrderPageHeader({ eyebrow = 'Craft Orders', title, description, back, actions }: { eyebrow?: string; title: string; description: string; back?: () => void; actions?: React.ReactNode }) {
  return <div className="orders-page-header">
    <div className="flex min-w-0 items-start gap-3">
      {back && <Button variant="ghost" size="sm" onClick={back} className="mt-1 shrink-0 px-2" aria-label="Kembali"><ArrowRight className="h-4 w-4 rotate-180" /></Button>}
      <div><p className="orders-eyebrow">{eyebrow}</p><h1 className="orders-page-title">{title}</h1><p className="orders-page-description">{description}</p></div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

export function OrderSectionHeader({ number, icon: Icon, title, description, action }: { number: string; icon?: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="orders-section-header">
    <div className="flex min-w-0 items-start gap-3"><span className="orders-section-number">{number}</span>{Icon && <span className="orders-section-icon"><Icon className="h-4 w-4" /></span>}<div><h2 className="orders-section-title">{title}</h2><p className="orders-section-description">{description}</p></div></div>{action}
  </div>;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label?: string }) {
  return <div><div className="mb-2 flex items-center justify-between"><span className="orders-field-label">{label}</span></div><div className="orders-segmented-control" role="group" aria-label={label}>{options.map(option => <button key={option.value} type="button" className={cn('orders-segment', value === option.value && 'is-active')} onClick={() => onChange(option.value)} aria-pressed={value === option.value}>{value === option.value && <Check className="h-3.5 w-3.5" />}{option.label}</button>)}</div></div>;
}

export function FormField({ label, hint, required, children, className }: { label?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return <label className={cn('orders-field', className)}>{label && <span className="orders-field-label">{label}{required && <span className="text-red-500"> *</span>}</span>}{children}{hint && <span className="orders-field-hint">{hint}</span>}</label>;
}

export function EmptyOrdersState({ title = 'Belum Ada Pesanan', description = 'Pesanan Craft dari marketplace, pelanggan langsung, dan mitra akan muncul di sini.', action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="orders-empty-state"><div className="orders-empty-icon"><span className="text-xl">✦</span></div><h3 className="mt-4 text-base font-semibold text-[var(--nexus-charcoal)]">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-[var(--nexus-muted)]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function TableHeader({ children }: { children: React.ReactNode }) { return <thead className="orders-table-head">{children}</thead>; }
export function TableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void; key?: React.Key }) { return <tr className={cn('orders-table-row', onClick && 'cursor-pointer')} onClick={onClick}>{children}</tr>; }

export function useUnsavedChangesGuard(when: boolean, onSaveDraft: () => Promise<void>) {
  const allowNextNavigation = React.useRef(false);
  const shouldBlock = React.useCallback(({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
    if (allowNextNavigation.current) { allowNextNavigation.current = false; return false; }
    return when && currentLocation.pathname !== nextLocation.pathname;
  }, [when]);
  const blocker = useBlocker(shouldBlock);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!when) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  const saveAndExit = async () => {
    if (blocker.state !== 'blocked') return;
    setSaving(true); setError(null);
    try { await onSaveDraft(); blocker.proceed(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan draf pesanan.'); }
    finally { setSaving(false); }
  };

  const dialog = blocker.state === 'blocked' ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]"><div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title"><div className="p-6"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--nexus-yellow)]/20 text-[var(--nexus-yellow-deep)]">!</div><h2 id="unsaved-changes-title" className="mt-4 text-lg font-bold text-[var(--nexus-charcoal)]">Perubahan Belum Disimpan</h2><p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">Data pesanan yang Anda isi belum disimpan. Anda dapat menyimpannya sebagai draf sebelum meninggalkan halaman.</p>{error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}</div><div className="flex flex-col-reverse gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4 sm:flex-row sm:justify-end"><button type="button" className="h-10 rounded-lg px-3 text-xs font-semibold text-[var(--nexus-muted)] hover:bg-white hover:text-[var(--nexus-charcoal)]" onClick={() => blocker.reset()} disabled={saving}>Lanjut Mengedit</button><button type="button" className="h-10 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => blocker.proceed()} disabled={saving}>Keluar Tanpa Menyimpan</button><button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--nexus-yellow)] px-3 text-xs font-bold text-[var(--nexus-charcoal)] hover:bg-[var(--nexus-yellow-deep)] disabled:opacity-50" onClick={() => void saveAndExit()} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Draf & Keluar'}</button></div></div></div> : null;
  return { blocker, dialog, approveNavigation: () => { allowNextNavigation.current = true; } };
}
