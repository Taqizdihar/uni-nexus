import { pool } from '../../config/database';
import { STUDIO_LOCAL_DATE_SQL, deriveProgress, displayFileName, toNumber } from './studio-projects.helpers';
import { ACTIVE_PROJECT_STATUSES, type MilestoneBoardFilters, type ProjectListFilters } from './studio-projects.types';

/** A project is late when its deadline has passed and it is still open. */
const OVERDUE_SQL = `(p.deadline_at IS NOT NULL AND p.deadline_at < UTC_TIMESTAMP(3) AND p.status_code NOT IN ('completed', 'paid', 'cancelled'))`;

const MILESTONE_AGG = `LEFT JOIN (
  SELECT project_id,
         COUNT(*) AS total,
         SUM(status_code = 'completed') AS done
  FROM project_milestones WHERE status_code <> 'cancelled' GROUP BY project_id
) ms ON ms.project_id = p.id`;

const DELIVERABLE_AGG = `LEFT JOIN (
  SELECT project_id,
         COUNT(*) AS total,
         SUM(status_code IN ('approved', 'delivered')) AS done
  FROM project_deliverables GROUP BY project_id
) dl ON dl.project_id = p.id`;

const SERVICE_AGG = `LEFT JOIN (
  SELECT project_id, COUNT(*) AS total, SUM(line_total) AS subtotal
  FROM studio_project_services GROUP BY project_id
) sv ON sv.project_id = p.id`;

const LIST_COLUMNS = `
  p.id, p.project_code, p.project_name, p.project_type, p.status_code, p.priority_code,
  p.start_date, p.deadline_at, p.completed_at, p.currency_code, p.contract_value,
  p.estimated_cost, p.actual_cost, p.paid_amount, p.payment_status_code,
  p.client_party_id, p.project_manager_user_id, p.created_at, p.updated_at,
  client.display_name AS client_name, client.code AS client_code,
  manager.full_name AS manager_name,
  COALESCE(ms.total, 0) AS milestone_total, COALESCE(ms.done, 0) AS milestone_done,
  COALESCE(dl.total, 0) AS deliverable_total, COALESCE(dl.done, 0) AS deliverable_done,
  COALESCE(sv.total, 0) AS service_count, COALESCE(sv.subtotal, 0) AS service_subtotal,
  (SELECT sps.description FROM studio_project_services sps WHERE sps.project_id = p.id ORDER BY sps.id LIMIT 1) AS primary_service,
  (SELECT COUNT(*) FROM studio_project_members spm WHERE spm.project_id = p.id AND spm.left_at IS NULL) AS member_count,
  ${OVERDUE_SQL} AS is_overdue`;

const LIST_JOINS = `
  FROM studio_projects p
  JOIN parties client ON client.id = p.client_party_id
  LEFT JOIN users manager ON manager.id = p.project_manager_user_id
  ${MILESTONE_AGG}
  ${DELIVERABLE_AGG}
  ${SERVICE_AGG}`;

export const mapProjectRow = (row: any) => ({
  ...row,
  contract_value: toNumber(row.contract_value),
  estimated_cost: toNumber(row.estimated_cost),
  actual_cost: toNumber(row.actual_cost),
  paid_amount: toNumber(row.paid_amount),
  service_subtotal: toNumber(row.service_subtotal),
  milestone_total: toNumber(row.milestone_total),
  milestone_done: toNumber(row.milestone_done),
  deliverable_total: toNumber(row.deliverable_total),
  deliverable_done: toNumber(row.deliverable_done),
  service_count: toNumber(row.service_count),
  member_count: toNumber(row.member_count),
  is_overdue: Boolean(Number(row.is_overdue)),
  progress: deriveProgress(row.status_code, toNumber(row.milestone_total), toNumber(row.milestone_done), toNumber(row.deliverable_total), toNumber(row.deliverable_done)),
});

export class StudioProjectsRepository {
  async getProjects(filters: ProjectListFilters, businessUnitId: number) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let where = ` WHERE p.deleted_at IS NULL AND p.business_unit_id = ?`;
    const params: unknown[] = [businessUnitId];

    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };

    if (filters.search) {
      const term = `%${filters.search}%`;
      add('(p.project_code LIKE ? OR p.project_name LIKE ? OR p.project_type LIKE ? OR p.brief LIKE ? OR client.display_name LIKE ?)', term, term, term, term, term);
    }
    if (filters.status) add('p.status_code = ?', filters.status);
    if (filters.statuses?.length) add(`p.status_code IN (${filters.statuses.map(() => '?').join(',')})`, ...filters.statuses);
    if (filters.priority) add('p.priority_code = ?', filters.priority);
    if (filters.projectType) add('p.project_type = ?', filters.projectType);
    if (filters.clientId) add('p.client_party_id = ?', filters.clientId);
    if (filters.managerId) add('p.project_manager_user_id = ?', filters.managerId);
    if (filters.paymentStatus) add('p.payment_status_code = ?', filters.paymentStatus);
    if (filters.serviceId) add('EXISTS (SELECT 1 FROM studio_project_services fs WHERE fs.project_id = p.id AND fs.service_id = ?)', filters.serviceId);
    if (filters.startDate) add('p.start_date >= ?', filters.startDate);
    if (filters.endDate) add('p.start_date <= ?', filters.endDate);
    if (filters.deadlineFrom) add('p.deadline_at >= ?', filters.deadlineFrom);
    if (filters.deadlineTo) add('p.deadline_at <= ?', filters.deadlineTo);
    if (filters.overdue) where += ` AND ${OVERDUE_SQL}`;

    const sortFields: Record<string, string> = {
      deadline: 'p.deadline_at',
      created: 'p.created_at',
      name: 'p.project_name',
      value: 'p.contract_value',
      priority: `FIELD(p.priority_code, 'low', 'normal', 'high', 'critical')`,
      client: 'client.display_name',
    };
    const sortField = sortFields[filters.sortBy || ''] || 'p.created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    // Deadline sorting must keep undated projects last regardless of direction.
    const nullGuard = sortField === 'p.deadline_at' ? 'p.deadline_at IS NULL ASC, ' : '';

    // This MySQL deployment rejects bound placeholders in LIMIT/OFFSET; both values
    // are clamped integers above so interpolation stays safe.
    const [rows]: any = await pool.execute(
      `SELECT ${LIST_COLUMNS} ${LIST_JOINS} ${where}
       ORDER BY ${nullGuard}${sortField} ${sortOrder}, p.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params as any[],
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total FROM studio_projects p JOIN parties client ON client.id = p.client_party_id ${where}`,
      params as any[],
    );

    const total = Number(countRows[0].total);
    return {
      items: (rows as any[]).map(mapProjectRow),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** Kanban buckets for the Active Projects page — approved / in_progress / review. */
  async getActiveProjects(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT ${LIST_COLUMNS} ${LIST_JOINS}
       WHERE p.deleted_at IS NULL AND p.business_unit_id = ?
         AND p.status_code IN (${ACTIVE_PROJECT_STATUSES.map(() => '?').join(',')})
       ORDER BY p.deadline_at IS NULL ASC, p.deadline_at ASC, FIELD(p.priority_code, 'critical', 'high', 'normal', 'low'), p.id DESC
       LIMIT 300`,
      [businessUnitId, ...ACTIVE_PROJECT_STATUSES],
    );
    return (rows as any[]).map(mapProjectRow);
  }

  async getOverview(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT
        SUM(status_code IN ('approved', 'in_progress', 'review')) AS active_projects,
        SUM(status_code NOT IN ('completed', 'paid', 'cancelled')
            AND deadline_at IS NOT NULL
            AND deadline_at >= UTC_TIMESTAMP(3)
            AND deadline_at < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)) AS due_in_7_days,
        SUM(status_code NOT IN ('completed', 'paid', 'cancelled')
            AND deadline_at IS NOT NULL AND deadline_at < UTC_TIMESTAMP(3)) AS overdue,
        SUM(status_code = 'review') AS in_review,
        SUM(status_code IN ('completed', 'paid')
            AND completed_at IS NOT NULL
            AND YEAR(completed_at) = YEAR(${STUDIO_LOCAL_DATE_SQL})
            AND MONTH(completed_at) = MONTH(${STUDIO_LOCAL_DATE_SQL})) AS completed_this_month,
        SUM(status_code IN ('lead', 'quotation')) AS pipeline,
        COUNT(*) AS total_projects,
        COALESCE(SUM(CASE WHEN status_code IN ('approved', 'in_progress', 'review') THEN contract_value ELSE 0 END), 0) AS active_contract_value
      FROM studio_projects
      WHERE deleted_at IS NULL AND business_unit_id = ?`,
      [businessUnitId],
    );
    const row = rows[0] || {};
    return {
      active_projects: toNumber(row.active_projects),
      due_in_7_days: toNumber(row.due_in_7_days),
      overdue: toNumber(row.overdue),
      in_review: toNumber(row.in_review),
      completed_this_month: toNumber(row.completed_this_month),
      pipeline: toNumber(row.pipeline),
      total_projects: toNumber(row.total_projects),
      active_contract_value: toNumber(row.active_contract_value),
    };
  }

  async getProject(projectId: number, businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT ${LIST_COLUMNS}, p.brief, p.notes, p.created_by,
              client.email AS client_email, client.phone AS client_phone, client.party_kind AS client_kind,
              client.legal_name AS client_legal_name,
              creator.full_name AS created_by_name
       ${LIST_JOINS}
       LEFT JOIN users creator ON creator.id = p.created_by
       WHERE p.id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [projectId, businessUnitId],
    );
    return rows.length ? mapProjectRow(rows[0]) : null;
  }

  async getServices(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT sps.id, sps.service_id, sps.package_id, sps.description, sps.quantity, sps.unit_price, sps.line_total, sps.created_at,
              s.code AS service_code, s.name AS service_name, s.pricing_model, s.unit_label,
              pkg.code AS package_code, pkg.name AS package_name
       FROM studio_project_services sps
       LEFT JOIN studio_services s ON s.id = sps.service_id
       LEFT JOIN service_packages pkg ON pkg.id = sps.package_id
       WHERE sps.project_id = ?
       ORDER BY sps.id ASC`,
      [projectId],
    );
    return (rows as any[]).map(row => ({ ...row, quantity: toNumber(row.quantity), unit_price: toNumber(row.unit_price), line_total: toNumber(row.line_total) }));
  }

  async getMembers(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT spm.user_id, spm.role_label, spm.allocation_percent, spm.joined_at, spm.left_at,
              u.full_name, u.email, u.employee_code, u.avatar_path, u.status_code AS user_status
       FROM studio_project_members spm
       JOIN users u ON u.id = spm.user_id
       WHERE spm.project_id = ?
       ORDER BY spm.left_at IS NOT NULL ASC, spm.joined_at ASC`,
      [projectId],
    );
    return (rows as any[]).map(row => ({ ...row, allocation_percent: row.allocation_percent === null ? null : toNumber(row.allocation_percent) }));
  }

  /** Overdue is derived on read; milestone rows are never mutated by a GET. */
  async getMilestones(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT pm.id, pm.title, pm.description, pm.due_at, pm.status_code, pm.sort_order, pm.completed_at,
              pm.created_at, pm.updated_at,
              (pm.due_at IS NOT NULL AND pm.due_at < UTC_TIMESTAMP(3) AND pm.status_code NOT IN ('completed', 'cancelled')) AS is_overdue,
              (SELECT COUNT(*) FROM project_deliverables pd WHERE pd.milestone_id = pm.id) AS deliverable_count
       FROM project_milestones pm
       WHERE pm.project_id = ?
       ORDER BY pm.sort_order ASC, pm.id ASC`,
      [projectId],
    );
    return (rows as any[]).map(row => ({ ...row, is_overdue: Boolean(Number(row.is_overdue)), deliverable_count: toNumber(row.deliverable_count) }));
  }

  async getDeliverables(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT pd.id, pd.milestone_id, pd.title, pd.description, pd.status_code, pd.due_at, pd.delivered_at,
              pd.external_url, pd.created_at, pd.updated_at,
              pd.storage_path IS NOT NULL AS has_file,
              SUBSTRING_INDEX(pd.storage_path, '/', -1) AS file_name,
              pm.title AS milestone_title,
              (pd.due_at IS NOT NULL AND pd.due_at < UTC_TIMESTAMP(3) AND pd.status_code NOT IN ('approved', 'delivered')) AS is_overdue
       FROM project_deliverables pd
       LEFT JOIN project_milestones pm ON pm.id = pd.milestone_id
       WHERE pd.project_id = ?
       ORDER BY pd.id ASC`,
      [projectId],
    );
    return (rows as any[]).map(row => ({
      ...row,
      has_file: Boolean(Number(row.has_file)),
      is_overdue: Boolean(Number(row.is_overdue)),
      file_name: Number(row.has_file) ? displayFileName(row.file_name) : null,
    }));
  }

  async getExternalAssignments(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT pea.id, pea.party_id, pea.assignment_role, pea.scope_description, pea.agreed_fee,
              pea.payment_status_code, pea.start_date, pea.end_date, pea.notes, pea.created_at,
              party.display_name AS party_name, party.code AS party_code, party.party_kind, party.email, party.phone
       FROM project_external_assignments pea
       JOIN parties party ON party.id = pea.party_id
       WHERE pea.project_id = ?
       ORDER BY pea.end_date IS NOT NULL ASC, pea.id ASC`,
      [projectId],
    );
    return (rows as any[]).map(row => ({ ...row, agreed_fee: toNumber(row.agreed_fee) }));
  }

  async getStatusHistory(projectId: number) {
    const [rows]: any = await pool.execute(
      `SELECT h.id, h.from_status_code, h.to_status_code, h.reason, h.changed_at, h.changed_by,
              u.full_name AS changed_by_name
       FROM studio_project_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.project_id = ?
       ORDER BY h.changed_at DESC, h.id DESC
       LIMIT 200`,
      [projectId],
    );
    return rows as any[];
  }

  async getAuditTrail(projectId: number, organizationId: number) {
    const [rows]: any = await pool.execute(
      `SELECT a.id, a.action_code, a.description, a.created_at, a.user_id, u.full_name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.organization_id = ? AND a.module_code = 'studio_projects'
         AND a.entity_type = 'studio_project' AND a.entity_id = ?
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 200`,
      [organizationId, projectId],
    );
    return rows as any[];
  }

  /** Cross-project milestone board, grouped by the caller. */
  async getMilestoneBoard(filters: MilestoneBoardFilters, businessUnitId: number) {
    let where = ` WHERE p.deleted_at IS NULL AND p.business_unit_id = ? AND p.status_code <> 'cancelled'`;
    const params: unknown[] = [businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };

    if (filters.projectId) add('pm.project_id = ?', filters.projectId);
    if (filters.clientId) add('p.client_party_id = ?', filters.clientId);
    if (filters.managerId) add('p.project_manager_user_id = ?', filters.managerId);
    if (filters.status) add('pm.status_code = ?', filters.status);
    if (filters.dueFrom) add('pm.due_at >= ?', filters.dueFrom);
    if (filters.dueTo) add('pm.due_at <= ?', filters.dueTo);

    const [rows]: any = await pool.execute(
      `SELECT pm.id, pm.project_id, pm.title, pm.description, pm.due_at, pm.status_code, pm.sort_order, pm.completed_at,
              p.project_code, p.project_name, p.status_code AS project_status, p.priority_code,
              client.display_name AS client_name,
              manager.full_name AS manager_name,
              (pm.due_at IS NOT NULL AND pm.due_at < UTC_TIMESTAMP(3) AND pm.status_code NOT IN ('completed', 'cancelled')) AS is_overdue,
              (pm.due_at IS NOT NULL AND pm.due_at >= UTC_TIMESTAMP(3) AND pm.due_at < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)) AS is_due_soon
       FROM project_milestones pm
       JOIN studio_projects p ON p.id = pm.project_id
       JOIN parties client ON client.id = p.client_party_id
       LEFT JOIN users manager ON manager.id = p.project_manager_user_id
       ${where}
       ORDER BY pm.due_at IS NULL ASC, pm.due_at ASC, pm.id ASC
       LIMIT 500`,
      params as any[],
    );
    return (rows as any[]).map(row => ({ ...row, is_overdue: Boolean(Number(row.is_overdue)), is_due_soon: Boolean(Number(row.is_due_soon)) }));
  }

  /** Distinct project types already in use, so the free-text field can still suggest values. */
  async getUsedProjectTypes(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT project_type FROM studio_projects
       WHERE business_unit_id = ? AND deleted_at IS NULL AND project_type IS NOT NULL AND project_type <> ''
       ORDER BY project_type ASC LIMIT 100`,
      [businessUnitId],
    );
    return (rows as any[]).map(row => row.project_type as string);
  }
}
