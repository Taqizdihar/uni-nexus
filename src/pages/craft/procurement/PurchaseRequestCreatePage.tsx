import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type {
  MaterialReference,
  ProcurementReferences,
  PurchaseRequestForm,
} from "../../../types/craft-procurement";
import {
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  inputClass,
  money,
  quantity,
} from "./components/ProcurementShared";

type DraftItem = PurchaseRequestForm["items"][number];
const emptyItem = (): DraftItem => ({
  material_id: null,
  description: "",
  quantity: 1,
  unit_id: null,
  estimated_unit_cost: null,
  notes: null,
});
export function PurchaseRequestCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [refs, setRefs] = useState<ProcurementReferences | null>(null);
  const [form, setForm] = useState<PurchaseRequestForm>({
    required_by: null,
    purpose: null,
    items: [emptyItem()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void craftProcurementApi
      .getReferences()
      .then((result) => {
        setRefs(result);
        const requestedMaterial = Number(params.get("material"));
        const material = result.materials.find(
          (item) => item.id === requestedMaterial,
        );
        if (material)
          setForm((current) => ({
            ...current,
            items: [
              {
                material_id: material.id,
                description: material.name,
                quantity: material.reorder_qty || 1,
                unit_id: material.base_unit_id,
                estimated_unit_cost: material.default_unit_cost,
                notes: null,
              },
            ],
          }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Referensi material tidak dapat dimuat.",
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
  const pickMaterial = (index: number, materialId: number) => {
    const material = refs?.materials.find((item) => item.id === materialId);
    if (!material) return;
    changeItem(index, {
      material_id: material.id,
      description: material.name,
      unit_id: material.base_unit_id,
      estimated_unit_cost: material.default_unit_cost,
      quantity: form.items[index].quantity || material.reorder_qty || 1,
    });
  };
  const total = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) * Number(item.estimated_unit_cost || 0),
        0,
      ),
    [form.items],
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await craftProcurementApi.createPurchaseRequest({
        ...form,
        items: form.items.map((item) => ({
          ...item,
          material_id: item.material_id || null,
          unit_id: item.unit_id || null,
          estimated_unit_cost:
            item.estimated_unit_cost === null ||
            item.estimated_unit_cost === undefined
              ? null
              : Number(item.estimated_unit_cost),
          quantity: Number(item.quantity),
          notes: item.notes || null,
        })),
      });
      navigate(`/app/craft/procurement/requests/${result.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Permintaan tidak dapat disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading || !refs) return <Loading />;
  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title="Permintaan Pembelian Baru"
        description="Simpan sebagai draf; ajukan dari detail setelah kebutuhan telah lengkap."
        backTo="/app/craft/procurement/requests"
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
              {saving ? "Menyimpan…" : "Simpan Draf"}
            </Button>
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Dibutuhkan sebelum">
            <input
              type="date"
              className={inputClass}
              value={form.required_by || ""}
              onChange={(event) =>
                setForm({ ...form, required_by: event.target.value || null })
              }
            />
          </Field>
          <Field label="Tujuan / alasan">
            <input
              className={inputClass}
              value={form.purpose || ""}
              onChange={(event) =>
                setForm({ ...form, purpose: event.target.value || null })
              }
              placeholder="Contoh: pengisian stok PLA untuk pesanan minggu ini"
            />
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--nexus-border)] p-5">
          <div>
            <h2 className="font-bold">Item kebutuhan</h2>
            <p className="text-xs text-[var(--nexus-muted)]">
              Material bersifat opsional untuk sparepart atau kebutuhan satu
              kali.
            </p>
          </div>
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
        </div>
        <div className="divide-y divide-[var(--nexus-border)]">
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-3 p-5 md:grid-cols-12">
              <Field label="Material">
                <select
                  className={inputClass}
                  value={item.material_id || ""}
                  onChange={(event) =>
                    event.target.value
                      ? pickMaterial(index, Number(event.target.value))
                      : changeItem(index, { material_id: null, unit_id: null })
                  }
                >
                  <option value="">Item non-material</option>
                  {refs.materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.sku} — {material.name} (
                      {quantity(material.available_qty)} {material.unit_symbol})
                    </option>
                  ))}
                </select>
              </Field>
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
              <div className="md:col-span-2">
                <Field label="Estimasi harga">
                  <input
                    min="0"
                    type="number"
                    className={inputClass}
                    value={item.estimated_unit_cost ?? ""}
                    onChange={(event) =>
                      changeItem(index, {
                        estimated_unit_cost:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
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
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-[var(--nexus-border)] p-5 text-sm">
          <span className="text-[var(--nexus-muted)]">Estimasi Nilai: </span>
          <strong className="ml-2">{money(total)}</strong>
        </div>
      </section>
    </form>
  );
}
