import React from 'react';
import { useNavigate } from 'react-router-dom';
import { studioBillingApi } from '../../../services/api/studio-billing.api';
import type { InvoicePayload } from '../../../types/studio-billing';
import { StudioBillingHeader } from './components/BillingUI';
import { InvoiceForm } from './components/BillingForms';

export function InvoiceCreatePage() { const navigate = useNavigate(); const [saving, setSaving] = React.useState(false); const save = async (payload: InvoicePayload) => { setSaving(true); try { const created = await studioBillingApi.createInvoice(payload); navigate(`/app/studio/billing/invoices/${created.id}`); } finally { setSaving(false); } }; return <div className="space-y-6 pb-8"><StudioBillingHeader title="Buat Invoice" description="Buat Draft tagihan Studio. Menerbitkan invoice tidak mencatat pembayaran atau mengubah Treasury." back={() => navigate('/app/studio/billing/invoices')} /><InvoiceForm onSave={save} saving={saving} /></div>; }
