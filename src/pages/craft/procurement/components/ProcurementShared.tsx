import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../../../../components/ui/Button";

export const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-[var(--nexus-border)] bg-white px-3 text-sm outline-none focus:border-[var(--nexus-yellow-deep)] focus:ring-2 focus:ring-[var(--nexus-yellow)]/25";
export const textAreaClass = `${inputClass} h-auto py-2`;
export const money = (value: number | null | undefined, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
export const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
export const quantity = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(
    Number(value || 0),
  );

const colors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-blue-100 text-blue-800",
  closed: "bg-slate-200 text-slate-700",
  sent: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  partial: "bg-orange-100 text-orange-800",
  received: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  unpaid: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-slate-200 text-slate-700",
};
const labels: Record<string, string> = {
  draft: "Draf",
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  ordered: "Dipesan",
  closed: "Ditutup",
  sent: "Terkirim",
  confirmed: "Dikonfirmasi",
  partial: "Parsial",
  received: "Diterima",
  cancelled: "Dibatalkan",
  unpaid: "Belum dibayar",
  overdue: "Jatuh tempo",
  void: "Dibatalkan",
};
export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value] || "bg-gray-100 text-gray-700"}`}
    >
      {labels[value] || value}
    </span>
  );
}
export function PageHeader({
  eyebrow = "PENGADAAN",
  title,
  description,
  actions,
  backTo,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  backTo?: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--nexus-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {backTo && (
          <Link
            to={backTo}
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--nexus-yellow-deep)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        )}
        <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--nexus-yellow-deep)]">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--nexus-muted)]">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <div className="flex gap-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p>{message}</p>
      </div>
      {retry && (
        <Button className="mt-3" size="sm" onClick={retry}>
          Coba Lagi
        </Button>
      )}
    </section>
  );
}
export function Loading() {
  return (
    <div className="rounded-xl border border-[var(--nexus-border)] bg-white p-10 text-center text-sm text-[var(--nexus-muted)]">
      <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
      Memuat data pengadaan…
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--nexus-border)] bg-white p-10 text-center">
      <h2 className="font-bold text-[var(--nexus-charcoal)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--nexus-muted)]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-[var(--nexus-charcoal)]">
      {label}
      {required && <span className="text-red-600"> *</span>}
      {children}
    </label>
  );
}
