import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studioBillingApi } from '../../../services/api/studio-billing.api';
import type { QuotationPayload, StudioQuotationDetail } from '../../../types/studio-billing';
import { ErrorBanner, LoadingState, StudioBillingHeader } from './components/BillingUI';
import { QuotationForm } from './components/BillingForms';

export function QuotationEditPage() {
  const navigate = useNavigate(); const id = Number(useParams().id); const [detail, setDetail] = React.useState<StudioQuotationDetail | null>(null); const [error, setError] = React.useState<string | null>(null); const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { void studioBillingApi.getQuotation(id).then(setDetail).catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Gagal memuat penawaran.')); }, [id]);
  if (!detail && !error) return <LoadingState />; if (!detail) return <ErrorBanner message={error || 'Penawaran tidak ditemukan.'} />;
  if (detail.quotation.status_code !== 'draft') return <div className="space-y-5"><StudioBillingHeader title="Penawaran Terkunci" description="Penawaran yang sudah dikirim tidak dapat diubah secara komersial." back={() => navigate(`/app/studio/billing/quotations/${id}`)} /><ErrorBanner message="Gunakan Duplikat dari detail penawaran untuk membuat revisi Draft." /></div>;
  const save = async (payload: QuotationPayload) => { setSaving(true); try { await studioBillingApi.updateQuotation(id, payload); navigate(`/app/studio/billing/quotations/${id}`); } finally { setSaving(false); } };
  return <div className="space-y-6 pb-8"><StudioBillingHeader title={`Edit ${detail.quotation.quotation_number}`} description="Hanya penawaran Draft yang dapat diubah secara komersial." back={() => navigate(`/app/studio/billing/quotations/${id}`)} /><QuotationForm initial={detail} onSave={save} saving={saving} /></div>;
}
