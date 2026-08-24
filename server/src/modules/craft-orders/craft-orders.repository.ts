import { pool } from '../../config/database';
import { CraftOrderFilters } from './craft-orders.types';

export class CraftOrdersRepository {
  async getOrders(filters: CraftOrderFilters, businessUnitId: number) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.id, o.order_code, o.order_type, o.order_date, o.deadline_at, 
             o.priority_code, o.priority_score, o.status_code, o.payment_status_code, 
             o.total_amount, o.paid_amount, o.external_order_id,
             p.display_name as customer_name, p.party_kind as customer_type,
             sc.name as sales_channel_name,
             (SELECT COUNT(*) FROM craft_order_items coi WHERE coi.order_id = o.id) as item_count,
             (SELECT SUM(quantity) FROM craft_order_items coi WHERE coi.order_id = o.id) as total_quantity,
             (SELECT GROUP_CONCAT(item_name SEPARATOR ', ') FROM craft_order_items coi WHERE coi.order_id = o.id) as item_summary,
             (SELECT COALESCE(SUM(COALESCE(coi.estimated_print_minutes, 0) * coi.quantity), 0) FROM craft_order_items coi WHERE coi.order_id = o.id) as total_print_minutes,
             (o.deadline_at < UTC_TIMESTAMP() AND o.status_code NOT IN ('completed', 'cancelled', 'returned', 'shipped')) as is_overdue
      FROM craft_orders o
      JOIN parties p ON o.customer_party_id = p.id
      JOIN sales_channels sc ON o.sales_channel_id = sc.id
      WHERE o.deleted_at IS NULL AND o.business_unit_id = ?
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM craft_orders o
      JOIN parties p ON o.customer_party_id = p.id
      WHERE o.deleted_at IS NULL AND o.business_unit_id = ?
    `;
    const params: unknown[] = [businessUnitId];
    const countParams: unknown[] = [businessUnitId];

    const addCondition = (condition: string, value: unknown) => {
      query += ` AND ${condition}`;
      countQuery += ` AND ${condition}`;
      params.push(value);
      countParams.push(value);
    };

    if (filters.search) {
      const search = `%${filters.search}%`;
      const searchCondition = `(o.order_code LIKE ? OR o.external_order_id LIKE ? OR p.display_name LIKE ? OR EXISTS (
        SELECT 1 FROM craft_order_items search_items
        WHERE search_items.order_id = o.id AND search_items.item_name LIKE ?
      ))`;
      query += ` AND ${searchCondition}`;
      countQuery += ` AND ${searchCondition}`;
      params.push(search, search, search, search);
      countParams.push(search, search, search, search);
    }

    if (filters.status) addCondition('o.status_code = ?', filters.status);
    if (filters.statuses?.length) {
      const placeholders = filters.statuses.map(() => '?').join(', ');
      query += ` AND o.status_code IN (${placeholders})`;
      countQuery += ` AND o.status_code IN (${placeholders})`;
      params.push(...filters.statuses);
      countParams.push(...filters.statuses);
    }
    if (filters.priority) addCondition('o.priority_code = ?', filters.priority);
    if (filters.paymentStatus) addCondition('o.payment_status_code = ?', filters.paymentStatus);
    if (filters.channel) addCondition('o.sales_channel_id = ?', filters.channel);
    if (filters.orderType) addCondition('o.order_type = ?', filters.orderType);
    
    if (filters.dateFrom) addCondition('o.order_date >= ?', filters.dateFrom);
    if (filters.dateTo) addCondition('o.order_date <= ?', filters.dateTo);
    
    if (filters.deadlineFrom) addCondition('o.deadline_at >= ?', filters.deadlineFrom);
    if (filters.deadlineTo) addCondition('o.deadline_at <= ?', filters.deadlineTo);
    
    if (filters.overdue) {
       query += ` AND (o.deadline_at < UTC_TIMESTAMP() AND o.status_code NOT IN ('completed', 'cancelled', 'returned', 'shipped'))`;
       countQuery += ` AND (o.deadline_at < UTC_TIMESTAMP() AND o.status_code NOT IN ('completed', 'cancelled', 'returned', 'shipped'))`;
    }
    if (filters.activeOnly) {
      const terminalStatuses = ['completed', 'packed', 'shipped', 'cancelled', 'returned'];
      const placeholders = terminalStatuses.map(() => '?').join(', ');
      query += ` AND o.status_code NOT IN (${placeholders})`;
      countQuery += ` AND o.status_code NOT IN (${placeholders})`;
      params.push(...terminalStatuses);
      countParams.push(...terminalStatuses);
    }

    const validSortFields = {
      'priority': 'o.priority_score',
      'deadline': 'o.deadline_at',
      'date': 'o.order_date',
      'total': 'o.total_amount'
    };
    
    const sortField = filters.sortBy && validSortFields[filters.sortBy as keyof typeof validSortFields] 
      ? validSortFields[filters.sortBy as keyof typeof validSortFields] 
      : 'o.order_date';
    
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // This MySQL deployment rejects bound placeholders in LIMIT/OFFSET. Values are
    // clamped integers above, so interpolation here remains safe and prevents a 500.
    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params as any[]);
    const [countRows]: any = await pool.execute(countQuery, countParams as any[]);
    
    return {
      items: rows as unknown as any[],
      meta: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    };
  }

  async getOrderById(id: number, businessUnitId: number) {
    const [rows]: any = await pool.execute(`
      SELECT o.*, 
             p.display_name as customer_name, p.party_kind as customer_type, p.email, p.phone,
             sc.name as sales_channel_name, sc.channel_type,
             u.full_name as created_by_name
      FROM craft_orders o
      JOIN parties p ON o.customer_party_id = p.id
      JOIN sales_channels sc ON o.sales_channel_id = sc.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = ? AND o.business_unit_id = ? AND o.deleted_at IS NULL
    `, [id, businessUnitId]);
    
    if (!rows.length) return null;
    return rows[0];
  }

  async getOrderItems(orderId: number) {
    const [rows]: any = await pool.execute(`
      SELECT coi.*,
             p.name as product_name, p.sku as product_sku,
             v.name as variant_name, v.sku as variant_sku,
             pp.name as print_profile_name
      FROM craft_order_items coi
      LEFT JOIN products p ON coi.product_id = p.id
      LEFT JOIN product_variants v ON coi.variant_id = v.id
      LEFT JOIN print_profiles pp ON coi.print_profile_id = pp.id
      WHERE coi.order_id = ?
    `, [orderId]);
    return rows;
  }

  async checkDuplicateMarketplaceOrder(channelId: number, externalId: string) {
    const [rows]: any = await pool.execute(`
      SELECT id FROM craft_orders 
      WHERE sales_channel_id = ? AND external_order_id = ? AND deleted_at IS NULL
      LIMIT 1
    `, [channelId, externalId]);
    return rows.length > 0;
  }

  async getDrafts(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT d.id, d.draft_code, d.title, d.status_code, d.created_by, d.created_at, d.updated_at,
              u.full_name AS created_by_name, p.display_name AS customer_name,
              COALESCE(JSON_LENGTH(JSON_EXTRACT(d.payload_json, '$.items')), 0) AS item_count
       FROM craft_order_drafts d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN parties p ON p.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(d.payload_json, '$.form.customer_party_id')) AS UNSIGNED)
       WHERE d.business_unit_id = ? AND d.status_code = 'active' AND d.deleted_at IS NULL
       ORDER BY d.updated_at DESC, d.id DESC`,
      [businessUnitId],
    );
    return rows;
  }

  async getDraftById(id: number, businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name, p.display_name AS customer_name,
              COALESCE(JSON_LENGTH(JSON_EXTRACT(d.payload_json, '$.items')), 0) AS item_count
       FROM craft_order_drafts d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN parties p ON p.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(d.payload_json, '$.form.customer_party_id')) AS UNSIGNED)
       WHERE d.id = ? AND d.business_unit_id = ? AND d.deleted_at IS NULL
       LIMIT 1`,
      [id, businessUnitId],
    );
    if (!rows.length) return null;
    const row = rows[0];
    const payload = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
    return { ...row, payload };
  }
}
