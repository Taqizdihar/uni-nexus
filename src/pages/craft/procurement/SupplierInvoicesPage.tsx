import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type {
  ProcurementReferences,
  SupplierInvoice,
} from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  inputClass,
  money,
} from "./components/ProcurementShared";

export function SupplierInvoicesPage() {
  const [items, setItems] = useState<SupplierInvoice[]>([]);
  const [refs, setRefs] = useState<ProcurementReferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<SupplierInvoice | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoices, references] = await Promise.all([
        craftProcurementApi.getSupplierInvoices(),
        craftProcurementApi.getReferences(),
      ]);
      setItems(invoices.items);
      setRefs(references);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Tagihan pemasok tidak dapat dimuat.",
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
        title="Tagihan Pemasok"
        description="Tagihan menampilkan Accounts Payable. Pembayaran dan kas tidak diubah oleh modul Pengadaan."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Catat Tagihan
          </Button>
        }
      />
      {error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="Belum Ada Tagihan Pemasok"
          description="Catat invoice dari pemasok untuk visibilitas utang usaha, tanpa menandai pembayaran."
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Pemasok / PO</th>
                <th className="p-4">Jatuh tempo</th>
                <th className="p-4">Saldo</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-[var(--nexus-border)]"
                >
                  <td className="p-4 font-semibold">
                    {invoice.supplier_invoice_number}
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {date(invoice.invoice_date)}
                    </p>
                  </td>
                  <td className="p-4">
                    {invoice.supplier_name}
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {invoice.po_number || "Tanpa PO"}
                    </p>
                  </td>
                  <td className="p-4">{date(invoice.due_date)}</td>
                  <td className="p-4">
                    {money(invoice.balance_due, invoice.currency_code)}
                  </td>
                  <td className="p-4">
                    <StatusBadge value={invoice.status_code} />
                  </td>
                  <td className="p-4">
                    {invoice.status_code !== "void" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        onClick={() => setVoidTarget(invoice)}
                      >
                        Batalkan
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {open && refs && (
        <InvoiceForm
          refs={refs}
          onClose={() => setOpen(false)}
          onSave={async (value) => {
            await craftProcurementApi.createSupplierInvoice(value as any);
            setOpen(false);
            await load();
          }}
        />
      )}
      {
        <ConfirmDialog
          open={Boolean(voidTarget)}
          title="Batalkan tagihan?"
          description="Tagihan akan dikeluarkan dari Accounts Payable. Tagihan yang sudah dibayar sebagian tidak dapat dibatalkan di Pengadaan."
          confirmLabel="Batalkan Tagihan"
          variant="danger"
          onCancel={() => setVoidTarget(null)}
          onConfirm={() => {
            if (!voidTarget) return;
            void craftProcurementApi
              .voidSupplierInvoice(voidTarget.id)
              .then(() => {
                setVoidTarget(null);
                return load();
              })
              .catch((cause) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Tagihan tidak dapat dibatalkan.",
                ),
              );
          }}
        />
      }
    </div>
  );
}
function InvoiceForm({
  refs,
  onClose,
  onSave,
}: {
  refs: ProcurementReferences;
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    supplier_party_id: "",
    supplier_invoice_number: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    total_amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSave({
            ...form,
            supplier_party_id: Number(form.supplier_party_id),
            due_date: form.due_date || null,
            total_amount: Number(form.total_amount),
            notes: form.notes || null,
            currency_code: "IDR",
          });
          setSaving(false);
        }}
        className="w-full max-w-lg rounded-xl bg-white"
      >
        <div className="p-6">
          <h2 className="font-bold">Catat Tagihan Pemasok</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Pemasok" required>
              <select
                required
                className={inputClass}
                value={form.supplier_party_id}
                onChange={(event) =>
                  setForm({ ...form, supplier_party_id: event.target.value })
                }
              >
                <option value="">Pilih</option>
                {refs.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nomor invoice" required>
              <input
                required
                className={inputClass}
                value={form.supplier_invoice_number}
                onChange={(event) =>
                  setForm({
                    ...form,
                    supplier_invoice_number: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Tanggal invoice" required>
              <input
                required
                type="date"
                className={inputClass}
                value={form.invoice_date}
                onChange={(event) =>
                  setForm({ ...form, invoice_date: event.target.value })
                }
              />
            </Field>
            <Field label="Jatuh tempo">
              <input
                type="date"
                className={inputClass}
                value={form.due_date}
                onChange={(event) =>
                  setForm({ ...form, due_date: event.target.value })
                }
              />
            </Field>
            <Field label="Total" required>
              <input
                required
                min="1"
                type="number"
                className={inputClass}
                value={form.total_amount}
                onChange={(event) =>
                  setForm({ ...form, total_amount: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Catat Tagihan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
