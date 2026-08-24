import { pool } from '../../config/database';
import { OrderPriorityService } from './order-priority.service';
import { Connection } from 'mysql2/promise';

export class CraftOrdersService {
  private priorityService = new OrderPriorityService();

  async createOrder(data: any, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create temporary code
      const tempCode = `TMP-${Date.now()}`;
      
      const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price) - (item.discount_amount || 0), 0);
      const total_amount = subtotal - (data.discount_amount || 0) + (data.shipping_amount || 0) + (data.tax_amount || 0);

      const [orderResult]: any = await connection.execute(
        `INSERT INTO craft_orders (
          business_unit_id, order_code, customer_party_id, sales_channel_id, external_order_id,
          order_type, order_date, deadline_at, priority_code, priority_reason, is_priority_manual,
          currency_code, subtotal, discount_amount, shipping_amount, marketplace_fee_amount, tax_amount, total_amount,
          customer_notes, internal_notes, shipping_recipient_name, shipping_phone, shipping_address, courier_name,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessUnitId, tempCode, data.customer_party_id, data.sales_channel_id, data.external_order_id || null,
          data.order_type, data.deadline_at || null, data.priority_code, data.priority_reason || null, data.is_priority_manual ? 1 : 0,
          data.currency_code || 'IDR', subtotal, data.discount_amount || 0, data.shipping_amount || 0, data.marketplace_fee_amount || 0, data.tax_amount || 0, total_amount,
          data.customer_notes || null, data.internal_notes || null, data.shipping_recipient_name || null, data.shipping_phone || null, data.shipping_address || null, data.courier_name || null,
          userId
        ]
      );

      const orderId = orderResult.insertId;
      const orderCode = `NX-${orderId.toString().padStart(6, '0')}`;

      await connection.execute(`UPDATE craft_orders SET order_code = ? WHERE id = ?`, [orderCode, orderId]);

      for (const item of data.items) {
        const line_total = (item.quantity * item.unit_price) - (item.discount_amount || 0);
        await connection.execute(
          `INSERT INTO craft_order_items (
            order_id, product_id, variant_id, item_name, item_description, quantity, unit_price, discount_amount, line_total,
            estimated_material_g, estimated_print_minutes, print_profile_id, custom_spec_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.product_id || null, item.variant_id || null, item.item_name, item.item_description || null,
            item.quantity, item.unit_price, item.discount_amount || 0, line_total,
            item.estimated_material_g || null, item.estimated_print_minutes || null, item.print_profile_id || null,
            item.custom_spec_json ? JSON.stringify(item.custom_spec_json) : null
          ]
        );
      }

      await connection.execute(
        `INSERT INTO craft_order_status_history (order_id, to_status_code, changed_by) VALUES (?, 'new', ?)`,
        [orderId, userId]
      );

      await this.priorityService.calculatePriority(orderId, connection as any);

      await connection.commit();
      connection.release();
      return { id: orderId, order_code: orderCode };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async updateOrderStatus(orderId: number, statusCode: string, reason: string | null, userId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [orders]: any = await connection.execute(`SELECT status_code FROM craft_orders WHERE id = ?`, [orderId]);
      if (!orders.length) throw new Error('Order not found');
      
      const oldStatus = orders[0].status_code;

      let updateQuery = `UPDATE craft_orders SET status_code = ?`;
      const params: any[] = [statusCode];

      if (['completed', 'shipped'].includes(statusCode)) {
        updateQuery += `, completed_at = UTC_TIMESTAMP()`;
      } else if (['cancelled', 'returned'].includes(statusCode)) {
        updateQuery += `, cancelled_at = UTC_TIMESTAMP()`;
      }

      updateQuery += ` WHERE id = ?`;
      params.push(orderId);

      await connection.execute(updateQuery, params);

      await connection.execute(
        `INSERT INTO craft_order_status_history (order_id, from_status_code, to_status_code, reason, changed_by) VALUES (?, ?, ?, ?, ?)`,
        [orderId, oldStatus, statusCode, reason || null, userId]
      );

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async createInvoice(orderId: number, data: any, userId: number, businessUnitId: number, organizationId: number = 1) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [existing]: any = await connection.execute(`SELECT id FROM invoices WHERE source_type = 'craft_order' AND source_id = ? AND status_code != 'void'`, [orderId]);
      if (existing.length) {
        throw new Error('Invoice already exists for this order');
      }

      const [orders]: any = await connection.execute(`SELECT * FROM craft_orders WHERE id = ?`, [orderId]);
      const order = orders[0];

      const invoiceNumber = `INV-${order.order_code}`;

      const [invResult]: any = await connection.execute(
        `INSERT INTO invoices (
          organization_id, business_unit_id, invoice_number, party_id, source_type, source_id,
          issue_date, due_date, status_code, currency_code, subtotal, discount_amount, tax_amount, total_amount, balance_due,
          payment_terms, notes, created_by, issued_at
        ) VALUES (?, ?, ?, ?, 'craft_order', ?, UTC_DATE(), ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          organizationId, businessUnitId, invoiceNumber, order.customer_party_id, orderId,
          data.due_date || null, order.currency_code, order.subtotal, order.discount_amount, order.tax_amount, order.total_amount, order.total_amount,
          data.payment_terms || null, data.notes || null, userId
        ]
      );

      const invoiceId = invResult.insertId;

      const [items]: any = await connection.execute(`SELECT * FROM craft_order_items WHERE order_id = ?`, [orderId]);
      
      let sortOrder = 0;
      for (const item of items) {
        await connection.execute(
          `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount_amount, line_total, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoiceId, item.product_id, item.item_name, item.quantity, item.unit_price, item.discount_amount, item.line_total, sortOrder++]
        );
      }

      await connection.commit();
      connection.release();
      return invoiceId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async recordPayment(orderId: number, data: any, userId: number, businessUnitId: number, organizationId: number = 1) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [invoices]: any = await connection.execute(`SELECT id, total_amount, paid_amount FROM invoices WHERE source_type = 'craft_order' AND source_id = ? AND status_code != 'void'`, [orderId]);
      if (!invoices.length) throw new Error('No active invoice found for this order');
      const invoice = invoices[0];

      const newPaidAmount = Number(invoice.paid_amount) + Number(data.amount);
      if (newPaidAmount > Number(invoice.total_amount) + 0.01) {
        throw new Error('Jumlah pembayaran melebihi sisa tagihan');
      }

      const [orders]: any = await connection.execute(`SELECT customer_party_id, order_code FROM craft_orders WHERE id = ?`, [orderId]);
      const order = orders[0];

      // Get count for payment code
      const [payCount]: any = await connection.execute(`SELECT COUNT(*) as c FROM payments WHERE invoice_id = ?`, [invoice.id]);
      const paymentCode = `PAY-${order.order_code}-${(payCount[0].c + 1).toString().padStart(2, '0')}`;

      const [payResult]: any = await connection.execute(
        `INSERT INTO payments (
          organization_id, business_unit_id, payment_code, invoice_id, party_id, payment_method_id, treasury_account_id,
          payment_direction, payment_date, amount, reference_number, status_code, notes, received_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?, ?, 'confirmed', ?, ?)`,
        [
          organizationId, businessUnitId, paymentCode, invoice.id, order.customer_party_id, data.payment_method_id, data.treasury_account_id || null,
          data.payment_date, data.amount, data.reference_number || null, data.notes || null, userId
        ]
      );

      const paymentId = payResult.insertId;

      const invoiceStatus = newPaidAmount >= Number(invoice.total_amount) - 0.01 ? 'paid' : 'partial';
      const balanceDue = Number(invoice.total_amount) - newPaidAmount;

      await connection.execute(
        `UPDATE invoices SET paid_amount = ?, balance_due = ?, status_code = ?, paid_at = IF(?='paid', UTC_TIMESTAMP(), paid_at) WHERE id = ?`,
        [newPaidAmount, balanceDue, invoiceStatus, invoiceStatus, invoice.id]
      );

      const orderPaymentStatus = invoiceStatus === 'paid' ? 'paid' : 'partial';
      await connection.execute(
        `UPDATE craft_orders SET paid_amount = ?, payment_status_code = ? WHERE id = ?`,
        [newPaidAmount, orderPaymentStatus, orderId]
      );

      await connection.commit();
      connection.release();
      return paymentId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async enqueueOrderItems(orderId: number, itemIds: number[], userId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [order]: any = await connection.execute(`SELECT priority_code FROM craft_orders WHERE id = ?`, [orderId]);
      if (!order.length) throw new Error('Order not found');

      for (const itemId of itemIds) {
        // Avoid duplicate queue items
        const [existing]: any = await connection.execute(`SELECT id FROM production_queue_items WHERE order_item_id = ? AND status_code IN ('queued', 'printing')`, [itemId]);
        if (existing.length) continue;

        // Get max position
        const [maxPos]: any = await connection.execute(`SELECT MAX(queue_position) as max_pos FROM production_queue_items`);
        const nextPos = (maxPos[0].max_pos || 0) + 1;

        await connection.execute(
          `INSERT INTO production_queue_items (
            order_item_id, queue_position, priority_code, status_code, added_by
          ) VALUES (?, ?, ?, 'queued', ?)`,
          [itemId, nextPos, order[0].priority_code, userId]
        );
      }

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async quickCreateCustomer(data: any, userId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [result]: any = await connection.execute(
        `INSERT INTO parties (display_name, party_type, email, phone, created_by) VALUES (?, ?, ?, ?, ?)`,
        [data.display_name, data.party_type, data.email || null, data.phone || null, userId]
      );
      const partyId = result.insertId;

      await connection.execute(
        `INSERT INTO party_roles (party_id, role_code) VALUES (?, 'craft_customer')`,
        [partyId]
      );

      await connection.commit();
      connection.release();
      return { id: partyId, display_name: data.display_name, email: data.email, phone: data.phone };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }
}
