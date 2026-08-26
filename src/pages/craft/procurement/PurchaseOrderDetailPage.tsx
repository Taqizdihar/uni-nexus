import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Send, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { PurchaseOrder } from "../../../types/craft-procurement";
import {
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  money,
  quantity,
} from "./components/ProcurementShared";

type Detail = Awaited<ReturnType<typeof craftProcurementApi.getPurchaseOrder>>;
export function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"send" | "confirm" | "cancel" | null>(
    null,
  );
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await craftProcurementApi.getPurchaseOrder(Number(id)));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "PO tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const execute = async () => {
    if (!data || !action) return;
    try {
      if (action === "send")
        await craftProcurementApi.markPurchaseOrderSent(data.order.id);
      if (action === "confirm")
        await craftProcurementApi.confirmPurchaseOrder(data.order.id);
      if (action === "cancel")
        await craftProcurementApi.cancelPurchaseOrder(data.order.id);
      setAction(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aksi PO gagal.");
    }
  };
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <ErrorBox
        message={error || "PO tidak ditemukan."}
        retry={() => void load()}
      />
    );
  const order: PurchaseOrder = data.order;
  return (
    <div className="space-y-6">
      <PageHeader
        title={order.po_number}
        description={`${order.supplier_name} · ${order.request_code || "Pembelian langsung"}`}
        backTo="/app/craft/procurement/orders"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                void craftProcurementApi.downloadPurchaseOrderPdf(
                  order.id,
                  order.po_number,
                )
              }
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            {order.status_code === "draft" && (
              <Button onClick={() => setAction("send")}>
                <Send className="h-4 w-4" />
                Tandai Terkirim
              </Button>
            )}
            {["draft", "sent"].includes(order.status_code) && (
              <Button variant="outline" onClick={() => setAction("confirm")}>
                <CheckCircle2 className="h-4 w-4" />
                Konfirmasi
              </Button>
            )}
            {["sent", "confirmed", "partial"].includes(order.status_code) && (
              <Link
                to={`/app/craft/procurement/receipts/new?order=${order.id}`}
              >
                <Button>Terima Barang</Button>
              </Link>
            )}
            {["draft", "sent", "confirmed"].includes(order.status_code) && (
              <Button
                variant="ghost"
                className="text-red-700"
                onClick={() => setAction("cancel")}
              >
                <XCircle className="h-4 w-4" />
                Batalkan
              </Button>
            )}
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      <section className="grid gap-4 md:grid-cols-4">
        <Info
          label="Status"
          value={<StatusBadge value={order.status_code} />}
        />
        <Info label="Tanggal PO" value={date(order.order_date)} />
        <Info label="Estimasi tiba" value={date(order.expected_date)} />
        <Info
          label="Total"
          value={money(order.total_amount, order.currency_code)}
        />
      </section>
      <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="border-b border-[var(--nexus-border)] p-5">
          <h2 className="font-bold">Item Pesanan</h2>
        </div>
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Dipesan</th>
              <th className="p-4">Diterima</th>
              <th className="p-4">Sisa</th>
              <th className="p-4">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[var(--nexus-border)]"
              >
                <td className="p-4">
                  <p className="font-semibold">{item.description}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {item.material_sku || "Item non-material"}
                    {item.purchase_request_item_id ? " · dari PR" : ""}
                  </p>
                </td>
                <td className="p-4">
                  {quantity(item.quantity)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {quantity(item.received_qty)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {quantity(item.remaining_qty)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {money(item.line_total, order.currency_code)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white">
          <div className="border-b border-[var(--nexus-border)] p-5">
            <h2 className="font-bold">Penerimaan Barang</h2>
          </div>
          <div className="divide-y divide-[var(--nexus-border)]">
            {data.receipts.length ? (
              data.receipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  to={`/app/craft/procurement/receipts?receipt=${receipt.id}`}
                  className="block p-4 text-sm hover:bg-gray-50"
                >
                  <p className="font-semibold">{receipt.receipt_number}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {date(receipt.received_at)} · diterima{" "}
                    {quantity(receipt.accepted_qty)}, ditolak{" "}
                    {quantity(receipt.rejected_qty)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--nexus-muted)]">
                Belum ada penerimaan.
              </p>
            )}
          </div>
        </article>
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white">
          <div className="border-b border-[var(--nexus-border)] p-5">
            <h2 className="font-bold">Tagihan Pemasok</h2>
          </div>
          <div className="divide-y divide-[var(--nexus-border)]">
            {data.invoices.length ? (
              data.invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 text-sm">
                  <div className="flex justify-between">
                    <p className="font-semibold">
                      {invoice.supplier_invoice_number}
                    </p>
                    <StatusBadge value={invoice.status_code} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                    {money(invoice.balance_due, invoice.currency_code)} · jatuh
                    tempo {date(invoice.due_date)}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--nexus-muted)]">
                Belum ada tagihan.
              </p>
            )}
          </div>
        </article>
      </section>
      <ConfirmDialog
        open={Boolean(action)}
        title={
          action === "cancel"
            ? "Batalkan PO?"
            : action === "send"
              ? "Tandai PO terkirim?"
              : "Konfirmasi PO?"
        }
        description={
          action === "cancel"
            ? "PO tanpa penerimaan dapat dibatalkan; pemetaan PR akan dihitung ulang."
            : "Perubahan status dicatat dalam audit log."
        }
        confirmLabel={
          action === "cancel"
            ? "Batalkan PO"
            : action === "send"
              ? "Tandai Terkirim"
              : "Konfirmasi"
        }
        variant={action === "cancel" ? "danger" : "default"}
        onCancel={() => setAction(null)}
        onConfirm={() => void execute()}
      />
    </div>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--nexus-border)] bg-white p-4">
      <p className="text-xs text-[var(--nexus-muted)]">{label}</p>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}
