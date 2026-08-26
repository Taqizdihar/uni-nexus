import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import type { HistoryFilters, PrinterFilters } from './craft-printers.types';

type Executor = PoolConnection | typeof pool;

export class CraftPrintersRepository {
  async transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const result = await work(connection); await connection.commit(); return result; }
    catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async getPrinter(id: number, businessUnitId: number, connection?: Executor, lock = false): Promise<any | undefined> {
    const db = connection || pool;
    const [rows] = await db.execute<any[]>(`SELECT p.* FROM printers p WHERE p.id = ? AND p.business_unit_id = ? ${lock ? 'FOR UPDATE' : ''}`, [id, businessUnitId]);
    return rows[0];
  }

  async getPrinterByCode(code: string, businessUnitId: number, connection?: Executor) {
    const db = connection || pool;
    const [rows] = await db.execute<any[]>('SELECT * FROM printers WHERE code = ? AND business_unit_id = ? AND deleted_at IS NULL', [code, businessUnitId]);
    return rows[0];
  }

  async codeExists(code: string, excludeId?: number, connection?: Executor) {
    const db = connection || pool;
    const [rows] = await db.execute<any[]>(`SELECT id FROM printers WHERE code = ? AND deleted_at IS NULL ${excludeId ? 'AND id <> ?' : ''} LIMIT 1`, excludeId ? [code, excludeId] : [code]);
    return Boolean(rows[0]);
  }

  async serialExists(serial: string, businessUnitId: number, excludeId?: number, connection?: Executor) {
    const db = connection || pool;
    const sql = `SELECT id FROM printers WHERE business_unit_id = ? AND serial_number = ? AND deleted_at IS NULL ${excludeId ? 'AND id <> ?' : ''} LIMIT 1`;
    const [rows] = await db.execute<any[]>(sql, excludeId ? [businessUnitId, serial, excludeId] : [businessUnitId, serial]);
    return Boolean(rows[0]);
  }

  async listPrinters(businessUnitId: number, filters: PrinterFilters) {
    const clauses = ['p.business_unit_id = ?', 'p.deleted_at IS NULL'];
    const values: any[] = [businessUnitId];
    if (filters.archived === true) clauses.push('p.is_active = 0');
    else clauses.push('p.is_active = 1');
    if (filters.status) { clauses.push('p.status_code = ?'); values.push(filters.status); }
    if (filters.printerType) { clauses.push('p.printer_type = ?'); values.push(filters.printerType); }
    if (filters.location) { clauses.push('p.location_name = ?'); values.push(filters.location); }
    if (filters.search) { clauses.push('(p.code LIKE ? OR p.name LIKE ? OR p.brand LIKE ? OR p.model LIKE ?)'); values.push(...Array(4).fill(`%${filters.search}%`)); }
    const [rows] = await pool.execute<any[]>(`
      SELECT p.*,
        a.print_job_id, a.job_code, a.job_name, a.job_status, a.progress_percent, a.started_at, a.estimated_finish_at,
        (SELECT COUNT(*) FROM printer_issues i WHERE i.printer_id = p.id AND i.status_code IN ('open','investigating')) AS open_issue_count,
        (SELECT MAX(FIELD(i.severity_code, 'low','medium','high','critical')) FROM printer_issues i WHERE i.printer_id = p.id AND i.status_code IN ('open','investigating')) AS highest_issue_rank
      FROM printers p
      LEFT JOIN v_printer_current_activity a ON a.printer_id = p.id
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.is_active DESC, p.name ASC`, values);
    return rows;
  }

  async listActivity(businessUnitId: number) {
    const [rows] = await pool.execute<any[]>(`
      SELECT p.*, a.print_job_id, a.job_code, a.job_name, a.job_status, a.progress_percent, a.started_at, a.estimated_finish_at,
        u.full_name AS operator_name
      FROM printers p
      LEFT JOIN v_printer_current_activity a ON a.printer_id = p.id
      LEFT JOIN print_jobs pj ON pj.id = a.print_job_id
      LEFT JOIN users u ON u.id = pj.operator_user_id
      WHERE p.business_unit_id = ? AND p.deleted_at IS NULL AND p.is_active = 1
      ORDER BY FIELD(p.status_code, 'busy','maintenance','error','available','offline'), p.name`, [businessUnitId]);
    return rows;
  }

  async listSchedules(businessUnitId: number, printerId?: number) {
    const [rows] = await pool.execute<any[]>(`
      SELECT s.*, p.code AS printer_code, p.name AS printer_name, p.total_print_hours,
        (SELECT COUNT(*) FROM print_jobs j WHERE j.printer_id = p.id AND j.status_code IN ('completed','failed')
          AND j.finished_at >= COALESCE((SELECT MAX(r.performed_at) FROM printer_maintenance_records r WHERE r.printer_id = p.id AND (r.schedule_id = s.id OR r.maintenance_type = s.maintenance_type)), s.created_at)) AS jobs_since_service
      FROM printer_maintenance_schedules s JOIN printers p ON p.id = s.printer_id
      WHERE p.business_unit_id = ? AND p.deleted_at IS NULL ${printerId ? 'AND s.printer_id = ?' : ''}
      ORDER BY s.is_active DESC, s.next_due_at IS NULL, s.next_due_at, p.name`, printerId ? [businessUnitId, printerId] : [businessUnitId]);
    return rows;
  }

  async getSchedule(scheduleId: number, businessUnitId: number, connection?: Executor, lock = false) {
    const db = connection || pool;
    const [rows] = await db.execute<any[]>(`SELECT s.*, p.business_unit_id, p.total_print_hours, p.name AS printer_name FROM printer_maintenance_schedules s JOIN printers p ON p.id = s.printer_id WHERE s.id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`, [scheduleId, businessUnitId]);
    return rows[0];
  }

  async listRecords(businessUnitId: number, printerId?: number) {
    const [rows] = await pool.execute<any[]>(`
      SELECT r.*, p.code AS printer_code, p.name AS printer_name, u.full_name AS performed_by_name, s.trigger_type
      FROM printer_maintenance_records r JOIN printers p ON p.id = r.printer_id
      LEFT JOIN users u ON u.id = r.performed_by LEFT JOIN printer_maintenance_schedules s ON s.id = r.schedule_id
      WHERE p.business_unit_id = ? AND p.deleted_at IS NULL ${printerId ? 'AND r.printer_id = ?' : ''}
      ORDER BY r.performed_at DESC, r.id DESC`, printerId ? [businessUnitId, printerId] : [businessUnitId]);
    return rows;
  }

  async listIssues(businessUnitId: number, filters: { printerId?: number; status?: string; severity?: string; search?: string }) {
    const clauses = ['p.business_unit_id = ?', 'p.deleted_at IS NULL']; const values: any[] = [businessUnitId];
    if (filters.printerId) { clauses.push('i.printer_id = ?'); values.push(filters.printerId); }
    if (filters.status) { clauses.push('i.status_code = ?'); values.push(filters.status); }
    if (filters.severity) { clauses.push('i.severity_code = ?'); values.push(filters.severity); }
    if (filters.search) { clauses.push('(i.issue_code LIKE ? OR i.title LIKE ? OR i.description LIKE ?)'); values.push(...Array(3).fill(`%${filters.search}%`)); }
    const [rows] = await pool.execute<any[]>(`
      SELECT i.*, p.code AS printer_code, p.name AS printer_name, reporter.full_name AS reported_by_name, assignee.full_name AS assigned_to_name
      FROM printer_issues i JOIN printers p ON p.id = i.printer_id
      LEFT JOIN users reporter ON reporter.id = i.reported_by LEFT JOIN users assignee ON assignee.id = i.assigned_to
      WHERE ${clauses.join(' AND ')} ORDER BY FIELD(i.status_code,'open','investigating','resolved','closed'), FIELD(i.severity_code,'critical','high','medium','low'), i.reported_at DESC`, values);
    return rows;
  }

  async getIssue(issueId: number, businessUnitId: number, connection?: Executor, lock = false) {
    const db = connection || pool;
    const [rows] = await db.execute<any[]>(`SELECT i.*, p.business_unit_id, p.name AS printer_name, p.status_code AS printer_status FROM printer_issues i JOIN printers p ON p.id = i.printer_id WHERE i.id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`, [issueId, businessUnitId]);
    return rows[0];
  }

  async listProfiles(businessUnitId: number, printerId?: number) {
    const [rows] = await pool.execute<any[]>(`
      SELECT pp.*, p.code AS printer_code, p.name AS printer_name, pr.name AS product_name, pv.name AS variant_name
      FROM print_profiles pp LEFT JOIN printers p ON p.id = pp.printer_id
      LEFT JOIN products pr ON pr.id = pp.product_id LEFT JOIN product_variants pv ON pv.id = pp.variant_id
      WHERE pp.business_unit_id = ? ${printerId ? 'AND pp.printer_id = ?' : ''}
      ORDER BY pp.is_default DESC, pp.name`, printerId ? [businessUnitId, printerId] : [businessUnitId]);
    return rows;
  }

  async listHistory(businessUnitId: number, filters: HistoryFilters) {
    const clauses = ['j.business_unit_id = ?']; const values: any[] = [businessUnitId];
    if (filters.printerId) { clauses.push('j.printer_id = ?'); values.push(filters.printerId); }
    if (filters.status) { clauses.push('j.status_code = ?'); values.push(filters.status); }
    if (filters.operatorId) { clauses.push('j.operator_id = ?'); values.push(filters.operatorId); }
    if (filters.dateFrom) { clauses.push('COALESCE(j.finished_at, j.started_at, j.created_at) >= ?'); values.push(filters.dateFrom); }
    if (filters.dateTo) { clauses.push('COALESCE(j.finished_at, j.started_at, j.created_at) <= ?'); values.push(`${filters.dateTo} 23:59:59`); }
    if (filters.search) { clauses.push('(j.job_code LIKE ? OR j.job_name LIKE ? OR p.name LIKE ?)'); values.push(...Array(3).fill(`%${filters.search}%`)); }
    const [rows] = await pool.execute<any[]>(`
      SELECT j.*, p.code AS printer_code, p.name AS printer_name, u.full_name AS operator_name,
        o.order_code, oi.item_description AS order_item_description
      FROM print_jobs j JOIN printers p ON p.id = j.printer_id
      LEFT JOIN users u ON u.id = j.operator_user_id LEFT JOIN craft_orders o ON o.id = j.order_id LEFT JOIN craft_order_items oi ON oi.id = j.order_item_id
      WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(j.finished_at, j.started_at, j.created_at) DESC LIMIT 500`, values);
    return rows;
  }

  async getStats(printerId: number, businessUnitId: number) {
    const [rows] = await pool.execute<any[]>(`
      SELECT COUNT(*) AS total_jobs, SUM(j.status_code = 'completed') AS completed_jobs, SUM(j.status_code = 'failed') AS failed_jobs,
        AVG(CASE WHEN j.actual_print_minutes > 0 THEN j.actual_print_minutes END) AS average_actual_minutes,
        SUM(COALESCE(j.actual_material_g, j.estimated_material_g, 0)) AS material_used
      FROM print_jobs j JOIN printers p ON p.id = j.printer_id WHERE j.printer_id = ? AND p.business_unit_id = ?`, [printerId, businessUnitId]);
    return rows[0] || {};
  }

  async hasActivePhysicalJob(printerId: number, connection?: Executor) {
    const db = connection || pool; const [rows] = await db.execute<any[]>('SELECT id, job_code, status_code FROM print_jobs WHERE printer_id = ? AND status_code IN (\'printing\',\'paused\') LIMIT 1', [printerId]); return rows[0];
  }
  async hasBlockingIssue(printerId: number, connection?: Executor) {
    const db = connection || pool; const [rows] = await db.execute<any[]>('SELECT id, issue_code, title, severity_code FROM printer_issues WHERE printer_id = ? AND status_code IN (\'open\',\'investigating\') AND severity_code IN (\'high\',\'critical\') LIMIT 1', [printerId]); return rows[0];
  }
  async hasScheduledJob(printerId: number, connection?: Executor) {
    const db = connection || pool; const [rows] = await db.execute<any[]>('SELECT id, job_code, status_code FROM print_jobs WHERE printer_id = ? AND status_code IN (\'queued\',\'ready\') LIMIT 1', [printerId]); return rows[0];
  }
  async isValidCraftUser(userId: number, businessUnitId: number, connection?: Executor) {
    const db = connection || pool; const [rows] = await db.execute<any[]>(`SELECT u.id FROM users u JOIN user_business_units ubu ON ubu.user_id = u.id WHERE u.id = ? AND ubu.business_unit_id = ? AND ubu.can_access = 1 AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL LIMIT 1`, [userId, businessUnitId]); return Boolean(rows[0]);
  }
}
