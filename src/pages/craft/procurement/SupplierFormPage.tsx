import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { Supplier, SupplierForm } from "../../../types/craft-procurement";
import {
  ErrorBox,
  Field,
  PageHeader,
  inputClass,
  textAreaClass,
} from "./components/ProcurementShared";

const blank = (): SupplierForm => ({
  party_kind: "company",
  display_name: "",
  legal_name: null,
  email: null,
  phone: null,
  website: null,
  tax_id: null,
  address_line1: null,
  address_line2: null,
  city: null,
  province: null,
  postal_code: null,
  country_code: "ID",
  notes: null,
});
export function SupplierFormPage({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<SupplierForm>(blank());
  const [loading, setLoading] = useState(edit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Supplier[]>([]);
  useEffect(() => {
    if (!edit || !id) return;
    void craftProcurementApi
      .getSupplier(Number(id))
      .then((data) => setForm(data.supplier))
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Pemasok tidak dapat dimuat.",
        ),
      )
      .finally(() => setLoading(false));
  }, [edit, id]);
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const findDuplicates = async () => {
    setError(null);
    try {
      setCandidates(await craftProcurementApi.getSupplierDuplicates(form));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Duplikasi tidak dapat diperiksa.",
      );
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (edit && id) {
        await craftProcurementApi.updateSupplier(Number(id), form);
        navigate(`/app/craft/procurement/suppliers/${id}`);
      } else {
        const result = await craftProcurementApi.createSupplier(form);
        navigate(`/app/craft/procurement/suppliers/${result.id}`);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pemasok tidak dapat disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return <p className="text-sm text-[var(--nexus-muted)]">Memuat pemasok…</p>;
  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title={edit ? "Edit Pemasok" : "Tambah Pemasok"}
        description="Gunakan Party yang sudah ada melalui API jika terdeteksi duplikasi; pembuatan baru menggunakan identitas Party kanonis."
        backTo={
          edit && id
            ? `/app/craft/procurement/suppliers/${id}`
            : "/app/craft/procurement/suppliers"
        }
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
              {saving ? "Menyimpan…" : "Simpan Pemasok"}
            </Button>
          </>
        }
      />
      {error && <ErrorBox message={error} />}
      {!edit && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Gunakan Party yang Ada</h2>
              <p className="mt-1 text-sm text-[var(--nexus-muted)]">
                Periksa nama, NPWP, email, atau telepon sebelum membuat Party
                baru.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void findDuplicates()}
            >
              Periksa Duplikasi
            </Button>
          </div>
          {candidates.length > 0 && (
            <div className="mt-4 divide-y divide-amber-200 rounded-lg border border-amber-200 bg-white">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{candidate.display_name}</p>
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {candidate.code} ·{" "}
                      {candidate.email ||
                        candidate.phone ||
                        candidate.tax_id ||
                        "Tidak ada identitas tambahan"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, existing_party_id: candidate.id })
                    }
                  >
                    Gunakan Party Ini
                  </Button>
                </div>
              ))}
            </div>
          )}
          {form.existing_party_id && (
            <p className="mt-3 text-sm font-semibold text-emerald-800">
              Party yang dipilih akan memperoleh peran supplier Craft tanpa
              duplikasi: ID {form.existing_party_id}.
            </p>
          )}
        </section>
      )}
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-6">
        <h2 className="font-bold">Identitas Pemasok</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Jenis Party" required>
            <select
              className={inputClass}
              value={form.party_kind || "company"}
              onChange={(event) =>
                set(
                  "party_kind",
                  event.target.value as SupplierForm["party_kind"],
                )
              }
            >
              <option value="company">Perusahaan</option>
              <option value="individual">Individu</option>
              <option value="institution">Institusi</option>
            </select>
          </Field>
          <Field label="Nama tampilan" required>
            <input
              required
              className={inputClass}
              value={form.display_name || ""}
              onChange={(event) => set("display_name", event.target.value)}
            />
          </Field>
          <Field label="Nama legal">
            <input
              className={inputClass}
              value={form.legal_name || ""}
              onChange={(event) =>
                set("legal_name", event.target.value || null)
              }
            />
          </Field>
          <Field label="Tax ID / NPWP">
            <input
              className={inputClass}
              value={form.tax_id || ""}
              onChange={(event) => set("tax_id", event.target.value || null)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email || ""}
              onChange={(event) => set("email", event.target.value || null)}
            />
          </Field>
          <Field label="Telepon">
            <input
              className={inputClass}
              value={form.phone || ""}
              onChange={(event) => set("phone", event.target.value || null)}
            />
          </Field>
          <Field label="Website">
            <input
              className={inputClass}
              value={form.website || ""}
              onChange={(event) => set("website", event.target.value || null)}
            />
          </Field>
          <Field label="Negara">
            <input
              maxLength={2}
              className={inputClass}
              value={form.country_code || "ID"}
              onChange={(event) =>
                set("country_code", event.target.value.toUpperCase() || "ID")
              }
            />
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-[var(--nexus-border)] bg-white p-6">
        <h2 className="font-bold">Alamat & Catatan</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Alamat">
            <input
              className={inputClass}
              value={form.address_line1 || ""}
              onChange={(event) =>
                set("address_line1", event.target.value || null)
              }
            />
          </Field>
          <Field label="Alamat lanjutan">
            <input
              className={inputClass}
              value={form.address_line2 || ""}
              onChange={(event) =>
                set("address_line2", event.target.value || null)
              }
            />
          </Field>
          <Field label="Kota">
            <input
              className={inputClass}
              value={form.city || ""}
              onChange={(event) => set("city", event.target.value || null)}
            />
          </Field>
          <Field label="Provinsi">
            <input
              className={inputClass}
              value={form.province || ""}
              onChange={(event) => set("province", event.target.value || null)}
            />
          </Field>
          <Field label="Kode pos">
            <input
              className={inputClass}
              value={form.postal_code || ""}
              onChange={(event) =>
                set("postal_code", event.target.value || null)
              }
            />
          </Field>
          <Field label="Catatan">
            <textarea
              rows={3}
              className={textAreaClass}
              value={form.notes || ""}
              onChange={(event) => set("notes", event.target.value || null)}
            />
          </Field>
        </div>
      </section>
    </form>
  );
}
