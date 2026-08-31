import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { calendarRegistry } from '../../shared/calendar/calendar-registry.service';
import { jakartaDateStartUtc, utcDateTimeSql } from '../../shared/time/jakarta-time';
import { CraftPrintersRepository } from './craft-printers.repository';
import type { CompleteMaintenanceInput, HistoryFilters, IssueInput, IssueUpdateInput, PrinterFilters, PrinterInput, PrinterStatus, PrinterUpdateInput, ScheduleInput, ScheduleUpdateInput } from './craft-printers.types';

export interface PrinterActor { id: number; organizationId: number; businessUnitId: number; ip?: string; userAgent?: string; }

const toSqlDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATE', 'Tanggal/waktu tidak valid.');
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const futureDate = (from: string | Date, days: number) => new Date(new Date(from).getTime() + days * 86_400_000);
const asNumber = (value: unknown) => Number(value || 0);
const allDayRange = (value: string | Date) => {
  const day = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const start = jakartaDateStartUtc(day);
  return { startAt: utcDateTimeSql(start), endAt: utcDateTimeSql(new Date(start.getTime() + 86_400_000)) };
};

export class CraftPrintersService {
  private repository = new CraftPrintersRepository();

  private async audit(connection: PoolConnection, actor: PrinterActor, action: string, entityType: string, entityId: number, entityCode: string | null, description: string, oldValues?: unknown, newValues?: unknown) {
    await AuditService.write({ organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, userId: actor.id, moduleCode: 'craft_printers', actionCode: action, entityType, entityId, entityCode, description, oldValues, newValues, ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
  }

  private async printerOrThrow(printerId: number, businessUnitId: number, connection?: PoolConnection, lock = false) {
    const printer = await this.repository.getPrinter(printerId, businessUnitId, connection, lock);
    if (!printer) throw new NotFoundError('Printer tidak ditemukan.');
    return printer;
  }

  private scheduleState(schedule: any) {
    if (!schedule.is_active) return { state: 'inactive' as const, label: 'Tidak aktif', due_value: null, remaining: null };
    const now = new Date();
    if (schedule.trigger_type === 'date') {
      const due = schedule.next_due_at ? new Date(schedule.next_due_at) : null;
      if (!due) return { state: 'unknown' as const, label: 'Belum dijadwalkan', due_value: null, remaining: null };
      const remaining = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
      return { state: remaining < 0 ? 'overdue' as const : remaining <= 7 ? 'due_soon' as const : 'ok' as const, label: remaining < 0 ? 'Terlambat' : remaining <= 7 ? 'Segera jatuh tempo' : 'Terjadwal', due_value: due.toISOString(), remaining };
    }
    if (schedule.trigger_type === 'print_hours') {
      const due = asNumber(schedule.next_due_print_hours); const remaining = due - asNumber(schedule.total_print_hours);
      const threshold = Math.max(10, asNumber(schedule.interval_value) * .1);
      return { state: remaining <= 0 ? 'overdue' as const : remaining <= threshold ? 'due_soon' as const : 'ok' as const, label: remaining <= 0 ? 'Terlambat' : remaining <= threshold ? 'Segera jatuh tempo' : 'Terjadwal', due_value: due, remaining };
    }
    const remaining = asNumber(schedule.interval_value) - asNumber(schedule.jobs_since_service);
    const threshold = Math.max(2, asNumber(schedule.interval_value) * .1);
    return { state: remaining <= 0 ? 'overdue' as const : remaining <= threshold ? 'due_soon' as const : 'ok' as const, label: remaining <= 0 ? 'Terlambat' : remaining <= threshold ? 'Segera jatuh tempo' : 'Terjadwal', due_value: asNumber(schedule.interval_value), remaining };
  }

  private async decoratePrinters(rows: any[], businessUnitId: number) {
    const schedules = await this.repository.listSchedules(businessUnitId);
    return rows.map(row => {
      const printerSchedules = schedules.filter(schedule => Number(schedule.printer_id) === Number(row.id)).map(schedule => ({ ...schedule, due: this.scheduleState(schedule) }));
      const physicalJob = row.print_job_id ? { id: row.print_job_id, code: row.job_code, name: row.job_name, status: row.job_status, progress_percent: asNumber(row.progress_percent), started_at: row.started_at, estimated_finish_at: row.estimated_finish_at } : null;
      return { ...row, total_print_hours: asNumber(row.total_print_hours), is_active: Boolean(row.is_active), physical_job: physicalJob, maintenance_due: printerSchedules.filter(item => item.due.state === 'overdue' || item.due.state === 'due_soon'), schedules: printerSchedules };
    });
  }

  async getPrinters(businessUnitId: number, filters: PrinterFilters) { return this.decoratePrinters(await this.repository.listPrinters(businessUnitId, filters), businessUnitId); }
  async getActivity(businessUnitId: number) { return this.decoratePrinters(await this.repository.listActivity(businessUnitId), businessUnitId); }

  async getPrinter(printerId: number, actor: PrinterActor) {
    const printer = await this.printerOrThrow(printerId, actor.businessUnitId);
    const activity = (await this.repository.listActivity(actor.businessUnitId)).find(row => Number(row.id) === printerId);
    const [decorated] = await this.decoratePrinters([{ ...printer, ...activity }], actor.businessUnitId);
    const [records, issues, profiles, stats] = await Promise.all([
      this.repository.listRecords(actor.businessUnitId, printerId), this.repository.listIssues(actor.businessUnitId, { printerId }), this.repository.listProfiles(actor.businessUnitId, printerId), this.repository.getStats(printerId, actor.businessUnitId),
    ]);
    const total = asNumber(stats.total_jobs); const completed = asNumber(stats.completed_jobs);
    return { ...decorated, maintenance_records: records, issues, print_profiles: profiles, analytics: { ...stats, total_jobs: total, completed_jobs: completed, failed_jobs: asNumber(stats.failed_jobs), success_rate: total ? Math.round(completed / total * 10000) / 100 : 0, stored_print_hours: asNumber(printer.total_print_hours), material_used: asNumber(stats.material_used), average_actual_minutes: asNumber(stats.average_actual_minutes) } };
  }

  async createPrinter(input: PrinterInput, actor: PrinterActor) {
    if (input.code?.trim() && await this.repository.codeExists(input.code.trim())) throw new AppError(409, 'DUPLICATE_PRINTER_CODE', 'Kode printer sudah digunakan.');
    if (input.serial_number && await this.repository.serialExists(input.serial_number, actor.businessUnitId)) throw new AppError(409, 'DUPLICATE_SERIAL', 'Nomor seri sudah digunakan oleh printer lain.');
    const printerId = await this.repository.transaction(async connection => {
      const temporaryCode = input.code?.trim() || `TMP-${randomUUID()}`;
      const [result] = await connection.execute<any>(`INSERT INTO printers (business_unit_id, code, name, brand, model, serial_number, printer_type, nozzle_diameter_mm, build_volume_x_mm, build_volume_y_mm, build_volume_z_mm, status_code, location_name, purchase_date, purchase_cost, warranty_until, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [actor.businessUnitId, temporaryCode, input.name, input.brand || null, input.model || null, input.serial_number || null, input.printer_type || 'FDM', input.nozzle_diameter_mm || null, input.build_volume_x_mm || null, input.build_volume_y_mm || null, input.build_volume_z_mm || null, input.initial_status || 'available', input.location_name || null, input.purchase_date || null, input.purchase_cost ?? null, input.warranty_until || null, input.notes || null]);
      const printerId = Number(result.insertId); const code = input.code?.trim() || `PRN-${String(printerId).padStart(6, '0')}`;
      if (!input.code) await connection.execute('UPDATE printers SET code = ? WHERE id = ?', [code, printerId]);
      await this.audit(connection, actor, 'create', 'printer', printerId, code, `Membuat printer ${code}.`, undefined, { ...input, code });
      return printerId;
    });
    return this.getPrinter(printerId, actor);
  }

  async updatePrinter(printerId: number, input: PrinterUpdateInput, actor: PrinterActor) {
    await this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      if (input.code?.trim() && input.code.trim() !== printer.code && await this.repository.codeExists(input.code.trim(), printerId, connection)) throw new AppError(409, 'DUPLICATE_PRINTER_CODE', 'Kode printer sudah digunakan.');
      if (input.serial_number && await this.repository.serialExists(input.serial_number, actor.businessUnitId, printerId, connection)) throw new AppError(409, 'DUPLICATE_SERIAL', 'Nomor seri sudah digunakan oleh printer lain.');
      const allowed = ['code', 'name', 'brand', 'model', 'serial_number', 'printer_type', 'nozzle_diameter_mm', 'build_volume_x_mm', 'build_volume_y_mm', 'build_volume_z_mm', 'location_name', 'purchase_date', 'purchase_cost', 'warranty_until', 'notes'] as const;
      const changes = allowed.filter(key => input[key] !== undefined);
      if (!changes.length) return;
      await connection.execute(`UPDATE printers SET ${changes.map(key => `${key} = ?`).join(', ')} WHERE id = ?`, [...changes.map(key => input[key] ?? null), printerId]);
      await this.audit(connection, actor, 'update', 'printer', printerId, printer.code, `Memperbarui printer ${printer.code}.`, printer, input);
    });
    return this.getPrinter(printerId, actor);
  }

  private async assertNoPhysicalActivity(printerId: number, connection: PoolConnection) {
    const job = await this.repository.hasActivePhysicalJob(printerId, connection);
    if (job) throw new AppError(409, 'PRINTER_BUSY', `Printer sedang dipakai oleh pekerjaan ${job.job_code}.`);
  }
  private async assertCanBeAvailable(printerId: number, connection: PoolConnection) {
    await this.assertNoPhysicalActivity(printerId, connection);
    const blocking = await this.repository.hasBlockingIssue(printerId, connection);
    if (blocking) throw new AppError(409, 'PRINTER_HAS_BLOCKING_ISSUE', `Selesaikan masalah ${blocking.issue_code} sebelum mengaktifkan printer.`);
  }

  async setStatus(printerId: number, status: 'offline' | 'available', actor: PrinterActor) {
    await this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      await this.assertNoPhysicalActivity(printerId, connection);
      if (status === 'available') {
        if (printer.status_code === 'maintenance') throw new AppError(409, 'MAINTENANCE_NOT_COMPLETED', 'Selesaikan perawatan terlebih dahulu.');
        await this.assertCanBeAvailable(printerId, connection);
      }
      await connection.execute('UPDATE printers SET status_code = ? WHERE id = ?', [status, printerId]);
      await this.audit(connection, actor, status === 'offline' ? 'set_offline' : 'restore_available', 'printer', printerId, printer.code, `${printer.code} diubah menjadi ${status}.`, { status: printer.status_code }, { status });
      await domainEvents.publish(connection, { eventKey: `printer.status_changed:${printerId}:${randomUUID()}`, eventName: 'printer.status_changed', moduleCode: 'craft_printers', organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, entityType: 'printer', entityId: printerId, entityCode: printer.code, actorUserId: actor.id, payload: { context: { printer: { id: printerId, code: printer.code, name: printer.name, status_code: status, old_status: printer.status_code } } } });
    });
    return this.getPrinter(printerId, actor);
  }

  async archivePrinter(printerId: number, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      await this.assertNoPhysicalActivity(printerId, connection);
      const scheduled = await this.repository.hasScheduledJob(printerId, connection);
      if (scheduled) throw new AppError(409, 'PRINTER_HAS_SCHEDULED_JOBS', `Printer masih memiliki pekerjaan terjadwal (${scheduled.job_code}).`);
      await connection.execute('UPDATE printers SET is_active = 0, status_code = \'offline\' WHERE id = ?', [printerId]);
      await this.audit(connection, actor, 'archive', 'printer', printerId, printer.code, `Mengarsipkan printer ${printer.code}.`, { is_active: printer.is_active }, { is_active: false });
      return { id: printerId, archived: true };
    });
  }

  async reactivatePrinter(printerId: number, actor: PrinterActor) {
    await this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      await connection.execute('UPDATE printers SET is_active = 1, status_code = \'offline\' WHERE id = ?', [printerId]);
      await this.audit(connection, actor, 'reactivate', 'printer', printerId, printer.code, `Mengaktifkan kembali printer ${printer.code} dalam status offline.`, { is_active: printer.is_active }, { is_active: true, status: 'offline' });
    });
    return this.getPrinter(printerId, actor);
  }

  private async syncDateCalendar(connection: PoolConnection, schedule: any, actor: PrinterActor) {
    const sourceKey = `printer_maintenance:${schedule.id}`;
    if (!schedule.is_active || schedule.trigger_type !== 'date' || !schedule.next_due_at) {
      await calendarRegistry.removeSourceEvent(actor.organizationId, sourceKey, actor.id, connection);
      return;
    }
    const printer = await this.printerOrThrow(Number(schedule.printer_id), actor.businessUnitId, connection);
    await calendarRegistry.upsertSourceEvent({ organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, sourceKey, sourceModuleCode: 'craft_printers', sourceType: 'printer_maintenance_schedule', sourceId: Number(schedule.id), sourceCode: printer.code, title: `Perawatan: ${printer.name} - ${schedule.maintenance_type}`, description: schedule.notes || null, eventType: 'maintenance', ...allDayRange(schedule.next_due_at), allDay: true, updatedBy: actor.id }, connection);
  }

  private scheduleDueFields(input: { trigger_type: string; interval_value: number; next_due_at?: string | null }, printer: any, current?: any) {
    const trigger = input.trigger_type; const interval = asNumber(input.interval_value);
    if (trigger === 'date') return { nextDueAt: input.next_due_at ? toSqlDateTime(input.next_due_at) : toSqlDateTime(futureDate(new Date(), interval)), nextDuePrintHours: null };
    if (trigger === 'print_hours') return { nextDueAt: null, nextDuePrintHours: asNumber(printer.total_print_hours) + interval };
    return { nextDueAt: null, nextDuePrintHours: null };
  }

  async getMaintenance(businessUnitId: number, printerId?: number) {
    const [schedules, records] = await Promise.all([this.repository.listSchedules(businessUnitId, printerId), this.repository.listRecords(businessUnitId, printerId)]);
    return { schedules: schedules.map(schedule => ({ ...schedule, due: this.scheduleState(schedule) })), records };
  }

  async createSchedule(input: ScheduleInput, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(input.printer_id, actor.businessUnitId, connection, true);
      const due = this.scheduleDueFields(input, printer);
      const [result] = await connection.execute<any>(`INSERT INTO printer_maintenance_schedules (printer_id, maintenance_type, trigger_type, interval_value, next_due_at, next_due_print_hours, is_active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [input.printer_id, input.maintenance_type, input.trigger_type, input.interval_value, due.nextDueAt, due.nextDuePrintHours, input.is_active === false ? 0 : 1, input.notes || null]);
      const schedule = await this.repository.getSchedule(Number(result.insertId), actor.businessUnitId, connection);
      await this.syncDateCalendar(connection, schedule, actor);
      await this.audit(connection, actor, 'maintenance_schedule_create', 'maintenance_schedule', Number(result.insertId), null, `Membuat jadwal perawatan ${input.maintenance_type} untuk ${printer.code}.`, undefined, input);
      return { ...schedule, due: this.scheduleState(schedule) };
    });
  }

  async updateSchedule(scheduleId: number, input: ScheduleUpdateInput, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const previous = await this.repository.getSchedule(scheduleId, actor.businessUnitId, connection, true);
      if (!previous) throw new NotFoundError('Jadwal perawatan tidak ditemukan.');
      const printer = await this.printerOrThrow(Number(previous.printer_id), actor.businessUnitId, connection, true);
      const merged = { ...previous, ...input, trigger_type: input.trigger_type || previous.trigger_type, interval_value: input.interval_value ?? asNumber(previous.interval_value) };
      const triggerChanged = merged.trigger_type !== previous.trigger_type || merged.interval_value !== asNumber(previous.interval_value) || input.next_due_at !== undefined;
      const due = triggerChanged ? this.scheduleDueFields(merged, printer, previous) : { nextDueAt: previous.next_due_at, nextDuePrintHours: previous.next_due_print_hours };
      await connection.execute(`UPDATE printer_maintenance_schedules SET maintenance_type = ?, trigger_type = ?, interval_value = ?, next_due_at = ?, next_due_print_hours = ?, is_active = ?, notes = ? WHERE id = ?`, [merged.maintenance_type, merged.trigger_type, merged.interval_value, due.nextDueAt, due.nextDuePrintHours, merged.is_active === false ? 0 : 1, merged.notes || null, scheduleId]);
      const schedule = await this.repository.getSchedule(scheduleId, actor.businessUnitId, connection);
      await this.syncDateCalendar(connection, schedule, actor);
      await this.audit(connection, actor, 'maintenance_schedule_update', 'maintenance_schedule', scheduleId, null, `Memperbarui jadwal perawatan ${schedule.maintenance_type} pada ${printer.code}.`, previous, input);
      return { ...schedule, due: this.scheduleState(schedule) };
    });
  }

  async deleteSchedule(scheduleId: number, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const schedule = await this.repository.getSchedule(scheduleId, actor.businessUnitId, connection, true);
      if (!schedule) throw new NotFoundError('Jadwal perawatan tidak ditemukan.');
      await connection.execute('UPDATE printer_maintenance_records SET schedule_id = NULL WHERE schedule_id = ?', [scheduleId]);
      await connection.execute('DELETE FROM printer_maintenance_schedules WHERE id = ?', [scheduleId]);
      await calendarRegistry.removeSourceEvent(actor.organizationId, `printer_maintenance:${scheduleId}`, actor.id, connection);
      await this.audit(connection, actor, 'maintenance_schedule_delete', 'maintenance_schedule', scheduleId, null, `Menghapus jadwal perawatan ${schedule.maintenance_type}.`, schedule);
      return { id: scheduleId, deleted: true };
    });
  }

  async startMaintenance(printerId: number, actor: PrinterActor) {
    await this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      await this.assertNoPhysicalActivity(printerId, connection);
      if (printer.status_code === 'maintenance') throw new AppError(409, 'MAINTENANCE_ALREADY_STARTED', 'Printer sudah dalam status perawatan.');
      await connection.execute(`UPDATE printers SET status_code = 'maintenance' WHERE id = ?`, [printerId]);
      await this.audit(connection, actor, 'maintenance_start', 'printer', printerId, printer.code, `Memulai perawatan printer ${printer.code}.`, { status: printer.status_code }, { status: 'maintenance' });
    });
    return this.getPrinter(printerId, actor);
  }

  async completeMaintenance(printerId: number, input: CompleteMaintenanceInput, actor: PrinterActor) {
    await this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(printerId, actor.businessUnitId, connection, true);
      await this.assertNoPhysicalActivity(printerId, connection);
      if (printer.status_code !== 'maintenance') throw new AppError(409, 'MAINTENANCE_NOT_STARTED', 'Printer belum berada dalam status perawatan.');
      if (input.performed_by && !await this.repository.isValidCraftUser(input.performed_by, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_TECHNICIAN', 'Teknisi harus merupakan pengguna Craft yang aktif.');
      let schedule: any | undefined;
      if (input.schedule_id) { schedule = await this.repository.getSchedule(input.schedule_id, actor.businessUnitId, connection, true); if (!schedule || Number(schedule.printer_id) !== printerId) throw new AppError(400, 'INVALID_MAINTENANCE_SCHEDULE', 'Jadwal perawatan tidak sesuai dengan printer.'); }
      const performedAt = toSqlDateTime(input.performed_at || new Date());
      const [record] = await connection.execute<any>(`INSERT INTO printer_maintenance_records (printer_id, schedule_id, maintenance_type, performed_at, performed_by, cost, print_hours_at_service, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [printerId, schedule?.id || null, input.maintenance_type, performedAt, input.performed_by || actor.id, input.cost ?? 0, printer.total_print_hours, input.notes || null]);
      if (schedule) {
        const next = schedule.trigger_type === 'date'
          ? { nextDueAt: toSqlDateTime(futureDate(performedAt, asNumber(schedule.interval_value))), nextDuePrintHours: null }
          : schedule.trigger_type === 'print_hours'
            ? { nextDueAt: null, nextDuePrintHours: asNumber(printer.total_print_hours) + asNumber(schedule.interval_value) }
            : { nextDueAt: null, nextDuePrintHours: null };
        await connection.execute('UPDATE printer_maintenance_schedules SET next_due_at = ?, next_due_print_hours = ? WHERE id = ?', [next.nextDueAt, next.nextDuePrintHours, schedule.id]);
        const updated = await this.repository.getSchedule(schedule.id, actor.businessUnitId, connection); await this.syncDateCalendar(connection, updated, actor);
      }
      const blocking = await this.repository.hasBlockingIssue(printerId, connection); const status: PrinterStatus = blocking ? 'error' : 'available';
      await connection.execute('UPDATE printers SET status_code = ? WHERE id = ?', [status, printerId]);
      await this.audit(connection, actor, 'maintenance_complete', 'maintenance_record', Number(record.insertId), printer.code, `Menyelesaikan perawatan ${input.maintenance_type} pada ${printer.code}.`, { status: 'maintenance' }, { status, schedule_id: schedule?.id || null });
      await domainEvents.publish(connection, { eventKey: `printer.maintenance_recorded:${record.insertId}`, eventName: 'printer.maintenance_recorded', moduleCode: 'craft_printers', organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, entityType: 'printer', entityId: printerId, entityCode: printer.code, actorUserId: actor.id, payload: { context: { printer: { id: printerId, code: printer.code, name: printer.name, status_code: status } } } });
    });
    return this.getPrinter(printerId, actor);
  }

  async getIssues(businessUnitId: number, filters: { printerId?: number; status?: string; severity?: string; search?: string }) { return this.repository.listIssues(businessUnitId, filters); }

  async createIssue(input: IssueInput, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const printer = await this.printerOrThrow(input.printer_id, actor.businessUnitId, connection, true);
      if (input.assigned_to && !await this.repository.isValidCraftUser(input.assigned_to, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_TECHNICIAN', 'Penanggung jawab harus merupakan pengguna Craft yang aktif.');
      const [result] = await connection.execute<any>(`INSERT INTO printer_issues (printer_id, issue_code, title, severity_code, status_code, description, reported_by, assigned_to) VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`, [input.printer_id, `TMP-${randomUUID()}`, input.title, input.severity_code, input.description || null, actor.id, input.assigned_to || null]);
      const issueId = Number(result.insertId); const issueCode = `ISS-${String(issueId).padStart(6, '0')}`;
      await connection.execute('UPDATE printer_issues SET issue_code = ? WHERE id = ?', [issueCode, issueId]);
      const active = await this.repository.hasActivePhysicalJob(printer.id, connection);
      const blocks = ['high', 'critical'].includes(input.severity_code);
      if (blocks && !active) await connection.execute(`UPDATE printers SET status_code = 'error' WHERE id = ? AND status_code <> 'maintenance'`, [printer.id]);
      await this.audit(connection, actor, 'issue_create', 'printer_issue', issueId, issueCode, `Mencatat masalah ${issueCode} pada ${printer.code}.`, undefined, input);
      await domainEvents.publish(connection, { eventKey: `printer.issue_created:${issueId}`, eventName: 'printer.issue_created', moduleCode: 'craft_printers', organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, entityType: 'printer', entityId: printer.id, entityCode: printer.code, actorUserId: actor.id, payload: { context: { printer: { id: printer.id, code: printer.code, name: printer.name, status_code: blocks && !active ? 'error' : printer.status_code }, issue: { id: issueId, issue_code: issueCode, severity: input.severity_code } } } });
      return { ...(await this.repository.getIssue(issueId, actor.businessUnitId, connection)), printer_status_changed: blocks && !active && printer.status_code !== 'maintenance', guidance: blocks && active ? 'Pekerjaan fisik sedang aktif; hentikan atau selesaikan pekerjaan melalui Produksi sebelum mengubah status printer.' : undefined };
    });
  }

  async updateIssue(issueId: number, input: IssueUpdateInput, actor: PrinterActor) {
    return this.repository.transaction(async connection => {
      const issue = await this.repository.getIssue(issueId, actor.businessUnitId, connection, true); if (!issue) throw new NotFoundError('Masalah printer tidak ditemukan.');
      if (input.assigned_to && !await this.repository.isValidCraftUser(input.assigned_to, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_TECHNICIAN', 'Penanggung jawab harus merupakan pengguna Craft yang aktif.');
      const status = input.status_code || issue.status_code; const assigned = input.assigned_to !== undefined ? input.assigned_to : (status === 'investigating' && !issue.assigned_to ? actor.id : issue.assigned_to);
      const resolution = input.resolution_notes !== undefined ? input.resolution_notes : issue.resolution_notes;
      if (status === 'resolved' && !String(resolution || '').trim()) throw new AppError(400, 'RESOLUTION_NOTES_REQUIRED', 'Catatan penyelesaian wajib diisi.');
      await connection.execute(`UPDATE printer_issues SET title = ?, severity_code = ?, status_code = ?, description = ?, assigned_to = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?`, [input.title ?? issue.title, input.severity_code ?? issue.severity_code, status, input.description ?? issue.description, assigned ?? null, resolution || null, status === 'resolved' ? toSqlDateTime(new Date()) : issue.resolved_at, issueId]);
      const refreshed = await this.repository.getIssue(issueId, actor.businessUnitId, connection);
      if (['high', 'critical'].includes(refreshed.severity_code) && ['open', 'investigating'].includes(refreshed.status_code)) {
        const active = await this.repository.hasActivePhysicalJob(refreshed.printer_id, connection);
        if (!active) await connection.execute(`UPDATE printers SET status_code = 'error' WHERE id = ? AND status_code <> 'maintenance'`, [refreshed.printer_id]);
      }
      await this.audit(connection, actor, 'issue_update', 'printer_issue', issueId, issue.issue_code, `Memperbarui masalah ${issue.issue_code}.`, issue, input);
      return this.repository.getIssue(issueId, actor.businessUnitId, connection);
    });
  }

  async getHistory(businessUnitId: number, filters: HistoryFilters) { return this.repository.listHistory(businessUnitId, filters); }
  async getProfiles(businessUnitId: number, printerId?: number) { return this.repository.listProfiles(businessUnitId, printerId); }
  async getTechnicians(businessUnitId: number) {
    const [users] = await pool.execute<any[]>(`SELECT u.id, u.full_name, u.username, u.email FROM users u JOIN user_business_units ubu ON ubu.user_id = u.id WHERE ubu.business_unit_id = ? AND ubu.can_access = 1 AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL ORDER BY u.full_name`, [businessUnitId]);
    return users;
  }
}
