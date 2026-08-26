import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { GoodsReceipt } from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  date,
  quantity,
} from "./components/ProcurementShared";

export function GoodsReceiptsPage() {
  const [items, setItems] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await craftProcurementApi.getGoodsReceipts()).items);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Penerimaan tidak dapat dimuat.",
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
        title="Penerimaan Barang"
        description="Kuantitas diterima memperbarui stok material secara atomik; kuantitas ditolak tidak menambah stok atau received_qty PO."
        actions={
          <Link to="new">
            <Button>
              <Plus className="h-4 w-4" />
              Terima Barang
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
          title="Belum Ada Penerimaan Barang"
          description="Pilih PO terkirim atau dikonfirmasi untuk mencatat barang yang benar-benar tiba."
          action={
            <Link to="new">
              <Button>Terima Barang</Button>
            </Link>
          }
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
              <tr>
                <th className="p-4">Penerimaan</th>
                <th className="p-4">PO / Pemasok</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Diterima</th>
                <th className="p-4">Ditolak</th>
              </tr>
            </thead>
            <tbody>
              {items.map((receipt) => (
                <tr
                  key={receipt.id}
                  className="border-b border-[var(--nexus-border)]"
                >
                  <td className="p-4 font-semibold">
                    {receipt.receipt_number}
                  </td>
                  <td className="p-4">
                    {receipt.po_number}
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {receipt.supplier_name}
                    </p>
                  </td>
                  <td className="p-4">{date(receipt.received_at)}</td>
                  <td className="p-4">{quantity(receipt.accepted_qty)}</td>
                  <td className="p-4">{quantity(receipt.rejected_qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
