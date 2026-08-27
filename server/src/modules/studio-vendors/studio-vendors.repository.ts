import { pool } from '../../config/database';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import type { VendorListFilters } from './studio-vendors.types';

const number = (value: unknown) => value === null || value === undefined ? 0 : Number(value);
const activeRole = (businessUnitId: number) => `EXISTS (SELECT 1 FROM party_roles ar WHERE ar.party_id = p.id AND ar.business_unit_id = ${businessUnitId} AND ar.role_code IN ('vendor', 'freelancer', 'studio_partner') AND ar.is_active = 1 AND (ar.valid_from IS NULL OR ar.valid_from <= UTC_DATE()) AND (ar.valid_until IS NULL OR ar.valid_until >= UTC_DATE()))`;
const statusSql = (businessUnitId: number) => `CASE WHEN p.status_code <> 'active' THEN 'party_inactive' WHEN ${activeRole(businessUnitId)} THEN 'active' ELSE 'role_inactive' END`;
const externalJoin = (businessUnitId: number) => `JOIN (SELECT DISTINCT party_id FROM party_roles WHERE business_unit_id = ${businessUnitId} AND role_code IN ('vendor', 'freelancer', 'studio_partner')) ext ON ext.party_id = p.id`;
const activeAssignments = (businessUnitId: number) => `(SELECT COUNT(*) FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL WHERE pea.party_id = p.id AND pea.end_date IS NULL AND sp.status_code IN ('approved', 'in_progress', 'review'))`;
const assignments = (businessUnitId: number) => `(SELECT COUNT(*) FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL WHERE pea.party_id = p.id)`;
const agreed = (businessUnitId: number) => `(SELECT COALESCE(SUM(pea.agreed_fee), 0) FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL WHERE pea.party_id = p.id)`;
const expenses = (businessUnitId: number) => `(SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.party_id = p.id AND e.business_unit_id = ${businessUnitId} AND e.status_code <> 'void')`;

const mapDirectory = (row: any) => ({
  ...row, managed_roles: row.managed_roles ? String(row.managed_roles).split(',') : [],
  role_is_active: Boolean(Number(row.role_is_active)), active_assignment_count: number(row.active_assignment_count),
  total_project_count: number(row.total_project_count), total_agreed_fee: number(row.total_agreed_fee), recorded_expenses: number(row.recorded_expenses),
});

export class StudioVendorsRepository {
  async list(filters: VendorListFilters, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1); const limit = Math.min(100, Math.max(1, filters.limit || 20)); const offset = (page - 1) * limit;
    let where = 'WHERE p.organization_id = ? AND p.deleted_at IS NULL'; const params: unknown[] = [studio.organizationId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search?.trim()) {
      const value = `%${filters.search.trim()}%`;
      add(`(p.code LIKE ? OR p.display_name LIKE ? OR p.legal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.tax_id LIKE ? OR EXISTS (SELECT 1 FROM party_contacts pc WHERE pc.party_id = p.id AND (pc.full_name LIKE ? OR pc.email LIKE ? OR pc.phone LIKE ?)))`, value, value, value, value, value, value, value, value, value);
    }
    if (filters.role) add(`EXISTS (SELECT 1 FROM party_roles fr WHERE fr.party_id = p.id AND fr.business_unit_id = ${studio.id} AND fr.role_code = ?)`, filters.role);
    if (filters.relationshipStatus === 'active') add(`p.status_code = 'active' AND ${activeRole(studio.id)}`);
    if (filters.relationshipStatus === 'role_inactive') add(`p.status_code = 'active' AND NOT ${activeRole(studio.id)}`);
    if (filters.relationshipStatus === 'party_inactive') add(`p.status_code <> 'active'`);
    if (filters.partyKind) add('p.party_kind = ?', filters.partyKind);
    if (filters.city?.trim()) add('p.city LIKE ?', `%${filters.city.trim()}%`);
    if (filters.hasActiveAssignment) add(`${activeAssignments(studio.id)} > 0`);
    const columns = `p.id, p.code, p.party_kind, p.display_name, p.legal_name, p.email, p.phone, p.city, p.status_code,
      ${statusSql(studio.id)} AS relationship_status,
      (SELECT GROUP_CONCAT(DISTINCT mr.role_code ORDER BY mr.role_code SEPARATOR ',') FROM party_roles mr WHERE mr.party_id = p.id AND mr.business_unit_id = ${studio.id} AND mr.role_code IN ('vendor', 'freelancer', 'studio_partner')) AS managed_roles,
      (SELECT MAX(mr.is_active) FROM party_roles mr WHERE mr.party_id = p.id AND mr.business_unit_id = ${studio.id} AND mr.role_code IN ('vendor', 'freelancer', 'studio_partner')) AS role_is_active,
      (SELECT pc.full_name FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_name,
      ${activeAssignments(studio.id)} AS active_assignment_count, ${assignments(studio.id)} AS total_project_count, ${agreed(studio.id)} AS total_agreed_fee, ${expenses(studio.id)} AS recorded_expenses`;
    const sorts: Record<string, string> = { name: 'p.display_name', created: 'p.created_at', active_assignments: 'active_assignment_count', projects: 'total_project_count', agreed_fee: 'total_agreed_fee', expenses: 'recorded_expenses' };
    const sort = sorts[filters.sortBy || ''] || 'p.display_name'; const direction = filters.sortOrder === 'desc' ? 'DESC' : filters.sortBy && filters.sortBy !== 'name' ? 'DESC' : 'ASC';
    const [rows]: any = await pool.execute(`SELECT ${columns} FROM parties p ${externalJoin(studio.id)} ${where} ORDER BY ${sort} ${direction}, p.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [countRows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM parties p ${externalJoin(studio.id)} ${where}`, params as any[]);
    const total = number(countRows[0]?.total);
    return { items: (rows as any[]).map(mapDirectory), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async summary(studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT COUNT(DISTINCT p.id) AS total_parties,
        COUNT(DISTINCT CASE WHEN p.status_code = 'active' AND ${activeRole(studio.id)} THEN p.id END) AS active_parties,
        COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM party_roles r WHERE r.party_id = p.id AND r.business_unit_id = ${studio.id} AND r.role_code = 'vendor') THEN p.id END) AS vendors,
        COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM party_roles r WHERE r.party_id = p.id AND r.business_unit_id = ${studio.id} AND r.role_code = 'freelancer') THEN p.id END) AS freelancers,
        COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM party_roles r WHERE r.party_id = p.id AND r.business_unit_id = ${studio.id} AND r.role_code = 'studio_partner') THEN p.id END) AS studio_partners,
        COALESCE(SUM(${agreed(studio.id)}), 0) AS total_agreed_fee, COALESCE(SUM(${expenses(studio.id)}), 0) AS recorded_expenses
       FROM parties p ${externalJoin(studio.id)} WHERE p.organization_id = ? AND p.deleted_at IS NULL`, [studio.organizationId],
    );
    const row = rows[0] || {}; return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, number(value)]));
  }

  async getParty(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT p.*, ${statusSql(studio.id)} AS relationship_status FROM parties p ${externalJoin(studio.id)}
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL LIMIT 1`, [id, studio.organizationId],
    );
    return rows[0] || null;
  }
  async getManagedRoles(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(`SELECT id, role_code, is_active, valid_from, valid_until, created_at FROM party_roles WHERE party_id = ? AND business_unit_id = ? AND role_code IN ('vendor', 'freelancer', 'studio_partner') ORDER BY role_code`, [id, studio.id]);
    return (rows as any[]).map(row => ({ ...row, is_active: Boolean(Number(row.is_active)) }));
  }
  async getOtherRoles(id: number) {
    const [rows]: any = await pool.execute(`SELECT role_code, business_unit_id FROM party_roles WHERE party_id = ? AND is_active = 1 AND (valid_from IS NULL OR valid_from <= UTC_DATE()) AND (valid_until IS NULL OR valid_until >= UTC_DATE()) ORDER BY role_code`, [id]);
    return rows as any[];
  }
  async contacts(id: number) { const [rows]: any = await pool.execute('SELECT * FROM party_contacts WHERE party_id = ? ORDER BY is_primary DESC, id ASC', [id]); return (rows as any[]).map(row => ({ ...row, is_primary: Boolean(Number(row.is_primary)) })); }
  async contactCount(id: number) { const [rows]: any = await pool.execute('SELECT COUNT(*) AS total FROM party_contacts WHERE party_id = ?', [id]); return number(rows[0]?.total); }
  async assignments(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT pea.*, sp.project_code, sp.project_name, sp.status_code AS project_status, sp.project_type, sp.start_date AS project_start_date, sp.deadline_at
       FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id
       WHERE pea.party_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL ORDER BY pea.end_date IS NULL DESC, COALESCE(pea.start_date, DATE(sp.created_at)) DESC, pea.id DESC`, [id, studio.id],
    ); return (rows as any[]).map(row => ({ ...row, agreed_fee: number(row.agreed_fee), is_active: !row.end_date && ['approved', 'in_progress', 'review'].includes(row.project_status) }));
  }
  async commercialSummary(id: number, studio: BusinessUnitContext) {
    const [feeRows, expenseRows]: any = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS assignment_count, COALESCE(SUM(pea.agreed_fee), 0) AS total_agreed_fee FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id WHERE pea.party_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL`, [id, studio.id]),
      pool.execute(`SELECT COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS recorded_expenses FROM expenses WHERE party_id = ? AND business_unit_id = ? AND status_code <> 'void'`, [id, studio.id]),
    ]);
    return { assignment_count: number(feeRows[0][0]?.assignment_count), total_agreed_fee: number(feeRows[0][0]?.total_agreed_fee), expense_count: number(expenseRows[0][0]?.expense_count), recorded_expenses: number(expenseRows[0][0]?.recorded_expenses) };
  }
  async expenses(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(`SELECT e.id, e.expense_code, e.expense_date, e.description, e.amount, e.tax_amount, e.currency_code, e.status_code, e.financial_transaction_id, sp.project_code, sp.project_name FROM expenses e LEFT JOIN studio_projects sp ON sp.id = e.studio_project_id WHERE e.party_id = ? AND e.business_unit_id = ? ORDER BY e.expense_date DESC, e.id DESC LIMIT 100`, [id, studio.id]);
    return (rows as any[]).map(row => ({ ...row, amount: number(row.amount), tax_amount: number(row.tax_amount) }));
  }
  async maintenance(id: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(`SELECT mr.id, mr.asset_id, a.asset_code, a.name AS asset_name, mr.maintenance_type, mr.performed_at, mr.cost, mr.next_due_at, mr.notes FROM asset_maintenance_records mr JOIN assets a ON a.id = mr.asset_id WHERE mr.performed_by_party_id = ? AND a.business_unit_id = ? AND a.deleted_at IS NULL ORDER BY mr.performed_at DESC, mr.id DESC LIMIT 100`, [id, studio.id]);
    return (rows as any[]).map(row => ({ ...row, cost: number(row.cost) }));
  }
  async activeAssignmentCount(id: number, studio: BusinessUnitContext) { const [rows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id WHERE pea.party_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL AND pea.end_date IS NULL AND sp.status_code IN ('approved', 'in_progress', 'review')`, [id, studio.id]); return number(rows[0]?.total); }
  async activity(id: number, studio: BusinessUnitContext) { const [rows]: any = await pool.execute(`SELECT a.id, a.action_code, a.description, a.created_at, u.full_name AS actor FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.organization_id = ? AND a.business_unit_id = ? AND a.module_code = 'studio_vendors' AND a.entity_type = 'party' AND a.entity_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 200`, [studio.organizationId, studio.id, id]); return rows as any[]; }
  async projectOptions(studio: BusinessUnitContext) { const [rows]: any = await pool.execute(`SELECT id, project_code, project_name, status_code FROM studio_projects WHERE business_unit_id = ? AND deleted_at IS NULL AND status_code NOT IN ('completed', 'paid', 'cancelled') ORDER BY project_name ASC LIMIT 200`, [studio.id]); return rows as any[]; }
}
