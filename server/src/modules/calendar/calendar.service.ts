import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { moduleReadPermissionFor } from '../../shared/access/module-read-permissions';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { notificationService, notifyBestEffort } from '../../shared/notifications/notification.service';
import { jakartaBusinessDate, jakartaDateStartUtc, jakartaDayBoundsUtc, utcDateTimeSql } from '../../shared/time/jakarta-time';
import { tasksService, type TaskPrincipal } from '../tasks/tasks.service';

type Principal = TaskPrincipal;
type DbExecutor = Pick<PoolConnection, 'execute'>;
type EventStatus = 'scheduled' | 'completed' | 'cancelled';
type EventType = 'order_deadline' | 'production' | 'project_deadline' | 'maintenance' | 'payment' | 'meeting' | 'task' | 'other';
export type CalendarEventInput = { title: string; description?: string | null; location_name?: string | null; event_type?: 'meeting' | 'other'; business_unit_id?: number | null; all_day?: boolean; start_at?: string; end_at?: string | null; start_date?: string; end_date?: string; reminder_minutes_before?: number | null; attendee_ids?: number[]; };

const can = (user: Principal, permission: string) => (user.permissions || []).includes(permission);
const manual = (row: any) => row.source_module_code === 'calendar' && row.source_type === 'manual_event';
const positive = (value: unknown) => { const numeric = Number(value); return Number.isInteger(numeric) && numeric > 0 ? numeric : null; };
const clean = (value: unknown, limit: number) => { const normalized = String(value ?? '').trim(); return normalized ? normalized.slice(0, limit) : null; };
// mysql2 materializes DATETIME as a host-local Date. Calendar tables store UTC
// wall-clock values, so serialize the database components explicitly as UTC.
const utcOutput = (value: any) => value == null ? null : value instanceof Date ? new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())).toISOString() : `${String(value).replace(' ', 'T').replace(/\.\d+$/, '')}${String(value).endsWith('Z') ? '' : 'Z'}`;
const like = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const sourceModule = (row: any) => {
  if (row.source_module_code) return String(row.source_module_code).toLowerCase();
  if (row.source_type === 'print_job') return 'craft_production';
  if (row.source_type === 'printer_maintenance_schedule') return 'craft_printers';
  return null;
};

const instant = (value: string | null | undefined) => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(raw)) throw new AppError(400, 'TIMEZONE_REQUIRED', 'Waktu harus memakai offset zona waktu eksplisit.');
  const date = new Date(raw); if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATETIME', 'Format waktu tidak valid.');
  return utcDateTimeSql(date);
};
const dateOnly = (value: string | undefined, field: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(400, 'INVALID_DATE', `${field} harus berupa tanggal YYYY-MM-DD.`);
  try { return jakartaDateStartUtc(value); } catch { throw new AppError(400, 'INVALID_DATE', `${field} tidak valid.`); }
};
const statusValues: EventStatus[] = ['scheduled', 'completed', 'cancelled'];

const sourceActionUrl = (module: string | null) => {
  const routes: Record<string, string> = { craft_orders: '/app/craft/orders', craft_production: '/app/craft/production/jobs', craft_printers: '/app/craft/printers/maintenance', craft_procurement: '/app/craft/procurement', studio_projects: '/app/studio/projects', studio_billing: '/app/studio/billing/invoices', studio_equipment: '/app/studio/equipment/maintenance' };
  return module ? routes[module] || null : null;
};

export class CalendarService {
  private sourceAllowed(row: any, user: Principal) {
    if (manual(row)) return true;
    const module = sourceModule(row); const permission = moduleReadPermissionFor(module, row.business_unit_code);
    return Boolean(permission && can(user, permission));
  }

  private capabilities(row: any, user: Principal) {
    const owner = Number(row.created_by) === user.id; const manage = can(user, 'calendar.manage'); const write = can(user, 'calendar.write');
    return { can_edit: Boolean(manual(row) && write && (owner || manage)), can_delete: Boolean(manual(row) && write && (owner || manage)), can_manage_attendees: Boolean(manual(row) && write && (owner || manage)), can_respond: false };
  }

  private async attendeesFor(ids: number[], connection: DbExecutor = pool) {
    if (!ids.length) return new Map<number, any[]>();
    const [rows]: any = await connection.execute(`SELECT cea.event_id,u.id,u.full_name,u.username,u.avatar_path,cea.response_status_code,cea.responded_at FROM calendar_event_attendees cea JOIN users u ON u.id=cea.user_id WHERE cea.event_id IN (${ids.map(() => '?').join(',')}) ORDER BY u.full_name,u.id`, ids);
    const grouped = new Map<number, any[]>();
    for (const row of rows) { const id = Number(row.event_id); const entries = grouped.get(id) || []; entries.push({ id: Number(row.id), name: row.full_name, username: row.username, avatar_path: row.avatar_path, response_status: row.response_status_code, responded_at: row.responded_at }); grouped.set(id, entries); }
    return grouped;
  }

  private dto(row: any, user: Principal, attendees: any[] = []) {
    const module = sourceModule(row); const ownAttendee = attendees.some(item => item.id === user.id);
    return {
      kind: 'event' as const, id: Number(row.id), event_code: row.event_code, title: row.title, description: row.description, location: row.location_name,
      event_type: row.event_type as EventType, status: row.status_code as EventStatus, start_at: utcOutput(row.start_at), end_at: utcOutput(row.end_at), all_day: Boolean(row.all_day), reminder_minutes_before: row.reminder_minutes_before == null ? null : Number(row.reminder_minutes_before),
      workspace: row.business_unit_id == null ? null : { id: Number(row.business_unit_id), code: row.business_unit_code, name: row.business_unit_name }, source: { module_code: module, type: row.source_type, id: row.source_id == null ? null : Number(row.source_id), code: row.source_code, key: row.source_key },
      source_owned: !manual(row), source_action_url: !manual(row) && this.sourceAllowed(row, user) ? sourceActionUrl(module) : null,
      creator: row.created_by == null ? null : { id: Number(row.created_by), name: row.creator_name || 'Pengguna' }, attendees,
      created_at: utcOutput(row.created_at), updated_at: utcOutput(row.updated_at), capabilities: { ...this.capabilities(row, user), can_respond: ownAttendee },
    };
  }

  private async accessible(id: number, user: Principal, connection: DbExecutor = pool, lock = false) {
    const [rows]: any = await connection.execute(`SELECT e.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS creator_name FROM calendar_events e LEFT JOIN business_units bu ON bu.id=e.business_unit_id LEFT JOIN users u ON u.id=e.created_by WHERE e.id=? AND e.organization_id=? AND e.deleted_at IS NULL AND (e.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=e.business_unit_id AND ubu.can_access=1)) ${lock ? 'FOR UPDATE' : ''}`, [id, user.organization_id, user.id]);
    if (!rows.length || !this.sourceAllowed(rows[0], user)) throw new NotFoundError('Acara kalender tidak ditemukan.');
    return rows[0];
  }

  private async assertScope(user: Principal, businessUnitId: number | null | undefined) {
    if (businessUnitId == null) { if (!can(user, 'calendar.manage')) throw new AppError(403, 'CALENDAR_GLOBAL_MANAGE_REQUIRED', 'Izin calendar.manage diperlukan untuk acara global.'); return null; }
    const [rows]: any = await pool.execute(`SELECT id FROM business_units WHERE id=? AND organization_id=? AND is_active=1 AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=business_units.id AND ubu.can_access=1)`, [businessUnitId, user.organization_id, user.id]);
    if (!rows.length) throw new NotFoundError('Workspace kalender tidak ditemukan.'); return Number(businessUnitId);
  }

  private normalizeInput(input: CalendarEventInput, current?: any) {
    const allDay = input.all_day === undefined ? Boolean(current?.all_day) : Boolean(input.all_day);
    const title = input.title === undefined ? current?.title : clean(input.title, 220); if (!title) throw new AppError(400, 'EVENT_TITLE_REQUIRED', 'Judul acara wajib diisi.');
    let startAt: string; let endAt: string | null;
    if (allDay) {
      const start = dateOnly(input.start_date || (current?.start_at ? new Date(new Date(current.start_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10) : undefined), 'Tanggal mulai');
      const endDate = input.end_date || input.start_date || (current?.end_at ? new Date(new Date(current.end_at).getTime() - 1 + 7 * 3600_000).toISOString().slice(0, 10) : undefined);
      const endStart = dateOnly(endDate, 'Tanggal selesai'); if (endStart < start) throw new AppError(400, 'EVENT_DATE_ORDER', 'Tanggal selesai harus sama atau setelah tanggal mulai.');
      startAt = utcDateTimeSql(start); endAt = utcDateTimeSql(new Date(endStart.getTime() + 86_400_000));
    } else {
      startAt = input.start_at === undefined ? current?.start_at : instant(input.start_at); endAt = input.end_at === undefined ? current?.end_at ?? null : instant(input.end_at);
      if (!startAt) throw new AppError(400, 'EVENT_START_REQUIRED', 'Waktu mulai acara wajib diisi.'); if (endAt && endAt < startAt) throw new AppError(400, 'EVENT_DATE_ORDER', 'Waktu selesai harus setelah waktu mulai.');
    }
    const reminder = input.reminder_minutes_before === undefined ? current?.reminder_minutes_before ?? null : input.reminder_minutes_before == null ? null : Number(input.reminder_minutes_before);
    if (reminder != null && (!Number.isInteger(reminder) || reminder < 0 || reminder > 1_008_000)) throw new AppError(400, 'INVALID_REMINDER', 'Pengingat acara tidak valid.');
    return { title, allDay, startAt, endAt, reminder, description: input.description === undefined ? current?.description ?? null : clean(input.description, 10_000), location: input.location_name === undefined ? current?.location_name ?? null : clean(input.location_name, 220), eventType: input.event_type === undefined ? current?.event_type || 'meeting' : input.event_type };
  }

  private async assertAttendees(organizationId: number, businessUnitId: number | null, ids: number[], connection: DbExecutor) {
    const desired = [...new Set(ids.map(positive).filter((value): value is number => value != null))]; if (desired.length !== ids.length) throw new AppError(400, 'INVALID_ATTENDEE', 'Peserta acara tidak valid.'); if (!desired.length) return desired;
    const params: any[] = [organizationId, ...desired]; let sql = `SELECT u.id FROM users u WHERE u.organization_id=? AND u.id IN (${desired.map(() => '?').join(',')}) AND u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved'`;
    if (businessUnitId != null) { sql += ' AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=u.id AND ubu.business_unit_id=? AND ubu.can_access=1)'; params.push(businessUnitId); }
    const [rows]: any = await connection.execute(sql, params); if (rows.length !== desired.length) throw new AppError(400, 'INVALID_ATTENDEE', 'Salah satu peserta tidak memiliki akses ke workspace acara.'); return desired;
  }

  private async replaceAttendees(event: any, ids: number[], actorId: number, connection: DbExecutor) {
    const desired = await this.assertAttendees(Number(event.organization_id), event.business_unit_id == null ? null : Number(event.business_unit_id), ids, connection); const [oldRows]: any = await connection.execute('SELECT user_id FROM calendar_event_attendees WHERE event_id=? FOR UPDATE', [event.id]); const oldIds = oldRows.map((item: any) => Number(item.user_id)); const removed = oldIds.filter((id: number) => !desired.includes(id)); const added = desired.filter(id => !oldIds.includes(id));
    if (removed.length) await connection.execute(`DELETE FROM calendar_event_attendees WHERE event_id=? AND user_id IN (${removed.map(() => '?').join(',')})`, [event.id, ...removed]); for (const userId of added) await connection.execute('INSERT INTO calendar_event_attendees (event_id,user_id,response_status_code,added_by) VALUES (?,?,' + "'invited'" + ',?)', [event.id, userId, actorId]);
    return { added, removed };
  }

  private async notifyAttendees(event: any, userIds: number[], kind: 'invite' | 'update') {
    if (!userIds.length) return; const recipients = kind === 'invite' ? userIds.filter(id => id !== Number(event.created_by)) : userIds;
    if (!recipients.length) return;
    await notifyBestEffort(() => notificationService.createForUsers(recipients, { organizationId: Number(event.organization_id), businessUnitId: event.business_unit_id == null ? null : Number(event.business_unit_id), notificationType: kind === 'invite' ? 'calendar_invite' : 'calendar_update', moduleCode: 'calendar', severityCode: 'info', title: kind === 'invite' ? 'Undangan acara baru' : 'Acara diperbarui', message: event.title, actionUrl: `/app/calendar?tab=calendar&event=${event.id}`, entityType: 'calendar_event', entityId: Number(event.id), dedupeKey: `calendar:event:${event.id}:${kind}:${event.updated_at || event.start_at}` }, { businessUnitId: event.business_unit_id == null ? null : Number(event.business_unit_id), permissionCode: 'calendar.read' }));
  }

  async create(user: Principal, input: CalendarEventInput) {
    const scope = await this.assertScope(user, input.business_unit_id == null ? null : positive(input.business_unit_id)); const values = this.normalizeInput(input); if (!['meeting', 'other'].includes(values.eventType)) throw new AppError(400, 'INVALID_MANUAL_EVENT_TYPE', 'Acara manual hanya dapat berupa rapat atau acara umum.');
    const connection = await pool.getConnection(); let event: any; let change: any;
    try { await connection.beginTransaction(); const [result]: any = await connection.execute(`INSERT INTO calendar_events (organization_id,business_unit_id,event_code,title,description,location_name,event_type,source_module_code,start_at,end_at,all_day,status_code,reminder_minutes_before,source_type,source_id,source_code,source_key,created_by,updated_by) VALUES (?,?,?, ?,?,?,?,?,?, ?,?,'scheduled',?,'manual_event',NULL,NULL,NULL,?,?)`, [user.organization_id, scope, `TMP-${randomUUID()}`, values.title, values.description, values.location, values.eventType, 'calendar', values.startAt, values.endAt, values.allDay ? 1 : 0, values.reminder, user.id, user.id]); const id = Number(result.insertId); const code = `EVT-${String(id).padStart(6, '0')}`; await connection.execute('UPDATE calendar_events SET event_code=? WHERE id=?', [code, id]); const [rows]: any = await connection.execute('SELECT * FROM calendar_events WHERE id=? FOR UPDATE', [id]); event = rows[0]; event.event_code = code; change = await this.replaceAttendees(event, input.attendee_ids || [], user.id, connection); await AuditService.write({ organizationId: user.organization_id, businessUnitId: scope, userId: user.id, moduleCode: 'calendar', actionCode: 'calendar.event_create', entityType: 'calendar_event', entityId: id, entityCode: code, description: 'Membuat acara manual.', newValues: { title: values.title, start_at: values.startAt, end_at: values.endAt, all_day: values.allDay, attendee_ids: input.attendee_ids || [] } }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await this.notifyAttendees(event, change.added, 'invite'); return this.get(Number(event.id), user);
  }

  async get(id: number, user: Principal) { const event = await this.accessible(id, user); const attendees = await this.attendeesFor([id]); return this.dto(event, user, attendees.get(id) || []); }

  async update(id: number, user: Principal, input: Partial<CalendarEventInput>) {
    const original = await this.accessible(id, user); if (!manual(original)) throw new AppError(409, 'SOURCE_EVENT_READ_ONLY', 'Acara milik modul sumber hanya dapat diubah dari modul asalnya.'); if (!(can(user, 'calendar.write') && (Number(original.created_by) === user.id || can(user, 'calendar.manage')))) throw new AppError(403, 'EVENT_EDIT_DENIED', 'Hanya pembuat atau pengelola yang dapat mengubah acara.');
    const values = this.normalizeInput(input as CalendarEventInput, original); const significant = values.startAt !== original.start_at || values.endAt !== original.end_at || values.allDay !== Boolean(original.all_day) || values.location !== original.location_name; const connection = await pool.getConnection(); let event: any; let attendees: any[] = [];
    try { await connection.beginTransaction(); await connection.execute('UPDATE calendar_events SET title=?,description=?,location_name=?,event_type=?,start_at=?,end_at=?,all_day=?,reminder_minutes_before=?,updated_by=? WHERE id=? AND organization_id=?', [values.title, values.description, values.location, values.eventType, values.startAt, values.endAt, values.allDay ? 1 : 0, values.reminder, user.id, id, user.organization_id]); const [rows]: any = await connection.execute('SELECT * FROM calendar_events WHERE id=? FOR UPDATE', [id]); event = rows[0]; const grouped = await this.attendeesFor([id], connection); attendees = grouped.get(id) || []; await AuditService.write({ organizationId: user.organization_id, businessUnitId: original.business_unit_id, userId: user.id, moduleCode: 'calendar', actionCode: 'calendar.event_update', entityType: 'calendar_event', entityId: id, entityCode: original.event_code, description: 'Memperbarui acara manual.', oldValues: { title: original.title, start_at: original.start_at, end_at: original.end_at, all_day: Boolean(original.all_day), location_name: original.location_name }, newValues: { title: values.title, start_at: values.startAt, end_at: values.endAt, all_day: values.allDay, location_name: values.location } }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    if (significant) await this.notifyAttendees(event, attendees.filter((attendee: any) => attendee.response_status !== 'declined').map((attendee: any) => attendee.id), 'update'); return this.get(id, user);
  }

  async setAttendees(id: number, user: Principal, attendeeIds: number[]) {
    const connection = await pool.getConnection(); let event: any; let change: any;
    try { await connection.beginTransaction(); event = await this.accessible(id, user, connection, true); if (!manual(event)) throw new AppError(409, 'SOURCE_EVENT_READ_ONLY', 'Peserta hanya dapat diubah pada acara manual.'); if (!(can(user, 'calendar.write') && (Number(event.created_by) === user.id || can(user, 'calendar.manage')))) throw new AppError(403, 'EVENT_ATTENDEE_DENIED', 'Anda tidak dapat mengubah peserta acara ini.'); change = await this.replaceAttendees(event, attendeeIds, user.id, connection); await connection.execute('UPDATE calendar_events SET updated_by=? WHERE id=?', [user.id, id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: event.business_unit_id, userId: user.id, moduleCode: 'calendar', actionCode: 'calendar.attendee_add', entityType: 'calendar_event', entityId: id, entityCode: event.event_code, description: 'Memperbarui peserta acara.', newValues: change }, connection); await connection.commit(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await this.notifyAttendees(event, change.added, 'invite'); return this.get(id, user);
  }

  async respond(id: number, user: Principal, response: 'accepted' | 'tentative' | 'declined') {
    const event = await this.accessible(id, user); const [result]: any = await pool.execute('UPDATE calendar_event_attendees SET response_status_code=?,responded_at=UTC_TIMESTAMP(3) WHERE event_id=? AND user_id=?', [response, id, user.id]); if (!result.affectedRows) throw new NotFoundError('Undangan acara tidak ditemukan.'); await AuditService.write({ organizationId: user.organization_id, businessUnitId: event.business_unit_id, userId: user.id, moduleCode: 'calendar', actionCode: 'calendar.attendee_response', entityType: 'calendar_event', entityId: id, entityCode: event.event_code, description: 'Merespons undangan acara.', newValues: { response } }); return this.get(id, user);
  }

  async remove(id: number, user: Principal) { const event = await this.accessible(id, user); if (!manual(event)) throw new AppError(409, 'SOURCE_EVENT_READ_ONLY', 'Acara sumber tidak dapat dihapus dari Kalender.'); if (!(can(user, 'calendar.write') && (Number(event.created_by) === user.id || can(user, 'calendar.manage')))) throw new AppError(403, 'EVENT_DELETE_DENIED', 'Anda tidak dapat menghapus acara ini.'); await pool.execute('UPDATE calendar_events SET deleted_at=UTC_TIMESTAMP(3),updated_by=? WHERE id=? AND organization_id=?', [user.id, id, user.organization_id]); await AuditService.write({ organizationId: user.organization_id, businessUnitId: event.business_unit_id, userId: user.id, moduleCode: 'calendar', actionCode: 'calendar.event_delete', entityType: 'calendar_event', entityId: id, entityCode: event.event_code, description: 'Menghapus acara manual.' }); return { id, deleted: true }; }

  async feed(user: Principal, filters: any = {}) {
    const fromDate = filters.from ? dateOnly(String(filters.from), 'from') : jakartaDayBoundsUtc()[0]; const toDate = filters.to ? dateOnly(String(filters.to), 'to') : new Date(fromDate.getTime() + 42 * 86_400_000); if (toDate <= fromDate || toDate.getTime() - fromDate.getTime() > 366 * 86_400_000) throw new AppError(400, 'CALENDAR_RANGE_INVALID', 'Rentang kalender maksimal 366 hari.');
    const from = utcDateTimeSql(fromDate); const to = utcDateTimeSql(toDate); const where = ['e.organization_id=?', 'e.deleted_at IS NULL', 'e.start_at < ?', '(e.end_at IS NULL OR e.end_at > ?)', '(e.business_unit_id IS NULL OR EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=e.business_unit_id AND ubu.can_access=1))']; const params: any[] = [user.organization_id, to, from, user.id];
    if (filters.workspace === 'global') where.push('e.business_unit_id IS NULL'); if (filters.workspace === 'craft' || filters.workspace === 'studio') { where.push('LOWER(bu.code)=?'); params.push(filters.workspace); } if (filters.event_type) { where.push('e.event_type=?'); params.push(clean(filters.event_type, 50)); } if (filters.source) { where.push('e.source_module_code=?'); params.push(clean(filters.source, 80)); } if (statusValues.includes(filters.status)) { where.push('e.status_code=?'); params.push(filters.status); } if (filters.q) { const term = like(String(filters.q).slice(0, 120)); where.push('(e.event_code LIKE ? ESCAPE \'\\\\\' OR e.title LIKE ? ESCAPE \'\\\\\' OR e.description LIKE ? ESCAPE \'\\\\\' OR e.source_code LIKE ? ESCAPE \'\\\\\')'); params.push(term, term, term, term); }
    const [rows]: any = await pool.execute(`SELECT e.*,bu.code AS business_unit_code,bu.name AS business_unit_name,u.full_name AS creator_name FROM calendar_events e LEFT JOIN business_units bu ON bu.id=e.business_unit_id LEFT JOIN users u ON u.id=e.created_by WHERE ${where.join(' AND ')} ORDER BY e.start_at,e.id LIMIT 1000`, params); const allowed = rows.filter((row: any) => this.sourceAllowed(row, user)); const attendees = await this.attendeesFor(allowed.map((row: any) => Number(row.id))); const events = allowed.map((row: any) => this.dto(row, user, attendees.get(Number(row.id)) || []));
    const includeTasks = filters.include_tasks !== 'false' && can(user, 'tasks.read'); const tasks = includeTasks ? await tasksService.calendarOverlay(user, from, to, filters.task_scope === 'mine') : [];
    return { from, to, items: [...events, ...tasks].sort((a: any, b: any) => String(a.start_at || a.due_at).localeCompare(String(b.start_at || b.due_at))) };
  }

  async summary(user: Principal) { const [start, end] = jakartaDayBoundsUtc(); const today = await this.feed(user, { from: jakartaBusinessDate(start), to: jakartaBusinessDate(end), include_tasks: can(user, 'tasks.read') }); const taskSummary = can(user, 'tasks.read') ? await tasksService.summary(user) : null; return { agenda_today: today.items.length, tasks: taskSummary, upcoming_7_days: (await this.feed(user, { from: jakartaBusinessDate(start), to: jakartaBusinessDate(new Date(start.getTime() + 7 * 86_400_000)), include_tasks: can(user, 'tasks.read') })).items.length }; }

  async meta(user: Principal) { const [workspaces]: any = await pool.execute(`SELECT bu.id,bu.code,bu.name FROM business_units bu WHERE bu.organization_id=? AND bu.is_active=1 AND EXISTS (SELECT 1 FROM user_business_units ubu WHERE ubu.user_id=? AND ubu.business_unit_id=bu.id AND ubu.can_access=1) ORDER BY bu.name`, [user.organization_id, user.id]); const [people]: any = await pool.execute(`SELECT DISTINCT u.id,u.full_name,u.username,u.avatar_path FROM users u WHERE u.organization_id=? AND u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' ORDER BY u.full_name LIMIT 250`, [user.organization_id]); return { workspaces: workspaces.map((row: any) => ({ id: Number(row.id), code: row.code, name: row.name })), attendees: people.map((row: any) => ({ id: Number(row.id), name: row.full_name, username: row.username, avatar_path: row.avatar_path })), event_types: ['meeting', 'other'], statuses: statusValues, source_modules: ['calendar', 'craft_orders', 'craft_production', 'craft_printers', 'craft_procurement', 'studio_projects', 'studio_billing', 'studio_equipment'] }; }
}

export const calendarService = new CalendarService();
