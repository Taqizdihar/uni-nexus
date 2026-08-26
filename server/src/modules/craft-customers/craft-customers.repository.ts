import { pool } from '../../config/database';
import type { BusinessUnitContext } from '../craft-orders/craft-orders.helpers';
import type { CustomerFilters, CustomerCreateInput } from './craft-customers.types';

const ACTIVE_ORDER_STATUSES = "'new', 'confirmed', 'waiting', 'ready', 'in_production', 'qc', 'packed'";
const TERMINAL_ORDER_STATUSES = "'completed', 'cancelled', 'returned', 'shipped'";

const mapNumbers = <T extends Record<string, any>>(row: T, keys: string[]): T => {
  const mutable = row as Record<string, any>;
  for (const key of keys) if (mutable[key] !== null && mutable[key] !== undefined) mutable[key] = Number(mutable[key]);
  return row;
};

export class CraftCustomersRepository {
  async getCustomers(filters: CustomerFilters, craft: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 24));
    const offset = (page - 1) * limit;
    const activePartner = `EXISTS (
      SELECT 1 FROM party_roles partner_role
      WHERE partner_role.party_id = p.id AND partner_role.business_unit_id = ?
        AND partner_role.role_code = 'craft_partner' AND partner_role.is_active = 1
        AND (partner_role.valid_from IS NULL OR partner_role.valid_from <= UTC_DATE())
        AND (partner_role.valid_until IS NULL OR partner_role.valid_until >= UTC_DATE())
    )`;
    const baseJoin = `
      FROM parties p
      JOIN (
        SELECT party_id, MAX(is_active = 1 AND (valid_from IS NULL OR valid_from <= UTC_DATE()) AND (valid_until IS NULL OR valid_until >= UTC_DATE())) AS is_current_customer
        FROM party_roles
        WHERE business_unit_id = ? AND role_code = 'craft_customer'
        GROUP BY party_id
      ) customer_role ON customer_role.party_id = p.id
      WHERE p.organization_id = ? AND p.deleted_at IS NULL
    `;
    const select = `
      SELECT p.id, p.code, p.party_kind, p.display_name, p.legal_name, p.email, p.phone, p.tax_id, p.status_code,
             p.created_at, p.updated_at, customer_role.is_current_customer,
             ${activePartner} AS is_partner,
             (SELECT pc.email FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_email,
             (SELECT COALESCE(pc.whatsapp, pc.phone) FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_phone,
             (SELECT COUNT(*) FROM craft_orders o WHERE o.customer_party_id = p.id AND o.business_unit_id = ? AND o.deleted_at IS NULL) AS total_orders,
             (SELECT COALESCE(SUM(o.total_amount), 0) FROM craft_orders o WHERE o.customer_party_id = p.id AND o.business_unit_id = ? AND o.deleted_at IS NULL AND o.status_code != 'cancelled') AS total_order_value,
             (SELECT MAX(o.order_date) FROM craft_orders o WHERE o.customer_party_id = p.id AND o.business_unit_id = ? AND o.deleted_at IS NULL) AS last_order_at
    `;
    let where = '';
    const filterParams: unknown[] = [];
    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      where += ` AND (p.code LIKE ? OR p.display_name LIKE ? OR p.legal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.tax_id LIKE ? OR EXISTS (
        SELECT 1 FROM party_contacts search_contact
        WHERE search_contact.party_id = p.id AND (search_contact.email LIKE ? OR search_contact.phone LIKE ? OR search_contact.whatsapp LIKE ?)
      ))`;
      filterParams.push(search, search, search, search, search, search, search, search, search);
    }
    if (filters.kind) { where += ' AND p.party_kind = ?'; filterParams.push(filters.kind); }
    if (filters.relationship === 'partner' || filters.partnersOnly) { where += ` AND ${activePartner}`; filterParams.push(craft.id); }
    if (filters.relationship === 'customer') { where += ` AND NOT ${activePartner}`; filterParams.push(craft.id); }
    if (filters.status === 'active') where += " AND p.status_code = 'active' AND customer_role.is_current_customer = 1";
    if (filters.status === 'inactive') where += " AND (p.status_code != 'active' OR customer_role.is_current_customer = 0)";
    if (filters.hasActiveOrder) { where += ` AND EXISTS (SELECT 1 FROM craft_orders active_order WHERE active_order.customer_party_id = p.id AND active_order.business_unit_id = ? AND active_order.deleted_at IS NULL AND active_order.status_code IN (${ACTIVE_ORDER_STATUSES}))`; filterParams.push(craft.id); }
    if (filters.salesChannelId) { where += ' AND EXISTS (SELECT 1 FROM craft_orders channel_order WHERE channel_order.customer_party_id = p.id AND channel_order.business_unit_id = ? AND channel_order.sales_channel_id = ? AND channel_order.deleted_at IS NULL)'; filterParams.push(craft.id, filters.salesChannelId); }

    const sortFields = {
      name: 'p.display_name', last_order: 'last_order_at', order_value: 'total_order_value', order_count: 'total_orders', created_at: 'p.created_at',
    } as const;
    const sortField = sortFields[filters.sortBy || 'name'];
    const direction = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const selectParams = [craft.id, craft.id, craft.id, craft.id];
    const [rows]: any = await pool.execute(
      `${select} ${baseJoin}${where} ORDER BY ${sortField} ${direction}, p.id DESC LIMIT ${limit} OFFSET ${offset}`,
      [...selectParams, craft.id, craft.organizationId, ...filterParams] as any[],
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total ${baseJoin}${where}`,
      [craft.id, craft.organizationId, ...filterParams] as any[],
    );
    const items = (rows as any[]).map(row => {
      mapNumbers(row, ['id', 'is_current_customer', 'is_partner', 'total_orders', 'total_order_value']);
      row.is_active = row.status_code === 'active' && Boolean(row.is_current_customer);
      row.is_partner = Boolean(row.is_partner);
      return row;
    });
    const total = Number(countRows[0]?.total || 0);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary(craft: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT
         COUNT(*) AS total_customers,
         COALESCE(SUM(p.status_code = 'active' AND customer_role.is_current_customer = 1), 0) AS active_customers,
         COALESCE(SUM(EXISTS (
           SELECT 1 FROM party_roles partner_role
           WHERE partner_role.party_id = p.id AND partner_role.business_unit_id = ? AND partner_role.role_code = 'craft_partner'
             AND partner_role.is_active = 1 AND (partner_role.valid_from IS NULL OR partner_role.valid_from <= UTC_DATE())
             AND (partner_role.valid_until IS NULL OR partner_role.valid_until >= UTC_DATE())
         )), 0) AS active_partners
       FROM parties p
       JOIN (
         SELECT party_id, MAX(is_active = 1 AND (valid_from IS NULL OR valid_from <= UTC_DATE()) AND (valid_until IS NULL OR valid_until >= UTC_DATE())) AS is_current_customer
         FROM party_roles WHERE business_unit_id = ? AND role_code = 'craft_customer' GROUP BY party_id
       ) customer_role ON customer_role.party_id = p.id
       WHERE p.organization_id = ? AND p.deleted_at IS NULL`,
      [craft.id, craft.id, craft.organizationId],
    );
    const [activeOrders]: any = await pool.execute(
      `SELECT COUNT(*) AS total FROM craft_orders WHERE business_unit_id = ? AND deleted_at IS NULL AND status_code IN (${ACTIVE_ORDER_STATUSES})`,
      [craft.id],
    );
    return {
      total_customers: Number(rows[0]?.total_customers || 0), active_customers: Number(rows[0]?.active_customers || 0),
      active_partners: Number(rows[0]?.active_partners || 0), active_orders: Number(activeOrders[0]?.total || 0),
    };
  }

  async getCustomer(partyId: number, craft: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT p.*, customer_role.id AS customer_role_id, customer_role.is_active AS customer_role_active,
              customer_role.valid_from AS customer_valid_from, customer_role.valid_until AS customer_valid_until,
              partner_role.id AS partner_role_id, partner_role.is_active AS partner_role_active,
              partner_role.valid_from AS partner_valid_from, partner_role.valid_until AS partner_valid_until
       FROM parties p
       JOIN party_roles customer_role ON customer_role.party_id = p.id AND customer_role.business_unit_id = ? AND customer_role.role_code = 'craft_customer'
       LEFT JOIN party_roles partner_role ON partner_role.id = (
         SELECT pr.id FROM party_roles pr WHERE pr.party_id = p.id AND pr.business_unit_id = ? AND pr.role_code = 'craft_partner' ORDER BY pr.id DESC LIMIT 1
       )
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       ORDER BY customer_role.id DESC LIMIT 1`,
      [craft.id, craft.id, partyId, craft.organizationId],
    );
    if (!rows.length) return null;
    const row = rows[0];
    mapNumbers(row, ['id', 'customer_role_id', 'customer_role_active', 'partner_role_id', 'partner_role_active']);
    row.is_partner = Boolean(row.partner_role_active) && (!row.partner_valid_from || new Date(row.partner_valid_from) <= new Date()) && (!row.partner_valid_until || new Date(row.partner_valid_until) >= new Date());
    row.is_active = row.status_code === 'active' && Boolean(row.customer_role_active);
    return row;
  }

  async getContacts(partyId: number) {
    const [rows]: any = await pool.execute('SELECT * FROM party_contacts WHERE party_id = ? ORDER BY is_primary DESC, full_name ASC, id ASC', [partyId]);
    return (rows as any[]).map(row => { mapNumbers(row, ['id', 'party_id', 'is_primary']); row.is_primary = Boolean(row.is_primary); return row; });
  }

  async getOrders(partyId: number, craft: BusinessUnitContext, page = 1, limit = 20) {
    const safePage = Math.max(1, page); const safeLimit = Math.min(100, Math.max(1, limit)); const offset = (safePage - 1) * safeLimit;
    const [rows]: any = await pool.execute(
      `SELECT o.id, o.order_code, o.order_type, o.order_date, o.deadline_at, o.status_code, o.payment_status_code, o.total_amount,
              sc.name AS sales_channel_name, (SELECT COUNT(*) FROM craft_order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM craft_orders o JOIN sales_channels sc ON sc.id = o.sales_channel_id
       WHERE o.customer_party_id = ? AND o.business_unit_id = ? AND o.deleted_at IS NULL
       ORDER BY o.order_date DESC, o.id DESC LIMIT ${safeLimit} OFFSET ${offset}`,
      [partyId, craft.id],
    );
    const [countRows]: any = await pool.execute('SELECT COUNT(*) AS total FROM craft_orders WHERE customer_party_id = ? AND business_unit_id = ? AND deleted_at IS NULL', [partyId, craft.id]);
    return { items: (rows as any[]).map(row => mapNumbers(row, ['id', 'total_amount', 'item_count'])), meta: { page: safePage, limit: safeLimit, total: Number(countRows[0]?.total || 0), totalPages: Math.ceil(Number(countRows[0]?.total || 0) / safeLimit) } };
  }

  async getCommercialSummary(partyId: number, craft: BusinessUnitContext) {
    const [orderRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(status_code IN (${ACTIVE_ORDER_STATUSES})), 0) AS active_orders,
              COALESCE(SUM(status_code IN ('completed', 'packed', 'shipped')), 0) AS completed_orders,
              COALESCE(SUM(status_code = 'cancelled'), 0) AS cancelled_orders,
              COALESCE(SUM(CASE WHEN status_code != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_order_value,
              MAX(order_date) AS last_order_at
       FROM craft_orders WHERE customer_party_id = ? AND business_unit_id = ? AND deleted_at IS NULL`,
      [partyId, craft.id],
    );
    const [invoiceRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(i.balance_due), 0) AS outstanding_invoice_balance
       FROM invoices i WHERE i.party_id = ? AND i.business_unit_id = ? AND i.source_type = 'craft_order' AND i.status_code NOT IN ('void', 'refunded')`,
      [partyId, craft.id],
    );
    const [paymentRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(payment.amount), 0) AS confirmed_payments
       FROM payments payment JOIN invoices i ON i.id = payment.invoice_id
       WHERE payment.party_id = ? AND payment.business_unit_id = ? AND payment.payment_direction = 'in' AND payment.status_code = 'confirmed'
         AND i.source_type = 'craft_order' AND i.status_code != 'void'`,
      [partyId, craft.id],
    );
    const [channels]: any = await pool.execute(
      `SELECT sc.id, sc.name, COUNT(*) AS order_count, MAX(o.order_date) AS last_order_at
       FROM craft_orders o JOIN sales_channels sc ON sc.id = o.sales_channel_id
       WHERE o.customer_party_id = ? AND o.business_unit_id = ? AND o.deleted_at IS NULL
       GROUP BY sc.id, sc.name ORDER BY last_order_at DESC`, [partyId, craft.id],
    );
    const result = { ...orderRows[0], ...invoiceRows[0], ...paymentRows[0], sales_channels: (channels as any[]).map(row => mapNumbers(row, ['id', 'order_count'])) };
    return mapNumbers(result, ['total_orders', 'active_orders', 'completed_orders', 'cancelled_orders', 'total_order_value', 'outstanding_invoice_balance', 'confirmed_payments']);
  }

  async getPriceRules(partyId: number, craft: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT r.*, p.name AS product_name, p.sku AS product_sku, v.name AS variant_name, v.sku AS variant_sku,
              COALESCE(v.selling_price, p.base_selling_price) AS normal_price
       FROM partner_price_rules r JOIN products p ON p.id = r.product_id AND p.business_unit_id = ?
       LEFT JOIN product_variants v ON v.id = r.variant_id
       WHERE r.partner_party_id = ? ORDER BY r.is_active DESC, p.name ASC, r.variant_id IS NULL ASC, r.minimum_qty ASC, r.id DESC`,
      [craft.id, partyId],
    );
    return (rows as any[]).map(row => { mapNumbers(row, ['id', 'partner_party_id', 'product_id', 'variant_id', 'minimum_qty', 'special_price', 'discount_percent', 'normal_price', 'is_active']); row.is_active = Boolean(row.is_active); return row; });
  }

  async findDuplicates(data: Pick<CustomerCreateInput, 'display_name' | 'legal_name' | 'email' | 'phone' | 'tax_id'>, craft: BusinessUnitContext, excludePartyId?: number) {
    const clauses: string[] = []; const params: unknown[] = [craft.organizationId];
    const email = data.email?.trim().toLowerCase(); const phone = data.phone?.trim(); const taxId = data.tax_id?.trim();
    const names = [data.display_name, data.legal_name].filter((value): value is string => Boolean(value?.trim())).map(value => value.trim().toLowerCase());
    if (email) { clauses.push('LOWER(p.email) = ? OR EXISTS (SELECT 1 FROM party_contacts duplicate_contact WHERE duplicate_contact.party_id = p.id AND LOWER(duplicate_contact.email) = ?)'); params.push(email, email); }
    if (phone) { clauses.push('p.phone = ? OR EXISTS (SELECT 1 FROM party_contacts duplicate_contact WHERE duplicate_contact.party_id = p.id AND (duplicate_contact.phone = ? OR duplicate_contact.whatsapp = ?))'); params.push(phone, phone, phone); }
    if (taxId) { clauses.push('p.tax_id = ?'); params.push(taxId); }
    if (names.length) { const placeholders = names.map(() => '?').join(', '); clauses.push(`LOWER(p.display_name) IN (${placeholders}) OR LOWER(COALESCE(p.legal_name, '')) IN (${placeholders})`); params.push(...names, ...names); }
    if (!clauses.length) return [];
    let query = `SELECT p.id, p.code, p.display_name, p.legal_name, p.email, p.phone, p.tax_id, p.party_kind, p.status_code FROM parties p WHERE p.organization_id = ? AND p.deleted_at IS NULL AND (${clauses.join(' OR ')})`;
    if (excludePartyId) { query += ' AND p.id != ?'; params.push(excludePartyId); }
    query += ' ORDER BY p.display_name ASC LIMIT 10';
    const [rows]: any = await pool.execute(query, params as any[]);
    return rows as any[];
  }
}
