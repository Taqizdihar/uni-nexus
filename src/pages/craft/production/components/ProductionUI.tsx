import React from 'react';
import { ArrowLeft, Factory, LucideIcon, RefreshCw } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';
import type {
  DeadlineRisk,
  FailureType,
  ProductionJobStatus,
  ProductionQueueStatus,
  QcResult,
} from '../../../../types/craft-production';
import type { PriorityCode } from '../../../../types/craft-orders';

export const productionStatusLabels: Record<ProductionJobStatus, string> = {
  queued: 'Menunggu',
  ready: 'Siap',
  printing: 'Sedang Dicetak',
  paused: 'Dijeda',
  qc: 'Kontrol Kualitas',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
};

export const priorityLabels: Record<PriorityCode, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const deadlineRiskLabels: Record<DeadlineRisk, string> = {
  on_track: 'Sesuai Jadwal',
  at_risk: 'Berisiko',
  late: 'Terlambat',
  unknown: 'Belum Dihitung',
};

export const failureTypeLabels: Record<FailureType, string> = {
  spaghetti: 'Spaghetti',
  layer_shift: 'Layer bergeser',
  warping: 'Warping',
  adhesion: 'Adhesi bed',
  filament: 'Filament',
  power: 'Daya listrik',
  human_error: 'Kesalahan operator',
  other: 'Lainnya',
};

export const qcResultLabels: Record<QcResult, string> = {
  pending: 'Menunggu',
  pass: 'Lulus',
  fail: 'Gagal',
  conditional: 'Bersyarat',
};

export const queueStatusLabels: Record<ProductionQueueStatus, string> = {
  queued: 'Menunggu',
  scheduled: 'Terjadwal',
  printing: 'Sedang Dicetak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function ProductionStatusBadge({ value }: { value: ProductionJobStatus | string }) {
  const variant = value === 'failed' || value === 'cancelled'
    ? 'error'
    : value === 'completed'
      ? 'success'
      : value === 'printing' || value === 'paused'
        ? 'warning'
        : value === 'qc'
          ? 'info'
          : 'default';
  return <Badge variant={variant}>{productionStatusLabels[value as ProductionJobStatus] || value}</Badge>;
}

export function ProductionPriorityBadge({ value }: { value: PriorityCode | string }) {
  const variant = value === 'critical' ? 'error' : value === 'high' ? 'warning' : value === 'normal' ? 'info' : 'default';
  return <Badge variant={variant}>{priorityLabels[value as PriorityCode] || value}</Badge>;
}

export function DeadlineRiskBadge({ value }: { value: DeadlineRisk | string | null | undefined }) {
  const normalized = value || 'unknown';
  const variant = normalized === 'late' ? 'error' : normalized === 'at_risk' ? 'warning' : normalized === 'on_track' ? 'success' : 'outline';
  return <Badge variant={variant}>{deadlineRiskLabels[normalized as DeadlineRisk] || normalized}</Badge>;
}

export function QcResultBadge({ value }: { value: QcResult | string }) {
  const variant = value === 'pass' ? 'success' : value === 'fail' ? 'error' : value === 'conditional' ? 'warning' : 'default';
  return <Badge variant={variant}>{qcResultLabels[value as QcResult] || value}</Badge>;
}

export function ProductionPageHeader({
  eyebrow = 'Craft Production',
  title,
  description,
  back,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  back?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="production-page-header">
      <div className="flex min-w-0 items-start gap-3">
        {back && <Button variant="ghost" size="sm" onClick={back} className="mt-1 shrink-0 px-2" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>}
        <div className="min-w-0">
          <p className="production-eyebrow">{eyebrow}</p>
          <h1 className="production-page-title">{title}</h1>
          <p className="production-page-description">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ProductionSectionHeader({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-[var(--nexus-border)] pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3">{Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--nexus-cream-soft)] text-[var(--nexus-charcoal)]"><Icon className="h-4 w-4" /></span>}<div><h2 className="text-sm font-bold text-[var(--nexus-charcoal)]">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[var(--nexus-muted)]">{description}</p>}</div></div>{action}</div>;
}

export function ProductionEmptyState({
  title,
  description,
  action,
  icon: Icon = Factory,
  compact = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return <div className={cn('production-empty-state', compact && 'min-h-48 py-8')}><div className="production-empty-icon"><Icon className="h-5 w-5" /></div><h3 className="mt-4 text-base font-semibold text-[var(--nexus-charcoal)]">{title}</h3><p className="mt-1 max-w-md text-sm leading-6 text-[var(--nexus-muted)]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ProductionLoading({ label = 'Memuat data produksi...' }: { label?: string }) {
  return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[var(--nexus-muted)]"><RefreshCw className="h-4 w-4 animate-spin text-[var(--nexus-yellow-deep)]" />{label}</div>;
}

export function ProductionError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{message}</span>{retry && <Button type="button" size="sm" variant="outline" onClick={retry} className="border-red-200 bg-white text-red-700"><RefreshCw className="h-3.5 w-3.5" /> Coba Lagi</Button>}</div>;
}

export function ProductionKpi({ label, value, icon: Icon, tone = 'default', hint }: { label: string; value: React.ReactNode; icon?: LucideIcon; tone?: 'default' | 'warning' | 'danger' | 'success'; hint?: string }) {
  const tones = { default: 'bg-white', warning: 'border-amber-200 bg-amber-50/60', danger: 'border-red-200 bg-red-50/60', success: 'border-emerald-200 bg-emerald-50/60' };
  return <div className={cn('production-kpi', tones[tone])}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p><div className="mt-2 text-2xl font-bold text-[var(--nexus-charcoal)]">{value}</div>{hint && <p className="mt-1 text-[11px] text-[var(--nexus-muted)]">{hint}</p>}</div>{Icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nexus-cream-soft)] text-[var(--nexus-charcoal)]"><Icon className="h-4 w-4" /></span>}</div></div>;
}

export function ProductionProgress({ value, source = 'none' }: { value: number; source?: string | null }) {
  const normalized = Math.min(100, Math.max(0, Number(value) || 0));
  return <div className="space-y-1.5"><div className="flex items-center justify-between text-[10px] font-semibold"><span className="text-[var(--nexus-muted)]">{source === 'estimated' ? 'Estimasi progres' : source === 'manual' ? 'Progres manual' : 'Progres tercatat'}</span><span className="text-[var(--nexus-charcoal)]">{normalized}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--nexus-cream-soft)]"><div className="h-full rounded-full bg-[var(--nexus-yellow-deep)] transition-[width]" style={{ width: `${normalized}%` }} /></div></div>;
}

export function ProductionTableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="production-table-head">{children}</thead>;
}

export function ProductionTableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void; key?: React.Key }) {
  return <tr className={cn('production-table-row', onClick && 'cursor-pointer')} onClick={onClick}>{children}</tr>;
}

export function formatProductionDate(value: string | null | undefined, includeTime = true): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) return '-';
  const value = Math.max(0, Math.round(Number(minutes)));
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!hours) return `${rest} mnt`;
  return rest ? `${hours}j ${rest}m` : `${hours}j`;
}

