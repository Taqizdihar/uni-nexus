import React from 'react';
import { AlertTriangle, ArrowRight, LucideIcon } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';
import type { ClientPartyKind, ClientRelationshipStatus } from '../../../../types/studio-clients';

export const relationshipLabels: Record<ClientRelationshipStatus, string> = {
  active: 'Aktif',
  role_inactive: 'Nonaktif sebagai Klien Studio',
  party_inactive: 'Party Nonaktif',
};

export const partyKindLabels: Record<ClientPartyKind, string> = {
  individual: 'Perorangan',
  company: 'Perusahaan',
  institution: 'Institusi',
};

export function RelationshipStatusBadge({ value }: { value: ClientRelationshipStatus | string }) {
  const variant = value === 'active' ? 'success' : value === 'party_inactive' ? 'error' : 'warning';
  return <Badge variant={variant}>{relationshipLabels[value as ClientRelationshipStatus] || value}</Badge>;
}

export function PartyKindBadge({ value }: { value: ClientPartyKind | string }) {
  return <Badge variant="outline">{partyKindLabels[value as ClientPartyKind] || value}</Badge>;
}

export function RoleBadge({ label, isPrimary }: { label: string; isPrimary?: boolean }) {
  return <Badge variant={isPrimary ? 'info' : 'default'}>{label}</Badge>;
}

export function StudioPageHeader({ eyebrow = 'Operasional Studio', title, description, back, actions }: {
  eyebrow?: string; title: string; description: string; back?: () => void; actions?: React.ReactNode;
}) {
  return (
    <div className="studio-page-header">
      <div className="flex min-w-0 items-start gap-3">
        {back && <Button variant="ghost" size="sm" onClick={back} className="mt-1 shrink-0 px-2" aria-label="Kembali"><ArrowRight className="h-4 w-4 rotate-180" /></Button>}
        <div className="min-w-0">
          <p className="studio-eyebrow">{eyebrow}</p>
          <h1 className="studio-page-title">{title}</h1>
          <p className="studio-page-description">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ number, icon: Icon, title, description, action }: {
  number?: string; icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="studio-section-header">
      <div className="flex min-w-0 items-start gap-3">
        {number && <span className="studio-section-number">{number}</span>}
        {Icon && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--nexus-cream-soft)] text-[var(--nexus-charcoal)]"><Icon className="h-4 w-4" /></span>}
        <div className="min-w-0">
          <h2 className="studio-section-title">{title}</h2>
          {description && <p className="studio-section-description">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, required, children, className }: {
  label?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cn('studio-field', className)}>
      {label && <span className="studio-field-label">{label}{required && <span className="text-red-500"> *</span>}</span>}
      {children}
      {hint && <span className="studio-field-hint">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="studio-empty-state">
      <div className="studio-empty-icon">{icon || <span className="text-xl">✦</span>}</div>
      <h3 className="mt-4 text-base font-semibold text-[var(--nexus-charcoal)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--nexus-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</span>
      {onDismiss && <button type="button" className="shrink-0 text-xs font-semibold underline" onClick={onDismiss}>Tutup</button>}
    </div>
  );
}

export function LoadingState({ label = 'Memuat data klien...' }: { label?: string }) {
  return <div className="flex h-64 items-center justify-center text-sm text-[var(--nexus-muted)]">{label}</div>;
}

export function Kpi({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="studio-kpi">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-[var(--nexus-charcoal)]">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-4 text-[var(--nexus-muted)]">{hint}</p>}
    </div>
  );
}

export const formatDateOnly = (value?: string | null) => (value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

/**
 * Blocks in-app navigation away from a dirty form and warns on a hard reload.
 * No draft save — the choice is stay or discard, same contract as Studio Projects.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const allowNext = React.useRef(false);
  const shouldBlock = React.useCallback(({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
    if (allowNext.current) { allowNext.current = false; return false; }
    return when && currentLocation.pathname !== nextLocation.pathname;
  }, [when]);
  const blocker = useBlocker(shouldBlock);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!when) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  const dialog = blocker.state === 'blocked' ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="client-unsaved-title">
        <div className="p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--nexus-yellow)]/20 text-[var(--nexus-yellow-deep)]"><AlertTriangle className="h-5 w-5" /></div>
          <h2 id="client-unsaved-title" className="mt-4 text-lg font-bold text-[var(--nexus-charcoal)]">Perubahan Belum Disimpan</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">Data klien yang Anda isi belum disimpan dan akan hilang jika Anda meninggalkan halaman ini.</p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4 sm:flex-row sm:justify-end">
          <button type="button" className="h-10 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => blocker.proceed?.()}>Keluar Tanpa Menyimpan</button>
          <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--nexus-yellow)] px-3 text-xs font-bold text-[var(--nexus-charcoal)] hover:bg-[var(--nexus-yellow-deep)]" onClick={() => blocker.reset?.()}>Lanjut Mengedit</button>
        </div>
      </div>
    </div>
  ) : null;

  return { dialog, approveNavigation: () => { allowNext.current = true; } };
}

/** Small confirm/prompt modal used for activate/deactivate and other confirmations. */
export function ReasonDialog({ open, title, description, label, placeholder, required, confirmLabel, tone = 'primary', busy, error, extra, onCancel, onConfirm }: {
  open: boolean; title: string; description?: string; label?: string; placeholder?: string; required?: boolean;
  confirmLabel: string; tone?: 'primary' | 'danger'; busy?: boolean; error?: string | null; extra?: React.ReactNode;
  onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { if (open) setReason(''); }, [open]);
  if (!open) return null;

  const disabled = busy || (required && reason.trim().length < 3);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--nexus-charcoal)]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true">
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--nexus-charcoal)]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[var(--nexus-muted)]">{description}</p>}
          </div>
          {extra}
          {(label || required) && (
            <Field label={label || 'Alasan'} required={required} hint={required ? 'Minimal 3 karakter.' : 'Opsional, tersimpan pada log audit.'}>
              <textarea className="studio-textarea" value={reason} placeholder={placeholder} onChange={event => setReason(event.target.value)} />
            </Field>
          )}
          <ErrorBanner message={error || null} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)]/45 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Batal</Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'secondary' : 'primary'}
            className={tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            onClick={() => onConfirm(reason.trim())}
            disabled={disabled}
          >
            {busy ? 'Memproses...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
