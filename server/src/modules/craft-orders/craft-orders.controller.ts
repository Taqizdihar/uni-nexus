import { Request, Response, NextFunction } from 'express';
import { CraftOrdersRepository } from './craft-orders.repository';
import { CraftOrdersService } from './craft-orders.service';
import { OrderDocumentsService } from './order-documents.service';
import { OrderPriorityService } from './order-priority.service';
import { pool } from '../../config/database';
import { sendSuccess } from '../../shared/utils/response';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import {
  createOrderSchema, updateOrderStatusSchema, updateOrderPrioritySchema, updateOrderSchema,
  createInvoiceSchema, recordPaymentSchema, enqueueOrderItemsSchema, quickCreateCustomerSchema, saveOrderDraftSchema,
} from './craft-orders.schema';
import { getCraftBusinessUnit } from './craft-orders.helpers';
import { z } from 'zod';
import { storageService } from '../../shared/storage';
import { documentRegistryService } from '../../shared/documents/document-registry.service';

const parseOrderId = (value: string): number => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ORDER_ID', 'ID pesanan tidak valid.');
  return id;
};

const parseDraftId = (value: string): number => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_DRAFT_ID', 'ID draf pesanan tidak valid.');
  return id;
};

export class CraftOrdersController {
  private repository = new CraftOrdersRepository();
  private service = new CraftOrdersService();
  private docService = new OrderDocumentsService();
  private priorityService = new OrderPriorityService();

  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const result = await this.repository.getOrders({
        page: req.query.page ? Number.parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        status: req.query.status as string,
        statuses: typeof req.query.statuses === 'string' ? req.query.statuses.split(',').filter(Boolean) : undefined,
        priority: req.query.priority as string,
        paymentStatus: req.query.paymentStatus as string,
        channel: req.query.channel ? Number.parseInt(req.query.channel as string, 10) : undefined,
        orderType: req.query.orderType as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        deadlineFrom: req.query.deadlineFrom as string,
        deadlineTo: req.query.deadlineTo as string,
        overdue: req.query.overdue === 'true',
        activeOnly: req.query.activeOnly === 'true',
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      }, craft.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getDrafts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(res, await this.repository.getDrafts(craft.id));
    } catch (error) {
      next(error);
    }
  };

  getDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const draft = await this.repository.getDraftById(parseDraftId(req.params.draftId as string), craft.id);
      if (!draft) throw new NotFoundError('Draf pesanan tidak ditemukan.');
      if (draft.status_code !== 'active') throw new AppError(409, 'DRAFT_NOT_ACTIVE', 'Draf pesanan ini sudah tidak aktif.');
      sendSuccess(res, draft);
    } catch (error) {
      next(error);
    }
  };

  createDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = saveOrderDraftSchema.parse(req.body);
      const craft = await getCraftBusinessUnit();
      const result = await this.service.createDraft(data.payload, data.title, (req as any).user.id, craft.id);
      sendSuccess(res, result, undefined, 201);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data draf pesanan tidak valid.', error.issues)
        : error);
    }
  };

  updateDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = saveOrderDraftSchema.parse(req.body);
      const craft = await getCraftBusinessUnit();
      const result = await this.service.updateDraft(parseDraftId(req.params.draftId as string), data.payload, data.title, (req as any).user.id, craft.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data draf pesanan tidak valid.', error.issues)
        : error);
    }
  };

  discardDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      await this.service.discardDraft(parseDraftId(req.params.draftId as string), (req as any).user.id, craft.id);
      sendSuccess(res, { message: 'Draf pesanan dibuang.' });
    } catch (error) {
      next(error);
    }
  };

  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const orderId = parseOrderId(req.params.id as string);
      const order = await this.repository.getOrderById(orderId, craft.id);
      if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
      const items = await this.repository.getOrderItems(orderId);
      const [history]: any = await pool.execute(
        `SELECT h.*, u.full_name AS changed_by_name
         FROM craft_order_status_history h
         LEFT JOIN users u ON h.changed_by = u.id
         WHERE h.order_id = ? ORDER BY h.changed_at DESC`,
        [orderId],
      );
      const [invoices]: any = await pool.execute(
        `SELECT * FROM invoices WHERE source_type = 'craft_order' AND source_id = ? AND status_code != 'void'`,
        [orderId],
      );
      let payments: any[] = [];
      if (invoices.length) {
        const [rows]: any = await pool.execute(
          `SELECT p.*, pm.name AS method_name
           FROM payments p LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
           WHERE p.invoice_id = ? ORDER BY p.payment_date DESC`,
          [invoices[0].id],
        );
        payments = rows;
      }
      const [attachments]: any = await pool.execute(
        `SELECT a.*, u.full_name AS uploaded_by_name
         FROM order_attachments a LEFT JOIN users u ON a.uploaded_by = u.id
         WHERE a.order_id = ? ORDER BY a.uploaded_at DESC`,
        [orderId],
      );
      sendSuccess(res, { order, items, history, invoices, payments, attachments });
    } catch (error) {
      next(error);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createOrderSchema.parse(req.body);
      const craft = await getCraftBusinessUnit();
      if (data.external_order_id && await this.repository.checkDuplicateMarketplaceOrder(data.sales_channel_id, data.external_order_id)) {
        throw new AppError(409, 'DUPLICATE_EXTERNAL_ORDER', 'Pesanan marketplace ini sudah ada di sistem.');
      }
      const result = await this.service.createOrder(data, (req as any).user.id, craft.id);
      sendSuccess(res, result, undefined, 201);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data pesanan tidak valid.', error.issues)
        : error);
    }
  };

  updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const data = updateOrderSchema.parse(req.body);
      await this.service.updateOrder(parseOrderId(req.params.id as string), data, craft.id);
      sendSuccess(res, { message: 'Pesanan berhasil diperbarui.' });
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data perubahan pesanan tidak valid.', error.issues)
        : error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const { status_code, reason } = updateOrderStatusSchema.parse(req.body);
      await this.service.updateOrderStatus(parseOrderId(req.params.id as string), status_code, reason || null, (req as any).user.id, craft.id);
      sendSuccess(res, { message: 'Status berhasil diperbarui.' });
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Status pesanan tidak valid.', error.issues)
        : error);
    }
  };

  updatePriority = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const orderId = parseOrderId(req.params.id as string);
      const { priority_code, reason, is_priority_manual } = updateOrderPrioritySchema.parse(req.body);
      const scores: Record<string, number> = { low: 0, normal: 20, high: 50, critical: 80 };
      const [result]: any = await pool.execute(
        `UPDATE craft_orders SET priority_code = ?, priority_score = ?, priority_reason = ?, is_priority_manual = ?
         WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL`,
        [priority_code, scores[priority_code], reason || null, is_priority_manual ? 1 : 0, orderId, craft.id],
      );
      if (!result.affectedRows) throw new NotFoundError('Pesanan tidak ditemukan');
      sendSuccess(res, { message: 'Prioritas berhasil diperbarui.' });
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Prioritas pesanan tidak valid.', error.issues)
        : error);
    }
  };

  recalculatePriorities = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      await this.priorityService.recalculateAllAutomaticPriorities(craft.id);
      sendSuccess(res, { message: 'Prioritas berhasil dikalkulasi ulang.' });
    } catch (error) {
      next(error);
    }
  };

  createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const invoiceId = await this.service.createInvoice(parseOrderId(req.params.id as string), createInvoiceSchema.parse(req.body), (req as any).user.id, craft.id, craft.organizationId);
      sendSuccess(res, { invoice_id: invoiceId }, undefined, 201);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data invoice tidak valid.', error.issues)
        : error);
    }
  };

  recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const paymentId = await this.service.recordPayment(parseOrderId(req.params.id as string), recordPaymentSchema.parse(req.body), (req as any).user.id, craft.id, craft.organizationId);
      sendSuccess(res, { payment_id: paymentId }, undefined, 201);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data pembayaran tidak valid.', error.issues)
        : error);
    }
  };

  enqueueItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const { item_ids } = enqueueOrderItemsSchema.parse(req.body);
      await this.service.enqueueOrderItems(parseOrderId(req.params.id as string), item_ids, (req as any).user.id, craft.id);
      sendSuccess(res, { message: 'Item berhasil ditambahkan ke antrean produksi.' });
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Item antrean tidak valid.', error.issues)
        : error);
    }
  };

  quickCreateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const result = await this.service.quickCreateCustomer(quickCreateCustomerSchema.parse(req.body), craft.id, craft.organizationId, (req as any).user.id);
      sendSuccess(res, result, undefined, 201);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'VALIDATION_ERROR', 'Data pelanggan tidak valid.', error.issues)
        : error);
    }
  };

  exportOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const result = await this.repository.getOrders({
        page: 1, limit: 100,
        search: req.query.search as string, status: req.query.status as string, priority: req.query.priority as string,
        statuses: typeof req.query.statuses === 'string' ? req.query.statuses.split(',').filter(Boolean) : undefined,
        paymentStatus: req.query.paymentStatus as string, channel: req.query.channel ? Number(req.query.channel) : undefined,
        orderType: req.query.orderType as string, dateFrom: req.query.dateFrom as string, dateTo: req.query.dateTo as string,
        deadlineFrom: req.query.deadlineFrom as string, deadlineTo: req.query.deadlineTo as string,
        overdue: req.query.overdue === 'true', activeOnly: req.query.activeOnly === 'true', sortBy: req.query.sortBy as string, sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      }, craft.id);
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const header = ['ID Pesanan', 'Tanggal', 'Pelanggan', 'Kanal', 'Tipe', 'Item', 'Jumlah', 'Prioritas', 'Status', 'Pembayaran', 'Tenggat', 'Total'];
      const rows = result.items.map((order: any) => [order.order_code, order.order_date, order.customer_name, order.sales_channel_name, order.order_type, order.item_summary, order.total_quantity, order.priority_code, order.status_code, order.payment_status_code, order.deadline_at, order.total_amount]);
      res.status(200).type('text/csv; charset=utf-8').attachment('craft-orders.csv').send(`\uFEFF${[header, ...rows].map(row => row.map(escape).join(',')).join('\n')}`);
    } catch (error) {
      next(error);
    }
  };

  uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const orderId = parseOrderId(req.params.id as string);
      if (!await this.repository.getOrderById(orderId, craft.id)) throw new NotFoundError('Pesanan tidak ditemukan');
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) throw new AppError(400, 'ATTACHMENT_REQUIRED', 'Pilih file lampiran terlebih dahulu.');
      const saved = await storageService.saveUploadedFile('order_attachment', file, { orderId });
      try {
        const [result]: any = await pool.execute(
          `INSERT INTO order_attachments (order_id, file_name, file_type, storage_path, file_size_bytes, attachment_type, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, saved.original_name, saved.mime_type, saved.key, saved.size_bytes, req.body.attachment_type || 'reference', (req as any).user.id],
        );
        const attachmentId = Number(result.insertId);
        const [orderRows]: any = await pool.execute('SELECT bu.organization_id,o.order_code FROM craft_orders o JOIN business_units bu ON bu.id=o.business_unit_id WHERE o.id=? AND o.business_unit_id=?', [orderId, craft.id]);
        await documentRegistryService.registerSourceDocument({
          organizationId: Number(orderRows[0].organization_id), businessUnitId: craft.id, sourceModuleCode: 'craft_orders', documentType: 'attachment',
          title: `Lampiran pesanan ${orderRows[0].order_code}`, fileName: saved.original_name, storagePath: saved.key, mimeType: saved.mime_type,
          fileSizeBytes: saved.size_bytes, checksumSha256: saved.checksum_sha256, entityType: 'order_attachment', entityId: attachmentId,
          entityCode: orderRows[0].order_code, uploadedBy: Number((req as any).user.id),
        });
        sendSuccess(res, { id: attachmentId, file_name: saved.original_name, file_type: saved.mime_type, file_size_bytes: saved.size_bytes }, undefined, 201);
      } catch (error) {
        await storageService.delete(saved.key);
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  downloadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const attachmentId = Number.parseInt(req.params.attachmentId as string, 10);
      const [rows]: any = await pool.execute(
        `SELECT a.file_name, a.storage_path
         FROM order_attachments a JOIN craft_orders o ON a.order_id = o.id
         WHERE a.id = ? AND o.business_unit_id = ? AND o.deleted_at IS NULL`,
        [attachmentId, craft.id],
      );
      if (!rows.length) throw new NotFoundError('Lampiran tidak ditemukan');
      await storageService.streamToResponse(res, rows[0].storage_path, { filename: rows[0].file_name });
    } catch (error) {
      next(error);
    }
  };

  deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const attachmentId = Number.parseInt(req.params.attachmentId as string, 10);
      const [rows]: any = await pool.execute(
        `SELECT a.id, a.storage_path, o.organization_id
         FROM order_attachments a JOIN craft_orders o ON a.order_id = o.id
         WHERE a.id = ? AND o.business_unit_id = ? AND o.deleted_at IS NULL`,
        [attachmentId, craft.id],
      );
      if (!rows.length) throw new NotFoundError('Lampiran tidak ditemukan');
      await pool.execute('DELETE FROM order_attachments WHERE id = ?', [attachmentId]);
      await documentRegistryService.removeSourceDocument(Number(rows[0].organization_id), 'craft_orders', 'order_attachment', attachmentId);
      await storageService.delete(rows[0].storage_path);
      sendSuccess(res, { message: 'Lampiran berhasil dihapus.' });
    } catch (error) {
      next(error);
    }
  };

  downloadInvoicePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const orderId = parseOrderId(req.params.id as string);
      const [invoices]: any = await pool.execute(
        `SELECT i.*, p.display_name AS customer_name, p.email AS customer_email, p.phone AS customer_phone
         FROM invoices i JOIN craft_orders o ON i.source_type = 'craft_order' AND i.source_id = o.id
         JOIN parties p ON i.party_id = p.id
         WHERE o.id = ? AND o.business_unit_id = ? AND i.status_code != 'void'`,
        [orderId, craft.id],
      );
      if (!invoices.length) throw new NotFoundError('Invoice tidak ditemukan');
      const [items]: any = await pool.execute('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC', [invoices[0].id]);
      await this.docService.generateInvoicePdf(invoices[0], items, res);
    } catch (error) {
      next(error);
    }
  };

  downloadReceiptPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const craft = await getCraftBusinessUnit();
      const orderId = parseOrderId(req.params.id as string);
      const paymentId = Number.parseInt(req.params.paymentId as string, 10);
      const [payments]: any = await pool.execute(
        `SELECT p.*, pt.display_name AS customer_name, o.order_code, u.full_name AS receiver_name
         FROM payments p JOIN invoices i ON p.invoice_id = i.id
         JOIN craft_orders o ON i.source_type = 'craft_order' AND i.source_id = o.id
         JOIN parties pt ON p.party_id = pt.id LEFT JOIN users u ON p.received_by = u.id
         WHERE p.id = ? AND o.id = ? AND o.business_unit_id = ?`,
        [paymentId, orderId, craft.id],
      );
      if (!payments.length) throw new NotFoundError('Pembayaran tidak ditemukan');
      await this.docService.generateReceiptPdf(payments[0], res);
    } catch (error) {
      next(error);
    }
  };
}
