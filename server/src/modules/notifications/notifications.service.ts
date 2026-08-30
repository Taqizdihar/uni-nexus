import { pool } from '../../config/database';
import { NotFoundError } from '../../shared/errors/AppError';
import type { NotificationListFilters } from './notifications.types';

type Actor = { id: number; organization_id: number };

const accessPredicate = (alias = 'n') => `(
  ${alias}.business_unit_id IS NULL OR EXISTS (
    SELECT 1 FROM user_business_units access_unit
    JOIN business_units active_unit ON active_unit.id = access_unit.business_unit_id AND active_unit.is_active = 1
    WHERE access_unit.user_id = ? AND access_unit.business_unit_id = ${alias}.business_unit_id AND access_unit.can_access = 1
  )
)`;

const baseWhere = (actor: Actor, extra: string[] = [], params: any[] = []) => ({
  sql: `n.organization_id = ? AND n.user_id = ? AND ${accessPredicate('n')} ${extra.length ? `AND ${extra.join(' AND ')}` : ''}`,
  params: [actor.organization_id, actor.id, actor.id, ...params],
});

const presentation = (row: any) => ({
  id: Number(row.id),
  notification_type: row.notification_type,
  module_code: row.module_code,
  severity_code: row.severity_code,
  title: row.title,
  message: row.message,
  action_url: row.action_url,
  entity_type: row.entity_type,
  entity_id: row.entity_id === null ? null : Number(row.entity_id),
  is_read: Boolean(row.is_read),
  read_at: row.read_at,
  created_at: row.created_at,
  workspace: row.workspace_id ? { id: Number(row.workspace_id), code: row.workspace_code, name: row.workspace_name } : null,
});

export class NotificationsService {
  private filters(filters: NotificationListFilters) {
    const clauses: string[] = [];
    const params: any[] = [];
    if (filters.status === 'unread') clauses.push('n.is_read = 0');
    if (filters.status === 'read') clauses.push('n.is_read = 1');
    if (filters.workspace === 'global') clauses.push('n.business_unit_id IS NULL');
    if (filters.workspace === 'craft' || filters.workspace === 'studio') { clauses.push('LOWER(bu.code) = ?'); params.push(filters.workspace); }
    if (filters.severity !== 'all') { clauses.push('n.severity_code = ?'); params.push(filters.severity); }
    if (filters.module) { clauses.push('n.module_code = ?'); params.push(filters.module); }
    if (filters.q) { clauses.push('(n.title LIKE ? OR n.message LIKE ?)'); const search = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`; params.push(search, search); }
    return { clauses, params };
  }

  async list(actor: Actor, filters: NotificationListFilters) {
    // Express 5 exposes query as a getter, so validation cannot reliably
    // replace coerced defaults on req.query. Normalize at the boundary too.
    const normalized: NotificationListFilters = {
      status: ['all', 'unread', 'read'].includes(String(filters.status)) ? String(filters.status) as NotificationListFilters['status'] : 'all',
      workspace: ['all', 'craft', 'studio', 'global'].includes(String(filters.workspace)) ? String(filters.workspace) as NotificationListFilters['workspace'] : 'all',
      severity: ['all', 'info', 'success', 'warning', 'error', 'critical'].includes(String(filters.severity)) ? String(filters.severity) as NotificationListFilters['severity'] : 'all',
      module: typeof filters.module === 'string' ? filters.module : undefined,
      q: typeof filters.q === 'string' ? filters.q : undefined,
      page: Math.max(1, Number(filters.page) || 1),
      limit: Math.min(100, Math.max(1, Number(filters.limit) || 20)),
    };
    const page = normalized.page;
    const limit = normalized.limit;
    const { clauses, params } = this.filters(normalized);
    const where = baseWhere(actor, clauses, params);
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute<any[]>(
      `SELECT n.id, n.notification_type, n.module_code, n.severity_code, n.title, n.message,
              n.action_url, n.entity_type, n.entity_id, n.is_read, n.read_at, n.created_at,
              bu.id AS workspace_id, bu.code AS workspace_code, bu.name AS workspace_name
       FROM notifications n
       LEFT JOIN business_units bu ON bu.id = n.business_unit_id
       WHERE ${where.sql}
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      where.params,
    );
    const [totals] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS total FROM notifications n
       LEFT JOIN business_units bu ON bu.id = n.business_unit_id
       WHERE ${where.sql}`,
      where.params,
    );
    const total = Number(totals[0]?.total || 0);
    return { items: rows.map(presentation), pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async summary(actor: Actor) {
    const where = baseWhere(actor);
    const [rows] = await pool.execute<any[]>(
      `SELECT
         COALESCE(SUM(n.is_read = 0), 0) AS unread_count,
         COALESCE(SUM(n.is_read = 0 AND n.severity_code = 'critical'), 0) AS critical_unread_count,
         COALESCE(SUM(n.created_at >= DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))), 0) AS today_count
       FROM notifications n WHERE ${where.sql}`,
      where.params,
    );
    const row = rows[0] || {};
    return { unread_count: Number(row.unread_count || 0), critical_unread_count: Number(row.critical_unread_count || 0), today_count: Number(row.today_count || 0) };
  }

  private async accessible(actor: Actor, notificationId: number) {
    const where = baseWhere(actor, ['n.id = ?'], [notificationId]);
    const [rows] = await pool.execute<any[]>(
      `SELECT n.id, n.is_read, n.severity_code FROM notifications n WHERE ${where.sql} LIMIT 1`,
      where.params,
    );
    if (!rows.length) throw new NotFoundError('Notifikasi tidak ditemukan.');
    return rows[0];
  }

  async markRead(actor: Actor, notificationId: number, isRead: boolean) {
    await this.accessible(actor, notificationId);
    const where = baseWhere(actor, ['n.id = ?'], [notificationId]);
    await pool.execute(
      `UPDATE notifications n SET is_read = ?, read_at = ${isRead ? 'UTC_TIMESTAMP(3)' : 'NULL'} WHERE ${where.sql}`,
      [isRead ? 1 : 0, ...where.params],
    );
    return { id: notificationId, is_read: isRead };
  }

  async markAllRead(actor: Actor) {
    const where = baseWhere(actor, ['n.is_read = 0']);
    const [result]: any = await pool.execute(
      `UPDATE notifications n SET n.is_read = 1, n.read_at = UTC_TIMESTAMP(3) WHERE ${where.sql}`,
      where.params,
    );
    return { affected_count: Number(result.affectedRows || 0) };
  }
}

export const notificationsService = new NotificationsService();
