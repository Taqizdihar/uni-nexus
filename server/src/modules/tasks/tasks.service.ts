import { createHash, randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { moduleReadPermissionFor } from '../../shared/access/module-read-permissions';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { notificationService, notifyBestEffort } from '../../shared/notifications/notification.service';
import { jakartaDayBoundsUtc, utcDateTimeSql } from '../../shared/time/jakarta-time';

export type TaskPrincipal = { id: number; organization_id: number; permissions?: string[] };
type DbExecutor = Pick<PoolConnection, 'execute'>;
type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskCreateInput = { title: string; description?: string | null; priority_code?: TaskPriority; business_unit_id?: number | null; start_at?: string | null; due_at?: string | null; reminder_minutes_before?: number | null; assignee_ids?: number[] };
export type GeneratedTaskInput = { organizationId: number; businessUnitId?: number | null; title: string; description?: string | null; priorityCode?: TaskPriority; startAt?: string | null; dueAt?: string | null; reminderMinutesBefore?: number | null; sourceModuleCode: string; sourceType: string; sourceId?: number | null; sourceCode?: string | null; sourceKey: string; actorId?: number | null; };

const can = (user: TaskPrincipal, permission: string) => (user.permissions || []).includes(permission);
const manual = (row: any) => row.source_module_code === 'tasks' && row.source_type === 'manual';
const positive = (value: unknown) => { const result = Number(value); return Number.isInteger(result) && result > 0 ? result : null; };
const clean = (value: unknown, limit: number) => { const result = String(value ?? '').trim(); return result ? result.slice(0, limit) : null; };
const utcOutput = (value: any) => value == null ? null : value instanceof Date ? new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())).toISOString() : `${String(value).replace(' ', 'T').replace(/\.\d+$/, '')}${String(value).endsWith('Z') ? '' : 'Z'}`;
const validPriority = (value: unknown): TaskPriority => ['low', 'normal', 'high', 'critical'].includes(String(value)) ? String(value) as TaskPriority : 'normal';
const sqlLike = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const generatedCode = (organizationId: number, sourceKey: string) => `AUT-${createHash('sha256').update(`${organizationId}:${sourceKey}`).digest('hex').slice(0, 20).toUpperCase()}`;

const instant = (value: string | null | undefined) => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(raw)) return raw;
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(raw)) throw new AppError(400, 'TIMEZONE_REQUIRED', 'Waktu harus memakai offset zona waktu eksplisit.');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATETIME', 'Format waktu tidak valid.');
  return utcDateTimeSql(date);
};

const taskActionUrl = (id: number) => `/app/calendar?tab=tasks&task=${id}`;

export class TasksService {
  private sourceAllowed(row: any, user: TaskPrincipal) {
    if (manual(row)) return true;
    const permission = moduleReadPermissionFor(row.source_module_code, row.business_unit_code);
    return Boolean(permission && can(user, permission));
  }

  private capabilities(row: any, user: TaskPrincipal, assigned = false) {
    const owner = Number(row.created_by) === user.id;
    const manage = can(user, 'tasks.manage');
    const write = can(user, 'tasks.write');
    return {
      can_edit: Boolean(manual(row) && write && (owner || manage)),
      can_delete: Boolean((owner && write && manual(row)) || (manage && manual(row))),
      can_change_status: Boolean(write && (owner || manage || assigned)),
      can_manage_assignees: Boolean(manual(row) && write && (owner || manage)),
    };
  }

  private async assigneesFor(ids: number[], connection: DbExecutor = pool) {
    if (!ids.length) return new Map<number, any[]>();
    const [rows]: any = await connection.execute(
      `SELECT ta.task_id,u.id,u.full_name,u.username,u.avatar_path,ta.assigned_by,ta.assigned_at
       FROM task_assignees ta JOIN users u ON u.id=ta.user_id
       WHERE ta.task_id IN (${ids.map(() => '?').join(',')}) ORDER BY u.full_name,u.id`, ids,
    );
    const grouped = new Map<number, any[]>();
    for (const row of rows) { const id = Number(row.task_id); const list = grouped.get(id) || []; list.push({ id: Number(row.id), name: row.full_name, username: row.username, avatar_path: row.avatar_path, assigned_at: row.assigned_at }); grouped.set(id, list); }
    return grouped;
  }

  private dto(row: any, user: TaskPrincipal, assignees: any[] = []) {
    const assigned = assignees.some((item) => item.id === user.id);
    return {
      id: Number(row.id), task_code: row.task_code, title: row.title, description: row.description,
      status: row.status_code, priority: row.priority_code, start_at: utcOutput(row.start_at), due_at: utcOutput(row.due_at),
      completed_at: utcOutput(row.completed_at), reminder_minutes_before: row.reminder_minutes_before == null ? null : Number(row.reminder_minutes_before),
      source: { module_code: row.source_module_code, type: row.source_type, id: row.source_id == null ? null : Number(row.source_id), code: row.source_code, key: row.source_key },
      source_owned: !manual(row), workspace: row.business_unit_id == null ? null : { id: Number(row.business_unit_id), code: row.business_unit_code, name: row.business_unit_name },
      creator: row.created_by == null ? null : { id: Number(row.created_by), name: row.creator_name || 'Pengguna' }, assignees,
      created_at: utcOutput(row.created_at), updated_at: utcOutput(row.updated_at), capabilities: this.capabilities(row, user, assigned),
    };
  }

  private async accessible(id: number, user: TaskPrincipal, connection: DbExecutor = pool, lock = false) {
    const [rows]: any = await connection.execute(
      `SELECT t.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS creator_name
       FROM tasks t LEFT JOIN business_units bu ON bu.id=t.business_unit_id LEFT JOIN users u ON u.id=t.created_by
       WHERE t.id=? AND t.organization_id=? AND t.deleted_at IS NULL
         AND (t.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=t.business_unit_id AND ubu.can_access=1)) ${lock ? 'FOR UPDATE' : ''}`,
      [id, user.organization_id, user.id],
    );
    if (!rows.length || !this.sourceAllowed(rows[0], user)) throw new NotFoundError('Tugas tidak ditemukan.');
    return rows[0];
  }

  private async assertScope(user: TaskPrincipal, businessUnitId: number | null | undefined) {
    if (businessUnitId == null) { if (!can(user, 'tasks.manage')) throw new AppError(403, 'TASK_GLOBAL_MANAGE_REQUIRED', 'Izin tasks.manage diperlukan untuk tugas global.'); return null; }
    const [rows]: any = await pool.execute(
      `SELECT id FROM business_units WHERE id=? AND organization_id=? AND is_active=1 AND EXISTS
       (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=business_units.id AND ubu.can_access=1)`,
      [businessUnitId, user.organization_id, user.id],
    );
    if (!rows.length) throw new NotFoundError('Workspace tugas tidak ditemukan.');
    return Number(businessUnitId);
  }

  private async assertAssignees(organizationId: number, businessUnitId: number | null, ids: number[], connection: DbExecutor) {
    const normalized = [...new Set(ids.map(positive).filter((value): value is number => value != null))];
    if (normalized.length !== ids.length) throw new AppError(400, 'INVALID_ASSIGNEE', 'Penugasan pengguna tidak valid.');
    if (!normalized.length) return normalized;
    const params: any[] = [organizationId, ...normalized];
    let sql = `SELECT u.id FROM users u WHERE u.organization_id=? AND u.id IN (${normalized.map(() => '?').join(',')})
      AND u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved'`;
    if (businessUnitId != null) { sql += ' AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=u.id AND ubu.business_unit_id=? AND ubu.can_access=1)'; params.push(businessUnitId); }
    const [rows]: any = await connection.execute(sql, params);
    if (rows.length !== normalized.length) throw new AppError(400, 'INVALID_ASSIGNEE', 'Salah satu pengguna tidak dapat ditugaskan pada workspace ini.');
    return normalized;
  }

  private async replaceAssignees(task: any, ids: number[], actorId: number, connection: DbExecutor) {
    const desired = await this.assertAssignees(Number(task.organization_id), task.business_unit_id == null ? null : Number(task.business_unit_id), ids, connection);
    const [previousRows]: any = await connection.execute('SELECT user_id FROM task_assignees WHERE task_id=? FOR UPDATE', [task.id]);
    const previous = previousRows.map((item: any) => Number(item.user_id));
    const removed = previous.filter((id: number) => !desired.includes(id)); const added = desired.filter((id) => !previous.includes(id));
    if (removed.length) await connection.execute(`DELETE FROM task_assignees WHERE task_id=? AND user_id IN (${removed.map(() => '?').join(',')})`, [task.id, ...removed]);
    for (const userId of added) await connection.execute('INSERT INTO task_assignees (task_id,user_id,assigned_by) VALUES (?,?,?)', [task.id, userId, actorId]);
    return { added, removed };
  }

  private async notifyAssignments(task: any, userIds: number[]) {
    const recipients = userIds.filter((id) => id !== Number(task.created_by));
    if (!recipients.length) return;
    await notifyBestEffort(() => notificationService.createForUsers(recipients, {
      organizationId: Number(task.organization_id), businessUnitId: task.business_unit_id == null ? null : Number(task.business_unit_id), notificationType: 'task_assignment', moduleCode: 'tasks', severityCode: 'info',
      title: 'Tugas baru diberikan kepada Anda', message: task.title, actionUrl: taskActionUrl(Number(task.id)), entityType: 'task', entityId: Number(task.id), dedupeKey: `task:${task.id}:assignment:${task.updated_at || 'initial'}`,
    }, { businessUnitId: task.business_unit_id == null ? null : Number(task.business_unit_id), permissionCode: 'tasks.read' }));
  }

  async create(user: TaskPrincipal, input: TaskCreateInput) {
    const title = clean(input.title, 220); if (!title) throw new AppError(400, 'TASK_TITLE_REQUIRED', 'Judul tugas wajib diisi.');
    const scope = await this.assertScope(user, input.business_unit_id == null ? null : positive(input.business_unit_id));
    const startAt = instant(input.start_at); const dueAt = instant(input.due_at);
    if (startAt && dueAt && dueAt < startAt) throw new AppError(400, 'TASK_DATE_ORDER', 'Jatuh tempo harus setelah waktu mulai.');
    const reminder = input.reminder_minutes_before == null ? null : Number(input.reminder_minutes_before);
    if (reminder != null && (!Number.isInteger(reminder) || reminder < 0 || reminder > 1_008_000)) throw new AppError(400, 'INVALID_REMINDER', 'Pengingat tugas tidak valid.');
    const connection = await pool.getConnection(); let created: any; let changes: any;
    try {
      await connection.beginTransaction();
      const pendingCode = `TMP-${randomUUID()}`;
      const [result]: any = await connection.execute(
        `INSERT INTO tasks (organization_id,business_unit_id,task_code,title,description,status_code,priority_code,start_at,due_at,reminder_minutes_before,source_module_code,source_type,source_id,source_code,source_key,created_by,updated_by)
         VALUES (?,?,?, ?,?,'todo',?,?,?,?,'tasks','manual',NULL,NULL,NULL,?,?)`,
        [user.organization_id, scope, pendingCode, title, clean(input.description, 10_000), validPriority(input.priority_code), startAt, dueAt, reminder, user.id, user.id],
      );
      const id = Number(result.insertId); const taskCode = `TSK-${String(id).padStart(6, '0')}`;
      await connection.execute('UPDATE tasks SET task_code=? WHERE id=?', [taskCode, id]);
      const [rows]: any = await connection.execute('SELECT * FROM tasks WHERE id=? FOR UPDATE', [id]); created = rows[0]; created.task_code = taskCode;
      changes = await this.replaceAssignees(created, input.assignee_ids || [], user.id, connection);
      await AuditService.write({ organizationId: user.organization_id, businessUnitId: scope, userId: user.id, moduleCode: 'tasks', actionCode: 'tasks.create', entityType: 'task', entityId: id, entityCode: taskCode, description: 'Membuat tugas manual.', newValues: { title, priority_code: validPriority(input.priority_code), assignee_ids: input.assignee_ids || [] } }, connection);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await this.notifyAssignments(created, changes.added);
    return this.get(Number(created.id), user);
  }

  /** Used by automation actions. A deterministic source key makes retries safe. */
  async createGenerated(input: GeneratedTaskInput, connection?: DbExecutor) {
    const key = clean(input.sourceKey, 190); if (!key) throw new AppError(400, 'TASK_SOURCE_KEY_REQUIRED', 'Tugas otomatis membutuhkan source key deterministik.');
    const execute = async (db: DbExecutor) => {
      const [existing]: any = await db.execute('SELECT id,task_code FROM tasks WHERE organization_id=? AND source_key=? LIMIT 1', [input.organizationId, key]);
      if (existing.length) return { id: Number(existing[0].id), task_code: existing[0].task_code, reused: true };
      try {
        const [result]: any = await db.execute(
          `INSERT INTO tasks (organization_id,business_unit_id,task_code,title,description,status_code,priority_code,start_at,due_at,reminder_minutes_before,source_module_code,source_type,source_id,source_code,source_key,created_by,updated_by)
           VALUES (?,?,?, ?,?,'todo',?,?,?,?,?,?,?,?,?,?,?)`,
          [input.organizationId, input.businessUnitId == null ? null : Number(input.businessUnitId), generatedCode(input.organizationId, key), clean(input.title, 220) || 'Tindak lanjut otomasi', clean(input.description, 10_000), validPriority(input.priorityCode), instant(input.startAt), instant(input.dueAt), input.reminderMinutesBefore == null ? null : Number(input.reminderMinutesBefore), clean(input.sourceModuleCode, 80), clean(input.sourceType, 60), input.sourceId == null ? null : Number(input.sourceId), clean(input.sourceCode, 120), key, input.actorId == null ? null : Number(input.actorId), input.actorId == null ? null : Number(input.actorId)],
        );
        const id = Number(result.insertId); const [rows]: any = await db.execute('SELECT * FROM tasks WHERE id=?', [id]);
        await AuditService.write({ organizationId: input.organizationId, businessUnitId: input.businessUnitId ?? null, userId: input.actorId ?? null, moduleCode: 'tasks', actionCode: 'tasks.automation_create', entityType: 'task', entityId: id, entityCode: rows[0]?.task_code, description: 'Membuat tugas dari otomasi.', newValues: { source_key: key, source_module_code: input.sourceModuleCode } }, db as any);
        return { id, task_code: rows[0]?.task_code, reused: false };
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_ENTRY') throw error;
        const [race]: any = await db.execute('SELECT id,task_code FROM tasks WHERE organization_id=? AND source_key=? LIMIT 1', [input.organizationId, key]);
        if (race.length) return { id: Number(race[0].id), task_code: race[0].task_code, reused: true };
        throw error;
      }
    };
    if (connection) return execute(connection);
    const transaction = await pool.getConnection();
    try { await transaction.beginTransaction(); const result = await execute(transaction); await transaction.commit(); return result; }
    catch (error) { await transaction.rollback(); throw error; } finally { transaction.release(); }
  }

  async get(id: number, user: TaskPrincipal) {
    const row = await this.accessible(id, user); const assignees = await this.assigneesFor([id]); return this.dto(row, user, assignees.get(id) || []);
  }

  async list(user: TaskPrincipal, filters: any = {}) {
    const page = Math.max(1, Number(filters.page) || 1); const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where = ['t.organization_id=?', 't.deleted_at IS NULL', '(t.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=t.business_unit_id AND ubu.can_access=1))'];
    const params: any[] = [user.organization_id, user.id];
    if (filters.workspace === 'global') where.push('t.business_unit_id IS NULL');
    if (filters.workspace === 'craft' || filters.workspace === 'studio') { where.push('LOWER(bu.code)=?'); params.push(filters.workspace); }
    if (['todo', 'in_progress', 'blocked', 'done', 'cancelled'].includes(String(filters.status))) { where.push('t.status_code=?'); params.push(filters.status); }
    if (['low', 'normal', 'high', 'critical'].includes(String(filters.priority))) { where.push('t.priority_code=?'); params.push(filters.priority); }
    if (filters.mine === true || filters.mine === 'true') { where.push('EXISTS (SELECT 1 FROM task_assignees mine WHERE mine.task_id=t.id AND mine.user_id=?)'); params.push(user.id); }
    if (positive(filters.assignee_id)) { where.push('EXISTS (SELECT 1 FROM task_assignees assignee WHERE assignee.task_id=t.id AND assignee.user_id=?)'); params.push(positive(filters.assignee_id)); }
    if (filters.due === 'overdue') { where.push("t.due_at < UTC_TIMESTAMP(3) AND t.status_code NOT IN ('done','cancelled')"); }
    if (filters.due === 'today') { const [start, end] = jakartaDayBoundsUtc(); where.push("t.due_at >= ? AND t.due_at < ? AND t.status_code NOT IN ('done','cancelled')"); params.push(utcDateTimeSql(start), utcDateTimeSql(end)); }
    if (filters.due === 'week') { const [, end] = jakartaDayBoundsUtc(new Date(Date.now() + 6 * 86_400_000)); where.push("t.due_at >= ? AND t.due_at < ? AND t.status_code NOT IN ('done','cancelled')"); params.push(utcDateTimeSql(jakartaDayBoundsUtc()[0]), utcDateTimeSql(end)); }
    if (filters.q) { const term = sqlLike(String(filters.q).slice(0, 120)); where.push('(t.task_code LIKE ? ESCAPE \'\\\\\' OR t.title LIKE ? ESCAPE \'\\\\\' OR t.description LIKE ? ESCAPE \'\\\\\' OR t.source_code LIKE ? ESCAPE \'\\\\\')'); params.push(term, term, term, term); }
    const sql = `SELECT t.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS creator_name FROM tasks t LEFT JOIN business_units bu ON bu.id=t.business_unit_id LEFT JOIN users u ON u.id=t.created_by WHERE ${where.join(' AND ')} ORDER BY t.due_at IS NULL,t.due_at ASC,t.id DESC`;
    const [allRows]: any = await pool.execute(sql, params); const allowed = allRows.filter((row: any) => this.sourceAllowed(row, user));
    const total = allowed.length; const rows = allowed.slice((page - 1) * limit, page * limit); const grouped = await this.assigneesFor(rows.map((row: any) => Number(row.id)));
    return { items: rows.map((row: any) => this.dto(row, user, grouped.get(Number(row.id)) || [])), pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async summary(user: TaskPrincipal) {
    const listed = await this.list(user, { page: 1, limit: 1000 }); const [todayStart, todayEnd] = jakartaDayBoundsUtc(); const now = new Date();
    const active = listed.items.filter((task: any) => !['done', 'cancelled'].includes(task.status));
    return { my_active: active.filter((task: any) => task.assignees.some((assignee: any) => assignee.id === user.id)).length, due_today: active.filter((task: any) => task.due_at && new Date(task.due_at) >= todayStart && new Date(task.due_at) < todayEnd).length, overdue: active.filter((task: any) => task.due_at && new Date(task.due_at) < now).length, completed_this_week: listed.items.filter((task: any) => task.status === 'done' && task.completed_at && new Date(task.completed_at) >= new Date(todayStart.getTime() - 6 * 86_400_000)).length };
  }

  async meta(user: TaskPrincipal) {
    const [workspaces]: any = await pool.execute(`SELECT bu.id,bu.code,bu.name FROM business_units bu WHERE bu.organization_id=? AND bu.is_active=1 AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=bu.id AND ubu.can_access=1) ORDER BY bu.name`, [user.organization_id, user.id]);
    const [people]: any = await pool.execute(`SELECT DISTINCT u.id,u.full_name,u.username,u.avatar_path FROM users u WHERE u.organization_id=? AND u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' ORDER BY u.full_name LIMIT 250`, [user.organization_id]);
    return { workspaces: workspaces.map((row: any) => ({ id: Number(row.id), code: row.code, name: row.name })), assignees: people.map((row: any) => ({ id: Number(row.id), name: row.full_name, username: row.username, avatar_path: row.avatar_path })), statuses: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'], priorities: ['low', 'normal', 'high', 'critical'] };
  }

  async update(id: number, user: TaskPrincipal, input: Partial<TaskCreateInput>) {
    const original = await this.accessible(id, user); if (!manual(original)) throw new AppError(409, 'SOURCE_TASK_READ_ONLY', 'Tugas milik sumber hanya dapat diperbarui dari sumbernya.'); if (!(can(user, 'tasks.write') && (Number(original.created_by) === user.id || can(user, 'tasks.manage')))) throw new AppError(403, 'TASK_EDIT_DENIED', 'Hanya pembuat atau pengelola yang dapat mengubah tugas.');
    const title = input.title === undefined ? original.title : clean(input.title, 220); if (!title) throw new AppError(400, 'TASK_TITLE_REQUIRED', 'Judul tugas wajib diisi.');
    const startAt = input.start_at === undefined ? original.start_at : instant(input.start_at); const dueAt = input.due_at === undefined ? original.due_at : instant(input.due_at);
    if (startAt && dueAt && String(dueAt) < String(startAt)) throw new AppError(400, 'TASK_DATE_ORDER', 'Jatuh tempo harus setelah waktu mulai.');
    const reminder = input.reminder_minutes_before === undefined ? original.reminder_minutes_before : input.reminder_minutes_before == null ? null : Number(input.reminder_minutes_before);
    if (reminder != null && (!Number.isInteger(reminder) || reminder < 0 || reminder > 1_008_000)) throw new AppError(400, 'INVALID_REMINDER', 'Pengingat tugas tidak valid.');
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); await connection.execute('UPDATE tasks SET title=?,description=?,priority_code=?,start_at=?,due_at=?,reminder_minutes_before=?,updated_by=? WHERE id=? AND organization_id=?', [title, input.description === undefined ? original.description : clean(input.description, 10_000), input.priority_code === undefined ? original.priority_code : validPriority(input.priority_code), startAt, dueAt, reminder, user.id, id, user.organization_id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: original.business_unit_id, userId: user.id, moduleCode: 'tasks', actionCode: 'tasks.update', entityType: 'task', entityId: id, entityCode: original.task_code, description: 'Memperbarui metadata tugas.', oldValues: { title: original.title, priority_code: original.priority_code, due_at: original.due_at }, newValues: { title, priority_code: input.priority_code === undefined ? original.priority_code : validPriority(input.priority_code), due_at: dueAt } }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return this.get(id, user);
  }

  async changeStatus(id: number, user: TaskPrincipal, status: TaskStatus) {
    if (!['todo', 'in_progress', 'blocked', 'done', 'cancelled'].includes(status)) throw new AppError(400, 'INVALID_TASK_STATUS', 'Status tugas tidak valid.');
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); const task = await this.accessible(id, user, connection, true); const [assignedRows]: any = await connection.execute('SELECT 1 FROM task_assignees WHERE task_id=? AND user_id=?', [id, user.id]); const allowed = can(user, 'tasks.write') && (can(user, 'tasks.manage') || Number(task.created_by) === user.id || assignedRows.length > 0); if (!allowed) throw new AppError(403, 'TASK_STATUS_DENIED', 'Anda tidak dapat mengubah status tugas ini.');
      const transitions: Record<TaskStatus, TaskStatus[]> = { todo: ['in_progress', 'cancelled'], in_progress: ['blocked', 'done', 'cancelled'], blocked: ['in_progress', 'cancelled'], done: ['in_progress'], cancelled: ['in_progress'] };
      if (task.status_code !== status && !transitions[task.status_code as TaskStatus].includes(status)) throw new AppError(409, 'TASK_STATUS_TRANSITION_INVALID', 'Perubahan status tugas tidak diizinkan.');
      await connection.execute('UPDATE tasks SET status_code=?,completed_at=?,updated_by=? WHERE id=?', [status, status === 'done' ? utcDateTimeSql(new Date()) : null, user.id, id]);
      await AuditService.write({ organizationId: user.organization_id, businessUnitId: task.business_unit_id, userId: user.id, moduleCode: 'tasks', actionCode: 'tasks.status_change', entityType: 'task', entityId: id, entityCode: task.task_code, description: 'Mengubah status tugas.', oldValues: { status_code: task.status_code, completed_at: task.completed_at }, newValues: { status_code: status, completed_at: status === 'done' ? 'set' : null } }, connection); await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return this.get(id, user);
  }

  async setAssignees(id: number, user: TaskPrincipal, assigneeIds: number[]) {
    const connection = await pool.getConnection(); let task: any; let change: any;
    try { await connection.beginTransaction(); task = await this.accessible(id, user, connection, true); if (!manual(task)) throw new AppError(409, 'SOURCE_TASK_READ_ONLY', 'Penugasan tugas milik sumber dikelola oleh sumbernya.'); if (!(can(user, 'tasks.write') && (Number(task.created_by) === user.id || can(user, 'tasks.manage')))) throw new AppError(403, 'TASK_ASSIGNEE_DENIED', 'Hanya pembuat atau pengelola yang dapat mengubah penugasan.'); change = await this.replaceAssignees(task, assigneeIds, user.id, connection); await connection.execute('UPDATE tasks SET updated_by=? WHERE id=?', [user.id, id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: task.business_unit_id, userId: user.id, moduleCode: 'tasks', actionCode: 'tasks.assignees_change', entityType: 'task', entityId: id, entityCode: task.task_code, description: 'Memperbarui penugasan tugas.', newValues: change }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await this.notifyAssignments(task, change.added); return this.get(id, user);
  }

  async archive(id: number, user: TaskPrincipal) {
    const task = await this.accessible(id, user); if (!manual(task)) throw new AppError(409, 'SOURCE_TASK_ARCHIVE_DENIED', 'Tugas yang dibuat sumber hanya dapat dikelola melalui sumbernya.'); if (!((Number(task.created_by) === user.id && can(user, 'tasks.write')) || can(user, 'tasks.manage'))) throw new AppError(403, 'TASK_ARCHIVE_DENIED', 'Anda tidak dapat mengarsipkan tugas ini.');
    await pool.execute('UPDATE tasks SET deleted_at=UTC_TIMESTAMP(3),updated_by=? WHERE id=? AND organization_id=?', [user.id, id, user.organization_id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: task.business_unit_id, userId: user.id, moduleCode: 'tasks', actionCode: 'tasks.archive', entityType: 'task', entityId: id, entityCode: task.task_code, description: 'Mengarsipkan tugas.' }); return { id, archived: true };
  }

  async calendarOverlay(user: TaskPrincipal, from: string, to: string, mine = false) {
    const listed = await this.list(user, { page: 1, limit: 1000, mine });
    const start = new Date(from); const end = new Date(to);
    return listed.items.filter((task: any) => {
      const when = task.start_at || task.due_at; return when && new Date(when) < end && (!task.due_at || new Date(task.due_at) >= start) && task.status !== 'cancelled';
    }).map((task: any) => ({ kind: 'task' as const, ...task }));
  }
}

export const tasksService = new TasksService();
