import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { BillingOverviewPage } from './billing/BillingOverviewPage';
import { InvoiceCreatePage } from './billing/InvoiceCreatePage';
import { InvoiceDetailPage } from './billing/InvoiceDetailPage';
import { InvoiceEditPage } from './billing/InvoiceEditPage';
import { InvoicesPage } from './billing/InvoicesPage';
import { OutstandingBillingPage } from './billing/OutstandingBillingPage';
import { QuotationCreatePage } from './billing/QuotationCreatePage';
import { QuotationDetailPage } from './billing/QuotationDetailPage';
import { QuotationEditPage } from './billing/QuotationEditPage';
import { QuotationTemplateEditorPage } from './billing/QuotationTemplateEditorPage';
import { QuotationTemplatesPage } from './billing/QuotationTemplatesPage';
import { QuotationsPage } from './billing/QuotationsPage';

/** Studio Billing has one wildcard entry so no child route can fall back to a planned-module placeholder. */
export function StudioBilling() {
  return <Routes>
    <Route index element={<BillingOverviewPage />} />
    <Route path="quotations" element={<QuotationsPage />} />
    <Route path="quotations/new" element={<QuotationCreatePage />} />
    <Route path="quotations/:id/edit" element={<QuotationEditPage />} />
    <Route path="quotations/:id" element={<QuotationDetailPage />} />
    <Route path="quotation-templates" element={<QuotationTemplatesPage />} />
    <Route path="quotation-templates/new" element={<QuotationTemplateEditorPage create />} />
    <Route path="quotation-templates/:id/edit" element={<QuotationTemplateEditorPage />} />
    <Route path="invoices" element={<InvoicesPage />} />
    <Route path="invoices/new" element={<InvoiceCreatePage />} />
    <Route path="invoices/:id/edit" element={<InvoiceEditPage />} />
    <Route path="invoices/:id" element={<InvoiceDetailPage />} />
    <Route path="outstanding" element={<OutstandingBillingPage />} />
  </Routes>;
}
