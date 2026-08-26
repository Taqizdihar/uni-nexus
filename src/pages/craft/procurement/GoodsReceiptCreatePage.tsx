import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type {
  GoodsReceiptForm,
  PurchaseOrder,
  PurchaseOrderItem,
} from "../../../types/craft-procurement";
import {
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  inputClass,
  quantity,
} from "./components/ProcurementShared";

type Detail = Awaited<ReturnType<typeof craftProcurementApi.getPurchaseOrder>>;
export function GoodsReceiptCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<GoodsReceiptForm>({
    purchase_order_id: Number(params.get("order")) || 0,
    received_at: new Date().toISOString().slice(0, 10),
    notes: null,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadOrder = async (orderId: number) => {
    if (!orderId) {
      setDetail(null);
      return;
    }
    try {
      const result = await craftProcurementApi.getPurchaseOrder(orderId);
      setDetail(result);
      setForm((current) => ({
        ...current,
        purchase_order_id: orderId,
        items: result.items
          .filter((item) => (item.remaining_qty || 0) > 0)
          .map((item) => ({
            purchase_order_item_id: item.id,
            accepted_qty: 0,
            rejected_qty: 0,
            rejection_reason: null,
            create_spool: true,
            batch_code: null,
            location_code: null,
          })),
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Detail PO tidak dapat dimuat.",
      );
    }
  };
  useEffect(() => {
    void craftProcurementApi
      .getPurchaseOrders()
      .then((result) => {
        const available = result.items.filter((order) =>
          ["sent", "confirmed", "partial"].includes(order.status_code),
        );
        setOrders(available);
        const selected = Number(params.get("order")) || available[0]?.id;
        if (selected) void loadOrder(selected);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Daftar PO tidak dapat dimuat.",
        ),
      )
      .finally(() => setLoading(false));
  }, [params]);
  const patch = (
    index: number,
    values: Partial<GoodsReceiptForm["items"][number]>,
  ) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...values } : item,
      ),
    }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await craftProcurementApi.createGoodsReceipt({
        ...form,
        purchase_order_id: Number(form.purchase_order_id),
        items: form.items.map((item) => ({
          ...item,
          accepted_qty: Number(item.accepted_qty),
          rejected_qty: Number(item.rejected_qty || 0),
          rejection_reason: item.rejection_reason || null,
        })),
      });
      navigate(`/app/craft/procurement/receipts?receipt=${result.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Penerimaan barang gagal.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loading />;
  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title="Terima Barang"
        description="Simpan hanya kuantitas yang benar-benar diterima. Penolakan tidak akan menaikkan stok atau kuantitas PO."
        backTo="/app/craft/procurement/receipts"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !detail ||
                form.items.every(
                  (item) => !item.accepted_qty && !item.rejected_qty,
                )
              }
            >
              {saving ? "Memproses…" : "Simpan Penerimaan"}
            </Button>
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="PO" required>
            <select
              required
              className={inputClass}
              value={form.purchase_order_id || ""}
              onChange={(event) => void loadOrder(Number(event.target.value))}
            >
              <option value="">Pilih PO dapat diterima</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number} — {order.supplier_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal penerimaan">
            <input
              type="date"
              className={inputClass}
              value={form.received_at || ""}
              onChange={(event) =>
                setForm({ ...form, received_at: event.target.value || null })
              }
            />
          </Field>
        </div>
      </section>
      {detail ? (
        <section className="rounded-xl border border-[var(--nexus-border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--nexus-border)] p-5">
            <div>
              <h2 className="font-bold">{detail.order.po_number}</h2>
              <p className="text-xs text-[var(--nexus-muted)]">
                {detail.order.supplier_name}
              </p>
            </div>
            <StatusBadge value={detail.order.status_code} />
          </div>
          <div className="divide-y divide-[var(--nexus-border)]">
            {detail.items
              .filter((item) => (item.remaining_qty || 0) > 0)
              .map((item: PurchaseOrderItem, index: number) => {
                const receipt = form.items[index];
                return (
                  <div key={item.id} className="grid gap-3 p-5 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <p className="font-semibold text-sm">
                        {item.description}
                      </p>
                      <p className="text-xs text-[var(--nexus-muted)]">
                        Pesan {quantity(item.quantity)} · sebelumnya{" "}
                        {quantity(item.received_qty)} · sisa{" "}
                        {quantity(item.remaining_qty)} {item.unit_symbol}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Diterima">
                        <input
                          min="0"
                          max={item.remaining_qty}
                          step="any"
                          type="number"
                          className={inputClass}
                          value={receipt?.accepted_qty ?? 0}
                          onChange={(event) =>
                            patch(index, {
                              accepted_qty: Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Ditolak">
                        <input
                          min="0"
                          step="any"
                          type="number"
                          className={inputClass}
                          value={receipt?.rejected_qty ?? 0}
                          onChange={(event) =>
                            patch(index, {
                              rejected_qty: Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-3">
                      <Field label="Alasan penolakan">
                        <input
                          className={inputClass}
                          required={Boolean(receipt?.rejected_qty)}
                          value={receipt?.rejection_reason || ""}
                          onChange={(event) =>
                            patch(index, {
                              rejection_reason: event.target.value || null,
                            })
                          }
                        />
                      </Field>
                    </div>
                    {item.material_id ? (
                      <div className="md:col-span-2">
                        <Field label="Kode batch">
                          <input
                            className={inputClass}
                            value={receipt?.batch_code || ""}
                            onChange={(event) =>
                              patch(index, {
                                batch_code: event.target.value || null,
                              })
                            }
                            placeholder="Otomatis bila kosong"
                          />
                        </Field>
                        <label className="mt-7 flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={receipt?.create_spool !== false}
                            onChange={(event) =>
                              patch(index, {
                                create_spool: event.target.checked,
                              })
                            }
                          />{" "}
                          Buat spool (filament)
                        </label>
                      </div>
                    ) : (
                      <div className="md:col-span-2 rounded-lg bg-gray-50 p-3 text-xs text-[var(--nexus-muted)]">
                        Item non-material: penerimaan dicatat tanpa batch atau
                        pergerakan stok.
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--nexus-border)] bg-white p-8 text-center text-sm text-[var(--nexus-muted)]">
          Pilih PO untuk memuat item penerimaan.
        </p>
      )}
    </form>
  );
}
