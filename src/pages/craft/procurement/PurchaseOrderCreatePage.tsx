import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type {
  ProcurementReferences,
  PurchaseOrderForm,
  PurchaseRequestDetail,
} from "../../../types/craft-procurement";
import {
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  inputClass,
  money,
} from "./components/ProcurementShared";

type DraftItem = PurchaseOrderForm["items"][number];
const emptyItem = (): DraftItem => ({
  purchase_request_item_id: null,
  material_id: null,
  description: "",
  quantity: 1,
  unit_id: null,
  unit_price: 0,
});
export function PurchaseOrderCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [refs, setRefs] = useState<ProcurementReferences | null>(null);
  const [request, setRequest] = useState<PurchaseRequestDetail | null>(null);
  const [form, setForm] = useState<PurchaseOrderForm>({
    supplier_party_id: 0,
    purchase_request_id: null,
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: null,
    currency_code: "IDR",
    tax_amount: 0,
    shipping_amount: 0,
    notes: null,
    items: [emptyItem()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const requestId = Number(params.get("request"));
    Promise.all([
      craftProcurementApi.getReferences(),
      requestId
        ? craftProcurementApi.getPurchaseRequest(requestId)
        : Promise.resolve(null),
    ])
      .then(([references, selectedRequest]) => {
        setRefs(references);
        setRequest(selectedRequest);
        if (selectedRequest)
          setForm((current) => ({
            ...current,
            purchase_request_id: selectedRequest.request.id,
            items: selectedRequest.items
              .filter((item) => (item.remaining_qty || 0) > 0)
              .map((item) => ({
                purchase_request_item_id: item.id,
                material_id: item.material_id,
                description: item.description,
                quantity: item.remaining_qty || item.quantity,
                unit_id: item.unit_id,
                unit_price: item.estimated_unit_cost || 0,
              })),
          }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Referensi PO tidak dapat dimuat.",
        ),
      )
      .finally(() => setLoading(false));
  }, [params]);
  const changeItem = (index: number, patch: Partial<DraftItem>) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  const selectMaterial = (index: number, materialId: number) => {
    const material = refs?.materials.find((item) => item.id === materialId);
    if (material)
      changeItem(index, {
        material_id: material.id,
        description: material.name,
        unit_id: material.base_unit_id,
        unit_price: material.default_unit_cost,
      });
  };
  const subtotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0,
      ),
    [form.items],
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await craftProcurementApi.createPurchaseOrder({
        ...form,
        supplier_party_id: Number(form.supplier_party_id),
        purchase_request_id: form.purchase_request_id || null,
        tax_amount: Number(form.tax_amount || 0),
        shipping_amount: Number(form.shipping_amount || 0),
        items: form.items.map((item) => ({
          ...item,
          purchase_request_item_id: item.purchase_request_item_id || null,
          material_id: item.material_id || null,
          unit_id: item.unit_id || null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
      navigate(`/app/craft/procurement/orders/${result.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "PO tidak dapat disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading || !refs) return <Loading />;
  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title="Buat Pesanan Pembelian"
        description={
          request
            ? `Konversi sebagian atau seluruh sisa ${request.request.request_code}.`
            : "PO langsung tetap memerlukan pemasok aktif dan tidak menandai pembayaran."
        }
        backTo="/app/craft/procurement/orders"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan PO Draf"}
            </Button>
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Pemasok" required>
            <select
              required
              className={inputClass}
              value={form.supplier_party_id || ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  supplier_party_id: Number(event.target.value),
                })
              }
            >
              <option value="">Pilih pemasok aktif</option>
              {refs.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} — {supplier.display_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal PO" required>
            <input
              required
              type="date"
              className={inputClass}
              value={form.order_date}
              onChange={(event) =>
                setForm({ ...form, order_date: event.target.value })
              }
            />
          </Field>
          <Field label="Estimasi tiba">
            <input
              type="date"
              className={inputClass}
              value={form.expected_date || ""}
              onChange={(event) =>
                setForm({ ...form, expected_date: event.target.value || null })
              }
            />
          </Field>
          <Field label="Pajak">
            <input
              min="0"
              type="number"
              className={inputClass}
              value={form.tax_amount || ""}
              onChange={(event) =>
                setForm({ ...form, tax_amount: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Ongkir">
            <input
              min="0"
              type="number"
              className={inputClass}
              value={form.shipping_amount || ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  shipping_amount: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Catatan">
            <input
              className={inputClass}
              value={form.notes || ""}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value || null })
              }
            />
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--nexus-border)] p-5">
          <h2 className="font-bold">Item PO</h2>
          {!request && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setForm({ ...form, items: [...form.items, emptyItem()] })
              }
            >
              <Plus className="h-4 w-4" />
              Item
            </Button>
          )}
        </div>
        <div className="divide-y divide-[var(--nexus-border)]">
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-3 p-5 md:grid-cols-12">
              <div className="md:col-span-3">
                <Field label="Material">
                  <select
                    disabled={Boolean(request)}
                    className={inputClass}
                    value={item.material_id || ""}
                    onChange={(event) =>
                      event.target.value
                        ? selectMaterial(index, Number(event.target.value))
                        : changeItem(index, {
                            material_id: null,
                            unit_id: null,
                          })
                    }
                  >
                    <option value="">Non-material</option>
                    {refs.materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.sku} — {material.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="Deskripsi" required>
                  <input
                    required
                    className={inputClass}
                    value={item.description}
                    onChange={(event) =>
                      changeItem(index, { description: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Jumlah" required>
                  <input
                    required
                    min="0.001"
                    step="any"
                    type="number"
                    className={inputClass}
                    value={item.quantity}
                    onChange={(event) =>
                      changeItem(index, {
                        quantity: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Satuan">
                  <select
                    className={inputClass}
                    value={item.unit_id || ""}
                    onChange={(event) =>
                      changeItem(index, {
                        unit_id: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">Pilih</option>
                    {refs.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.symbol}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="Harga">
                  <input
                    min="0"
                    type="number"
                    className={inputClass}
                    value={item.unit_price}
                    onChange={(event) =>
                      changeItem(index, {
                        unit_price: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              {
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-700"
                    disabled={form.items.length === 1}
                    onClick={() =>
                      setForm({
                        ...form,
                        items: form.items.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              }
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-[var(--nexus-border)] p-5 text-sm">
          Subtotal <strong className="ml-2">{money(subtotal)}</strong>
          <span className="mx-2">·</span>Total{" "}
          <strong>
            {money(
              subtotal +
                Number(form.tax_amount || 0) +
                Number(form.shipping_amount || 0),
            )}
          </strong>
        </div>
      </section>
    </form>
  );
}
