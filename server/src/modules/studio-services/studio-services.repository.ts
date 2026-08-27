import { pool } from '../../config/database';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import type { PackageListFilters, ServiceListFilters, ServiceProjectFilters } from './studio-services.types';

const number = (value: unknown) => Number(value ?? 0);
const bool = (value: unknown) => Boolean(number(value));
const pagination = (filters: { page?: number; limit?: number }) => ({
  page: Math.max(1, filters.page || 1), limit: Math.min(100, Math.max(1, filters.limit || 20)),
});

const serviceRow = (row: any) => ({
  ...row, id: number(row.id), category_id: row.category_id == null ? null : number(row.category_id), base_price: number(row.base_price),
  is_active: bool(row.is_active), project_usage_count: number(row.project_usage_count), package_membership_count: number(row.package_membership_count),
  project_scope_value: number(row.project_scope_value),
});
const packageRow = (row: any) => ({
  ...row, id: number(row.id), package_price: number(row.package_price), is_active: bool(row.is_active), item_count: number(row.item_count),
  reference_value: number(row.reference_value), project_usage_count: number(row.project_usage_count),
});

export class StudioServicesRepository {
  async getOverview(studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM studio_services WHERE business_unit_id = ? AND is_active = 1) AS active_services,
        (SELECT COUNT(*) FROM studio_services WHERE business_unit_id = ? AND is_active = 0) AS inactive_services,
        (SELECT COUNT(*) FROM studio_service_categories WHERE business_unit_id = ? AND is_active = 1) AS active_categories,
        (SELECT COUNT(*) FROM service_packages WHERE business_unit_id = ? AND is_active = 1) AS active_packages,
        (SELECT COUNT(DISTINCT sps.service_id) FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id
          JOIN studio_services ss ON ss.id = sps.service_id WHERE sp.business_unit_id = ? AND sp.deleted_at IS NULL) AS services_used_in_projects`,
      [studio.id, studio.id, studio.id, studio.id, studio.id],
    );
    const row = rows[0] || {};
    return {
      active_services: number(row.active_services), inactive_services: number(row.inactive_services), active_categories: number(row.active_categories),
      active_packages: number(row.active_packages), services_used_in_projects: number(row.services_used_in_projects),
    };
  }

  async listServices(filters: ServiceListFilters, studio: BusinessUnitContext) {
    const { page, limit } = pagination(filters);
    const offset = (page - 1) * limit;
    let where = ' WHERE ss.business_unit_id = ?';
    const params: unknown[] = [studio.id];
    const add = (sql: string, ...values: unknown[]) => { where += ` AND ${sql}`; params.push(...values); };
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      add('(ss.code LIKE ? OR ss.name LIKE ? OR ss.description LIKE ? OR sc.name LIKE ?)', term, term, term, term);
    }
    if (filters.categoryId) add('ss.category_id = ?', filters.categoryId);
    if (filters.pricingModel) add('ss.pricing_model = ?', filters.pricingModel);
    if (filters.status === 'active') add('ss.is_active = 1');
    if (filters.status === 'inactive') add('ss.is_active = 0');
    const sortFields: Record<string, string> = { name: 'ss.name', newest: 'ss.created_at', base_price: 'ss.base_price', most_used: 'project_usage_count' };
    const sort = sortFields[filters.sortBy || ''] || 'ss.name';
    const order = filters.sortOrder === 'desc' ? 'DESC' : filters.sortBy && filters.sortBy !== 'name' ? 'DESC' : 'ASC';
    const usage = `(SELECT COUNT(DISTINCT sps.project_id) FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id WHERE sps.service_id = ss.id AND sp.business_unit_id = ${studio.id} AND sp.deleted_at IS NULL)`;
    const membership = '(SELECT COUNT(*) FROM service_package_items spi WHERE spi.service_id = ss.id)';
    const scopeValue = `(SELECT COALESCE(SUM(sps.line_total), 0) FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id WHERE sps.service_id = ss.id AND sp.business_unit_id = ${studio.id} AND sp.deleted_at IS NULL)`;
    const [rows]: any = await pool.execute(
      `SELECT ss.*, sc.code AS category_code, sc.name AS category_name, sc.is_active AS category_is_active,
              ${usage} AS project_usage_count, ${membership} AS package_membership_count, ${scopeValue} AS project_scope_value
       FROM studio_services ss LEFT JOIN studio_service_categories sc ON sc.id = ss.category_id${where}
       ORDER BY ${sort} ${order}, ss.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total FROM studio_services ss LEFT JOIN studio_service_categories sc ON sc.id = ss.category_id${where}`,
      params as any[],
    );
    const total = number(countRows[0]?.total);
    return { items: (rows as any[]).map(serviceRow), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getService(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT ss.*, sc.code AS category_code, sc.name AS category_name, sc.is_active AS category_is_active,
        (SELECT COUNT(DISTINCT sps.project_id) FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id WHERE sps.service_id = ss.id AND sp.business_unit_id = ? AND sp.deleted_at IS NULL) AS project_usage_count,
        (SELECT COUNT(*) FROM service_package_items spi WHERE spi.service_id = ss.id) AS package_membership_count,
        (SELECT COALESCE(SUM(sps.line_total), 0) FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id WHERE sps.service_id = ss.id AND sp.business_unit_id = ? AND sp.deleted_at IS NULL) AS project_scope_value
       FROM studio_services ss LEFT JOIN studio_service_categories sc ON sc.id = ss.category_id
       WHERE ss.id = ? AND ss.business_unit_id = ? LIMIT 1`, [studio.id, studio.id, id, studio.id],
    );
    return rows.length ? serviceRow(rows[0]) : null;
  }

  async getServiceForUpdate(connection: any, id: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT * FROM studio_services WHERE id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE`, [id, studio.id]);
    return rows.length ? rows[0] : null;
  }

  async listCategories(studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT sc.*, (SELECT COUNT(*) FROM studio_services ss WHERE ss.category_id = sc.id AND ss.business_unit_id = sc.business_unit_id) AS service_count,
              (SELECT COUNT(*) FROM studio_services ss WHERE ss.category_id = sc.id AND ss.business_unit_id = sc.business_unit_id AND ss.is_active = 1) AS active_service_count
       FROM studio_service_categories sc WHERE sc.business_unit_id = ? ORDER BY sc.is_active DESC, sc.name ASC`, [studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, id: number(row.id), is_active: bool(row.is_active), service_count: number(row.service_count), active_service_count: number(row.active_service_count) }));
  }

  async getCategoryForUpdate(connection: any, id: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT * FROM studio_service_categories WHERE id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE`, [id, studio.id]);
    return rows.length ? rows[0] : null;
  }

  async getCategoryByCode(connection: any, code: string, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT id FROM studio_service_categories WHERE business_unit_id = ? AND code = ? LIMIT 1`, [studio.id, code]);
    return rows.length ? rows[0] : null;
  }

  async activeServiceCountForCategory(connection: any, categoryId: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT COUNT(*) AS total FROM studio_services WHERE category_id = ? AND business_unit_id = ? AND is_active = 1`, [categoryId, studio.id]);
    return number(rows[0]?.total);
  }

  async listServicePackages(serviceId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT sp.id, sp.code, sp.name, sp.description, sp.package_price, sp.is_active, spi.quantity, spi.notes
       FROM service_package_items spi JOIN service_packages sp ON sp.id = spi.package_id
       WHERE spi.service_id = ? AND sp.business_unit_id = ? ORDER BY sp.is_active DESC, sp.name ASC`, [serviceId, studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, id: number(row.id), package_price: number(row.package_price), quantity: number(row.quantity), is_active: bool(row.is_active) }));
  }

  async listServiceProjects(serviceId: number, filters: ServiceProjectFilters, studio: BusinessUnitContext) {
    const { page, limit } = pagination(filters); const offset = (page - 1) * limit;
    const where = ` WHERE sps.service_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL`;
    const [rows]: any = await pool.execute(
      `SELECT sps.id, sps.description, sps.quantity, sps.unit_price, sps.line_total, sps.created_at,
              sp.id AS project_id, sp.project_code, sp.project_name, sp.status_code, p.display_name AS client_name
       FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id JOIN parties p ON p.id = sp.client_party_id${where}
       ORDER BY sps.created_at DESC, sps.id DESC LIMIT ${limit} OFFSET ${offset}`, [serviceId, studio.id],
    );
    const [counts]: any = await pool.execute(`SELECT COUNT(*) AS total FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id${where}`, [serviceId, studio.id]);
    const total = number(counts[0]?.total);
    return { items: (rows as any[]).map(row => ({ ...row, id: number(row.id), project_id: number(row.project_id), quantity: number(row.quantity), unit_price: number(row.unit_price), line_total: number(row.line_total) })), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async serviceCommercialUsage(serviceId: number, studio: BusinessUnitContext) {
    const [quotations, invoices, templates]: any = await Promise.all([
      pool.execute(`SELECT qi.id, q.id AS quotation_id, q.quotation_number, q.issue_date, q.status_code, p.display_name AS client_name, qi.description, qi.quantity, qi.unit_price, qi.line_total
        FROM quotation_items qi JOIN quotations q ON q.id = qi.quotation_id LEFT JOIN parties p ON p.id = q.party_id
        WHERE qi.service_id = ? AND q.business_unit_id = ? ORDER BY q.issue_date DESC, qi.id DESC LIMIT 100`, [serviceId, studio.id]),
      pool.execute(`SELECT ii.id, i.id AS invoice_id, i.invoice_number, i.issue_date, i.status_code, p.display_name AS client_name, ii.description, ii.quantity, ii.unit_price, ii.line_total
        FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id LEFT JOIN parties p ON p.id = i.party_id
        WHERE ii.service_id = ? AND i.business_unit_id = ? ORDER BY i.issue_date DESC, ii.id DESC LIMIT 100`, [serviceId, studio.id]),
      pool.execute(`SELECT qti.id, qt.id AS template_id, qt.template_code AS template_code, qt.name AS template_name, qti.description, qti.default_quantity, qti.default_unit_price
        FROM quotation_template_items qti JOIN quotation_templates qt ON qt.id = qti.template_id
        WHERE qti.service_id = ? AND qt.business_unit_id = ? ORDER BY qt.name ASC LIMIT 100`, [serviceId, studio.id]),
    ]);
    const mapCommercial = (row: any) => ({ ...row, id: number(row.id), quotation_id: row.quotation_id == null ? undefined : number(row.quotation_id), invoice_id: row.invoice_id == null ? undefined : number(row.invoice_id), quantity: row.quantity == null ? undefined : number(row.quantity), unit_price: row.unit_price == null ? undefined : number(row.unit_price), line_total: row.line_total == null ? undefined : number(row.line_total), default_quantity: row.default_quantity == null ? undefined : number(row.default_quantity), default_unit_price: row.default_unit_price == null ? null : number(row.default_unit_price) });
    return { quotations: (quotations[0] as any[]).map(mapCommercial), invoices: (invoices[0] as any[]).map(mapCommercial), quotation_templates: (templates[0] as any[]).map(mapCommercial) };
  }

  async serviceActivity(serviceId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT a.id, a.action_code, a.description, a.created_at, u.full_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.organization_id = ? AND a.business_unit_id = ? AND a.module_code = 'studio_services' AND a.entity_type = 'studio_service' AND a.entity_id = ?
       ORDER BY a.created_at DESC, a.id DESC LIMIT 100`, [studio.organizationId, studio.id, serviceId],
    );
    return rows as any[];
  }

  async listPackages(filters: PackageListFilters, studio: BusinessUnitContext) {
    let where = ' WHERE sp.business_unit_id = ?'; const params: unknown[] = [studio.id];
    if (filters.status === 'active') where += ' AND sp.is_active = 1';
    if (filters.status === 'inactive') where += ' AND sp.is_active = 0';
    if (filters.search?.trim()) { const term = `%${filters.search.trim()}%`; where += ' AND (sp.code LIKE ? OR sp.name LIKE ? OR sp.description LIKE ?)'; params.push(term, term, term); }
    const [rows]: any = await pool.execute(
      `SELECT sp.*, (SELECT COUNT(*) FROM service_package_items spi WHERE spi.package_id = sp.id) AS item_count,
        (SELECT COALESCE(SUM(spi.quantity * ss.base_price), 0) FROM service_package_items spi JOIN studio_services ss ON ss.id = spi.service_id WHERE spi.package_id = sp.id) AS reference_value,
        (SELECT COUNT(DISTINCT sps.project_id) FROM studio_project_services sps JOIN studio_projects pr ON pr.id = sps.project_id WHERE sps.package_id = sp.id AND pr.business_unit_id = ${studio.id} AND pr.deleted_at IS NULL) AS project_usage_count
       FROM service_packages sp${where} ORDER BY sp.is_active DESC, sp.name ASC`, params as any[],
    );
    return (rows as any[]).map(packageRow);
  }

  async getPackage(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT sp.*, (SELECT COUNT(*) FROM service_package_items spi WHERE spi.package_id = sp.id) AS item_count,
        (SELECT COALESCE(SUM(spi.quantity * ss.base_price), 0) FROM service_package_items spi JOIN studio_services ss ON ss.id = spi.service_id WHERE spi.package_id = sp.id) AS reference_value,
        (SELECT COUNT(DISTINCT sps.project_id) FROM studio_project_services sps JOIN studio_projects pr ON pr.id = sps.project_id WHERE sps.package_id = sp.id AND pr.business_unit_id = ? AND pr.deleted_at IS NULL) AS project_usage_count
       FROM service_packages sp WHERE sp.id = ? AND sp.business_unit_id = ? LIMIT 1`, [studio.id, id, studio.id],
    );
    if (!rows.length) return null;
    const [items]: any = await pool.execute(
      `SELECT spi.id, spi.service_id, spi.quantity, spi.notes, ss.code AS service_code, ss.name AS service_name, ss.description AS service_description,
              ss.base_price, ss.unit_label, ss.pricing_model, ss.is_active AS service_is_active
       FROM service_package_items spi JOIN studio_services ss ON ss.id = spi.service_id WHERE spi.package_id = ? ORDER BY spi.id ASC`, [id],
    );
    return { ...packageRow(rows[0]), items: (items as any[]).map(item => ({ ...item, id: number(item.id), service_id: number(item.service_id), quantity: number(item.quantity), base_price: number(item.base_price), service_is_active: bool(item.service_is_active) })) };
  }

  async getPackageForUpdate(connection: any, id: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(`SELECT * FROM service_packages WHERE id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE`, [id, studio.id]);
    return rows.length ? rows[0] : null;
  }

  async listPackageProjects(packageId: number, filters: ServiceProjectFilters, studio: BusinessUnitContext) {
    const { page, limit } = pagination(filters); const offset = (page - 1) * limit;
    const where = ` WHERE sps.package_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL`;
    const [rows]: any = await pool.execute(
      `SELECT sps.id, sps.description, sps.quantity, sps.unit_price, sps.line_total, sps.created_at, sp.id AS project_id, sp.project_code, sp.project_name, sp.status_code, p.display_name AS client_name
       FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id JOIN parties p ON p.id = sp.client_party_id${where}
       ORDER BY sps.created_at DESC, sps.id DESC LIMIT ${limit} OFFSET ${offset}`, [packageId, studio.id],
    );
    const [counts]: any = await pool.execute(`SELECT COUNT(*) AS total FROM studio_project_services sps JOIN studio_projects sp ON sp.id = sps.project_id${where}`, [packageId, studio.id]);
    const total = number(counts[0]?.total);
    return { items: (rows as any[]).map(row => ({ ...row, id: number(row.id), project_id: number(row.project_id), quantity: number(row.quantity), unit_price: number(row.unit_price), line_total: number(row.line_total) })), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}

export const studioServicesRepository = new StudioServicesRepository();
