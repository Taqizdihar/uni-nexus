import React from 'react';
import { Badge } from '../../../../components/ui/Badge';
import { formatCurrency } from '../../../../lib/utils';
import type { CraftCustomer, PartyKind } from '../../../../types/craft-customers';

const kindLabels: Record<PartyKind, string> = { individual: 'Individu', company: 'Perusahaan', institution: 'Institusi', internal: 'Internal' };

export const kindLabel = (kind: PartyKind) => kindLabels[kind] || kind;
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
export const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum ada';

export function CustomerAvatar({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexus-cream-soft)] text-sm font-bold tracking-wide text-[var(--nexus-yellow-deep)] ${className}`}>{initials(name)}</span>;
}

export function CustomerKindBadge({ kind }: { kind: PartyKind }) { return <Badge variant="outline">{kindLabel(kind)}</Badge>; }
export function CustomerStatusBadge({ active }: { active: boolean }) { return <Badge variant={active ? 'success' : 'error'}>{active ? 'Aktif' : 'Tidak Aktif'}</Badge>; }
export function PartnerBadge() { return <Badge variant="warning" className="border-amber-300 bg-amber-50 text-amber-800">MITRA</Badge>; }

export function CustomerMetric({ label, value, money = false }: { label: string; value: number | string; money?: boolean }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nexus-muted)]">{label}</p><p className="mt-1 text-sm font-bold text-[var(--nexus-charcoal)]">{money ? formatCurrency(Number(value)) : value}</p></div>;
}

export function CustomerCard({ customer, onOpen }: { customer: CraftCustomer; onOpen: () => void | Promise<void> } & React.Attributes) {
  return <button type="button" onClick={onOpen} className="group w-full rounded-xl border border-[var(--nexus-border)] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--nexus-yellow)]/25">
    <div className="flex items-start gap-3"><CustomerAvatar name={customer.display_name} /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[0.14em] text-[var(--nexus-muted)]">{customer.code}</p><h2 className="mt-0.5 truncate font-bold text-[var(--nexus-charcoal)] group-hover:text-[var(--nexus-yellow-deep)]">{customer.display_name}</h2><div className="mt-2 flex flex-wrap gap-1.5"><CustomerKindBadge kind={customer.party_kind} />{customer.is_partner && <PartnerBadge />}<CustomerStatusBadge active={customer.is_active} /></div></div></div>
    <div className="mt-5 space-y-1.5 text-xs text-[var(--nexus-muted)]"><p className="truncate">{customer.email || customer.primary_contact_email || 'Email belum tersedia'}</p><p>{customer.phone || customer.primary_contact_phone || 'Telepon belum tersedia'}</p></div>
    <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--nexus-border)] pt-4"><CustomerMetric label="Pesanan" value={customer.total_orders} /><CustomerMetric label="Nilai Pesanan" value={customer.total_order_value} money /><CustomerMetric label="Terakhir" value={dateLabel(customer.last_order_at)} /></div>
  </button>;
}
