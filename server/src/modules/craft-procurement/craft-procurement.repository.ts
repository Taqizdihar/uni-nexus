import type { RowDataPacket } from "mysql2";
import { pool } from "../../config/database";
import type { BusinessUnitContext } from "../craft-orders/craft-orders.helpers";
import type { ProcurementListFilters } from "./craft-procurement.types";

const numberFields = new Set([
  "id",
  "party_id",
  "business_unit_id",
  "supplier_party_id",
  "purchase_request_id",
  "purchase_request_item_id",
  "purchase_order_id",
  "purchase_order_item_id",
  "goods_receipt_id",
  "supplier_invoice_id",
  "material_id",
  "material_batch_id",
  "unit_id",
  "role_id",
  "is_active",
  "is_primary",
  "total_pos",
  "open_pos",
  "received_pos",
  "total_purchase_value",
  "rejected_qty_total",
  "total_items",
  "ordered_qty",
  "remaining_qty",
  "quantity",
  "received_qty",
  "accepted_qty",
  "rejected_qty",
  "unit_price",
  "line_total",
  "estimated_unit_cost",
  "estimated_total",
  "subtotal",
  "tax_amount",
  "shipping_amount",
  "total_amount",
  "paid_amount",
  "balance_due",
  "days_overdue",
  "total_qty",
  "available_qty",
  "low_stock_threshold",
  "reorder_qty",
  "open_value",
  "count",
]);

function numeric<T extends Record<string, any>>(row: T): T {
  const next = row as Record<string, any>;
  for (const [key, value] of Object.entries(next)) {
    if (numberFields.has(key) && value !== null && value !== undefined)
      next[key] = Number(value);
  }
  for (const key of ["is_active", "is_primary"])
    if (next[key] !== null && next[key] !== undefined)
      next[key] = Boolean(next[key]);
  return row;
}

const listBounds = (filters: ProcurementListFilters) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  return { page, limit, offset: (page - 1) * limit };
};

export class CraftProcurementRepository {
  async getOverview(craft: BusinessUnitContext) {
    const [summaryRows]: any = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM purchase_requests WHERE business_unit_id = ? AND status_code = 'submitted') AS pending_requests,
        (SELECT COUNT(*) FROM purchase_orders WHERE business_unit_id = ? AND status_code IN ('sent','confirmed','partial')) AS active_purchase_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE business_unit_id = ? AND status_code IN ('sent','confirmed','partial') AND expected_date < CURDATE()) AS overdue_purchase_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE business_unit_id = ? AND status_code IN ('sent','confirmed','partial') AND expected_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS due_this_week,
        (SELECT COALESCE(SUM(total_amount),0) FROM purchase_orders WHERE business_unit_id = ? AND status_code IN ('sent','confirmed','partial')) AS open_po_value,
        (SELECT COALESCE(SUM(balance_due),0) FROM v_accounts_payable WHERE business_unit_id = ?) AS unpaid_supplier_invoices,
        (SELECT COUNT(*) FROM materials m LEFT JOIN v_material_stock vs ON vs.material_id = m.id WHERE m.business_unit_id = ? AND m.deleted_at IS NULL AND m.is_active = 1 AND COALESCE(vs.available_qty,0) <= m.low_stock_threshold) AS low_stock_materials`,
      [craft.id, craft.id, craft.id, craft.id, craft.id, craft.id, craft.id],
    );
    const results: any = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT m.id, m.sku, m.name, m.reorder_qty, u.symbol AS unit_symbol, COALESCE(vs.available_qty,0) AS available_qty
        FROM materials m LEFT JOIN v_material_stock vs ON vs.material_id=m.id JOIN units_of_measure u ON u.id=m.base_unit_id
        WHERE m.business_unit_id=? AND m.deleted_at IS NULL AND m.is_active=1 AND COALESCE(vs.available_qty,0)<=m.low_stock_threshold
          AND NOT EXISTS (SELECT 1 FROM purchase_order_items poi JOIN purchase_orders po ON po.id=poi.purchase_order_id WHERE poi.material_id=m.id AND po.business_unit_id=? AND po.status_code IN ('draft','sent','confirmed','partial'))
        ORDER BY (m.low_stock_threshold-COALESCE(vs.available_qty,0)) DESC, m.name LIMIT 12`,
        [craft.id, craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT pr.id, pr.request_code, pr.purpose, pr.required_by, requester.full_name AS requester_name, pr.requested_at
        FROM purchase_requests pr LEFT JOIN users requester ON requester.id=pr.requested_by WHERE pr.business_unit_id=? AND pr.status_code='submitted' ORDER BY pr.required_by IS NULL, pr.required_by ASC, pr.requested_at ASC LIMIT 12`,
        [craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT po.id, po.po_number, p.display_name AS supplier_name, po.expected_date, po.total_amount, po.status_code
        FROM purchase_orders po JOIN parties p ON p.id=po.supplier_party_id WHERE po.business_unit_id=? AND po.status_code IN ('sent','confirmed','partial') AND po.expected_date<CURDATE() ORDER BY po.expected_date ASC LIMIT 12`,
        [craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT po.id, po.po_number, p.display_name AS supplier_name, po.expected_date, po.total_amount
        FROM purchase_orders po JOIN parties p ON p.id=po.supplier_party_id WHERE po.business_unit_id=? AND po.status_code='partial' ORDER BY po.expected_date ASC, po.id DESC LIMIT 12`,
        [craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT gr.id AS goods_receipt_id, gr.receipt_number, po.po_number, poi.description, gri.rejected_qty, gri.rejection_reason, gr.received_at
        FROM goods_receipt_items gri JOIN goods_receipts gr ON gr.id=gri.goods_receipt_id JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN purchase_order_items poi ON poi.id=gri.purchase_order_item_id
        WHERE gr.business_unit_id=? AND gri.rejected_qty>0 ORDER BY gr.received_at DESC LIMIT 12`,
        [craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT * FROM v_accounts_payable WHERE business_unit_id=? AND due_date IS NOT NULL AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY due_date ASC LIMIT 12`,
        [craft.id],
      ),
    ]);
    const [
      lowStock,
      pendingRequests,
      overduePos,
      partialPos,
      rejectedGoods,
      dueInvoices,
    ] = results.map(([rows]: [RowDataPacket[]]) => rows);
    return {
      ...numeric(summaryRows[0] || {}),
      attention: {
        low_stock_without_procurement: lowStock.map((row: any) =>
          numeric({ ...row }),
        ),
        pending_requests: pendingRequests.map((row: any) =>
          numeric({ ...row }),
        ),
        overdue_purchase_orders: overduePos.map((row: any) =>
          numeric({ ...row }),
        ),
        partially_received_purchase_orders: partialPos.map((row: any) =>
          numeric({ ...row }),
        ),
        rejected_goods: rejectedGoods.map((row: any) => numeric({ ...row })),
        due_supplier_invoices: dueInvoices.map((row: any) =>
          numeric({ ...row }),
        ),
      },
    };
  }

  async getReferences(craft: BusinessUnitContext) {
    const referenceResults: any = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT m.id, m.sku, m.name, m.base_unit_id, m.default_unit_cost, m.reorder_qty, m.preferred_supplier_id, mc.category_type, u.code AS unit_code, u.symbol AS unit_symbol, COALESCE(vs.available_qty,0) AS available_qty
        FROM materials m JOIN material_categories mc ON mc.id=m.category_id JOIN units_of_measure u ON u.id=m.base_unit_id LEFT JOIN v_material_stock vs ON vs.material_id=m.id
        WHERE m.business_unit_id=? AND m.deleted_at IS NULL AND m.is_active=1 ORDER BY m.name`,
        [craft.id],
      ),
      pool.execute<RowDataPacket[]>(
        "SELECT id, code, name, symbol, unit_group, decimal_places FROM units_of_measure WHERE is_active=1 ORDER BY unit_group, name",
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT p.id, p.code, p.display_name FROM parties p JOIN party_roles pr ON pr.party_id=p.id
        WHERE p.organization_id=? AND p.deleted_at IS NULL AND p.status_code='active' AND pr.business_unit_id=? AND pr.role_code='supplier' AND pr.is_active=1
          AND (pr.valid_from IS NULL OR pr.valid_from<=UTC_DATE()) AND (pr.valid_until IS NULL OR pr.valid_until>=UTC_DATE()) ORDER BY p.display_name`,
        [craft.organizationId, craft.id],
      ),
    ]);
    const [materials, units, parties] = referenceResults.map(
      ([rows]: [RowDataPacket[]]) => rows,
    );
    return {
      materials: materials.map((row: any) => numeric({ ...row })),
      units: units.map((row: any) => numeric({ ...row })),
      suppliers: parties.map((row: any) => numeric({ ...row })),
    };
  }

  async findSupplierDuplicates(
    data: {
      display_name?: string;
      legal_name?: string | null;
      email?: string | null;
      phone?: string | null;
      tax_id?: string | null;
    },
    craft: BusinessUnitContext,
    excludeId?: number,
  ) {
    const clauses: string[] = [];
    const params: unknown[] = [craft.organizationId];
    const names = [data.display_name, data.legal_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim().toLowerCase());
    if (data.email?.trim()) {
      clauses.push(
        "LOWER(p.email)=? OR EXISTS (SELECT 1 FROM party_contacts pc WHERE pc.party_id=p.id AND LOWER(pc.email)=?)",
      );
      params.push(
        data.email.trim().toLowerCase(),
        data.email.trim().toLowerCase(),
      );
    }
    if (data.phone?.trim()) {
      clauses.push(
        "p.phone=? OR EXISTS (SELECT 1 FROM party_contacts pc WHERE pc.party_id=p.id AND (pc.phone=? OR pc.whatsapp=?))",
      );
      params.push(data.phone.trim(), data.phone.trim(), data.phone.trim());
    }
    if (data.tax_id?.trim()) {
      clauses.push("p.tax_id=?");
      params.push(data.tax_id.trim());
    }
    if (names.length) {
      const marks = names.map(() => "?").join(",");
      clauses.push(
        `LOWER(p.display_name) IN (${marks}) OR LOWER(COALESCE(p.legal_name,'')) IN (${marks})`,
      );
      params.push(...names, ...names);
    }
    if (!clauses.length) return [];
    let sql = `SELECT p.id,p.code,p.display_name,p.legal_name,p.email,p.phone,p.tax_id,p.party_kind,p.status_code FROM parties p WHERE p.organization_id=? AND p.deleted_at IS NULL AND (${clauses.join(" OR ")})`;
    if (excludeId) {
      sql += " AND p.id<>?";
      params.push(excludeId);
    }
    sql += " ORDER BY p.display_name LIMIT 10";
    const [rows]: any = await pool.execute(sql, params as any[]);
    return rows.map((row: any) => numeric({ ...row }));
  }

  async listSuppliers(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const where = [
      "p.organization_id=?",
      "p.deleted_at IS NULL",
      "pr.role_code='supplier'",
      "pr.business_unit_id=?",
    ];
    const params: unknown[] = [craft.organizationId, craft.id];
    if (filters.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      where.push(
        "(p.code LIKE ? OR p.display_name LIKE ? OR p.legal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)",
      );
      params.push(like, like, like, like, like);
    }
    if (filters.status === "active")
      where.push(
        "pr.is_active=1 AND p.status_code='active' AND (pr.valid_from IS NULL OR pr.valid_from<=UTC_DATE()) AND (pr.valid_until IS NULL OR pr.valid_until>=UTC_DATE())",
      );
    if (filters.status === "inactive")
      where.push(
        "(pr.is_active=0 OR p.status_code<>'active' OR (pr.valid_until IS NOT NULL AND pr.valid_until<UTC_DATE()))",
      );
    const select = `SELECT p.id,p.code,p.party_kind,p.display_name,p.legal_name,p.email,p.phone,p.tax_id,p.status_code,p.created_at, pr.id AS role_id,pr.is_active,pr.valid_from,pr.valid_until,
      (SELECT pc.full_name FROM party_contacts pc WHERE pc.party_id=p.id ORDER BY pc.is_primary DESC,pc.id LIMIT 1) AS primary_contact_name,
      (SELECT COALESCE(pc.email,p.email) FROM party_contacts pc WHERE pc.party_id=p.id ORDER BY pc.is_primary DESC,pc.id LIMIT 1) AS primary_contact_email,
      (SELECT COALESCE(pc.whatsapp,pc.phone,p.phone) FROM party_contacts pc WHERE pc.party_id=p.id ORDER BY pc.is_primary DESC,pc.id LIMIT 1) AS primary_contact_phone,
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.business_unit_id=? AND po.supplier_party_id=p.id) AS total_pos,
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.business_unit_id=? AND po.supplier_party_id=p.id AND po.status_code IN ('draft','sent','confirmed','partial')) AS open_pos,
      (SELECT COALESCE(SUM(po.total_amount),0) FROM purchase_orders po WHERE po.business_unit_id=? AND po.supplier_party_id=p.id AND po.status_code<>'cancelled') AS total_purchase_value,
      (SELECT MAX(po.order_date) FROM purchase_orders po WHERE po.business_unit_id=? AND po.supplier_party_id=p.id) AS last_purchase_date`;
    const joins =
      " FROM parties p JOIN party_roles pr ON pr.party_id=p.id WHERE " +
      where.join(" AND ");
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `${select}${joins} ORDER BY pr.is_active DESC,p.display_name,p.id DESC LIMIT ${limit} OFFSET ${offset}`,
        [craft.id, craft.id, craft.id, craft.id, ...params] as any[],
      ),
      pool.execute(`SELECT COUNT(*) AS total${joins}`, params as any[]),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }

  async getSupplier(partyId: number, craft: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT p.*,pr.id AS role_id,pr.is_active,pr.valid_from,pr.valid_until FROM parties p JOIN party_roles pr ON pr.party_id=p.id
      WHERE p.id=? AND p.organization_id=? AND p.deleted_at IS NULL AND pr.business_unit_id=? AND pr.role_code='supplier' ORDER BY pr.id DESC LIMIT 1`,
      [partyId, craft.organizationId, craft.id],
    );
    return rows.length ? numeric({ ...rows[0] }) : null;
  }

  async getSupplierDetail(partyId: number, craft: BusinessUnitContext) {
    const supplier = await this.getSupplier(partyId, craft);
    if (!supplier) return null;
    const supplierDetailResults: any = await Promise.all([
      pool.execute<RowDataPacket[]>(
        "SELECT * FROM party_contacts WHERE party_id=? ORDER BY is_primary DESC,full_name,id",
        [partyId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT po.*,pr.request_code FROM purchase_orders po LEFT JOIN purchase_requests pr ON pr.id=po.purchase_request_id WHERE po.business_unit_id=? AND po.supplier_party_id=? ORDER BY po.order_date DESC,po.id DESC LIMIT 100`,
        [craft.id, partyId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT gr.*,po.po_number FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id WHERE gr.business_unit_id=? AND po.supplier_party_id=? ORDER BY gr.received_at DESC,gr.id DESC LIMIT 100`,
        [craft.id, partyId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT * FROM supplier_invoices WHERE business_unit_id=? AND supplier_party_id=? ORDER BY invoice_date DESC,id DESC LIMIT 100`,
        [craft.id, partyId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT m.id,m.sku,m.name,m.preferred_supplier_id,mc.category_type,1 AS is_preferred FROM materials m JOIN material_categories mc ON mc.id=m.category_id WHERE m.business_unit_id=? AND m.deleted_at IS NULL AND m.preferred_supplier_id=?
        UNION SELECT m.id,m.sku,m.name,m.preferred_supplier_id,mc.category_type,0 AS is_preferred FROM materials m JOIN material_categories mc ON mc.id=m.category_id JOIN material_batches mb ON mb.material_id=m.id WHERE m.business_unit_id=? AND mb.supplier_id=? GROUP BY m.id,m.sku,m.name,m.preferred_supplier_id,mc.category_type`,
        [craft.id, partyId, craft.id, partyId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total_pos,COALESCE(SUM(status_code IN ('received','closed')),0) AS received_pos,COALESCE(SUM(status_code IN ('draft','sent','confirmed','partial')),0) AS open_pos,COALESCE(SUM(total_amount),0) AS total_purchase_value,MAX(order_date) AS last_purchase_date FROM purchase_orders WHERE business_unit_id=? AND supplier_party_id=? AND status_code<>'cancelled'`,
        [craft.id, partyId],
      ),
    ]);
    const [contacts, orders, receipts, invoices, materials, performanceRows] =
      supplierDetailResults.map(([rows]: [RowDataPacket[]]) => rows);
    return {
      supplier,
      contacts: contacts.map((row: any) => numeric({ ...row })),
      purchase_orders: orders.map((row: any) => numeric({ ...row })),
      receipts: receipts.map((row: any) => numeric({ ...row })),
      invoices: invoices.map((row: any) => numeric({ ...row })),
      materials: materials.map((row: any) => numeric({ ...row })),
      performance: numeric(performanceRows[0] || {}),
    };
  }

  async listPurchaseRequests(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const where = ["pr.business_unit_id=?"];
    const params: unknown[] = [craft.id];
    if (filters.status) {
      where.push("pr.status_code=?");
      params.push(filters.status);
    }
    if (filters.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      where.push("(pr.request_code LIKE ? OR pr.purpose LIKE ?)");
      params.push(like, like);
    }
    const sql = `SELECT pr.*,requester.full_name AS requester_name,approver.full_name AS approver_name,(SELECT COUNT(*) FROM purchase_request_items pri WHERE pri.purchase_request_id=pr.id) AS total_items,(SELECT COALESCE(SUM(pri.quantity*COALESCE(pri.estimated_unit_cost,0)),0) FROM purchase_request_items pri WHERE pri.purchase_request_id=pr.id) AS estimated_total FROM purchase_requests pr LEFT JOIN users requester ON requester.id=pr.requested_by LEFT JOIN users approver ON approver.id=pr.approved_by WHERE ${where.join(" AND ")}`;
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `${sql} ORDER BY pr.created_at DESC,pr.id DESC LIMIT ${limit} OFFSET ${offset}`,
        params as any[],
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM purchase_requests pr WHERE ${where.join(" AND ")}`,
        params as any[],
      ),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }

  async getPurchaseRequest(id: number, craft: BusinessUnitContext) {
    const [headers]: any = await pool.execute(
      `SELECT pr.*,requester.full_name AS requester_name,approver.full_name AS approver_name FROM purchase_requests pr LEFT JOIN users requester ON requester.id=pr.requested_by LEFT JOIN users approver ON approver.id=pr.approved_by WHERE pr.id=? AND pr.business_unit_id=?`,
      [id, craft.id],
    );
    if (!headers.length) return null;
    const requestDetailResults: any = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT pri.*,m.sku AS material_sku,m.name AS material_name,u.symbol AS unit_symbol,COALESCE((SELECT SUM(poi.quantity) FROM purchase_order_items poi JOIN purchase_orders po ON po.id=poi.purchase_order_id WHERE poi.purchase_request_item_id=pri.id AND po.status_code<>'cancelled'),0) AS ordered_qty FROM purchase_request_items pri LEFT JOIN materials m ON m.id=pri.material_id LEFT JOIN units_of_measure u ON u.id=pri.unit_id WHERE pri.purchase_request_id=? ORDER BY pri.id`,
        [id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT id,action_code,description,created_at,user_id,new_values FROM audit_logs WHERE business_unit_id=? AND entity_type='purchase_request' AND entity_id=? ORDER BY id DESC`,
        [craft.id, id],
      ),
    ]);
    const [items, audit] = requestDetailResults.map(
      ([rows]: [RowDataPacket[]]) => rows,
    );
    const request = numeric({ ...headers[0] });
    const resolvedItems = items.map((row: any) => {
      const item = numeric({ ...row });
      item.remaining_qty = Math.max(0, item.quantity - item.ordered_qty);
      return item;
    });
    return {
      request,
      items: resolvedItems,
      audit: audit.map((row: any) => numeric({ ...row })),
    };
  }

  async listPurchaseOrders(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const where = ["po.business_unit_id=?"];
    const params: unknown[] = [craft.id];
    if (filters.status) {
      where.push("po.status_code=?");
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push("po.supplier_party_id=?");
      params.push(filters.supplierId);
    }
    if (filters.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      where.push("(po.po_number LIKE ? OR p.display_name LIKE ?)");
      params.push(like, like);
    }
    const sql = `SELECT po.*,p.code AS supplier_code,p.display_name AS supplier_name,pr.request_code,(SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id=po.id) AS total_items FROM purchase_orders po JOIN parties p ON p.id=po.supplier_party_id LEFT JOIN purchase_requests pr ON pr.id=po.purchase_request_id WHERE ${where.join(" AND ")}`;
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `${sql} ORDER BY po.order_date DESC,po.id DESC LIMIT ${limit} OFFSET ${offset}`,
        params as any[],
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM purchase_orders po JOIN parties p ON p.id=po.supplier_party_id WHERE ${where.join(" AND ")}`,
        params as any[],
      ),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }

  async getPurchaseOrder(id: number, craft: BusinessUnitContext) {
    const [headers]: any = await pool.execute(
      `SELECT po.*,p.code AS supplier_code,p.display_name AS supplier_name,p.email AS supplier_email,p.phone AS supplier_phone,pr.request_code,creator.full_name AS created_by_name FROM purchase_orders po JOIN parties p ON p.id=po.supplier_party_id LEFT JOIN purchase_requests pr ON pr.id=po.purchase_request_id LEFT JOIN users creator ON creator.id=po.created_by WHERE po.id=? AND po.business_unit_id=?`,
      [id, craft.id],
    );
    if (!headers.length) return null;
    const orderDetailResults: any = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT poi.*,pri.description AS request_description,pri.quantity AS request_quantity,m.sku AS material_sku,m.name AS material_name,u.symbol AS unit_symbol FROM purchase_order_items poi LEFT JOIN purchase_request_items pri ON pri.id=poi.purchase_request_item_id LEFT JOIN materials m ON m.id=poi.material_id LEFT JOIN units_of_measure u ON u.id=poi.unit_id WHERE poi.purchase_order_id=? ORDER BY poi.id`,
        [id],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT gr.*,SUM(gri.accepted_qty) AS accepted_qty,SUM(gri.rejected_qty) AS rejected_qty FROM goods_receipts gr LEFT JOIN goods_receipt_items gri ON gri.goods_receipt_id=gr.id WHERE gr.purchase_order_id=? GROUP BY gr.id,gr.business_unit_id,gr.receipt_number,gr.purchase_order_id,gr.received_at,gr.received_by,gr.status_code,gr.notes,gr.created_at ORDER BY gr.received_at DESC,gr.id DESC`,
        [id],
      ),
      pool.execute<RowDataPacket[]>(
        "SELECT * FROM supplier_invoices WHERE purchase_order_id=? ORDER BY invoice_date DESC,id DESC",
        [id],
      ),
    ]);
    const [items, receipts, invoices] = orderDetailResults.map(
      ([rows]: [RowDataPacket[]]) => rows,
    );
    return {
      order: numeric({ ...headers[0] }),
      items: items.map((row: any) => {
        const item = numeric({ ...row });
        item.remaining_qty = Math.max(0, item.quantity - item.received_qty);
        return item;
      }),
      receipts: receipts.map((row: any) => numeric({ ...row })),
      invoices: invoices.map((row: any) => numeric({ ...row })),
    };
  }

  async listGoodsReceipts(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const where = ["gr.business_unit_id=?"];
    const params: unknown[] = [craft.id];
    if (filters.supplierId) {
      where.push("po.supplier_party_id=?");
      params.push(filters.supplierId);
    }
    if (filters.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      where.push(
        "(gr.receipt_number LIKE ? OR po.po_number LIKE ? OR p.display_name LIKE ?)",
      );
      params.push(like, like, like);
    }
    const sql = `SELECT gr.*,po.po_number,p.display_name AS supplier_name,SUM(gri.accepted_qty) AS accepted_qty,SUM(gri.rejected_qty) AS rejected_qty FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN parties p ON p.id=po.supplier_party_id LEFT JOIN goods_receipt_items gri ON gri.goods_receipt_id=gr.id WHERE ${where.join(" AND ")} GROUP BY gr.id,gr.business_unit_id,gr.receipt_number,gr.purchase_order_id,gr.received_at,gr.received_by,gr.status_code,gr.notes,gr.created_at,po.po_number,p.display_name`;
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `${sql} ORDER BY gr.received_at DESC,gr.id DESC LIMIT ${limit} OFFSET ${offset}`,
        params as any[],
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN parties p ON p.id=po.supplier_party_id WHERE ${where.join(" AND ")}`,
        params as any[],
      ),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }

  async getGoodsReceipt(id: number, craft: BusinessUnitContext) {
    const [headers]: any = await pool.execute(
      `SELECT gr.*,po.po_number,p.display_name AS supplier_name FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN parties p ON p.id=po.supplier_party_id WHERE gr.id=? AND gr.business_unit_id=?`,
      [id, craft.id],
    );
    if (!headers.length) return null;
    const [items]: any = await pool.execute(
      `SELECT gri.*,poi.description,poi.quantity AS ordered_qty,m.sku AS material_sku,u.symbol AS unit_symbol,mb.batch_code,fs.spool_code FROM goods_receipt_items gri JOIN purchase_order_items poi ON poi.id=gri.purchase_order_item_id LEFT JOIN materials m ON m.id=poi.material_id LEFT JOIN units_of_measure u ON u.id=poi.unit_id LEFT JOIN material_batches mb ON mb.id=gri.material_batch_id LEFT JOIN filament_spools fs ON fs.material_batch_id=mb.id WHERE gri.goods_receipt_id=? ORDER BY gri.id`,
      [id],
    );
    return {
      receipt: numeric({ ...headers[0] }),
      items: items.map((row: any) => numeric({ ...row })),
    };
  }

  async listSupplierInvoices(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const where = ["si.business_unit_id=?"];
    const params: unknown[] = [craft.id];
    if (filters.status) {
      where.push("si.status_code=?");
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push("si.supplier_party_id=?");
      params.push(filters.supplierId);
    }
    if (filters.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      where.push(
        "(si.supplier_invoice_number LIKE ? OR p.display_name LIKE ? OR po.po_number LIKE ?)",
      );
      params.push(like, like, like);
    }
    const sql = `SELECT si.*,p.display_name AS supplier_name,po.po_number FROM supplier_invoices si JOIN parties p ON p.id=si.supplier_party_id LEFT JOIN purchase_orders po ON po.id=si.purchase_order_id WHERE ${where.join(" AND ")}`;
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `${sql} ORDER BY si.invoice_date DESC,si.id DESC LIMIT ${limit} OFFSET ${offset}`,
        params as any[],
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM supplier_invoices si JOIN parties p ON p.id=si.supplier_party_id LEFT JOIN purchase_orders po ON po.id=si.purchase_order_id WHERE ${where.join(" AND ")}`,
        params as any[],
      ),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }

  async getSupplierInvoice(id: number, craft: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT si.*,p.display_name AS supplier_name,po.po_number FROM supplier_invoices si JOIN parties p ON p.id=si.supplier_party_id LEFT JOIN purchase_orders po ON po.id=si.purchase_order_id WHERE si.id=? AND si.business_unit_id=?`,
      [id, craft.id],
    );
    return rows.length ? numeric({ ...rows[0] }) : null;
  }

  async getHistory(
    craft: BusinessUnitContext,
    filters: ProcurementListFilters = {},
  ) {
    const { page, limit, offset } = listBounds(filters);
    const params: unknown[] = [craft.id];
    let where = "business_unit_id=? AND module_code='craft_procurement'";
    if (filters.search?.trim()) {
      where += " AND (entity_code LIKE ? OR description LIKE ?)";
      const like = `%${filters.search.trim()}%`;
      params.push(like, like);
    }
    const [rows, countRows]: any = await Promise.all([
      pool.execute(
        `SELECT id,action_code,entity_type,entity_id,entity_code,description,old_values,new_values,created_at,user_id FROM audit_logs WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ${limit} OFFSET ${offset}`,
        params as any[],
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM audit_logs WHERE ${where}`,
        params as any[],
      ),
    ]);
    return {
      items: rows[0].map((row: any) => numeric({ ...row })),
      meta: {
        page,
        limit,
        total: Number(countRows[0][0]?.total || 0),
        totalPages: Math.ceil(Number(countRows[0][0]?.total || 0) / limit),
      },
    };
  }
}
