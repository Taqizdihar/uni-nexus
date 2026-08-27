import { pool } from '../../config/database';
import { ACTIVE_CLIENT_PROJECT_STATUSES, COMMITTED_CLIENT_PROJECT_STATUSES, toNumber } from './studio-clients.helpers';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import type { ClientListFilters, ClientProjectFilters } from './studio-clients.types';

const ACTIVE_PROJECT_LIST = ACTIVE_CLIENT_PROJECT_STATUSES.map(status => `'${status}'`).join(',');
const COMMITTED_PROJECT_LIST = COMMITTED_CLIENT_PROJECT_STATUSES.map(status => `'${status}'`).join(',');

/**
 * `businessUnitId` here is always the server-resolved STUDIO business unit id
 * (never user input), so every helper below inlines it as a literal integer.
 * That keeps the many reused fragments below free of positional-placeholder
 * bookkeeping — only genuine filter/user values are bound with `?`.
 */
const activeRoleExists = (businessUnitId: number, partyIdExpr = 'p.id') => `EXISTS (
  SELECT 1 FROM party_roles pr
  WHERE pr.party_id = ${partyIdExpr} AND pr.business_unit_id = ${businessUnitId} AND pr.role_code = 'studio_client'
    AND pr.is_active = 1
    AND (pr.valid_from IS NULL OR pr.valid_from <= UTC_DATE())
    AND (pr.valid_until IS NULL OR pr.valid_until >= UTC_DATE())
)`;

const relationshipPredicates = (businessUnitId: number) => ({
  active: `p.status_code = 'active' AND ${activeRoleExists(businessUnitId)}`,
  role_inactive: `p.status_code = 'active' AND NOT ${activeRoleExists(businessUnitId)}`,
  party_inactive: `p.status_code <> 'active'`,
}) as const;

const relationshipCaseSql = (businessUnitId: number) => `CASE
  WHEN p.status_code <> 'active' THEN 'party_inactive'
  WHEN ${activeRoleExists(businessUnitId)} THEN 'active'
  ELSE 'role_inactive'
END`;

const hasActiveProjectExists = (businessUnitId: number) => `EXISTS (
  SELECT 1 FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId}
    AND sp.deleted_at IS NULL AND sp.status_code IN (${ACTIVE_PROJECT_LIST})
)`;

const meaningfulProjectCountExpr = (businessUnitId: number) => `(
  SELECT COUNT(*) FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId}
    AND sp.deleted_at IS NULL AND sp.status_code <> 'cancelled'
)`;

const outstandingExists = (businessUnitId: number) => `EXISTS (
  SELECT 1 FROM v_accounts_receivable ar WHERE ar.party_id = p.id AND ar.business_unit_id = ${businessUnitId}
)`;

const listColumns = (businessUnitId: number) => `
  p.id, p.code, p.party_kind, p.display_name, p.legal_name, p.email, p.phone, p.city, p.status_code,
  role.is_active AS role_is_active, role.valid_from AS role_valid_from, role.valid_until AS role_valid_until,
  role.created_at AS relationship_since,
  ${relationshipCaseSql(businessUnitId)} AS relationship_status,
  (SELECT pc.full_name FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_name,
  (SELECT COALESCE(pc.email, p.email) FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_email,
  (SELECT COALESCE(pc.phone, p.phone) FROM party_contacts pc WHERE pc.party_id = p.id ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1) AS primary_contact_phone,
  (SELECT COUNT(*) FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL) AS total_project_count,
  (SELECT COUNT(*) FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL AND sp.status_code IN (${ACTIVE_PROJECT_LIST})) AS active_project_count,
  ${meaningfulProjectCountExpr(businessUnitId)} AS meaningful_project_count,
  (SELECT COALESCE(SUM(sp.contract_value), 0) FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL AND sp.status_code IN (${COMMITTED_PROJECT_LIST})) AS committed_contract_value,
  (SELECT MAX(sp.created_at) FROM studio_projects sp WHERE sp.client_party_id = p.id AND sp.business_unit_id = ${businessUnitId} AND sp.deleted_at IS NULL) AS last_project_at,
  (SELECT COALESCE(SUM(ar.balance_due), 0) FROM v_accounts_receivable ar WHERE ar.party_id = p.id AND ar.business_unit_id = ${businessUnitId}) AS outstanding_balance`;

const listJoin = (businessUnitId: number) => `
  FROM parties p
  JOIN party_roles role ON role.party_id = p.id AND role.business_unit_id = ${businessUnitId} AND role.role_code = 'studio_client'`;

const mapClientRow = (row: any) => ({
  ...row,
  role_is_active: Boolean(Number(row.role_is_active)),
  total_project_count: toNumber(row.total_project_count),
  active_project_count: toNumber(row.active_project_count),
  meaningful_project_count: toNumber(row.meaningful_project_count),
  committed_contract_value: toNumber(row.committed_contract_value),
  outstanding_balance: toNumber(row.outstanding_balance),
  repeat_client: toNumber(row.meaningful_project_count) >= 2,
});

export class StudioClientsRepository {
  async getClients(filters: ClientListFilters, studio: BusinessUnitContext) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;
    const predicates = relationshipPredicates(studio.id);

    let where = ` WHERE p.organization_id = ? AND p.deleted_at IS NULL`;
    const params: unknown[] = [studio.organizationId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      add(
        `(p.code LIKE ? OR p.display_name LIKE ? OR p.legal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.tax_id LIKE ?
          OR EXISTS (SELECT 1 FROM party_contacts sc WHERE sc.party_id = p.id AND (sc.full_name LIKE ? OR sc.email LIKE ? OR sc.phone LIKE ?)))`,
        term, term, term, term, term, term, term, term, term,
      );
    }
    if (filters.relationshipStatus) add(predicates[filters.relationshipStatus]);
    if (filters.partyKind) add('p.party_kind = ?', filters.partyKind);
    if (filters.city?.trim()) add('p.city LIKE ?', `%${filters.city.trim()}%`);
    if (filters.hasActiveProject) add(hasActiveProjectExists(studio.id));
    if (filters.repeatClient) add(`${meaningfulProjectCountExpr(studio.id)} >= 2`);
    if (filters.hasOutstanding) add(outstandingExists(studio.id));

    const sortFields: Record<string, string> = {
      name: 'p.display_name',
      created: 'role.created_at',
      last_project: 'last_project_at',
      active_projects: 'active_project_count',
      contract_value: 'committed_contract_value',
      outstanding: 'outstanding_balance',
    };
    const sortField = sortFields[filters.sortBy || ''] || 'p.display_name';
    const sortOrder = filters.sortOrder === 'desc' ? 'DESC' : filters.sortBy && filters.sortBy !== 'name' ? 'DESC' : 'ASC';
    const nullGuard = ['last_project', 'contract_value', 'outstanding', 'active_projects'].includes(filters.sortBy || '') ? `${sortField} IS NULL ASC, ` : '';

    // Interpolated fragments above carry no `?` placeholders (business_unit_id is a
    // literal), so `params` here maps 1:1 to the `?` marks actually present in `where`.
    const [rows]: any = await pool.execute(
      `SELECT ${listColumns(studio.id)} ${listJoin(studio.id)}${where}
       ORDER BY ${nullGuard}${sortField} ${sortOrder}, p.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total ${listJoin(studio.id)}${where}`,
      params as any[],
    );

    const total = Number(countRows[0].total);
    return {
      items: (rows as any[]).map(mapClientRow),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getSummary(studio: BusinessUnitContext) {
    const predicates = relationshipPredicates(studio.id);
    const [rows]: any = await pool.execute(
      `SELECT
        COUNT(*) AS active_clients,
        SUM(${hasActiveProjectExists(studio.id)}) AS clients_with_active_project,
        SUM(${meaningfulProjectCountExpr(studio.id)} >= 2) AS repeat_clients
       FROM parties p
       JOIN party_roles role ON role.party_id = p.id AND role.business_unit_id = ${studio.id} AND role.role_code = 'studio_client'
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND ${predicates.active}`,
      [studio.organizationId],
    );
    const [projectRows]: any = await pool.execute(
      `SELECT COUNT(*) AS active_projects FROM studio_projects
       WHERE business_unit_id = ? AND deleted_at IS NULL AND status_code IN (${ACTIVE_PROJECT_LIST})`,
      [studio.id],
    );
    const [arRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(balance_due), 0) AS outstanding FROM v_accounts_receivable WHERE business_unit_id = ?`,
      [studio.id],
    );
    return {
      active_clients: toNumber(rows[0]?.active_clients),
      clients_with_active_project: toNumber(rows[0]?.clients_with_active_project),
      repeat_clients: toNumber(rows[0]?.repeat_clients),
      active_projects: toNumber(projectRows[0]?.active_projects),
      outstanding_receivables: toNumber(arRows[0]?.outstanding),
    };
  }

  async getClient(partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT p.*, role.id AS role_id, role.is_active AS role_is_active, role.valid_from AS role_valid_from,
              role.valid_until AS role_valid_until, role.created_at AS relationship_since,
              ${relationshipCaseSql(studio.id)} AS relationship_status
       FROM parties p
       JOIN party_roles role ON role.party_id = p.id AND role.business_unit_id = ? AND role.role_code = 'studio_client'
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [studio.id, partyId, studio.organizationId],
    );
    if (!rows.length) return null;
    return { ...rows[0], role_is_active: Boolean(Number(rows[0].role_is_active)) };
  }

  /** Every active role on the Party, informational only — this module never edits another role. */
  async getOtherRoles(partyId: number) {
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT role_code, business_unit_id FROM party_roles
       WHERE party_id = ? AND is_active = 1
         AND (valid_from IS NULL OR valid_from <= UTC_DATE()) AND (valid_until IS NULL OR valid_until >= UTC_DATE())`,
      [partyId],
    );
    return rows as Array<{ role_code: string; business_unit_id: number | null }>;
  }

  async getContacts(partyId: number) {
    const [rows]: any = await pool.execute(
      `SELECT * FROM party_contacts WHERE party_id = ? ORDER BY is_primary DESC, id ASC`,
      [partyId],
    );
    return (rows as any[]).map(row => ({ ...row, is_primary: Boolean(Number(row.is_primary)) }));
  }

  async getContactCount(partyId: number) {
    const [rows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM party_contacts WHERE party_id = ?`, [partyId]);
    return toNumber(rows[0]?.total);
  }

  async getProjectSummary(partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT
        COUNT(*) AS total_projects,
        SUM(status_code IN (${ACTIVE_PROJECT_LIST})) AS active_projects,
        SUM(status_code IN ('completed', 'paid')) AS completed_projects,
        SUM(status_code = 'cancelled') AS cancelled_projects,
        SUM(status_code IN ('lead', 'quotation')) AS pipeline_projects,
        COALESCE(SUM(CASE WHEN status_code IN (${COMMITTED_PROJECT_LIST}) THEN contract_value ELSE 0 END), 0) AS committed_contract_value,
        COALESCE(SUM(CASE WHEN status_code IN ('lead', 'quotation') THEN contract_value ELSE 0 END), 0) AS pipeline_value,
        MAX(created_at) AS last_project_at
       FROM studio_projects WHERE client_party_id = ? AND business_unit_id = ? AND deleted_at IS NULL`,
      [partyId, studio.id],
    );
    const row = rows[0] || {};
    return {
      total_projects: toNumber(row.total_projects),
      active_projects: toNumber(row.active_projects),
      completed_projects: toNumber(row.completed_projects),
      cancelled_projects: toNumber(row.cancelled_projects),
      pipeline_projects: toNumber(row.pipeline_projects),
      committed_contract_value: toNumber(row.committed_contract_value),
      pipeline_value: toNumber(row.pipeline_value),
      last_project_at: row.last_project_at,
      repeat_client: toNumber(row.total_projects) - toNumber(row.cancelled_projects) >= 2,
    };
  }

  async getProjects(partyId: number, studio: BusinessUnitContext, filters: ClientProjectFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let where = ` WHERE sp.client_party_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL`;
    const params: unknown[] = [partyId, studio.id];
    if (filters.status === 'active') where += ` AND sp.status_code IN (${ACTIVE_PROJECT_LIST})`;
    else if (filters.status === 'completed') where += ` AND sp.status_code IN ('completed', 'paid')`;
    else if (filters.status === 'cancelled') where += ` AND sp.status_code = 'cancelled'`;

    const [rows]: any = await pool.execute(
      `SELECT sp.id, sp.project_code, sp.project_name, sp.project_type, sp.status_code, sp.priority_code,
              sp.start_date, sp.deadline_at, sp.completed_at, sp.contract_value, sp.payment_status_code,
              manager.full_name AS manager_name
       FROM studio_projects sp
       LEFT JOIN users manager ON manager.id = sp.project_manager_user_id
       ${where}
       ORDER BY sp.created_at DESC, sp.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );
    const [countRows]: any = await pool.execute(`SELECT COUNT(*) AS total FROM studio_projects sp${where}`, params as any[]);
    const total = Number(countRows[0].total);
    return {
      items: (rows as any[]).map(row => ({ ...row, contract_value: toNumber(row.contract_value) })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getQuotations(partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT q.id, q.quotation_number, q.project_id, sp.project_code, sp.project_name, q.issue_date, q.valid_until,
              q.status_code, q.total_amount, q.accepted_at
       FROM quotations q
       LEFT JOIN studio_projects sp ON sp.id = q.project_id
       WHERE q.party_id = ? AND q.business_unit_id = ?
       ORDER BY q.issue_date DESC, q.id DESC
       LIMIT 100`,
      [partyId, studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, total_amount: toNumber(row.total_amount) }));
  }

  async getInvoices(partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT i.id, i.invoice_number, i.source_type, i.source_id,
              CASE WHEN i.source_type = 'studio_project' THEN sp.project_code ELSE NULL END AS project_code,
              CASE WHEN i.source_type = 'studio_project' THEN sp.project_name ELSE NULL END AS project_name,
              i.issue_date, i.due_date, i.status_code, i.total_amount, i.paid_amount, i.balance_due
       FROM invoices i
       LEFT JOIN studio_projects sp ON i.source_type = 'studio_project' AND sp.id = i.source_id
       WHERE i.party_id = ? AND i.business_unit_id = ?
       ORDER BY i.issue_date DESC, i.id DESC
       LIMIT 100`,
      [partyId, studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, total_amount: toNumber(row.total_amount), paid_amount: toNumber(row.paid_amount), balance_due: toNumber(row.balance_due) }));
  }

  /**
   * Billed/paid/outstanding, computed from canonical invoice fields only — never a second
   * source summed alongside `paid_amount`, and `void` invoices never count as live billed value.
   */
  async getCommercialSummary(partyId: number, studio: BusinessUnitContext) {
    const [invoiceRows]: any = await pool.execute(
      `SELECT COUNT(*) AS invoice_count,
              COALESCE(SUM(CASE WHEN status_code <> 'void' THEN total_amount ELSE 0 END), 0) AS total_invoiced,
              COALESCE(SUM(CASE WHEN status_code <> 'void' THEN paid_amount ELSE 0 END), 0) AS total_paid
       FROM invoices WHERE party_id = ? AND business_unit_id = ?`,
      [partyId, studio.id],
    );
    const [arRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(balance_due), 0) AS outstanding FROM v_accounts_receivable WHERE party_id = ? AND business_unit_id = ?`,
      [partyId, studio.id],
    );
    const [quotationRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(status_code IN ('draft', 'sent')) AS active FROM quotations WHERE party_id = ? AND business_unit_id = ?`,
      [partyId, studio.id],
    );
    return {
      invoice_count: toNumber(invoiceRows[0]?.invoice_count),
      total_invoiced: toNumber(invoiceRows[0]?.total_invoiced),
      total_paid: toNumber(invoiceRows[0]?.total_paid),
      outstanding: toNumber(arRows[0]?.outstanding),
      quotation_count: toNumber(quotationRows[0]?.total),
      active_quotation_count: toNumber(quotationRows[0]?.active),
    };
  }

  async getAuditTrail(partyId: number, organizationId: number) {
    const [rows]: any = await pool.execute(
      `SELECT a.id, a.action_code, a.description, a.created_at, a.user_id, u.full_name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.organization_id = ? AND a.module_code = 'studio_clients' AND a.entity_type = 'party' AND a.entity_id = ?
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 200`,
      [organizationId, partyId],
    );
    return rows as any[];
  }

  /** Project creation/status-change history for every project this client owns, for the Activity tab. */
  async getProjectActivity(partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT h.id, h.from_status_code, h.to_status_code, h.reason, h.changed_at, h.changed_by,
              sp.project_code, sp.project_name, u.full_name AS changed_by_name
       FROM studio_project_status_history h
       JOIN studio_projects sp ON sp.id = h.project_id
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE sp.client_party_id = ? AND sp.business_unit_id = ?
       ORDER BY h.changed_at DESC, h.id DESC
       LIMIT 100`,
      [partyId, studio.id],
    );
    return rows as any[];
  }
}
