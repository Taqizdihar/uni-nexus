import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { PurchaseRequest } from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  money,
} from "./components/ProcurementShared";

export function PurchaseRequestsPage() {
  const [items, setItems] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await craftProcurementApi.getPurchaseRequests()).items);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Permintaan pembelian tidak dapat dimuat.",
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
        title="Permintaan Pembelian"
        description="Dokumen internal untuk kebutuhan pembelian sebelum pemasok dan PO ditentukan."
        actions={
          <Link to="new">
            <Button>
              <Plus className="h-4 w-4" />
              Permintaan Baru
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
          title="Belum Ada Permintaan Pembelian"
          description="Buat permintaan dari kebutuhan operasional atau material stok menipis."
          action={
            <Link to="new">
              <Button>Permintaan Baru</Button>
            </Link>
          }
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
              <tr>
                <th className="p-4">Kode</th>
                <th className="p-4">Tujuan</th>
                <th className="p-4">Dibutuhkan</th>
                <th className="p-4">Estimasi</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-[var(--nexus-border)]"
                >
                  <td className="p-4">
                    <Link
                      className="font-semibold hover:text-[var(--nexus-yellow-deep)]"
                      to={`${request.id}`}
                    >
                      {request.request_code}
                    </Link>
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {request.total_items || 0} item
                    </p>
                  </td>
                  <td className="p-4">{request.purpose || "—"}</td>
                  <td className="p-4">{date(request.required_by)}</td>
                  <td className="p-4">{money(request.estimated_total)}</td>
                  <td className="p-4">
                    <StatusBadge value={request.status_code} />
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
