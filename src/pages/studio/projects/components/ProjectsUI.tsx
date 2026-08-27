import React from 'react';
import { AlertTriangle, ArrowRight, Clock, LucideIcon } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';
import type {
  DeliverableStatus, MilestoneStatus, ProjectPriority, ProjectProgress, ProjectStatus,
} from '../../../../types/studio-projects';

export const statusLabels: Record<ProjectStatus, string> = {
  lead: 'Prospek', quotation: 'Penawaran', approved: 'Disetujui', in_progress: 'Sedang Dikerjakan',
  review: 'Tinjauan', completed: 'Selesai', paid: 'Lunas', cancelled: 'Dibatalkan',
};

export const priorityLabels: Record<ProjectPriority, string> = { low: 'Rendah', normal: 'Normal', high: 'Tinggi', critical: 'Kritis' };

export const paymentLabels: Record<string, string> = {
  unpaid: 'Belum Dibayar', partial: 'Dibayar Sebagian', paid: 'Lunas', refunded: 'Dikembalikan', cancelled: 'Dibatalkan',
};

export const milestoneLabels: Record<MilestoneStatus, string> = {
  pending: 'Menunggu', in_progress: 'Sedang Berjalan', completed: 'Selesai', late: 'Terlambat', cancelled: 'Dibatalkan',
};

export const deliverableLabels: Record<DeliverableStatus, string> = {
  pending: 'Menunggu', submitted: 'Dikirim untuk Ditinjau', revision: 'Perlu Revisi', approved: 'Disetujui', delivered: 'Diserahkan',
};

export const externalRoleLabels: Record<string, string> = {
  vendor: 'Vendor', freelancer: 'Freelancer', partner: 'Mitra', talent: 'Talent', other: 'Lainnya',
};

/** Free-text suggestions only — project_type stays a flexible field, not an enum. */
export const projectTypeSuggestions = [
  'Photography', 'Videography', 'Video Editing', 'Graphic Design', 'Landing Page',
  'Marketing', 'Social Media', 'Event Documentation', 'Content Production', 'Other',
];

export function ProjectStatusBadge({ value }: { value: ProjectStatus | string }) {
  const variant = value === 'cancelled' ? 'error'
    : value === 'completed' || value === 'paid' ? 'success'
    : value === 'in_progress' || value === 'approved' ? 'warning'
    : value === 'review' ? 'default' : 'info';
  return <Badge variant={variant} className={value === 'review' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : undefined}>{statusLabels[value as ProjectStatus] || value}</Badge>;
}

export function ProjectPriorityBadge({ value }: { value: ProjectPriority | string }) {
  const variant = value === 'critical' ? 'error' : value === 'high' ? 'warning' : value === 'normal' ? 'info' : 'default';
  return <Badge variant={variant}>{priorityLabels[value as ProjectPriority] || value}</Badge>;
}

export function ProjectPaymentBadge({ value }: { value: string }) {
  const variant = value === 'paid' ? 'success' : value === 'partial' ? 'warning' : value === 'refunded' ? 'error' : 'outline';
  return <Badge variant={variant}>{paymentLabels[value] || value}</Badge>;
}

export function MilestoneStatusBadge({ value, overdue }: { value: MilestoneStatus | string; overdue?: boolean }) {
  if (overdue && !['completed', 'cancelled'].includes(value)) {
    return <Badge variant="error">Terlambat</Badge>;
  }
  const variant = value === 'completed' ? 'success' : value === 'cancelled' ? 'default' : value === 'in_progress' ? 'warning' : 'info';
  return <Badge variant={variant}>{milestoneLabels[value as MilestoneStatus] || value}</Badge>;
}

export function DeliverableStatusBadge({ value }: { value: DeliverableStatus | string }) {
  const variant = value === 'delivered' ? 'success' : value === 'approved' ? 'info' : value === 'revision' ? 'error' : value === 'submitted' ? 'warning' : 'outline';
  return <Badge variant={variant}>{deliverableLabels[value as DeliverableStatus] || value}</Badge>;
}

/**
 * Progress is derived, never stored. When nothing has been planned yet the bar is
 * replaced with an honest label instead of a made-up percentage.
 */
export function ProjectProgressBar({ progress, className }: { progress: ProjectProgress; className?: string }) {
  if (progress.percent === null) {
    return <p className={cn('text-[11px] text-[var(--nexus-muted)]', className)}>Belum Ada Tahapan</p>;
  }
  const sourceLabel = progress.source === 'deliverables' ? 'deliverable' : progress.source === 'status' ? 'status proyek' : 'tahapan';
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] font-medium text-[var(--nexus-muted)]">
        <span>{progress.completed}/{progress.total} {sourceLabel}</span>
        <span className="font-bold text-[var(--nexus-charcoal)]">{progress.percent}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--nexus-cream-soft)]">
        <div className="h-full rounded-full bg-[var(--nexus-yellow-deep)] transition-all" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

/** Attention states always carry an icon and words, never colour alone. */
export function AttentionChip({ tone, icon: Icon, children }: { tone: 'danger' | 'warning' | 'neutral'; icon?: LucideIcon; children: React.ReactNode }) {
  const tones = {
    danger: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    neutral: 'border-[var(--nexus-border)] bg-[var(--nexus-cream-soft)] text-[var(--nexus-charcoal)]',
  };
  const Resolved = Icon || (tone === 'danger' ? AlertTriangle : Clock);
  return <span className={cn('studio-attention', tones[tone])}><Resolved className="h-3 w-3" />{children}</span>;
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

/**
 * Rupiah input without the native number spinner: digits are kept as a plain
 * string so typing never fights the caret, and the grouped value is shown back.
 */
export function CurrencyInput({ value, onChange, placeholder = '0', disabled, id }: {
  value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; id?: string;
}) {
  const digits = value.replace(/[^\d]/g, '');
  const display = digits ? Number(digits).toLocaleString('id-ID') : '';
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--nexus-muted)]">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className="studio-input pl-9"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        onChange={event => onChange(event.target.value.replace(/[^\d]/g, ''))}
      />
    </div>
  );
}

/** Decimal quantity input — Studio bills hours, days, sessions and units. */
export function QuantityInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      className="studio-input"
      value={value}
      disabled={disabled}
      placeholder="1"
      onChange={event => onChange(event.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
    />
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

export function LoadingState({ label = 'Memuat data proyek...' }: { label?: string }) {
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

/** Converts an API timestamp into the value shape a `datetime-local` input expects. */
export const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const toDateInput = (value?: string | null) => (value ? toDateTimeLocal(value).slice(0, 10) : '');

/**
 * Blocks in-app navigation away from a dirty multi-section form and warns on a
 * hard reload. There is no draft save — the choice is stay or discard.
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
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--nexus-border)] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="studio-unsaved-title">
        <div className="p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--nexus-yellow)]/20 text-[var(--nexus-yellow-deep)]"><AlertTriangle className="h-5 w-5" /></div>
          <h2 id="studio-unsaved-title" className="mt-4 text-lg font-bold text-[var(--nexus-charcoal)]">Perubahan Belum Disimpan</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">Data proyek yang Anda isi belum disimpan dan akan hilang jika Anda meninggalkan halaman ini.</p>
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

/** Small confirm/prompt modal used for status changes, cancellation and reopen reasons. */
export function ReasonDialog({ open, title, description, label, placeholder, required, confirmLabel, tone = 'primary', busy, error, onCancel, onConfirm }: {
  open: boolean; title: string; description?: string; label?: string; placeholder?: string; required?: boolean;
  confirmLabel: string; tone?: 'primary' | 'danger'; busy?: boolean; error?: string | null;
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
          {(label || required) && (
            <Field label={label || 'Alasan'} required={required} hint={required ? 'Minimal 3 karakter.' : 'Opsional, tersimpan pada riwayat status.'}>
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
