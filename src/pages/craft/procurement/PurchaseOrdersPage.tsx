import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { PurchaseOrder } from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  money,
} from "./components/ProcurementShared";

export function PurchaseOrdersPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await craftProcurementApi.getPurchaseOrders()).items);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "PO tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesanan Pembelian"
        description="Komitmen pembelian kepada pemasok; membuat PO tidak mencatat pembayaran atau pengeluaran."
        actions={
          <Link to="new">
            <Button>
              <Plus className="h-4 w-4" />
              Buat PO
            </Button>
          </Link>
        }
      />
      {error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="Belum Ada Pesanan Pembelian"
          description="Buat PO dari permintaan pembelian yang telah disetujui atau untuk pembelian langsung."
          action={
            <Link to="new">
              <Button>Buat PO</Button>
            </Link>
          }
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
              <tr>
                <th className="p-4">PO</th>
                <th className="p-4">Pemasok</th>
                <th className="p-4">Tanggal / Estimasi</th>
                <th className="p-4">Nilai</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--nexus-border)]"
                >
                  <td className="p-4">
                    <Link
                      className="font-semibold hover:text-[var(--nexus-yellow-deep)]"
                      to={`${order.id}`}
                    >
                      {order.po_number}
                    </Link>
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {order.request_code || "Pembelian langsung"}
                    </p>
                  </td>
                  <td className="p-4">{order.supplier_name}</td>
                  <td className="p-4">
                    {date(order.order_date)}
                    <p className="text-xs text-[var(--nexus-muted)]">
                      Est. {date(order.expected_date)}
                    </p>
                  </td>
                  <td className="p-4">
                    {money(order.total_amount, order.currency_code)}
                  </td>
                  <td className="p-4">
                    <StatusBadge value={order.status_code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
