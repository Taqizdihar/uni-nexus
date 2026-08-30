import ExcelJS from 'exceljs';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { AuditService as AuditWriter } from '../../shared/audit/audit.service';
import { redactAuditDescription } from '../../shared/audit/audit-redaction';
import { jakartaDateStartUtc, jakartaDayBoundsUtc, utcDateTimeSql } from '../../shared/time/jakarta-time';
import type { AuditActionGroup, AuditActor, AuditFilters } from './audit.types';

const MAX_EXPORT_ROWS = 10_000;
const actionGroups: AuditActionGroup[] = ['authentication', 'account', 'create', 'update', 'delete', 'approval', 'finance', 'automation', 'export', 'other'];

const actionGroupSql = (alias = 'a') => `CASE
  WHEN ${alias}.module_code = 'auth' OR ${alias}.action_code IN ('login', 'logout') THEN 'authentication'
  WHEN ${alias}.module_code = 'users' OR ${alias}.action_code LIKE 'account.%' OR ${alias}.action_code LIKE 'profile.%' THEN 'account'
  WHEN ${alias}.module_code LIKE '%finance%' OR ${alias}.action_code LIKE '%finance%' OR ${alias}.action_code LIKE '%payment%' THEN 'finance'
  WHEN ${alias}.module_code LIKE '%automation%' OR ${alias}.action_code LIKE 'automation.%' THEN 'automation'
  WHEN ${alias}.action_code LIKE '%export%' THEN 'export'
  WHEN ${alias}.action_code LIKE '%approve%' OR ${alias}.action_code LIKE '%reject%' OR ${alias}.action_code = 'approval' OR ${alias}.action_code = 'rejection' THEN 'approval'
  WHEN ${alias}.action_code LIKE '%delete%' OR ${alias}.action_code LIKE '%archive%' OR ${alias}.action_code LIKE '%remove%' THEN 'delete'
  WHEN ${alias}.action_code LIKE '%create%' OR ${alias}.action_code LIKE '%add%' OR ${alias}.action_code LIKE '%signup%' THEN 'create'
  WHEN ${alias}.action_code LIKE '%update%' OR ${alias}.action_code LIKE '%change%' OR ${alias}.action_code LIKE '%edit%' THEN 'update'
  ELSE 'other' END`;

const boundedText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : undefined;

const normalise = (source: Partial<AuditFilters>): AuditFilters => ({
  workspace: ['all', 'global', 'craft', 'studio'].includes(String(source.workspace)) ? source.workspace as AuditFilters['workspace'] : 'all',
  module: boundedText(source.module, 80), action: boundedText(source.action, 80),
  action_group: actionGroups.includes(source.action_group as AuditActionGroup) ? source.action_group as AuditActionGroup : undefined,
  user_id: Number.isInteger(Number(source.user_id)) && Number(source.user_id) > 0 ? Number(source.user_id) : undefined,
  entity_type: boundedText(source.entity_type, 80), q: boundedText(source.q, 160),
  from: boundedText(source.from, 10), to: boundedText(source.to, 10),
  page: Math.max(1, Number(source.page) || 1), limit: Math.min(100, Math.max(1, Number(source.limit) || 25)),
});

const auditJson = (value: unknown) => value === null || value === undefined ? '' : JSON.stringify(value);
const spreadsheetText = (value: unknown) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

export class AuditReadService {
  private scoped(actor: AuditActor, input: Partial<AuditFilters> = {}) {
    const filters = normalise(input);
    const clauses = [
      'a.organization_id = ?',
      `(a.business_unit_id IS NULL OR EXISTS (
        SELECT 1 FROM user_business_units accessible_unit
        WHERE accessible_unit.user_id = ? AND accessible_unit.business_unit_id = a.business_unit_id AND accessible_unit.can_access = 1
      ))`,
    ];
    const params: any[] = [Number(actor.organization_id), Number(actor.id)];
    if (filters.workspace === 'global') clauses.push('a.business_unit_id IS NULL');
    if (filters.workspace === 'craft' || filters.workspace === 'studio') { clauses.push('LOWER(bu.code) = ?'); params.push(filters.workspace); }
    if (filters.module) { clauses.push('a.module_code = ?'); params.push(filters.module); }
    if (filters.action) { clauses.push('a.action_code = ?'); params.push(filters.action); }
    if (filters.action_group) { clauses.push(`${actionGroupSql('a')} = ?`); params.push(filters.action_group); }
    if (filters.user_id) { clauses.push('a.user_id = ?'); params.push(filters.user_id); }
    if (filters.entity_type) { clauses.push('a.entity_type = ?'); params.push(filters.entity_type); }
    if (filters.q) {
      const query = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`;
      clauses.push('(a.description LIKE ? OR a.entity_code LIKE ? OR a.module_code LIKE ? OR a.action_code LIKE ? OR actor.full_name LIKE ? OR actor.username LIKE ?)');
      params.push(query, query, query, query, query, query);
    }
    try {
      if (filters.from) { clauses.push('a.created_at >= ?'); params.push(utcDateTimeSql(jakartaDateStartUtc(filters.from))); }
      if (filters.to) { const next = new Date(jakartaDateStartUtc(filters.to).getTime() + 86_400_000); clauses.push('a.created_at < ?'); params.push(utcDateTimeSql(next)); }
    } catch { throw new AppError(400, 'AUDIT_INVALID_DATE', 'Rentang tanggal Audit tidak valid.'); }
    return { filters, where: clauses.join(' AND '), params };
  }

  private joins() {
    return `FROM audit_logs a
      LEFT JOIN business_units bu ON bu.id = a.business_unit_id
      LEFT JOIN users actor ON actor.id = a.user_id
      LEFT JOIN user_roles actor_role_assignment ON actor_role_assignment.user_id = actor.id
      LEFT JOIN roles actor_role ON actor_role.id = actor_role_assignment.role_id AND actor_role.is_active = 1`;
  }

  private present(row: any) {
    const actor = row.actor_id == null ? null : {
      id: Number(row.actor_id), full_name: row.actor_full_name, username: row.actor_username,
      avatar_path: row.actor_avatar_path || null, current_role: row.actor_role_code ? { code: row.actor_role_code, name: row.actor_role_name } : null,
      archived: Boolean(row.actor_deleted_at),
    };
    return {
      id: Number(row.id), created_at: row.created_at, module_code: row.module_code, action_code: row.action_code,
      action_group: row.action_group as AuditActionGroup, description: redactAuditDescription(row.description), actor,
      workspace: row.workspace_id == null ? null : { id: Number(row.workspace_id), code: row.workspace_code, name: row.workspace_name },
      entity: { type: row.entity_type || null, id: row.entity_id == null ? null : Number(row.entity_id), code: row.entity_code || null },
      old_values: AuditWriter.readValues(row.old_values), new_values: AuditWriter.readValues(row.new_values),
      ip_address: row.ip_address || null, user_agent: row.user_agent || null,
    };
  }

  private select() {
    return `a.id,a.created_at,a.module_code,a.action_code,a.entity_type,a.entity_id,a.entity_code,a.description,a.old_values,a.new_values,a.ip_address,a.user_agent,
      ${actionGroupSql('a')} AS action_group,
      bu.id AS workspace_id,bu.code AS workspace_code,bu.name AS workspace_name,
      actor.id AS actor_id,actor.full_name AS actor_full_name,actor.username AS actor_username,actor.avatar_path AS actor_avatar_path,actor.deleted_at AS actor_deleted_at,
      actor_role.code AS actor_role_code,actor_role.name AS actor_role_name`;
  }

  async list(actor: AuditActor, input: Partial<AuditFilters>) {
    const { filters, where, params } = this.scoped(actor, input);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.execute<any[]>(`SELECT ${this.select()} ${this.joins()} WHERE ${where} ORDER BY a.created_at DESC,a.id DESC LIMIT ${filters.limit} OFFSET ${offset}`, params);
    const [totals] = await pool.execute<any[]>(`SELECT COUNT(DISTINCT a.id) AS total ${this.joins()} WHERE ${where}`, params);
    const total = Number(totals[0]?.total || 0);
    return { items: rows.map(row => this.present(row)), pagination: { page: filters.page, limit: filters.limit, total, total_pages: Math.max(1, Math.ceil(total / filters.limit)) } };
  }

  async detail(actor: AuditActor, id: number) {
    const { where, params } = this.scoped(actor);
    const [rows] = await pool.execute<any[]>(`SELECT ${this.select()} ${this.joins()} WHERE ${where} AND a.id = ? ORDER BY a.id DESC LIMIT 1`, [...params, id]);
    if (!rows.length) throw new NotFoundError('Log Audit tidak ditemukan.');
    return this.present(rows[0]);
  }

  async summary(actor: AuditActor, input: Partial<AuditFilters>) {
    const { where, params } = this.scoped(actor, input);
    const [todayStart, nextTodayStart] = jakartaDayBoundsUtc();
    const [rows] = await pool.execute<any[]>(
      `SELECT COUNT(DISTINCT a.id) AS total_in_range,
        COALESCE(SUM(a.created_at >= ? AND a.created_at < ?),0) AS today_count,
        COALESCE(SUM(a.created_at >= ? AND a.created_at < ? AND ${actionGroupSql('a')} = 'authentication'),0) AS auth_today_count,
        COALESCE(SUM(a.created_at >= ? AND a.created_at < ? AND ${actionGroupSql('a')} IN ('create','update','delete','approval','finance','automation')),0) AS change_today_count,
        COUNT(DISTINCT a.user_id) AS unique_actors_in_range
       ${this.joins()} WHERE ${where}`,
      [utcDateTimeSql(todayStart), utcDateTimeSql(nextTodayStart), utcDateTimeSql(todayStart), utcDateTimeSql(nextTodayStart), utcDateTimeSql(todayStart), utcDateTimeSql(nextTodayStart), ...params],
    );
    const row = rows[0] || {};
    return Object.fromEntries(['total_in_range', 'today_count', 'auth_today_count', 'change_today_count', 'unique_actors_in_range'].map(key => [key, Number(row[key] || 0)]));
  }

  async meta(actor: AuditActor, input: Partial<AuditFilters> = {}) {
    // Workspace is retained so switching workspaces never leaks unavailable
    // filter choices; other filter fields are intentionally omitted.
    const { where, params } = this.scoped(actor, { workspace: input.workspace, page: 1, limit: 1 });
    const from = this.joins();
    const [modules] = await pool.execute<any[]>(`SELECT DISTINCT a.module_code AS code ${from} WHERE ${where} AND a.module_code <> '' ORDER BY a.module_code`, params);
    const [actions] = await pool.execute<any[]>(`SELECT DISTINCT a.action_code AS code,${actionGroupSql('a')} AS action_group ${from} WHERE ${where} AND a.action_code <> '' ORDER BY a.action_code`, params);
    const [users] = await pool.execute<any[]>(`SELECT DISTINCT actor.id,actor.full_name,actor.username ${from} WHERE ${where} AND actor.id IS NOT NULL ORDER BY actor.full_name,actor.username`, params);
    const [entities] = await pool.execute<any[]>(`SELECT DISTINCT a.entity_type AS code ${from} WHERE ${where} AND a.entity_type IS NOT NULL AND a.entity_type <> '' ORDER BY a.entity_type`, params);
    const [workspaces] = await pool.execute<any[]>(`SELECT DISTINCT bu.id,bu.code,bu.name ${from} WHERE ${where} AND bu.id IS NOT NULL ORDER BY bu.name`, params);
    const [global] = await pool.execute<any[]>(`SELECT 1 ${from} WHERE ${where} AND a.business_unit_id IS NULL LIMIT 1`, params);
    return {
      modules: modules.map(row => ({ code: String(row.code) })), actions: actions.map(row => ({ code: String(row.code), action_group: row.action_group as AuditActionGroup })),
      action_groups: actionGroups, users: users.map(row => ({ id: Number(row.id), full_name: row.full_name, username: row.username })),
      entity_types: entities.map(row => ({ code: String(row.code) })), workspaces: [{ code: 'all', name: 'Semua workspace' }, ...(global.length ? [{ code: 'global', name: 'Global' }] : []), ...workspaces.map(row => ({ id: Number(row.id), code: row.code, name: row.name }))],
    };
  }

  async export(actor: AuditActor, input: Partial<AuditFilters>, format: 'csv' | 'xlsx') {
    const { where, params } = this.scoped(actor, input);
    const [totalRows] = await pool.execute<any[]>(`SELECT COUNT(DISTINCT a.id) AS total ${this.joins()} WHERE ${where}`, params);
    const total = Number(totalRows[0]?.total || 0);
    if (total > MAX_EXPORT_ROWS) throw new AppError(422, 'AUDIT_EXPORT_TOO_LARGE', `Ekspor dibatasi hingga ${MAX_EXPORT_ROWS.toLocaleString('id-ID')} baris. Persempit filter terlebih dahulu.`);
    const [rows] = await pool.execute<any[]>(`SELECT ${this.select()} ${this.joins()} WHERE ${where} ORDER BY a.created_at DESC,a.id DESC LIMIT ${MAX_EXPORT_ROWS}`, params);
    const items = rows.map(row => this.present(row));
    const headers = ['Timestamp', 'Workspace', 'User', 'Username', 'Module', 'Action', 'Entity Type', 'Entity ID', 'Entity Code', 'Description', 'Old Values', 'New Values', 'IP Address', 'User Agent'];
    const records = items.map(item => [item.created_at, item.workspace?.name || 'Global', item.actor?.full_name || 'Sistem UNI-NEXUS', item.actor?.username || '', item.module_code, item.action_code, item.entity.type || '', item.entity.id || '', item.entity.code || '', item.description || '', auditJson(item.old_values), auditJson(item.new_values), item.ip_address || '', item.user_agent || ''].map(spreadsheetText));
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const csv = [headers, ...records].map(record => record.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
      return { body: Buffer.from(`\uFEFF${csv}`, 'utf8'), contentType: 'text/csv; charset=utf-8', filename: `uni-nexus-audit-log-${stamp}.csv`, total };
    }
    const workbook = new ExcelJS.Workbook(); workbook.creator = 'UNI-NEXUS'; workbook.created = new Date();
    const sheet = workbook.addWorksheet('Log Audit'); sheet.columns = headers.map(header => ({ header, key: header, width: Math.min(42, Math.max(14, header.length + 4)) }));
    records.forEach(record => sheet.addRow(record)); sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.getRow(1).font = { bold: true }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CF' } };
    return { body: Buffer.from(await workbook.xlsx.writeBuffer()), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `uni-nexus-audit-log-${stamp}.xlsx`, total };
  }
}

export const auditReadService = new AuditReadService();
