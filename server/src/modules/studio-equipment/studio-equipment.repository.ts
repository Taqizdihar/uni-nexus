import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import type { AssignmentListFilters, AssetListFilters, MaintenanceListFilters } from './studio-equipment.types';
import { toNumber } from './studio-equipment.shared';

type Executor = PoolConnection | typeof pool;
const asNumber = (value: unknown) => Number(value || 0);
const assignmentStateSql = (alias = 'apa') => `CASE
  WHEN ${alias}.returned_at IS NOT NULL THEN 'returned'
  WHEN ${alias}.assigned_from > UTC_TIMESTAMP(3) THEN 'upcoming'
  WHEN ${alias}.assigned_until IS NOT NULL AND ${alias}.assigned_until < UTC_TIMESTAMP(3) THEN 'overdue'
  ELSE 'active' END`;
const maintenanceStateSql = (alias = 'lm') => `CASE
  WHEN ${alias}.next_due_at IS NULL THEN 'unscheduled'
  WHEN ${alias}.next_due_at < UTC_TIMESTAMP(3) THEN 'overdue'
  WHEN ${alias}.next_due_at < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY) THEN 'due_soon'
  ELSE 'scheduled' END`;

const mapAsset = (row: any) => ({
  ...row,
  id: Number(row.id), business_unit_id: Number(row.business_unit_id), assigned_user_id: row.assigned_user_id === null ? null : Number(row.assigned_user_id),
  purchase_cost: toNumber(row.purchase_cost), current_book_value: toNumber(row.current_book_value), useful_life_months: row.useful_life_months === null ? null : Number(row.useful_life_months),
  current_assignment_id: row.current_assignment_id === null ? null : Number(row.current_assignment_id),
  next_assignment_id: row.next_assignment_id === null ? null : Number(row.next_assignment_id),
  is_effectively_in_use: Boolean(Number(row.is_effectively_in_use)),
});

export class StudioEquipmentRepository {
  async transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try { const result = await work(connection); await connection.commit(); return result; }
    catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async getAsset(assetId: number, businessUnitId: number, connection: Executor = pool, lock = false) {
    const [rows]: any = await connection.execute(
      `SELECT a.* FROM assets a WHERE a.id = ? AND a.business_unit_id = ? AND a.deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`,
      [assetId, businessUnitId],
    );
    return rows[0] ? mapAsset(rows[0]) : null;
  }

  async serialExists(serial: string, businessUnitId: number, excludeAssetId?: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT id FROM assets WHERE business_unit_id = ? AND serial_number = ? AND deleted_at IS NULL ${excludeAssetId ? 'AND id <> ?' : ''} LIMIT 1`,
      excludeAssetId ? [businessUnitId, serial, excludeAssetId] : [businessUnitId, serial],
    );
    return Boolean(rows[0]);
  }

  async isValidCustodian(userId: number, organizationId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT id FROM users WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
       AND status_code = 'active' AND approval_status_code = 'approved' LIMIT 1`, [userId, organizationId],
    );
    return Boolean(rows[0]);
  }

  async isValidMaintenanceParty(partyId: number, organizationId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT id FROM parties WHERE id = ? AND organization_id = ? AND deleted_at IS NULL AND status_code = 'active' LIMIT 1`,
      [partyId, organizationId],
    );
    return Boolean(rows[0]);
  }

  async getProjectForAssignment(projectId: number, businessUnitId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT p.id, p.project_code, p.project_name, p.status_code FROM studio_projects p
       WHERE p.id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL LIMIT 1`, [projectId, businessUnitId],
    );
    return rows[0] || null;
  }

  private assetListColumns() {
    return `a.*, custodian.full_name AS custodian_name,
      current_assignment.id AS current_assignment_id, current_assignment.project_id AS current_project_id,
      current_assignment.assigned_from AS current_assigned_from, current_assignment.assigned_until AS current_assigned_until,
      current_project.project_code AS current_project_code, current_project.project_name AS current_project_name,
      next_assignment.id AS next_assignment_id, next_assignment.project_id AS next_project_id,
      next_assignment.assigned_from AS next_assigned_from, next_assignment.assigned_until AS next_assigned_until,
      next_project.project_code AS next_project_code, next_project.project_name AS next_project_name,
      latest_maintenance.id AS latest_maintenance_id, latest_maintenance.maintenance_type AS latest_maintenance_type,
      latest_maintenance.performed_at AS last_maintenance_at, latest_maintenance.next_due_at,
      ${maintenanceStateSql('latest_maintenance')} AS maintenance_due_state,
      (a.status_code = 'in_use' OR current_assignment.id IS NOT NULL) AS is_effectively_in_use`;
  }

  private assetListJoins() {
    return `LEFT JOIN users custodian ON custodian.id = a.assigned_user_id
      LEFT JOIN asset_project_assignments current_assignment ON current_assignment.id = (
        SELECT ca.id FROM asset_project_assignments ca WHERE ca.asset_id = a.id AND ca.returned_at IS NULL
          AND ca.assigned_from <= UTC_TIMESTAMP(3) AND (ca.assigned_until IS NULL OR ca.assigned_until >= UTC_TIMESTAMP(3))
        ORDER BY ca.assigned_from DESC, ca.id DESC LIMIT 1
      )
      LEFT JOIN studio_projects current_project ON current_project.id = current_assignment.project_id
      LEFT JOIN asset_project_assignments next_assignment ON next_assignment.id = (
        SELECT na.id FROM asset_project_assignments na WHERE na.asset_id = a.id AND na.returned_at IS NULL
          AND na.assigned_from > UTC_TIMESTAMP(3) ORDER BY na.assigned_from ASC, na.id ASC LIMIT 1
      )
      LEFT JOIN studio_projects next_project ON next_project.id = next_assignment.project_id
      LEFT JOIN asset_maintenance_records latest_maintenance ON latest_maintenance.id = (
        SELECT lm.id FROM asset_maintenance_records lm WHERE lm.asset_id = a.id ORDER BY lm.performed_at DESC, lm.id DESC LIMIT 1
      )`;
  }

  async listAssets(businessUnitId: number, filters: AssetListFilters) {
    const page = Math.max(1, filters.page || 1); const limit = Math.min(100, Math.max(1, filters.limit || 20)); const offset = (page - 1) * limit;
    let where = 'WHERE a.business_unit_id = ? AND a.deleted_at IS NULL'; const params: unknown[] = [businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search) { const term = `%${filters.search.trim()}%`; add('(a.asset_code LIKE ? OR a.name LIKE ? OR a.category LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)', term, term, term, term, term, term); }
    if (filters.status) add('a.status_code = ?', filters.status);
    if (filters.category) add('a.category = ?', filters.category);
    if (filters.assignedUserId) add('a.assigned_user_id = ?', filters.assignedUserId);
    if (filters.location) add('a.location_name = ?', filters.location);
    if (filters.maintenanceDue) add(`${maintenanceStateSql('latest_maintenance')} = ?`, filters.maintenanceDue);
    if (filters.assignmentState === 'active') add('current_assignment.id IS NOT NULL');
    if (filters.assignmentState === 'upcoming') add('next_assignment.id IS NOT NULL');
    if (filters.assignmentState === 'overdue') add(`EXISTS (SELECT 1 FROM asset_project_assignments osa WHERE osa.asset_id = a.id AND osa.returned_at IS NULL AND osa.assigned_until < UTC_TIMESTAMP(3))`);
    if (filters.assignmentState === 'none') add(`NOT EXISTS (SELECT 1 FROM asset_project_assignments osa WHERE osa.asset_id = a.id AND osa.returned_at IS NULL)`);
    const sortFields: Record<string, string> = { name: 'a.name', code: 'a.asset_code', category: 'a.category', status: 'a.status_code', location: 'a.location_name', book_value: 'a.current_book_value', maintenance: 'latest_maintenance.next_due_at', created: 'a.created_at' };
    const sort = sortFields[filters.sortBy || ''] || 'a.created_at'; const direction = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const [rows]: any = await pool.execute(`SELECT ${this.assetListColumns()} FROM assets a ${this.assetListJoins()} ${where}
      ORDER BY ${sort === 'latest_maintenance.next_due_at' ? `${sort} IS NULL ASC, ` : ''}${sort} ${direction}, a.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [count]: any = await pool.execute(`SELECT COUNT(*) AS total FROM assets a ${this.assetListJoins()} ${where}`, params as any[]);
    const total = asNumber(count[0]?.total);
    return { items: (rows as any[]).map(mapAsset), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getAssetDetail(assetId: number, businessUnitId: number) {
    const [rows]: any = await pool.execute(`SELECT ${this.assetListColumns()} FROM assets a ${this.assetListJoins()}
      WHERE a.id = ? AND a.business_unit_id = ? AND a.deleted_at IS NULL LIMIT 1`, [assetId, businessUnitId]);
    return rows[0] ? mapAsset(rows[0]) : null;
  }

  async getOverview(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) AS total_assets, SUM(status_code NOT IN ('retired', 'lost')) AS active_assets,
        SUM(status_code = 'available') AS available_assets, SUM(status_code = 'maintenance') AS maintenance_assets,
        SUM(status_code = 'borrowed') AS borrowed_assets, SUM(status_code = 'retired') AS retired_assets, SUM(status_code = 'lost') AS lost_assets,
        SUM(status_code = 'in_use' OR EXISTS (SELECT 1 FROM asset_project_assignments a1 WHERE a1.asset_id = assets.id AND a1.returned_at IS NULL AND a1.assigned_from <= UTC_TIMESTAMP(3) AND (a1.assigned_until IS NULL OR a1.assigned_until >= UTC_TIMESTAMP(3)))) AS in_use_assets,
        COALESCE(SUM(purchase_cost), 0) AS purchase_value, COALESCE(SUM(current_book_value), 0) AS book_value
       FROM assets WHERE business_unit_id = ? AND deleted_at IS NULL`, [businessUnitId],
    );
    const [assignmentRows]: any = await pool.execute(
      `SELECT SUM(returned_at IS NULL AND assigned_from <= UTC_TIMESTAMP(3) AND (assigned_until IS NULL OR assigned_until >= UTC_TIMESTAMP(3))) AS active_assignments,
        SUM(returned_at IS NULL AND assigned_until IS NOT NULL AND assigned_until < UTC_TIMESTAMP(3)) AS overdue_returns,
        SUM(returned_at IS NULL AND assigned_from > UTC_TIMESTAMP(3) AND assigned_from < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)) AS upcoming_bookings
       FROM asset_project_assignments apa JOIN assets a ON a.id = apa.asset_id WHERE a.business_unit_id = ? AND a.deleted_at IS NULL`, [businessUnitId],
    );
    const [maintenanceRows]: any = await pool.execute(
      `SELECT SUM(next_due_at < UTC_TIMESTAMP(3)) AS maintenance_overdue,
        SUM(next_due_at >= UTC_TIMESTAMP(3) AND next_due_at < DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)) AS maintenance_due_soon
       FROM asset_maintenance_records mr JOIN assets a ON a.id = mr.asset_id
       WHERE a.business_unit_id = ? AND a.deleted_at IS NULL
         AND mr.id = (SELECT lm.id FROM asset_maintenance_records lm WHERE lm.asset_id = a.id ORDER BY lm.performed_at DESC, lm.id DESC LIMIT 1)`, [businessUnitId],
    );
    const [activityRows]: any = await pool.execute(
      `SELECT al.id, al.action_code, al.description, al.created_at, u.full_name AS user_name
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       WHERE al.business_unit_id = ? AND al.module_code = 'studio_equipment'
       ORDER BY al.created_at DESC, al.id DESC LIMIT 12`, [businessUnitId],
    );
    const row = rows[0] || {}; const assignments = assignmentRows[0] || {}; const maintenance = maintenanceRows[0] || {};
    return {
      total_assets: asNumber(row.total_assets), active_assets: asNumber(row.active_assets), available_assets: asNumber(row.available_assets), in_use_assets: asNumber(row.in_use_assets), maintenance_assets: asNumber(row.maintenance_assets), borrowed_assets: asNumber(row.borrowed_assets), retired_assets: asNumber(row.retired_assets), lost_assets: asNumber(row.lost_assets),
      active_assignments: asNumber(assignments.active_assignments), overdue_returns: asNumber(assignments.overdue_returns), upcoming_bookings: asNumber(assignments.upcoming_bookings), maintenance_overdue: asNumber(maintenance.maintenance_overdue), maintenance_due_soon: asNumber(maintenance.maintenance_due_soon), purchase_value: asNumber(row.purchase_value), book_value: asNumber(row.book_value), recent_activity: activityRows,
    };
  }

  async listAssignments(businessUnitId: number, filters: AssignmentListFilters) {
    const page = Math.max(1, filters.page || 1); const limit = Math.min(200, Math.max(1, filters.limit || 50)); const offset = (page - 1) * limit;
    let where = 'WHERE a.business_unit_id = ? AND a.deleted_at IS NULL'; const params: unknown[] = [businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.assetId) add('apa.asset_id = ?', filters.assetId); if (filters.projectId) add('apa.project_id = ?', filters.projectId); if (filters.category) add('a.category = ?', filters.category);
    if (filters.startDate) add('apa.assigned_from >= ?', filters.startDate); if (filters.endDate) add('COALESCE(apa.returned_at, apa.assigned_until, \'9999-12-31 23:59:59\') <= ?', `${filters.endDate} 23:59:59`);
    if (filters.state) add(`${assignmentStateSql()} = ?`, filters.state);
    const select = `apa.id, apa.asset_id, apa.project_id, apa.assigned_from, apa.assigned_until, apa.returned_at, apa.assigned_by, apa.notes,
      ${assignmentStateSql()} AS assignment_state, a.asset_code, a.name AS asset_name, a.category, a.status_code AS asset_status,
      p.project_code, p.project_name, p.status_code AS project_status, client.display_name AS client_name, assigner.full_name AS assigned_by_name`;
    const joins = 'FROM asset_project_assignments apa JOIN assets a ON a.id = apa.asset_id JOIN studio_projects p ON p.id = apa.project_id LEFT JOIN parties client ON client.id = p.client_party_id LEFT JOIN users assigner ON assigner.id = apa.assigned_by';
    const [rows]: any = await pool.execute(`SELECT ${select} ${joins} ${where} ORDER BY apa.assigned_from DESC, apa.id DESC LIMIT ${limit} OFFSET ${offset}`, params as any[]);
    const [count]: any = await pool.execute(`SELECT COUNT(*) AS total ${joins} ${where}`, params as any[]);
    const total = asNumber(count[0]?.total); return { items: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async listAssetAssignments(assetId: number, businessUnitId: number) { return (await this.listAssignments(businessUnitId, { assetId, page: 1, limit: 300 })).items; }

  async getAssignment(assignmentId: number, businessUnitId: number, connection: Executor = pool, lock = false) {
    const [rows]: any = await connection.execute(
      `SELECT apa.*, a.asset_code, a.status_code AS asset_status FROM asset_project_assignments apa JOIN assets a ON a.id = apa.asset_id
       WHERE apa.id = ? AND a.business_unit_id = ? AND a.deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`, [assignmentId, businessUnitId],
    ); return rows[0] || null;
  }

  async findAssignmentConflict(assetId: number, from: string, until: string | null, connection: Executor = pool) {
    const end = until || '9999-12-31 23:59:59';
    const [rows]: any = await connection.execute(
      `SELECT apa.id, apa.assigned_from, apa.assigned_until, p.project_code, p.project_name
       FROM asset_project_assignments apa JOIN studio_projects p ON p.id = apa.project_id
       WHERE apa.asset_id = ? AND apa.returned_at IS NULL AND apa.assigned_from < ?
         AND COALESCE(apa.assigned_until, '9999-12-31 23:59:59') > ?
       ORDER BY apa.assigned_from ASC LIMIT 1`, [assetId, end, from],
    ); return rows[0] || null;
  }

  async hasCurrentAssignment(assetId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT id, project_id, assigned_until FROM asset_project_assignments WHERE asset_id = ? AND returned_at IS NULL
       AND assigned_from <= UTC_TIMESTAMP(3) AND (assigned_until IS NULL OR assigned_until >= UTC_TIMESTAMP(3)) LIMIT 1`, [assetId],
    ); return rows[0] || null;
  }

  async hasUnresolvedAssignments(assetId: number, connection: Executor = pool) {
    const [rows]: any = await connection.execute(
      `SELECT id, project_id, assigned_from, assigned_until FROM asset_project_assignments WHERE asset_id = ? AND returned_at IS NULL ORDER BY assigned_from ASC LIMIT 20`, [assetId],
    ); return rows;
  }

  async listMaintenance(businessUnitId: number, filters: MaintenanceListFilters) {
    let where = 'WHERE a.business_unit_id = ? AND a.deleted_at IS NULL'; const params: unknown[] = [businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.assetId) add('mr.asset_id = ?', filters.assetId); if (filters.category) add('a.category = ?', filters.category); if (filters.providerId) add('mr.performed_by_party_id = ?', filters.providerId);
    if (filters.dateFrom) add('mr.performed_at >= ?', filters.dateFrom); if (filters.dateTo) add('mr.performed_at <= ?', `${filters.dateTo} 23:59:59`);
    if (filters.state) add(`${maintenanceStateSql('mr')} = ?`, filters.state);
    const [rows]: any = await pool.execute(
      `SELECT mr.*, a.asset_code, a.name AS asset_name, a.category, a.status_code AS asset_status,
        provider.code AS provider_code, provider.display_name AS provider_name, ${maintenanceStateSql('mr')} AS maintenance_state
       FROM asset_maintenance_records mr JOIN assets a ON a.id = mr.asset_id
       LEFT JOIN parties provider ON provider.id = mr.performed_by_party_id ${where}
       ORDER BY mr.performed_at DESC, mr.id DESC LIMIT 500`, params as any[],
    ); return (rows as any[]).map(row => ({ ...row, id: Number(row.id), asset_id: Number(row.asset_id), performed_by_party_id: row.performed_by_party_id === null ? null : Number(row.performed_by_party_id), cost: asNumber(row.cost) }));
  }

  async getMaintenanceRecord(recordId: number, assetId: number, businessUnitId: number, connection: Executor = pool, lock = false) {
    const [rows]: any = await connection.execute(
      `SELECT mr.* FROM asset_maintenance_records mr JOIN assets a ON a.id = mr.asset_id
       WHERE mr.id = ? AND mr.asset_id = ? AND a.business_unit_id = ? AND a.deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`,
      [recordId, assetId, businessUnitId],
    ); return rows[0] || null;
  }

  async listAssetMaintenance(assetId: number, businessUnitId: number) { return this.listMaintenance(businessUnitId, { assetId }); }

  async listActivity(assetId: number, businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT al.id, al.action_code, al.description, al.old_values, al.new_values, al.created_at, u.full_name AS user_name
       FROM audit_logs al JOIN assets a ON a.id = al.entity_id
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.module_code = 'studio_equipment' AND al.entity_type = 'asset' AND al.entity_id = ? AND a.business_unit_id = ?
       ORDER BY al.created_at DESC, al.id DESC LIMIT 300`, [assetId, businessUnitId],
    ); return rows;
  }

  async getReferences(businessUnitId: number, organizationId: number) {
    const [projects]: any = await pool.execute(
      `SELECT p.id, p.project_code, p.project_name, p.status_code, p.start_date, p.deadline_at, client.display_name AS client_name
       FROM studio_projects p JOIN parties client ON client.id = p.client_party_id
       WHERE p.business_unit_id = ? AND p.deleted_at IS NULL AND p.status_code IN ('approved', 'in_progress', 'review') ORDER BY p.project_name ASC LIMIT 300`, [businessUnitId],
    );
    const [users]: any = await pool.execute(
      `SELECT u.id, u.full_name, u.employee_code, MIN(r.name) AS role_name FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.organization_id = ? AND u.deleted_at IS NULL AND u.status_code = 'active' AND u.approval_status_code = 'approved'
       GROUP BY u.id, u.full_name, u.employee_code ORDER BY u.full_name ASC LIMIT 300`, [organizationId],
    );
    const [parties]: any = await pool.execute(
      `SELECT DISTINCT p.id, p.code, p.display_name, p.party_kind, p.email, p.phone FROM parties p
       LEFT JOIN party_roles pr ON pr.party_id = p.id AND pr.is_active = 1
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND p.status_code = 'active'
         AND (pr.business_unit_id = ? OR pr.business_unit_id IS NULL)
       ORDER BY p.display_name ASC LIMIT 300`, [organizationId, businessUnitId],
    );
    const [categories]: any = await pool.execute(`SELECT DISTINCT category FROM assets WHERE business_unit_id = ? AND deleted_at IS NULL AND TRIM(category) <> '' ORDER BY category ASC`, [businessUnitId]);
    const [locations]: any = await pool.execute(`SELECT DISTINCT location_name FROM assets WHERE business_unit_id = ? AND deleted_at IS NULL AND location_name IS NOT NULL AND TRIM(location_name) <> '' ORDER BY location_name ASC`, [businessUnitId]);
    const [methods]: any = await pool.execute(`SELECT DISTINCT depreciation_method FROM assets WHERE business_unit_id = ? AND deleted_at IS NULL AND depreciation_method IS NOT NULL AND TRIM(depreciation_method) <> '' ORDER BY depreciation_method ASC`, [businessUnitId]);
    return { projects, users, external_parties: parties, categories: categories.map((row: any) => row.category), locations: locations.map((row: any) => row.location_name), depreciation_methods: methods.map((row: any) => row.depreciation_method) };
  }

  async availableAssets(businessUnitId: number, from: string, until: string, category?: string) {
    const params: any[] = [businessUnitId]; let categoryClause = '';
    if (category) { categoryClause = ' AND a.category = ?'; params.push(category); }
    params.push(until, from);
    const [rows]: any = await pool.execute(
      `SELECT a.id, a.asset_code, a.name, a.category, a.brand, a.model, a.status_code, a.location_name, a.assigned_user_id,
              u.full_name AS custodian_name
       FROM assets a LEFT JOIN users u ON u.id = a.assigned_user_id
       WHERE a.business_unit_id = ? AND a.deleted_at IS NULL${categoryClause}
         AND (a.status_code = 'available' OR (a.status_code = 'in_use' AND EXISTS (
           SELECT 1 FROM asset_project_assignments ca WHERE ca.asset_id = a.id AND ca.returned_at IS NULL
             AND ca.assigned_from <= UTC_TIMESTAMP(3) AND (ca.assigned_until IS NULL OR ca.assigned_until >= UTC_TIMESTAMP(3))
         )))
         AND NOT EXISTS (SELECT 1 FROM asset_project_assignments apa WHERE apa.asset_id = a.id AND apa.returned_at IS NULL
           AND apa.assigned_from < ? AND COALESCE(apa.assigned_until, '9999-12-31 23:59:59') > ?)
       ORDER BY a.category ASC, a.name ASC`, params,
    ); return rows;
  }
}

export const studioEquipmentRepository = new StudioEquipmentRepository();
