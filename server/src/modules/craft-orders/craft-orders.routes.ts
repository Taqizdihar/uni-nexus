import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftOrdersController } from './craft-orders.controller';
import { createUpload } from '../../shared/storage';

const router = Router();
const controller = new CraftOrdersController();
const attachmentUpload = createUpload('order_attachment');

router.use(requireAuth);

router.get('/', requirePermission('craft.orders.read'), controller.getOrders);
router.get('/drafts', requirePermission('craft.orders.read'), controller.getDrafts);
router.get('/drafts/:draftId', requirePermission('craft.orders.read'), controller.getDraft);
router.get('/export', requirePermission('craft.orders.read'), controller.exportOrders);
router.get('/:id', requirePermission('craft.orders.read'), controller.getOrder);
router.get('/:id/invoice/pdf', requirePermission('craft.orders.read'), controller.downloadInvoicePdf);
router.get('/:id/receipt/:paymentId/pdf', requirePermission('craft.orders.read'), controller.downloadReceiptPdf);
router.get('/:id/attachments/:attachmentId/download', requirePermission('craft.orders.read'), controller.downloadAttachment);

router.post('/', requirePermission('craft.orders.write'), controller.createOrder);
router.post('/drafts', requirePermission('craft.orders.write'), controller.createDraft);
router.post('/customers/quick', requirePermission('craft.orders.write'), controller.quickCreateCustomer);
router.post('/recalculate-priorities', requirePermission('craft.orders.write'), controller.recalculatePriorities);
router.post('/:id/invoice', requirePermission('craft.orders.write'), controller.createInvoice);
router.post('/:id/payment', requirePermission('craft.orders.write'), controller.recordPayment);
router.post('/:id/queue', requirePermission('craft.orders.write'), controller.enqueueItems);
router.post('/:id/attachments', requirePermission('craft.orders.write'), attachmentUpload.single('file'), controller.uploadAttachment);

router.patch('/:id', requirePermission('craft.orders.write'), controller.updateOrder);
router.patch('/drafts/:draftId', requirePermission('craft.orders.write'), controller.updateDraft);
router.patch('/:id/status', requirePermission('craft.orders.write'), controller.updateStatus);
router.patch('/:id/priority', requirePermission('craft.orders.write'), controller.updatePriority);
router.delete('/:id/attachments/:attachmentId', requirePermission('craft.orders.write'), controller.deleteAttachment);
router.delete('/drafts/:draftId', requirePermission('craft.orders.write'), controller.discardDraft);

export const craftOrdersRoutes = router;
