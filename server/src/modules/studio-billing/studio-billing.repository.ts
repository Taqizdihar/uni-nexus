import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { STUDIO_DATE_SQL, effectiveInvoiceStatus, effectiveQuotationStatus, toNumber } from './studio-billing.shared';
import type { InvoiceListFilters, OutstandingFilters, QuotationListFilters } from './studio-billing.types';

const mapMoney = (row: any) => ({
  ...row,
  subtotal: toNumber(row.subtotal),
  discount_amount: toNumber(row.discount_amount),
  tax_amount: toNumber(row.tax_amount),
  total_amount: toNumber(row.total_amount),
  paid_amount: toNumber(row.paid_amount),
  balance_due: toNumber(row.balance_due),
  quantity: row.quantity === undefined ? undefined : toNumber(row.quantity),
  unit_price: row.unit_price === undefined ? undefined : toNumber(row.unit_price),
  line_total: row.line_total === undefined ? undefined : toNumber(row.line_total),
  effective_status: row.effective_status || (row.quotation_number ? effectiveQuotationStatus(row) : effectiveInvoiceStatus(row)),
});

const quotationColumns = `
  q.id, q.quotation_number, q.party_id, q.project_id, q.order_id, q.issue_date, q.valid_until, q.status_code,
  q.currency_code, q.subtotal, q.discount_amount, q.tax_amount, q.total_amount, q.terms, q.notes, q.accepted_at,
  q.created_by, q.created_at, q.updated_at,
  party.code AS client_code, party.display_name AS client_name, party.email AS client_email, party.phone AS client_phone,
  project.project_code, project.project_name, creator.full_name AS created_by_name,
  CASE WHEN q.status_code = 'sent' AND q.valid_until IS NOT NULL AND q.valid_until < ${STUDIO_DATE_SQL} THEN 'expired' ELSE q.status_code END AS effective_status`;

const invoiceColumns = `
  i.id, i.invoice_number, i.party_id, i.quotation_id, i.source_type, i.source_id, i.issue_date, i.due_date,
  i.status_code, i.currency_code, i.subtotal, i.discount_amount, i.tax_amount, i.total_amount, i.paid_amount,
  i.balance_due, i.payment_terms, i.notes, i.pdf_path, i.created_by, i.issued_at, i.paid_at, i.created_at, i.updated_at,
  party.code AS client_code, party.display_name AS client_name, party.email AS client_email, party.phone AS client_phone,
  project.project_code, project.project_name, quote.quotation_number, creator.full_name AS created_by_name,
  CASE WHEN i.status_code NOT IN ('draft','paid','void','refunded') AND i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL} AND i.balance_due > 0 THEN 'overdue' ELSE i.status_code END AS effective_status`;

export class StudioBillingRepository {
  async listQuotations(filters: QuotationListFilters, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;
    let where = ' WHERE q.organization_id = ? AND q.business_unit_id = ? AND q.order_id IS NULL';
    const params: unknown[] = [studio.organizationId, studio.id];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      add(`(q.quotation_number LIKE ? OR party.code LIKE ? OR party.display_name LIKE ? OR project.project_code LIKE ? OR project.project_name LIKE ?
        OR EXISTS (SELECT 1 FROM quotation_items qi WHERE qi.quotation_id = q.id AND qi.description LIKE ?))`, term, term, term, term, term, term);
    }
    if (filters.status === 'expired') add(`q.status_code = 'sent' AND q.valid_until IS NOT NULL AND q.valid_until < ${STUDIO_DATE_SQL}`);
    else if (filters.status) add('q.status_code = ?', filters.status);
    if (filters.clientId) add('q.party_id = ?', filters.clientId);
    if (filters.projectId) add('q.project_id = ?', filters.projectId);
    if (filters.issueFrom) add('q.issue_date >= ?', filters.issueFrom);
    if (filters.issueTo) add('q.issue_date <= ?', filters.issueTo);
    if (filters.validity === 'expired') add(`q.status_code = 'sent' AND q.valid_until IS NOT NULL AND q.valid_until < ${STUDIO_DATE_SQL}`);
    if (filters.validity === 'active') add(`q.status_code IN ('draft', 'sent') AND (q.valid_until IS NULL OR q.valid_until >= ${STUDIO_DATE_SQL})`);
    if (filters.validity === 'awaiting_decision') add(`q.status_code = 'sent' AND (q.valid_until IS NULL OR q.valid_until >= ${STUDIO_DATE_SQL})`);
    const sortFields: Record<string, string> = { created: 'q.created_at', issue_date: 'q.issue_date', valid_until: 'q.valid_until', total: 'q.total_amount', client: 'party.display_name' };
    const sortField = sortFields[filters.sortBy || ''] || 'q.created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const joins = ' FROM quotations q JOIN parties party ON party.id = q.party_id LEFT JOIN studio_projects project ON project.id = q.project_id LEFT JOIN users creator ON creator.id = q.created_by';
    const [rows]: any = await pool.execute(`SELECT ${quotationColumns}${joins}${where} ORDER BY ${sortField === 'q.valid_until' ? 'q.valid_until IS NULL ASC, ' : ''}${sortField} ${sortOrder}, q.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [counts]: any = await pool.execute(`SELECT COUNT(*) AS total${joins}${where}`, params as any[]);
    const total = Number(counts[0]?.total || 0);
    return { items: (rows as any[]).map(mapMoney), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getQuotation(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT ${quotationColumns}
       FROM quotations q JOIN parties party ON party.id = q.party_id
       LEFT JOIN studio_projects project ON project.id = q.project_id
       LEFT JOIN users creator ON creator.id = q.created_by
       WHERE q.id = ? AND q.organization_id = ? AND q.business_unit_id = ? AND q.order_id IS NULL LIMIT 1`,
      [id, studio.organizationId, studio.id],
    );
    return rows.length ? mapMoney(rows[0]) : null;
  }

  async getQuotationItems(id: number) {
    const [rows]: any = await pool.execute(
      `SELECT qi.*, ss.code AS service_code, ss.name AS service_name, ss.unit_label
       FROM quotation_items qi LEFT JOIN studio_services ss ON ss.id = qi.service_id
       WHERE qi.quotation_id = ? ORDER BY qi.sort_order ASC, qi.id ASC`,
      [id],
    );
    return (rows as any[]).map(mapMoney);
  }

  async getInvoice(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT ${invoiceColumns}
       FROM invoices i JOIN parties party ON party.id = i.party_id
       LEFT JOIN studio_projects project ON i.source_type = 'studio_project' AND project.id = i.source_id
       LEFT JOIN quotations quote ON quote.id = i.quotation_id
       LEFT JOIN users creator ON creator.id = i.created_by
       WHERE i.id = ? AND i.organization_id = ? AND i.business_unit_id = ? LIMIT 1`,
      [id, studio.organizationId, studio.id],
    );
    return rows.length ? mapMoney(rows[0]) : null;
  }

  async getInvoiceItems(id: number) {
    const [rows]: any = await pool.execute(
      `SELECT ii.*, ss.code AS service_code, ss.name AS service_name, ss.unit_label
       FROM invoice_items ii LEFT JOIN studio_services ss ON ss.id = ii.service_id
       WHERE ii.invoice_id = ? ORDER BY ii.sort_order ASC, ii.id ASC`,
      [id],
    );
    return (rows as any[]).map(mapMoney);
  }

  async getSchedules(id: number) {
    const [rows]: any = await pool.execute(
      `SELECT ips.*, CASE WHEN ips.status_code NOT IN ('paid','cancelled') AND ips.due_date < ${STUDIO_DATE_SQL} AND ips.amount - ips.paid_amount > 0 THEN 'overdue' ELSE ips.status_code END AS effective_status
       FROM invoice_payment_schedules ips WHERE ips.invoice_id = ? ORDER BY ips.installment_no ASC, ips.id ASC`, [id],
    );
    return (rows as any[]).map(row => ({ ...row, amount: toNumber(row.amount), paid_amount: toNumber(row.paid_amount) }));
  }

  async getPayments(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT p.id, p.payment_code, p.payment_date, p.amount, p.currency_code, p.reference_number, p.status_code, p.notes,
              pm.name AS payment_method_name, ips.label AS schedule_label, ips.installment_no
       FROM payments p
       LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
       LEFT JOIN invoice_payment_schedules ips ON ips.id = p.payment_schedule_id
       WHERE p.invoice_id = ? AND p.organization_id = ? AND p.business_unit_id = ?
       ORDER BY p.payment_date DESC, p.id DESC`,
      [id, studio.organizationId, studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, amount: toNumber(row.amount) }));
  }

  async listInvoices(filters: InvoiceListFilters, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;
    let where = ' WHERE i.organization_id = ? AND i.business_unit_id = ?';
    const params: unknown[] = [studio.organizationId, studio.id];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      add('(i.invoice_number LIKE ? OR party.code LIKE ? OR party.display_name LIKE ? OR project.project_code LIKE ? OR project.project_name LIKE ? OR quote.quotation_number LIKE ?)', term, term, term, term, term, term);
    }
    if (filters.status === 'overdue') add(`i.status_code NOT IN ('draft','paid','void','refunded') AND i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL} AND i.balance_due > 0`);
    else if (filters.status) add('i.status_code = ?', filters.status);
    if (filters.clientId) add('i.party_id = ?', filters.clientId);
    if (filters.projectId) add(`i.source_type = 'studio_project' AND i.source_id = ?`, filters.projectId);
    if (filters.issueFrom) add('i.issue_date >= ?', filters.issueFrom);
    if (filters.issueTo) add('i.issue_date <= ?', filters.issueTo);
    if (filters.dueFrom) add('i.due_date >= ?', filters.dueFrom);
    if (filters.dueTo) add('i.due_date <= ?', filters.dueTo);
    if (filters.outstandingOnly) add(`i.status_code NOT IN ('draft','paid','void','refunded') AND i.balance_due > 0`);
    if (filters.overdueOnly) add(`i.status_code NOT IN ('draft','paid','void','refunded') AND i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL} AND i.balance_due > 0`);
    const sortFields: Record<string, string> = { created: 'i.created_at', issue_date: 'i.issue_date', due_date: 'i.due_date', total: 'i.total_amount', outstanding: 'i.balance_due', client: 'party.display_name' };
    const sortField = sortFields[filters.sortBy || ''] || 'i.created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const joins = ` FROM invoices i JOIN parties party ON party.id = i.party_id
      LEFT JOIN studio_projects project ON i.source_type = 'studio_project' AND project.id = i.source_id
      LEFT JOIN quotations quote ON quote.id = i.quotation_id LEFT JOIN users creator ON creator.id = i.created_by`;
    const [rows]: any = await pool.execute(`SELECT ${invoiceColumns}${joins}${where} ORDER BY ${sortField === 'i.due_date' ? 'i.due_date IS NULL ASC, ' : ''}${sortField} ${sortOrder}, i.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [counts]: any = await pool.execute(`SELECT COUNT(*) AS total${joins}${where}`, params as any[]);
    const total = Number(counts[0]?.total || 0);
    return { items: (rows as any[]).map(mapMoney), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async listOutstanding(filters: OutstandingFilters, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;
    let where = ` WHERE i.organization_id = ? AND i.business_unit_id = ? AND i.status_code NOT IN ('draft','paid','void','refunded') AND i.balance_due > 0`;
    const params: unknown[] = [studio.organizationId, studio.id];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.clientId) add('i.party_id = ?', filters.clientId);
    if (filters.projectId) add(`i.source_type = 'studio_project' AND i.source_id = ?`, filters.projectId);
    if (filters.overdue) add(`i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL}`);
    if (filters.dueFrom) add('i.due_date >= ?', filters.dueFrom);
    if (filters.dueTo) add('i.due_date <= ?', filters.dueTo);
    const joins = ` FROM invoices i JOIN parties party ON party.id = i.party_id
      LEFT JOIN studio_projects project ON i.source_type = 'studio_project' AND project.id = i.source_id
      LEFT JOIN quotations quote ON quote.id = i.quotation_id
      LEFT JOIN users creator ON creator.id = i.created_by`;
    const select = `${invoiceColumns},
      (SELECT COUNT(*) FROM invoice_payment_schedules ips WHERE ips.invoice_id = i.id AND ips.status_code <> 'cancelled') AS schedule_count,
      (SELECT MIN(ips.due_date) FROM invoice_payment_schedules ips WHERE ips.invoice_id = i.id AND ips.status_code NOT IN ('paid','cancelled') AND ips.amount > ips.paid_amount) AS next_schedule_due_date,
      (SELECT ips.label FROM invoice_payment_schedules ips WHERE ips.invoice_id = i.id AND ips.status_code NOT IN ('paid','cancelled') AND ips.amount > ips.paid_amount ORDER BY ips.due_date ASC, ips.installment_no ASC LIMIT 1) AS next_schedule_label,
      (SELECT ips.amount - ips.paid_amount FROM invoice_payment_schedules ips WHERE ips.invoice_id = i.id AND ips.status_code NOT IN ('paid','cancelled') AND ips.amount > ips.paid_amount ORDER BY ips.due_date ASC, ips.installment_no ASC LIMIT 1) AS next_schedule_balance,
      DATEDIFF(${STUDIO_DATE_SQL}, i.due_date) AS days_overdue`;
    const [rows]: any = await pool.execute(`SELECT ${select}${joins}${where} ORDER BY (i.due_date IS NULL) ASC, i.due_date ASC, i.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [countRows]: any = await pool.execute(`SELECT COUNT(*) AS total${joins}${where}`, params as any[]);
    const [summaryRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(i.balance_due), 0) AS total_outstanding,
              COALESCE(SUM(CASE WHEN i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL} THEN i.balance_due ELSE 0 END), 0) AS overdue_amount,
              COALESCE(SUM(CASE WHEN i.due_date >= ${STUDIO_DATE_SQL} AND i.due_date <= DATE_ADD(${STUDIO_DATE_SQL}, INTERVAL 7 DAY) THEN i.balance_due ELSE 0 END), 0) AS due_in_7_days,
              SUM(i.due_date IS NOT NULL AND i.due_date < ${STUDIO_DATE_SQL}) AS overdue_invoice_count,
              COUNT(DISTINCT i.party_id) AS clients_with_outstanding
       ${joins}${where}`,
      params as any[],
    );
    const summary = summaryRows[0] || {};
    return {
      items: (rows as any[]).map(row => ({ ...mapMoney(row), schedule_count: toNumber(row.schedule_count), next_schedule_balance: row.next_schedule_balance === null ? null : toNumber(row.next_schedule_balance), days_overdue: row.due_date ? Math.max(0, toNumber(row.days_overdue)) : 0 })),
      summary: { total_outstanding: toNumber(summary.total_outstanding), overdue_amount: toNumber(summary.overdue_amount), due_in_7_days: toNumber(summary.due_in_7_days), overdue_invoice_count: toNumber(summary.overdue_invoice_count), clients_with_outstanding: toNumber(summary.clients_with_outstanding) },
      meta: { page, limit, total: Number(countRows[0]?.total || 0), totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)) },
    };
  }

  async getOverview(studio: BusinessUnitContext) {
    const [quoteRows]: any = await pool.execute(
      `SELECT SUM(status_code = 'draft') AS draft,
              SUM(status_code = 'sent' AND (valid_until IS NULL OR valid_until >= ${STUDIO_DATE_SQL})) AS awaiting,
              SUM(status_code = 'accepted' AND YEAR(accepted_at) = YEAR(${STUDIO_DATE_SQL}) AND MONTH(accepted_at) = MONTH(${STUDIO_DATE_SQL})) AS accepted_this_month
       FROM quotations WHERE organization_id = ? AND business_unit_id = ? AND order_id IS NULL`, [studio.organizationId, studio.id],
    );
    const [invoiceRows]: any = await pool.execute(
      `SELECT SUM(status_code = 'issued' AND YEAR(issued_at) = YEAR(${STUDIO_DATE_SQL}) AND MONTH(issued_at) = MONTH(${STUDIO_DATE_SQL})) AS issued_this_month,
              COALESCE(SUM(CASE WHEN status_code NOT IN ('draft','paid','void','refunded') THEN balance_due ELSE 0 END), 0) AS total_outstanding,
              SUM(status_code NOT IN ('draft','paid','void','refunded') AND due_date IS NOT NULL AND due_date < ${STUDIO_DATE_SQL} AND balance_due > 0) AS overdue_invoices,
              COALESCE(SUM(CASE WHEN status_code NOT IN ('draft','paid','void','refunded') AND due_date >= ${STUDIO_DATE_SQL} AND due_date <= DATE_ADD(${STUDIO_DATE_SQL}, INTERVAL 7 DAY) THEN balance_due ELSE 0 END), 0) AS due_in_7_days
       FROM invoices WHERE organization_id = ? AND business_unit_id = ?`, [studio.organizationId, studio.id],
    );
    const quotes = quoteRows[0] || {};
    const invoices = invoiceRows[0] || {};
    return { quotations_draft: toNumber(quotes.draft), quotations_awaiting_decision: toNumber(quotes.awaiting), quotations_accepted_this_month: toNumber(quotes.accepted_this_month), invoices_issued_this_month: toNumber(invoices.issued_this_month), total_outstanding: toNumber(invoices.total_outstanding), overdue_invoices: toNumber(invoices.overdue_invoices), due_in_7_days: toNumber(invoices.due_in_7_days) };
  }

  async listTemplates(filters: { page?: number; limit?: number; search?: string; active?: string }, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;
    let where = ' WHERE qt.organization_id = ? AND qt.business_unit_id = ?';
    const params: unknown[] = [studio.organizationId, studio.id];
    if (filters.search?.trim()) { where += ' AND (qt.template_code LIKE ? OR qt.name LIKE ?)'; const term = `%${filters.search.trim()}%`; params.push(term, term); }
    if (filters.active === 'true') where += ' AND qt.is_active = 1';
    if (filters.active === 'false') where += ' AND qt.is_active = 0';
    const [rows]: any = await pool.execute(
      `SELECT qt.*, COUNT(qti.id) AS item_count, u.full_name AS created_by_name
       FROM quotation_templates qt LEFT JOIN quotation_template_items qti ON qti.template_id = qt.id LEFT JOIN users u ON u.id = qt.created_by
       ${where} GROUP BY qt.id ORDER BY qt.updated_at DESC, qt.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );
    const [countRows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM quotation_templates qt${where}`, params as any[]);
    return { items: (rows as any[]).map(row => ({ ...row, is_active: Boolean(Number(row.is_active)), item_count: toNumber(row.item_count), config_json: typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json })), meta: { page, limit, total: Number(countRows[0]?.total || 0), totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)) } };
  }

  async getTemplate(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(`SELECT * FROM quotation_templates WHERE id = ? AND organization_id = ? AND business_unit_id = ? LIMIT 1`, [id, studio.organizationId, studio.id]);
    if (!rows.length) return null;
    const [items]: any = await pool.execute(`SELECT qti.*, ss.code AS service_code, ss.name AS service_name FROM quotation_template_items qti LEFT JOIN studio_services ss ON ss.id = qti.service_id WHERE qti.template_id = ? ORDER BY qti.sort_order ASC, qti.id ASC`, [id]);
    const template = rows[0];
    return { ...template, is_active: Boolean(Number(template.is_active)), config_json: typeof template.config_json === 'string' ? JSON.parse(template.config_json) : template.config_json, items: (items as any[]).map(row => ({ ...row, default_quantity: toNumber(row.default_quantity), default_unit_price: row.default_unit_price === null ? null : toNumber(row.default_unit_price) })) };
  }

  async getActivity(entityType: 'quotation' | 'invoice', entityId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT a.id, a.action_code, a.description, a.created_at, u.full_name AS user_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.organization_id = ? AND a.business_unit_id = ? AND a.module_code = 'studio_billing' AND a.entity_type = ? AND a.entity_id = ?
       ORDER BY a.created_at DESC, a.id DESC LIMIT 200`, [studio.organizationId, studio.id, entityType, entityId],
    );
    return rows as any[];
  }

  async getDocument(entityType: 'quotation' | 'invoice', entityId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT * FROM documents WHERE organization_id = ? AND business_unit_id = ? AND entity_type = ? AND entity_id = ? AND document_type = ?
       ORDER BY version_no DESC, id DESC LIMIT 1`, [studio.organizationId, studio.id, entityType, entityId, entityType],
    );
    return rows.length ? rows[0] : null;
  }

  async getQuotationForUpdate(connection: PoolConnection, id: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT * FROM quotations WHERE id = ? AND organization_id = ? AND business_unit_id = ? AND order_id IS NULL LIMIT 1 FOR UPDATE`, [id, studio.organizationId, studio.id]);
    return rows.length ? rows[0] : null;
  }

  async getInvoiceForUpdate(connection: PoolConnection, id: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT * FROM invoices WHERE id = ? AND organization_id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE`, [id, studio.organizationId, studio.id]);
    return rows.length ? rows[0] : null;
  }
}

export const studioBillingRepository = new StudioBillingRepository();
