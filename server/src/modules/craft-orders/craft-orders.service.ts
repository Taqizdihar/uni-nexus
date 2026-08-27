import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { FinancePostingService } from '../../shared/finance/finance-posting.service';
import { OrderPriorityService } from './order-priority.service';
import { PartnerPricingService } from '../craft-customers/partner-pricing.service';

type SqlConnection = Awaited<ReturnType<typeof pool.getConnection>>;

const PRE_PRODUCTION_STATUSES = new Set(['new', 'confirmed', 'waiting', 'ready']);
const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['waiting', 'ready', 'cancelled'],
  waiting: ['ready', 'cancelled'],
  ready: ['in_production', 'cancelled'],
  in_production: ['qc'],
  qc: ['completed'],
  completed: ['packed', 'returned'],
  packed: ['shipped', 'returned'],
  shipped: ['returned'],
  cancelled: [],
  returned: [],
};

export class CraftOrdersService {
  private readonly financePosting = new FinancePostingService();
  private priorityService = new OrderPriorityService();
  private partnerPricing = new PartnerPricingService();

  /** Partner pricing is resolved only while an order is created; persisted item prices stay historical snapshots. */
  private async applyPartnerPrices(connection: SqlConnection, data: any, businessUnitId: number) {
    for (const item of data.items) {
      if (!item.product_id) continue;
      const resolved = await this.partnerPricing.resolve(
        connection, Number(data.customer_party_id), Number(item.product_id), item.variant_id ? Number(item.variant_id) : null,
        Number(item.quantity), businessUnitId,
      );
      if (resolved) item.unit_price = resolved.resolved_price;
    }
  }

  private async assertOrderReferenceData(connection: SqlConnection, data: any, businessUnitId: number) {
    const [customers]: any = await connection.execute(
      `SELECT p.id
       FROM parties p
       JOIN party_roles pr ON pr.party_id = p.id
         AND pr.business_unit_id = ?
         AND pr.role_code = 'craft_customer'
         AND pr.is_active = 1
         AND (pr.valid_from IS NULL OR pr.valid_from <= UTC_DATE())
         AND (pr.valid_until IS NULL OR pr.valid_until >= UTC_DATE())
       WHERE p.id = ? AND p.deleted_at IS NULL AND p.status_code = 'active'
       LIMIT 1`,
      [businessUnitId, data.customer_party_id],
    );
    if (!customers.length) {
      throw new AppError(400, 'INVALID_CUSTOMER', 'Pelanggan Craft yang dipilih tidak valid atau tidak aktif.');
    }

    const [channels]: any = await connection.execute(
      `SELECT id FROM sales_channels
       WHERE id = ? AND business_unit_id = ? AND is_active = 1
       LIMIT 1`,
      [data.sales_channel_id, businessUnitId],
    );
    if (!channels.length) {
      throw new AppError(400, 'INVALID_SALES_CHANNEL', 'Kanal penjualan Craft yang dipilih tidak valid atau tidak aktif.');
    }

    for (const item of data.items) {
      if (!item.product_id) continue;
      const [products]: any = await connection.execute(
        `SELECT id FROM products
         WHERE id = ? AND business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL
         LIMIT 1`,
        [item.product_id, businessUnitId],
      );
      if (!products.length) {
        throw new AppError(400, 'INVALID_PRODUCT', 'Produk katalog yang dipilih tidak tersedia untuk Craft.');
      }
      if (item.variant_id) {
        const [variants]: any = await connection.execute(
          `SELECT id FROM product_variants
           WHERE id = ? AND product_id = ? AND is_active = 1
           LIMIT 1`,
          [item.variant_id, item.product_id],
        );
        if (!variants.length) {
          throw new AppError(400, 'INVALID_VARIANT', 'Varian produk yang dipilih tidak valid atau tidak aktif.');
        }
      }
    }
  }

  private async writeDraftAudit(connection: SqlConnection, userId: number, businessUnitId: number, actionCode: string, description: string) {
    const [businessUnits]: any = await connection.execute('SELECT organization_id FROM business_units WHERE id = ? LIMIT 1', [businessUnitId]);
    if (!businessUnits.length) return;
    await connection.execute(
      `INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description)
       VALUES (?, ?, 'craft_orders', ?, ?)`,
      [businessUnits[0].organization_id, userId, actionCode, description],
    );
  }

  private getDraftTitle(payload: any) {
    const customerSelected = Boolean(payload?.form?.customer_party_id);
    const namedItems = Array.isArray(payload?.items) ? payload.items.filter((item: any) => String(item?.item_name || '').trim()) : [];
    if (customerSelected && namedItems[0]) return `Pesanan Custom — ${namedItems[0].item_name}`.slice(0, 180);
    if (namedItems.length) return `Pesanan Custom — ${namedItems.length} Item`;
    return 'Draf Pesanan Baru';
  }

  async createDraft(payload: any, title: string | null | undefined, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const schemaVersion = Number(payload.schema_version || 1);
      const draftTitle = title || this.getDraftTitle(payload);
      const [result]: any = await connection.execute(
        `INSERT INTO craft_order_drafts (business_unit_id, draft_code, title, payload_json, schema_version, status_code, created_by, updated_by)
         VALUES (?, NULL, ?, ?, ?, 'active', ?, ?)`,
        [businessUnitId, draftTitle, JSON.stringify(payload), schemaVersion, userId, userId],
      );
      const draftId = Number(result.insertId);
      const draftCode = `DRF-${draftId.toString().padStart(6, '0')}`;
      await connection.execute('UPDATE craft_order_drafts SET draft_code = ? WHERE id = ?', [draftCode, draftId]);
      await this.writeDraftAudit(connection, userId, businessUnitId, 'draft.create', `Draft ${draftCode} dibuat.`);
      await connection.commit();
      return { id: draftId, draft_code: draftCode, title: draftTitle, payload, status_code: 'active' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateDraft(draftId: number, payload: any, title: string | null | undefined, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [drafts]: any = await connection.execute(
        'SELECT draft_code, status_code FROM craft_order_drafts WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE',
        [draftId, businessUnitId],
      );
      if (!drafts.length) throw new NotFoundError('Draf pesanan tidak ditemukan.');
      if (drafts[0].status_code !== 'active') throw new AppError(409, 'DRAFT_NOT_EDITABLE', 'Draf pesanan ini sudah tidak dapat diubah.');
      const draftTitle = title || this.getDraftTitle(payload);
      await connection.execute(
        `UPDATE craft_order_drafts SET title = ?, payload_json = ?, schema_version = ?, updated_by = ?
         WHERE id = ?`,
        [draftTitle, JSON.stringify(payload), Number(payload.schema_version || 1), userId, draftId],
      );
      await this.writeDraftAudit(connection, userId, businessUnitId, 'draft.update', `Draft ${drafts[0].draft_code} diperbarui.`);
      await connection.commit();
      return { id: draftId, draft_code: drafts[0].draft_code, title: draftTitle, payload, status_code: 'active' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async discardDraft(draftId: number, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [drafts]: any = await connection.execute(
        'SELECT draft_code, status_code FROM craft_order_drafts WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE',
        [draftId, businessUnitId],
      );
      if (!drafts.length) throw new NotFoundError('Draf pesanan tidak ditemukan.');
      if (drafts[0].status_code !== 'active') throw new AppError(409, 'DRAFT_NOT_ACTIVE', 'Draf pesanan ini sudah tidak aktif.');
      await connection.execute(
        `UPDATE craft_order_drafts SET status_code = 'discarded', deleted_at = UTC_TIMESTAMP(), updated_by = ? WHERE id = ?`,
        [userId, draftId],
      );
      await this.writeDraftAudit(connection, userId, businessUnitId, 'draft.discard', `Draft ${drafts[0].draft_code} dibuang.`);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createOrder(data: any, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      let draftCode: string | null = null;
      if (data.draft_id) {
        const [drafts]: any = await connection.execute(
          'SELECT draft_code, status_code FROM craft_order_drafts WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE',
          [data.draft_id, businessUnitId],
        );
        if (!drafts.length) throw new NotFoundError('Draf pesanan tidak ditemukan.');
        if (drafts[0].status_code !== 'active') throw new AppError(409, 'DRAFT_ALREADY_CONVERTED', 'Draf pesanan ini sudah dikonversi atau tidak aktif.');
        draftCode = drafts[0].draft_code;
      }
      await this.assertOrderReferenceData(connection, data, businessUnitId);
      await this.applyPartnerPrices(connection, data, businessUnitId);
      const subtotal = data.items.reduce(
        (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)) - Number(item.discount_amount || 0),
        0,
      );
      const totalAmount = subtotal - Number(data.discount_amount || 0) + Number(data.shipping_amount || 0) + Number(data.tax_amount || 0);
      const temporaryCode = `TMP-${randomUUID()}`;
      const [orderResult]: any = await connection.execute(
        `INSERT INTO craft_orders (
          business_unit_id, order_code, customer_party_id, sales_channel_id, external_order_id,
          order_type, order_date, deadline_at, priority_code, priority_reason, is_priority_manual,
          currency_code, subtotal, discount_amount, shipping_amount, marketplace_fee_amount, tax_amount, total_amount,
          customer_notes, internal_notes, shipping_recipient_name, shipping_phone, shipping_address, courier_name,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessUnitId, temporaryCode, data.customer_party_id, data.sales_channel_id, data.external_order_id || null,
          data.order_type, data.deadline_at || null, data.priority_code, data.priority_reason || null, data.is_priority_manual ? 1 : 0,
          data.currency_code || 'IDR', subtotal, data.discount_amount || 0, data.shipping_amount || 0, data.marketplace_fee_amount || 0, data.tax_amount || 0, totalAmount,
          data.customer_notes || null, data.internal_notes || null, data.shipping_recipient_name || null, data.shipping_phone || null, data.shipping_address || null, data.courier_name || null,
          userId,
        ],
      );
      const orderId = Number(orderResult.insertId);
      const orderCode = `NX-${orderId.toString().padStart(6, '0')}`;
      await connection.execute('UPDATE craft_orders SET order_code = ? WHERE id = ?', [orderCode, orderId]);

      for (const item of data.items) {
        const lineTotal = (Number(item.quantity) * Number(item.unit_price)) - Number(item.discount_amount || 0);
        await connection.execute(
          `INSERT INTO craft_order_items (
            order_id, product_id, variant_id, item_name, item_description, quantity, unit_price, discount_amount, line_total,
            estimated_material_g, estimated_print_minutes, print_profile_id, custom_spec_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.product_id || null, item.variant_id || null, item.item_name, item.item_description || null,
            item.quantity, item.unit_price, item.discount_amount || 0, lineTotal,
            item.estimated_material_g ?? null, item.estimated_print_minutes ?? null, item.print_profile_id || null,
            item.custom_spec_json ? JSON.stringify(item.custom_spec_json) : null,
          ],
        );
      }
      await connection.execute(
        `INSERT INTO craft_order_status_history (order_id, to_status_code, changed_by) VALUES (?, 'new', ?)`,
        [orderId, userId],
      );
      await this.priorityService.calculatePriority(orderId, connection);
      if (data.draft_id) {
        await connection.execute(
          `UPDATE craft_order_drafts SET status_code = 'converted', converted_order_id = ?, converted_at = UTC_TIMESTAMP(), updated_by = ?
           WHERE id = ? AND status_code = 'active'`,
          [orderId, userId, data.draft_id],
        );
        await this.writeDraftAudit(connection, userId, businessUnitId, 'draft.convert', `Draft ${draftCode || data.draft_id} dikonversi menjadi ${orderCode}.`);
      }
      await connection.commit();
      return { id: orderId, order_code: orderCode };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrderStatus(orderId: number, statusCode: string, reason: string | null, userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [orders]: any = await connection.execute(
        'SELECT status_code FROM craft_orders WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE',
        [orderId, businessUnitId],
      );
      if (!orders.length) throw new NotFoundError('Pesanan tidak ditemukan');
      const oldStatus = orders[0].status_code;
      if (!STATUS_TRANSITIONS[oldStatus]?.includes(statusCode)) {
        throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Perubahan status dari ${oldStatus} ke ${statusCode} tidak diizinkan.`);
      }

      let updateQuery = 'UPDATE craft_orders SET status_code = ?';
      const params: unknown[] = [statusCode];
      if (statusCode === 'completed') updateQuery += ', completed_at = UTC_TIMESTAMP()';
      if (statusCode === 'cancelled') updateQuery += ', cancelled_at = UTC_TIMESTAMP()';
      updateQuery += ' WHERE id = ?';
      params.push(orderId);
      await connection.execute(updateQuery, params as any[]);
      await connection.execute(
        `INSERT INTO craft_order_status_history (order_id, from_status_code, to_status_code, reason, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, oldStatus, statusCode, reason || null, userId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrder(orderId: number, data: any, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [orders]: any = await connection.execute(
        `SELECT status_code FROM craft_orders WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [orderId, businessUnitId],
      );
      if (!orders.length) throw new NotFoundError('Pesanan tidak ditemukan');
      if (!PRE_PRODUCTION_STATUSES.has(orders[0].status_code)) {
        throw new AppError(409, 'ORDER_EDIT_LOCKED', 'Pesanan tidak dapat diubah setelah memasuki produksi.');
      }
      const [downstream]: any = await connection.execute(
        `SELECT
          (SELECT COUNT(*) FROM production_queue_items WHERE order_id = ?) AS queue_count,
          (SELECT COUNT(*) FROM print_jobs WHERE order_id = ?) AS job_count`,
        [orderId, orderId],
      );
      if (Number(downstream[0].queue_count) > 0 || Number(downstream[0].job_count) > 0) {
        throw new AppError(409, 'ORDER_EDIT_LOCKED', 'Pesanan tidak dapat diubah karena sudah memiliki riwayat produksi.');
      }

      await connection.execute(
        `UPDATE craft_orders SET deadline_at = ?, customer_notes = ?, internal_notes = ?,
          shipping_recipient_name = ?, shipping_phone = ?, shipping_address = ?, courier_name = ?
         WHERE id = ?`,
        [
          data.deadline_at || null, data.customer_notes || null, data.internal_notes || null,
          data.shipping_recipient_name || null, data.shipping_phone || null, data.shipping_address || null,
          data.courier_name || null, orderId,
        ],
      );
      await this.priorityService.calculatePriority(orderId, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createInvoice(orderId: number, data: any, userId: number, businessUnitId: number, organizationId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [orders]: any = await connection.execute(
        `SELECT * FROM craft_orders WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [orderId, businessUnitId],
      );
      if (!orders.length) throw new NotFoundError('Pesanan tidak ditemukan');
      const order = orders[0];
      const [existing]: any = await connection.execute(
        `SELECT id FROM invoices WHERE source_type = 'craft_order' AND source_id = ? AND status_code != 'void'`,
        [orderId],
      );
      if (existing.length) throw new AppError(409, 'INVOICE_EXISTS', 'Invoice aktif sudah ada untuk pesanan ini.');

      const invoiceSubtotal = Number(order.subtotal) + Number(order.shipping_amount);
      const [invoiceResult]: any = await connection.execute(
        `INSERT INTO invoices (
          organization_id, business_unit_id, invoice_number, party_id, source_type, source_id,
          issue_date, due_date, status_code, currency_code, subtotal, discount_amount, tax_amount, total_amount, balance_due,
          payment_terms, notes, created_by, issued_at
        ) VALUES (?, ?, ?, ?, 'craft_order', ?, UTC_DATE(), ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          organizationId, businessUnitId, `INV-${order.order_code}`, order.customer_party_id, orderId,
          data.due_date || null, order.currency_code, invoiceSubtotal, order.discount_amount, order.tax_amount,
          order.total_amount, order.total_amount, data.payment_terms || null, data.notes || null, userId,
        ],
      );
      const invoiceId = Number(invoiceResult.insertId);
      const [items]: any = await connection.execute('SELECT * FROM craft_order_items WHERE order_id = ? ORDER BY id', [orderId]);
      let sortOrder = 0;
      for (const item of items) {
        await connection.execute(
          `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount_amount, line_total, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoiceId, item.product_id, item.item_name, item.quantity, item.unit_price, item.discount_amount, item.line_total, sortOrder++],
        );
      }
      if (Number(order.shipping_amount) > 0) {
        await connection.execute(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, discount_amount, line_total, sort_order)
           VALUES (?, 'Ongkos Kirim', 1, ?, 0, ?, ?)`,
          [invoiceId, order.shipping_amount, order.shipping_amount, sortOrder],
        );
      }
      await connection.commit();
      return invoiceId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordPayment(orderId: number, data: any, userId: number, businessUnitId: number, organizationId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [invoices]: any = await connection.execute(
        `SELECT i.id, i.total_amount, i.paid_amount, i.balance_due, o.customer_party_id, o.order_code
         FROM invoices i
         JOIN craft_orders o ON i.source_type = 'craft_order' AND i.source_id = o.id
         WHERE o.id = ? AND o.business_unit_id = ? AND i.status_code != 'void'
         FOR UPDATE`,
        [orderId, businessUnitId],
      );
      if (!invoices.length) throw new AppError(409, 'INVOICE_NOT_FOUND', 'Tidak ada invoice aktif untuk pesanan ini.');
      const invoice = invoices[0];
      if (!data.treasury_account_id) throw new AppError(400, 'TREASURY_ACCOUNT_REQUIRED', 'Akun kas wajib dipilih untuk pembayaran baru.');
      const paymentId = await this.financePosting.postCustomerPayment(connection, { organizationId, businessUnitId, userId }, {
        invoiceId: invoice.id, partyId: invoice.customer_party_id, paymentMethodId: data.payment_method_id,
        treasuryAccountId: data.treasury_account_id, amount: data.amount, paymentDate: data.payment_date,
        referenceNumber: data.reference_number, notes: data.notes,
      }, orderId);
      await connection.commit();
      return paymentId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async enqueueOrderItems(orderId: number, itemIds: number[], userId: number, businessUnitId: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [orders]: any = await connection.execute(
        `SELECT priority_code, priority_score, status_code
         FROM craft_orders WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [orderId, businessUnitId],
      );
      if (!orders.length) throw new NotFoundError('Pesanan tidak ditemukan');
      const order = orders[0];
      if (order.status_code !== 'ready') {
        throw new AppError(409, 'ORDER_NOT_QUEUE_ELIGIBLE', 'Pesanan harus berstatus siap produksi sebelum masuk antrean.');
      }
      const [maxRows]: any = await connection.execute(
        'SELECT COALESCE(MAX(queue_position), 0) AS max_position FROM production_queue_items WHERE business_unit_id = ? FOR UPDATE',
        [businessUnitId],
      );
      let nextPosition = Number(maxRows[0].max_position);
      for (const itemId of itemIds) {
        const [items]: any = await connection.execute(
          'SELECT id FROM craft_order_items WHERE id = ? AND order_id = ? FOR UPDATE',
          [itemId, orderId],
        );
        if (!items.length) throw new AppError(400, 'INVALID_ORDER_ITEM', 'Item tidak termasuk dalam pesanan ini.');
        const [existing]: any = await connection.execute(
          `SELECT id FROM production_queue_items
           WHERE order_item_id = ? AND status_code IN ('queued', 'scheduled', 'printing') LIMIT 1`,
          [itemId],
        );
        if (existing.length) continue;
        nextPosition += 1;
        await connection.execute(
          `INSERT INTO production_queue_items (
            business_unit_id, order_id, order_item_id, queue_position, priority_code, priority_score, status_code, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)`,
          [businessUnitId, orderId, itemId, nextPosition, order.priority_code, order.priority_score, userId],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async quickCreateCustomer(data: any, businessUnitId: number, organizationId: number, userId?: number) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [result]: any = await connection.execute(
        `INSERT INTO parties (organization_id, code, party_kind, display_name, email, phone, status_code)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [organizationId, `TMP-${randomUUID()}`, data.party_kind || 'individual', data.display_name, data.email || null, data.phone || null],
      );
      const partyId = Number(result.insertId);
      const code = `CUS-${partyId.toString().padStart(6, '0')}`;
      await connection.execute('UPDATE parties SET code = ? WHERE id = ?', [code, partyId]);
      await connection.execute(
        `INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, 'craft_customer', 1)`,
        [partyId, businessUnitId],
      );
      if (userId) {
        await connection.execute(
          `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, new_values)
           VALUES (?, ?, ?, 'craft_customers', 'customer.create', 'party', ?, ?, ?, ?)`,
          [organizationId, businessUnitId, userId, partyId, code, `Membuat pelanggan Craft ${code} dari Pesanan Baru.`, JSON.stringify({ display_name: data.display_name, party_kind: data.party_kind || 'individual', source: 'craft_orders.quick_create' })],
        );
      }
      await connection.commit();
      return { id: partyId, code, display_name: data.display_name, party_kind: data.party_kind || 'individual', email: data.email || null, phone: data.phone || null };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
