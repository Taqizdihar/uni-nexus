import React, { useCallback, useEffect, useState } from "react";
import { craftProcurementApi } from "../../../services/api/craft-procurement.api";
import type { ProcurementHistoryItem } from "../../../types/craft-procurement";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  date,
} from "./components/ProcurementShared";

export function ProcurementHistoryPage() {
  const [items, setItems] = useState<ProcurementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await craftProcurementApi.getProcurementHistory()).items);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Riwayat pengadaan tidak dapat dimuat.",
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
        title="Riwayat Pengadaan"
        description="Jejak audit untuk peran pemasok, permintaan, PO, penerimaan barang, dan tagihan pemasok."
      />
      {error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="Belum Ada Riwayat Pengadaan"
          description="Aktivitas Pengadaan yang dilakukan akan tampil di sini."
        />
      ) : (
        <section className="rounded-xl border border-[var(--nexus-border)] bg-white divide-y divide-[var(--nexus-border)]">
          {items.map((item) => (
            <article key={item.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {item.entity_code || item.entity_type}
                </p>
                <p className="text-xs text-[var(--nexus-muted)]">
                  {date(item.created_at)}
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--nexus-charcoal)]">
                {item.description}
              </p>
              <p className="mt-1 text-xs text-[var(--nexus-muted)]">
                {item.action_code}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
