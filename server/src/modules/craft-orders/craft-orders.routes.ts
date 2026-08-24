import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { requireAuth, requirePermission } from '../../middleware/auth.middleware';
import { CraftOrdersController, ORDER_UPLOAD_ROOT } from './craft-orders.controller';
import { AppError } from '../../shared/errors/AppError';

const router = Router();
const controller = new CraftOrdersController();
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.stl', '.3mf', '.step', '.stp', '.scad', '.pdf']);
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const orderId = path.basename(String(req.params.id || ''));
      const target = path.join(ORDER_UPLOAD_ROOT, 'orders', orderId);
      mkdirSync(target, { recursive: true });
      callback(null, target);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new AppError(400, 'UNSUPPORTED_ATTACHMENT', 'Jenis file tidak didukung. Gunakan gambar, STL, 3MF, STEP, SCAD, atau PDF.'));
      return;
    }
    callback(null, true);
  },
});

router.use(requireAuth);

router.get('/', requirePermission('craft.orders.read'), controller.getOrders);
router.get('/export', requirePermission('craft.orders.read'), controller.exportOrders);
router.get('/:id', requirePermission('craft.orders.read'), controller.getOrder);
router.get('/:id/invoice/pdf', requirePermission('craft.orders.read'), controller.downloadInvoicePdf);
router.get('/:id/receipt/:paymentId/pdf', requirePermission('craft.orders.read'), controller.downloadReceiptPdf);
router.get('/:id/attachments/:attachmentId/download', requirePermission('craft.orders.read'), controller.downloadAttachment);

router.post('/', requirePermission('craft.orders.write'), controller.createOrder);
router.post('/customers/quick', requirePermission('craft.orders.write'), controller.quickCreateCustomer);
router.post('/recalculate-priorities', requirePermission('craft.orders.write'), controller.recalculatePriorities);
router.post('/:id/invoice', requirePermission('craft.orders.write'), controller.createInvoice);
router.post('/:id/payment', requirePermission('craft.orders.write'), controller.recordPayment);
router.post('/:id/queue', requirePermission('craft.orders.write'), controller.enqueueItems);
router.post('/:id/attachments', requirePermission('craft.orders.write'), attachmentUpload.single('file'), controller.uploadAttachment);

router.patch('/:id', requirePermission('craft.orders.write'), controller.updateOrder);
router.patch('/:id/status', requirePermission('craft.orders.write'), controller.updateStatus);
router.patch('/:id/priority', requirePermission('craft.orders.write'), controller.updatePriority);
router.delete('/:id/attachments/:attachmentId', requirePermission('craft.orders.write'), controller.deleteAttachment);

export const craftOrdersRoutes = router;
