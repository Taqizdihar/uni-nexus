import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Power } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { Supplier } from "../../../types/craft-procurement";
import {
  ErrorBox,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  date,
  inputClass,
  money,
} from "./components/ProcurementShared";

type Detail = Awaited<ReturnType<typeof craftProcurementApi.getSupplier>>;
export function SupplierDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await craftProcurementApi.getSupplier(Number(id)));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Pemasok tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <ErrorBox
        message={error || "Pemasok tidak ditemukan."}
        retry={() => void load()}
      />
    );
  const supplier: Supplier = data.supplier;
  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.display_name}
        description={`${supplier.code} · Party kanonis dengan peran supplier untuk Craft.`}
        backTo="/app/craft/procurement/suppliers"
        actions={
          <>
            <Link to="edit">
              <Button variant="outline">
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <Power className="h-4 w-4" />
              {supplier.is_active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </>
        }
      />
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">Profil Pemasok</p>
              <p className="mt-1 text-sm text-[var(--nexus-muted)]">
                {supplier.legal_name || supplier.party_kind}
              </p>
            </div>
            <StatusBadge value={supplier.is_active ? "approved" : "closed"} />
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--nexus-muted)]">Email</dt>
              <dd>{supplier.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--nexus-muted)]">Telepon</dt>
              <dd>{supplier.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--nexus-muted)]">Tax ID</dt>
              <dd>{supplier.tax_id || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--nexus-muted)]">Alamat</dt>
              <dd>
                {[supplier.address_line1, supplier.city, supplier.province]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
          </dl>
        </article>
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white p-5">
          <p className="font-bold">Kinerja Faktual</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total PO" value={data.performance.total_pos || 0} />
            <Metric label="PO terbuka" value={data.performance.open_pos || 0} />
            <Metric
              label="PO diterima"
              value={data.performance.received_pos || 0}
            />
            <Metric
              label="Nilai pembelian"
              value={money(data.performance.total_purchase_value)}
            />
          </div>
        </article>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--nexus-border)] p-5">
            <h2 className="font-bold">Kontak</h2>
            <Button size="sm" onClick={() => setContactOpen(true)}>
              <Plus className="h-4 w-4" />
              Kontak
            </Button>
          </div>
          <div className="divide-y divide-[var(--nexus-border)]">
            {data.contacts.length ? (
              data.contacts.map((contact: any) => (
                <div key={contact.id} className="p-4 text-sm">
                  <p className="font-semibold">
                    {contact.full_name}
                    {contact.is_primary && (
                      <span className="ml-2 text-xs text-[var(--nexus-yellow-deep)]">
                        UTAMA
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {contact.job_title || "PIC"} ·{" "}
                    {contact.email || contact.phone || "—"}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--nexus-muted)]">
                Belum ada kontak pemasok.
              </p>
            )}
          </div>
        </article>
        <article className="rounded-xl border border-[var(--nexus-border)] bg-white">
          <div className="border-b border-[var(--nexus-border)] p-5">
            <h2 className="font-bold">Material Terkait</h2>
          </div>
          <div className="divide-y divide-[var(--nexus-border)]">
            {data.materials.length ? (
              data.materials.map((material: any) => (
                <div key={material.id} className="p-4 text-sm">
                  <p className="font-semibold">{material.name}</p>
                  <p className="text-xs text-[var(--nexus-muted)]">
                    {material.sku} ·{" "}
                    {material.is_preferred
                      ? "Pemasok pilihan"
                      : "Riwayat penerimaan"}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--nexus-muted)]">
                Belum ada material terkait.
              </p>
            )}
          </div>
        </article>
      </section>
      <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
        <div className="border-b border-[var(--nexus-border)] p-5">
          <h2 className="font-bold">Pesanan Pembelian</h2>
        </div>
        <table className="w-full min-w-[650px] text-left text-sm">
          <tbody>
            {data.purchase_orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[var(--nexus-border)]"
              >
                <td className="p-4">
                  <Link
                    className="font-semibold"
                    to={`/app/craft/procurement/orders/${order.id}`}
                  >
                    {order.po_number}
                  </Link>
                </td>
                <td className="p-4">{date(order.order_date)}</td>
                <td className="p-4">{money(order.total_amount)}</td>
                <td className="p-4">
                  <StatusBadge value={order.status_code} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.purchase_orders.length === 0 && (
          <p className="p-5 text-sm text-[var(--nexus-muted)]">Belum ada PO.</p>
        )}
      </section>
      <ConfirmDialog
        open={statusOpen}
        title={
          supplier.is_active ? "Nonaktifkan pemasok?" : "Aktifkan pemasok?"
        }
        description={
          supplier.is_active
            ? "PO aktif dan tagihan belum dibayar akan mencegah penonaktifan."
            : "Pemasok akan dapat dipilih untuk PO baru."
        }
        confirmLabel={supplier.is_active ? "Nonaktifkan" : "Aktifkan"}
        variant={supplier.is_active ? "warning" : "default"}
        onCancel={() => setStatusOpen(false)}
        onConfirm={() =>
          void (
            supplier.is_active
              ? craftProcurementApi.deactivateSupplier(supplier.id)
              : craftProcurementApi.activateSupplier(supplier.id)
          )
            .then(() => {
              setStatusOpen(false);
              return load();
            })
            .catch((cause) =>
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Status tidak dapat diubah.",
              ),
            )
        }
      />
      {contactOpen && (
        <ContactForm
          onClose={() => setContactOpen(false)}
          onSave={async (form) => {
            await craftProcurementApi.createSupplierContact(supplier.id, form);
            setContactOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--nexus-cream-soft)] p-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-[var(--nexus-muted)]">{label}</p>
    </div>
  );
}
function ContactForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    email: "",
    phone: "",
    whatsapp: "",
    is_primary: false,
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
            job_title: form.job_title || null,
            email: form.email || null,
            phone: form.phone || null,
            whatsapp: form.whatsapp || null,
            notes: form.notes || null,
          });
          setSaving(false);
        }}
        className="w-full max-w-lg rounded-xl bg-white"
      >
        <div className="p-6">
          <h2 className="font-bold">Tambah Kontak Pemasok</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nama" required>
              <input
                required
                className={inputClass}
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
              />
            </Field>
            <Field label="Jabatan">
              <input
                className={inputClass}
                value={form.job_title}
                onChange={(event) =>
                  setForm({ ...form, job_title: event.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </Field>
            <Field label="Telepon">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(event) =>
                  setForm({ ...form, is_primary: event.target.checked })
                }
              />{" "}
              Jadikan kontak utama
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--nexus-border)] p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
