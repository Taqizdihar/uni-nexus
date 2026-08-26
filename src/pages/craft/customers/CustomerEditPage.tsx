import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerForm } from './components/CustomerForm';
import { craftCustomersApi } from '../../../services/api/craft-customers.api';
import type { CraftCustomer, CustomerFormData } from '../../../types/craft-customers';

export function CustomerEditPage() {
  const { id } = useParams(); const customerId = Number(id); const navigate = useNavigate(); const [customer, setCustomer] = useState<CraftCustomer | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!customerId) return; void craftCustomersApi.getCustomer(customerId).then(result => setCustomer(result.customer)).catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Pelanggan tidak ditemukan.')); }, [customerId]);
  const save = async (data: CustomerFormData) => { setSaving(true); setError(null); try { await craftCustomersApi.updateCustomer(customerId, data); navigate(`/app/craft/customers/${customerId}`); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Gagal memperbarui pelanggan.'); } finally { setSaving(false); } };
  if (!customer && !error) return <div className="p-8 text-sm text-[var(--nexus-muted)]">Memuat pelanggan...</div>;
  return <div className="mx-auto max-w-4xl space-y-6 pb-12"><header><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-yellow-deep)]">Bisnis Craft / Pelanggan</p><h1 className="mt-1 text-2xl font-bold text-[var(--nexus-charcoal)]">Edit Pelanggan</h1></header>{error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{customer && <CustomerForm customer={customer} submitting={saving} submitLabel="Simpan Perubahan" onSubmit={data => void save(data)} onCancel={() => navigate(`/app/craft/customers/${customerId}`)} />}</div>;
}
