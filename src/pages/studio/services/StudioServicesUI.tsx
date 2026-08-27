import React from 'react';
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, CheckCircle2, Package, Tag, XCircle } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { cn, formatCurrency } from '../../../lib/utils';
import type { StudioServicePricingModel } from '../../../types/studio-services';

export const pricingLabels: Record<StudioServicePricingModel, string> = { fixed: 'Harga Tetap', hourly: 'Per Jam', daily: 'Per Hari', package: 'Harga Paket', custom: 'Harga Kustom' };
export const statusLabel = (active: boolean) => active ? 'Aktif' : 'Nonaktif';

export const priceDisplay = (model: StudioServicePricingModel, price: number, unit?: string | null) => {
  if (model === 'custom' && !price) return 'Harga Kustom';
  return `${formatCurrency(price)}${unit ? ` / ${unit}` : ''}`;
};

export function ServiceStatusBadge({ active }: { active: boolean }) { return <Badge variant={active ? 'success' : 'warning'}>{statusLabel(active)}</Badge>; }
export function PricingModelBadge({ model }: { model: StudioServicePricingModel }) { return <Badge variant="outline">{pricingLabels[model]}</Badge>; }

export function StudioServicesHeader({ title, description, eyebrow = 'Operasional Studio', back, actions }: { title: string; description: string; eyebrow?: string; back?: () => void; actions?: React.ReactNode }) {
  return <div className="studio-page-header"><div className="flex min-w-0 items-start gap-3">{back && <Button variant="ghost" size="sm" className="mt-1 shrink-0 px-2" onClick={back} aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>}<div className="min-w-0"><p className="studio-eyebrow">{eyebrow}</p><h1 className="studio-page-title">{title}</h1><p className="studio-page-description">{description}</p></div></div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</div>;
}

export function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="studio-kpi"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p><p className="mt-1.5 text-lg font-bold text-[var(--nexus-charcoal)]">{value}</p>{hint && <p className="mt-1 text-[11px] leading-4 text-[var(--nexus-muted)]">{hint}</p>}</div>;
}

export function Field({ label, required, hint, children, className }: { label?: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('studio-field', className)}>{label && <span className="studio-field-label">{label}{required && <span className="text-red-500"> *</span>}</span>}{children}{hint && <span className="studio-field-hint">{hint}</span>}</label>;
}

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</span>{onDismiss && <button type="button" className="text-xs font-semibold underline" onClick={onDismiss}>Tutup</button>}</div>;
}

export function Loading({ label = 'Memuat layanan...' }: { label?: string }) { return <div className="flex h-56 items-center justify-center text-sm text-[var(--nexus-muted)]">{label}</div>; }
export function Empty({ title, description, action, icon }: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="studio-empty-state"><div className="studio-empty-icon">{icon || <BriefcaseBusiness className="h-5 w-5" />}</div><h2 className="mt-4 font-semibold text-[var(--nexus-charcoal)]">{title}</h2><p className="mt-1 max-w-md text-sm leading-6 text-[var(--nexus-muted)]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function CurrencyInput({ value, onChange, placeholder = '0' }: { value: number; onChange: (value: number) => void; placeholder?: string }) {
  const [text, setText] = React.useState(value ? String(Math.round(value)) : '');
  React.useEffect(() => { setText(value ? String(Math.round(value)) : ''); }, [value]);
  return <div className="relative"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-[var(--nexus-muted)]">Rp</span><input inputMode="numeric" className="studio-input pl-10" value={text} placeholder={placeholder} onChange={event => { const next = event.target.value.replace(/[^0-9]/g, ''); setText(next); onChange(next ? Number(next) : 0); }} /></div>;
}

/** Uses a custom in-app dialog and browser beforeunload warning for unsaved service and package forms. */
export function useServiceUnsavedGuard(when: boolean) {
  const allow = React.useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allow.current) { allow.current = false; return false; }
    return when && currentLocation.pathname !== nextLocation.pathname;
  });
  React.useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (when) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
  const dialog = blocker.state === 'blocked' ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"><div className="w-full max-w-md rounded-xl border border-[var(--nexus-border)] bg-white shadow-xl"><div className="p-6"><AlertTriangle className="h-5 w-5 text-[var(--nexus-yellow-deep)]" /><h2 className="mt-3 text-lg font-bold text-[var(--nexus-charcoal)]">Perubahan Belum Disimpan</h2><p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">Perubahan layanan belum disimpan dan akan hilang jika Anda meninggalkan halaman ini.</p></div><div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/50 p-4"><Button type="button" variant="outline" onClick={() => blocker.reset?.()}>Lanjut Mengedit</Button><Button type="button" variant="secondary" onClick={() => blocker.proceed?.()}>Keluar Tanpa Menyimpan</Button></div></div></div> : null;
  return { dialog, approveNavigation: () => { allow.current = true; } };
}

export function StatusAction({ active, busy, onActivate, onDeactivate, noun = 'Layanan' }: { active: boolean; busy?: boolean; onActivate: () => void; onDeactivate: () => void; noun?: string }) {
  return active ? <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busy} onClick={onDeactivate}><XCircle className="h-4 w-4" /> Nonaktifkan {noun}</Button> : <Button variant="outline" disabled={busy} onClick={onActivate}><CheckCircle2 className="h-4 w-4" /> Aktifkan {noun}</Button>;
}

export const unitSuggestion: Partial<Record<StudioServicePricingModel, string>> = { hourly: 'jam', daily: 'hari', package: 'paket' };
export const packageIcon = <Package className="h-5 w-5" />;
export const categoryIcon = <Tag className="h-5 w-5" />;
