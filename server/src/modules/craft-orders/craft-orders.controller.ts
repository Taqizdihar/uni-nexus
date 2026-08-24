import { Request, Response } from 'express';
import { CraftOrdersRepository } from './craft-orders.repository';
import { CraftOrdersService } from './craft-orders.service';
import { OrderDocumentsService } from './order-documents.service';
import { OrderPriorityService } from './order-priority.service';
import { pool } from '../../config/database';
import {
  createOrderSchema, updateOrderStatusSchema, updateOrderPrioritySchema,
  createInvoiceSchema, recordPaymentSchema, enqueueOrderItemsSchema, quickCreateCustomerSchema
} from './craft-orders.schema';
import { z } from 'zod';

export class CraftOrdersController {
  private repository = new CraftOrdersRepository();
  private service = new CraftOrdersService();
  private docService = new OrderDocumentsService();
  private priorityService = new OrderPriorityService();

  // Get orders list
  getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        search: req.query.search as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        paymentStatus: req.query.paymentStatus as string,
        channel: req.query.channel ? parseInt(req.query.channel as string) : undefined,
        orderType: req.query.orderType as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        deadlineFrom: req.query.deadlineFrom as string,
        deadlineTo: req.query.deadlineTo as string,
        overdue: req.query.overdue === 'true',
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await this.repository.getOrders(filters);
      res.json(result);
    } catch (error) {
      console.error('Failed to get orders:', error);
      res.status(500).json({ message: 'Gagal memuat pesanan' });
    }
  };

  // Get order details
  getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const order = await this.repository.getOrderById(orderId);
      
      if (!order) {
        res.status(404).json({ message: 'Pesanan tidak ditemukan' });
        return;
      }
      
      const items = await this.repository.getOrderItems(orderId);
      
      // Get history
      const [history]: any = await pool.execute(`
        SELECT h.*, u.name as changed_by_name 
        FROM craft_order_status_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.order_id = ? ORDER BY h.changed_at DESC
      `, [orderId]);
      
      // Get invoices
      const [invoices]: any = await pool.execute(`
        SELECT * FROM invoices WHERE source_type = 'craft_order' AND source_id = ? AND status_code != 'void'
      `, [orderId]);
      
      // Get payments
      let payments: any[] = [];
      if (invoices.length > 0) {
        const [p]: any = await pool.execute(`
          SELECT p.*, m.name as method_name 
          FROM payments p
          LEFT JOIN payment_methods m ON p.payment_method_id = m.id
          WHERE p.invoice_id = ?
        `, [invoices[0].id]);
        payments = p;
      }
      
      // Get attachments
      const [attachments]: any = await pool.execute(`
        SELECT a.*, u.name as uploaded_by_name
        FROM order_attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.order_id = ?
      `, [orderId]);

      res.json({ order, items, history, invoices, payments, attachments });
    } catch (error) {
      console.error('Failed to get order:', error);
      res.status(500).json({ message: 'Gagal memuat detail pesanan' });
    }
  };

  // Create order
  createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = createOrderSchema.parse(req.body);
      const userId = (req as any).user?.id || 1; 
      
      // Check duplicate marketplace order
      if (data.external_order_id && data.sales_channel_id) {
        const isDuplicate = await this.repository.checkDuplicateMarketplaceOrder(data.sales_channel_id, data.external_order_id);
        if (isDuplicate) {
           res.status(400).json({ message: 'Pesanan marketplace ini sudah ada di sistem.' });
           return;
        }
      }

      // Hardcoded businessUnitId for Craft for now = 2 (Assuming 1 is Global, 2 is Craft)
      // Usually fetch from session or config
      const businessUnitId = 2; 

      const result = await this.service.createOrder(data, userId, businessUnitId);
      res.status(201).json({ message: 'Pesanan berhasil dibuat', data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validasi gagal', errors: (error as any).errors });
        return;
      }
      console.error('Failed to create order:', error);
      res.status(500).json({ message: 'Gagal membuat pesanan' });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const { status_code, reason } = updateOrderStatusSchema.parse(req.body);
      const userId = (req as any).user?.id || 1;

      await this.service.updateOrderStatus(orderId, status_code, reason || null, userId);
      res.json({ message: 'Status berhasil diperbarui' });
    } catch (error) {
      console.error('Failed to update status:', error);
      res.status(500).json({ message: 'Gagal memperbarui status' });
    }
  };

  updatePriority = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const { priority_code, reason, is_priority_manual } = updateOrderPrioritySchema.parse(req.body);
      
      let score = 0;
      if (priority_code === 'critical') score = 80;
      else if (priority_code === 'high') score = 50;
      else if (priority_code === 'normal') score = 20;

      await (pool as any).execute(
        `UPDATE craft_orders SET priority_code = ?, priority_score = ?, priority_reason = ?, is_priority_manual = ? WHERE id = ?`,
        [priority_code, score, reason, is_priority_manual ? 1 : 0, orderId]
      );
      
      res.json({ message: 'Prioritas berhasil diperbarui' });
    } catch (error) {
      console.error('Failed to update priority:', error);
      res.status(500).json({ message: 'Gagal memperbarui prioritas' });
    }
  };

  recalculatePriorities = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.priorityService.recalculateAllAutomaticPriorities();
      res.json({ message: 'Prioritas berhasil dikalkulasi ulang' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghitung prioritas' });
    }
  };

  createInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const data = createInvoiceSchema.parse(req.body);
      const userId = (req as any).user?.id || 1;
      const businessUnitId = 2; // Craft BU

      const invoiceId = await this.service.createInvoice(orderId, data, userId, businessUnitId);
      res.status(201).json({ message: 'Invoice berhasil dibuat', invoice_id: invoiceId });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Gagal membuat invoice' });
    }
  };

  recordPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const data = recordPaymentSchema.parse(req.body);
      const userId = (req as any).user?.id || 1;
      const businessUnitId = 2;

      const paymentId = await this.service.recordPayment(orderId, data, userId, businessUnitId);
      res.status(201).json({ message: 'Pembayaran berhasil dicatat', payment_id: paymentId });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Gagal mencatat pembayaran' });
    }
  };

  enqueueItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const { item_ids } = enqueueOrderItemsSchema.parse(req.body);
      const userId = (req as any).user?.id || 1;

      await this.service.enqueueOrderItems(orderId, item_ids, userId);
      res.json({ message: 'Item berhasil ditambahkan ke antrean produksi' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menambahkan ke antrean' });
    }
  };

  quickCreateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = quickCreateCustomerSchema.parse(req.body);
      const userId = (req as any).user?.id || 1;
      const result = await this.service.quickCreateCustomer(data, userId);
      res.status(201).json({ message: 'Pelanggan berhasil dibuat', data: result });
    } catch (error) {
      res.status(500).json({ message: 'Gagal membuat pelanggan' });
    }
  };

  downloadInvoicePdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const [invoices]: any = await pool.execute(`
        SELECT i.*, p.display_name as customer_name, p.email as customer_email, p.phone as customer_phone
        FROM invoices i 
        JOIN parties p ON i.party_id = p.id
        WHERE i.source_type = 'craft_order' AND i.source_id = ? AND i.status_code != 'void'
      `, [orderId]);
      
      if (!invoices.length) {
        res.status(404).json({ message: 'Invoice tidak ditemukan' });
        return;
      }
      
      const invoice = invoices[0];
      const [items]: any = await pool.execute(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC`, [invoice.id]);
      
      await this.docService.generateInvoicePdf(invoice, items, res);
    } catch (error) {
      res.status(500).json({ message: 'Gagal membuat PDF invoice' });
    }
  };

  downloadReceiptPdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string);
      const paymentId = parseInt(req.params.paymentId as string);
      
      const [payments]: any = await pool.execute(`
        SELECT p.*, pt.display_name as customer_name, o.order_code, u.name as receiver_name
        FROM payments p
        JOIN parties pt ON p.party_id = pt.id
        JOIN invoices i ON p.invoice_id = i.id
        JOIN craft_orders o ON i.source_id = o.id
        LEFT JOIN users u ON p.received_by = u.id
        WHERE p.id = ? AND o.id = ?
      `, [paymentId, orderId]);
      
      if (!payments.length) {
        res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
        return;
      }
      
      await this.docService.generateReceiptPdf(payments[0], res);
    } catch (error) {
      res.status(500).json({ message: 'Gagal membuat PDF kwitansi' });
    }
  };
}
