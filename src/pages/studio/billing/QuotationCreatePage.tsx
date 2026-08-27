import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudioBillingHeader } from './components/BillingUI';
import { QuotationForm } from './components/BillingForms';
import { studioBillingApi } from '../../../services/api/studio-billing.api';
import type { QuotationPayload } from '../../../types/studio-billing';

export function QuotationCreatePage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const [saving, setSaving] = React.useState(false);
  const clientId = Number(params.get('client')) || undefined; const projectId = Number(params.get('project')) || undefined;
  const save = async (payload: QuotationPayload) => { setSaving(true); try { const created = await studioBillingApi.createQuotation(payload); navigate(`/app/studio/billing/quotations/${created.id}`); } finally { setSaving(false); } };
  return <div className="space-y-6 pb-8"><StudioBillingHeader title="Buat Penawaran" description="Simpan nilai layanan sebagai snapshot komersial Draft sebelum dikirim ke klien." back={() => navigate('/app/studio/billing/quotations')} /><QuotationForm onSave={save} saving={saving} defaultPartyId={clientId} defaultProjectId={projectId} /></div>;
}
