import React, { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { ProcurementOverview } from "../../../types/craft-procurement";
import {
  ErrorBox,
  Loading,
  PageHeader,
  money,
} from "./components/ProcurementShared";

export function ProcurementOverviewPage() {
  const [data, setData] = useState<ProcurementOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await craftProcurementApi.getOverview());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Ringkasan Pengadaan tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const cards = data
    ? [
        {
          label: "Permintaan Menunggu Persetujuan",
          value: data.pending_requests,
          icon: ClipboardList,
          to: "/app/craft/procurement/requests?status=submitted",
        },
        {
          label: "PO Aktif",
          value: data.active_purchase_orders,
          icon: PackageCheck,
          to: "/app/craft/procurement/orders",
        },
        {
          label: "PO Terlambat",
          value: data.overdue_purchase_orders,
          icon: TriangleAlert,
          to: "/app/craft/procurement/orders?status=partial",
        },
        {
          label: "Diharapkan Minggu Ini",
          value: data.due_this_week,
          icon: ReceiptText,
          to: "/app/craft/procurement/orders",
        },
        {
          label: "Nilai PO Terbuka",
          value: money(data.open_po_value),
          icon: Wallet,
          to: "/app/craft/procurement/orders",
        },
        {
          label: "Tagihan Belum Dibayar",
          value: money(data.unpaid_supplier_invoices),
          icon: Wallet,
          to: "/app/craft/procurement/invoices",
        },
        {
          label: "Material Stok Menipis",
          value: data.low_stock_materials,
          icon: PackageSearch,
          to: "/app/craft/materials/low-stock",
        },
      ]
    : [];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Pengadaan"
        description="Pantau kebutuhan pembelian, pesanan pemasok, penerimaan barang, dan kewajiban tagihan Craft."
        actions={
          <>
            <Link to="/app/craft/procurement/requests/new">
              <Button>Permintaan Baru</Button>
            </Link>
            <Link to="/app/craft/procurement/orders/new">
              <Button variant="outline">Buat PO</Button>
            </Link>
          </>
        }
      />
      {error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : loading || !data ? (
        <Loading />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="rounded-xl border border-[var(--nexus-border)] bg-white p-5 shadow-sm transition hover:border-[var(--nexus-yellow-deep)]"
              >
                <card.icon className="h-5 w-5 text-[var(--nexus-yellow-deep)]" />
                <p className="mt-4 text-2xl font-bold text-[var(--nexus-charcoal)]">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                  {card.label}
                </p>
              </Link>
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            <Attention
              title="Material stok menipis tanpa pengadaan terbuka"
              items={data.attention.low_stock_without_procurement || []}
              empty="Semua material menipis sudah memiliki pengadaan terbuka."
              render={(item) => (
                <>
                  <p className="font-semibold">{String(item.name)}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {String(item.sku)} · {String(item.available_qty)}{" "}
                    {String(item.unit_symbol)}
                  </p>
                  <Link
                    className="mt-2 inline-block text-xs font-semibold text-[var(--nexus-yellow-deep)]"
                    to={`/app/craft/procurement/requests/new?material=${item.id}`}
                  >
                    Buat permintaan
                  </Link>
                </>
              )}
            />
            <Attention
              title="Permintaan menunggu persetujuan"
              items={data.attention.pending_requests || []}
              empty="Tidak ada permintaan yang menunggu keputusan."
              render={(item) => (
                <Link to={`/app/craft/procurement/requests/${item.id}`}>
                  <p className="font-semibold">{String(item.request_code)}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {String(item.purpose || "Tanpa tujuan")} ·{" "}
                    {String(item.requester_name || "—")}
                  </p>
                </Link>
              )}
            />
            <Attention
              title="PO yang terlambat / parsial"
              items={[
                ...(data.attention.overdue_purchase_orders || []),
                ...(data.attention.partially_received_purchase_orders || []),
              ]}
              empty="Tidak ada PO yang memerlukan perhatian."
              render={(item) => (
                <Link to={`/app/craft/procurement/orders/${item.id}`}>
                  <p className="font-semibold">{String(item.po_number)}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {String(item.supplier_name)} · Est.{" "}
                    {String(item.expected_date || "—")}
                  </p>
                </Link>
              )}
            />
            <Attention
              title="Barang ditolak dan tagihan dekat jatuh tempo"
              items={[
                ...(data.attention.rejected_goods || []),
                ...(data.attention.due_supplier_invoices || []),
              ]}
              empty="Tidak ada pengecualian penerimaan atau tagihan mendesak."
              render={(item) => (
                <>
                  <p className="font-semibold">
                    {String(
                      item.receipt_number || item.supplier_invoice_number,
                    )}
                  </p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {String(
                      item.rejection_reason ||
                        item.supplier_name ||
                        "Perlu ditindaklanjuti",
                    )}
                  </p>
                </>
              )}
            />
          </section>
        </>
      )}
    </div>
  );
}
function Attention({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  empty: string;
  render: (item: Record<string, unknown>) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--nexus-border)] bg-white">
      <div className="border-b border-[var(--nexus-border)] px-5 py-4">
        <h2 className="font-bold text-[var(--nexus-charcoal)]">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--nexus-border)]">
        {items.length ? (
          items.slice(0, 8).map((item, index) => (
            <div
              key={`${item.id || item.receipt_number}-${index}`}
              className="p-4 text-sm"
            >
              {render(item)}
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-[var(--nexus-muted)]">{empty}</p>
        )}
      </div>
    </section>
  );
}
