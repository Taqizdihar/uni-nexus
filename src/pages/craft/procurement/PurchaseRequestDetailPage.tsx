import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Send, ShoppingCart, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { PurchaseRequestDetail } from "../../../types/craft-procurement";
import {
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  money,
  quantity,
} from "./components/ProcurementShared";

export function PurchaseRequestDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<PurchaseRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"submit" | "approve" | "reject" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await craftProcurementApi.getPurchaseRequest(Number(id)));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Permintaan tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async () => {
    if (!data || !action) return;
    try {
      if (action === "submit")
        await craftProcurementApi.submitPurchaseRequest(data.request.id);
      if (action === "approve")
        await craftProcurementApi.approvePurchaseRequest(data.request.id);
      if (action === "reject")
        await craftProcurementApi.rejectPurchaseRequest(
          data.request.id,
          reason,
        );
      setAction(null);
      setReason("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Aksi tidak dapat diproses.",
      );
    }
  };
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <ErrorBox
        message={error || "Permintaan tidak ditemukan."}
        retry={() => void load()}
      />
    );
  const request = data.request;
  return (
    <div className="space-y-6">
      <PageHeader
        title={request.request_code}
        description={request.purpose || "Permintaan pembelian internal"}
        backTo="/app/craft/procurement/requests"
        actions={
          <>
            {request.status_code === "draft" && (
              <Button onClick={() => setAction("submit")}>
                <Send className="h-4 w-4" />
                Ajukan
              </Button>
            )}
            {request.status_code === "submitted" && (
              <>
                <Button onClick={() => setAction("approve")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Setujui
                </Button>
                <Button
                  variant="outline"
                  className="text-red-700"
                  onClick={() => setAction("reject")}
                >
                  <XCircle className="h-4 w-4" />
                  Tolak
                </Button>
              </>
            )}
            {["approved", "ordered"].includes(request.status_code) && (
              <Link
                to={`/app/craft/procurement/orders/new?request=${request.id}`}
              >
                <Button>
                  <ShoppingCart className="h-4 w-4" />
                  Buat PO
                </Button>
              </Link>
            )}
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      <section className="grid gap-4 md:grid-cols-4">
        <Info
          label="Status"
          value={<StatusBadge value={request.status_code} />}
        />
        <Info label="Dibutuhkan sebelum" value={date(request.required_by)} />
        <Info label="Pemohon" value={request.requester_name || "—"} />
        <Info label="Estimasi nilai" value={money(request.estimated_total)} />
      </section>
      <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="border-b border-[var(--nexus-border)] p-5">
          <h2 className="font-bold">Item Permintaan</h2>
        </div>
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Diminta</th>
              <th className="p-4">Dipesan</th>
              <th className="p-4">Sisa</th>
              <th className="p-4">Estimasi</th>
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
                  </p>
                </td>
                <td className="p-4">
                  {quantity(item.quantity)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {quantity(item.ordered_qty)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {quantity(item.remaining_qty)} {item.unit_symbol}
                </td>
                <td className="p-4">
                  {money((item.estimated_unit_cost || 0) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="border-b border-[var(--nexus-border)] p-5">
          <h2 className="font-bold">Riwayat keputusan</h2>
        </div>
        <div className="divide-y divide-[var(--nexus-border)]">
          {data.audit.length ? (
            data.audit.map((event) => (
              <div key={event.id} className="p-4 text-sm">
                <p>{event.description}</p>
                <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                  {date(event.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-[var(--nexus-muted)]">
              Belum ada riwayat.
            </p>
          )}
        </div>
      </section>
      <ConfirmDialog
        open={action === "submit" || action === "approve"}
        title={
          action === "submit" ? "Ajukan permintaan?" : "Setujui permintaan?"
        }
        description={
          action === "submit"
            ? "Setelah diajukan, item menjadi hanya-baca sampai ada keputusan."
            : "Keputusan dan identitas approver tercatat dalam audit log."
        }
        confirmLabel={action === "submit" ? "Ajukan" : "Setujui"}
        onCancel={() => setAction(null)}
        onConfirm={() => void run()}
      />
      {action === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run();
            }}
            className="w-full max-w-md rounded-xl bg-white p-6"
          >
            <h2 className="font-bold">Tolak Permintaan</h2>
            <p className="mt-2 text-sm text-[var(--nexus-muted)]">
              Alasan penolakan akan disimpan di Audit Log.
            </p>
            <textarea
              required
              minLength={3}
              className="mt-4 w-full rounded-lg border border-[var(--nexus-border)] p-3 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAction(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Tolak
              </Button>
            </div>
          </form>
        </div>
      )}
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
