import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { StudioBillingController } from './studio-billing.controller';

const router = Router();
const controller = new StudioBillingController();
const READ = requirePermission('studio.billing.read');
const WRITE = requirePermission('studio.billing.write');

router.use(requireAuth);

// Static endpoints intentionally precede dynamic IDs.
router.get('/overview', READ, controller.overview);
router.get('/outstanding', READ, controller.outstanding);
router.get('/references', READ, controller.references);
router.get('/references/projects/:id/scope', READ, controller.projectScope);

router.get('/quotation-templates', READ, controller.templates);
router.post('/quotation-templates', WRITE, controller.createTemplate);
router.get('/quotation-templates/:id', READ, controller.template);
router.patch('/quotation-templates/:id', WRITE, controller.updateTemplate);
router.post('/quotation-templates/:id/activate', WRITE, controller.activateTemplate);
router.post('/quotation-templates/:id/deactivate', WRITE, controller.deactivateTemplate);

router.get('/quotations', READ, controller.quotations);
router.post('/quotations', WRITE, controller.createQuotation);
router.get('/quotations/:id', READ, controller.quotation);
router.patch('/quotations/:id', WRITE, controller.updateQuotation);
router.post('/quotations/:id/send', WRITE, controller.sendQuotation);
router.post('/quotations/:id/accept', WRITE, controller.acceptQuotation);
router.post('/quotations/:id/reject', WRITE, controller.rejectQuotation);
router.post('/quotations/:id/cancel', WRITE, controller.cancelQuotation);
router.post('/quotations/:id/duplicate', WRITE, controller.duplicateQuotation);
router.post('/quotations/:id/invoice', WRITE, controller.createInvoiceFromQuotation);
router.get('/quotations/:id/pdf', READ, controller.quotationPdf);

router.get('/invoices', READ, controller.invoices);
router.post('/invoices', WRITE, controller.createInvoice);
router.get('/invoices/:id', READ, controller.invoice);
router.patch('/invoices/:id', WRITE, controller.updateInvoice);
router.post('/invoices/:id/issue', WRITE, controller.issueInvoice);
router.post('/invoices/:id/void', WRITE, controller.voidInvoice);
router.get('/invoices/:id/pdf', READ, controller.invoicePdf);
router.get('/invoices/:id/schedules', READ, controller.schedules);
router.get('/invoices/:id/payments', READ, controller.payments);

export const studioBillingRoutes = router;
