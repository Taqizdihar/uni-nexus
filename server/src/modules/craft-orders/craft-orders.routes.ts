import { Router } from 'express';
import { CraftOrdersController } from './craft-orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';
// If requirePermission middleware exists: import { requirePermission } from '../../middleware/permission';
// Assuming basic authentication for now. In a full implementation we'd wrap with requirePermission('craft.orders.read/write')

const router = Router();
const controller = new CraftOrdersController();

// Orders List & Detail
router.get('/', requireAuth, controller.getOrders);
router.get('/:id', requireAuth, controller.getOrder);

// Create / Update
router.post('/', requireAuth, controller.createOrder);
router.patch('/:id/status', requireAuth, controller.updateStatus);
router.patch('/:id/priority', requireAuth, controller.updatePriority);

// Special Actions
router.post('/recalculate-priorities', requireAuth, controller.recalculatePriorities);
router.post('/:id/invoice', requireAuth, controller.createInvoice);
router.post('/:id/payment', requireAuth, controller.recordPayment);
router.post('/:id/queue', requireAuth, controller.enqueueItems);

// Quick Creates
router.post('/customers/quick', requireAuth, controller.quickCreateCustomer);

// Documents (PDFs)
router.get('/:id/invoice/pdf', requireAuth, controller.downloadInvoicePdf);
router.get('/:id/receipt/:paymentId/pdf', requireAuth, controller.downloadReceiptPdf);

export const craftOrdersRoutes = router;
