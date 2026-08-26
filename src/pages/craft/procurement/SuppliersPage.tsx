import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { Supplier } from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  money,
} from "./components/ProcurementShared";

export function SuppliersPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await craftProcurementApi.getSuppliers({
        search: params.get("search") || undefined,
        status: params.get("status") || undefined,
      });
      setItems(result.items);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Pemasok tidak dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);
  useEffect(() => {
    void load();
  }, [load]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setParams(search ? { search } : {});
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemasok"
        description="Pemasok adalah Party kanonis yang memiliki peran supplier untuk bisnis Craft."
        actions={
          <Link to="new">
            <Button>
              <Plus className="h-4 w-4" />
              Tambah Pemasok
            </Button>
          </Link>
        }
      />
      <form onSubmit={submit} className="flex max-w-lg gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-[var(--nexus-border)] px-3 text-sm"
          placeholder="Cari kode, nama, email, atau telepon"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
          Cari
        </Button>
      </form>
      {error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="Belum Ada Pemasok"
          description="Tambahkan Party baru atau gunakan Party yang sudah ada sebagai pemasok Craft."
          action={
            <Link to="new">
              <Button>Tambah Pemasok</Button>
            </Link>
          }
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-[var(--nexus-border)] bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--nexus-border)] text-xs text-[var(--nexus-muted)]">
              <tr>
                <th className="p-4">Kode / Pemasok</th>
                <th className="p-4">Kontak utama</th>
                <th className="p-4">PO</th>
                <th className="p-4">Nilai pembelian</th>
                <th className="p-4">Pembelian terakhir</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--nexus-border)] hover:bg-[var(--nexus-cream-soft)]"
                >
                  <td className="p-4">
                    <Link
                      className="font-semibold hover:text-[var(--nexus-yellow-deep)]"
                      to={`${item.id}`}
                    >
                      {item.display_name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                      {item.code} · {item.party_kind}
                    </p>
                  </td>
                  <td className="p-4">
                    <p>{item.primary_contact_name || item.email || "—"}</p>
                    <p className="text-xs text-[var(--nexus-muted)]">
                      {item.primary_contact_phone ||
                        item.phone ||
                        item.primary_contact_email ||
                        "—"}
                    </p>
                  </td>
                  <td className="p-4">
                    {item.open_pos || 0} terbuka / {item.total_pos || 0}
                  </td>
                  <td className="p-4">{money(item.total_purchase_value)}</td>
                  <td className="p-4">{item.last_purchase_date || "—"}</td>
                  <td className="p-4">
                    <StatusBadge
                      value={item.is_active ? "approved" : "closed"}
                    />
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
