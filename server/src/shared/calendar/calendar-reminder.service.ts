import { pool } from '../../config/database';
import { moduleReadPermissionFor } from '../access/module-read-permissions';
import { notificationService, notifyBestEffort } from '../notifications/notification.service';

/** Best-effort reminder pass owned by the existing AutomationWorker. */
export class CalendarReminderService {
  private async userHasPermission(userId: number, permission: string) {
    const [rows]: any = await pool.execute(`SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.is_active=1 JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=? AND p.code=? LIMIT 1`, [userId, permission]);
    return Boolean(rows.length);
  }

  private async sendEventReminders() {
    const [rows]: any = await pool.execute(`SELECT e.id,e.organization_id,e.business_unit_id,e.title,e.start_at,e.reminder_minutes_before,cea.user_id FROM calendar_events e JOIN calendar_event_attendees cea ON cea.event_id=e.id AND cea.response_status_code<>'declined' WHERE e.deleted_at IS NULL AND e.source_module_code='calendar' AND e.source_type='manual_event' AND e.status_code='scheduled' AND e.reminder_minutes_before IS NOT NULL AND DATE_SUB(e.start_at,INTERVAL e.reminder_minutes_before MINUTE)<=UTC_TIMESTAMP(3) AND e.start_at>=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE) AND e.start_at<=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 8 DAY)`);
    let attempted = 0;
    for (const row of rows) {
      attempted += 1; const stamp = new Date(row.start_at).toISOString().replace(/[:.]/g, '-');
      await notifyBestEffort(() => notificationService.createForUser(Number(row.user_id), { organizationId: Number(row.organization_id), businessUnitId: row.business_unit_id == null ? null : Number(row.business_unit_id), notificationType: 'calendar_reminder', moduleCode: 'calendar', severityCode: 'info', title: 'Pengingat acara', message: row.title, actionUrl: `/app/calendar?tab=calendar&event=${row.id}`, entityType: 'calendar_event', entityId: Number(row.id), dedupeKey: `calendar:event:${row.id}:start:${stamp}:reminder:${row.reminder_minutes_before}` }, { businessUnitId: row.business_unit_id == null ? null : Number(row.business_unit_id), permissionCode: 'calendar.read' }));
    }
    return attempted;
  }

  private async sendTaskReminders() {
    const [rows]: any = await pool.execute(`SELECT t.id,t.organization_id,t.business_unit_id,t.title,t.due_at,t.reminder_minutes_before,t.created_by,t.source_module_code,bu.code AS business_unit_code,COALESCE(GROUP_CONCAT(ta.user_id), '') AS assignee_ids FROM tasks t LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN business_units bu ON bu.id=t.business_unit_id WHERE t.deleted_at IS NULL AND t.status_code NOT IN ('done','cancelled') AND t.due_at IS NOT NULL AND t.reminder_minutes_before IS NOT NULL AND DATE_SUB(t.due_at,INTERVAL t.reminder_minutes_before MINUTE)<=UTC_TIMESTAMP(3) AND t.due_at>=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE) AND t.due_at<=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 8 DAY) GROUP BY t.id`);
    let attempted = 0;
    for (const row of rows) {
      const recipients = String(row.assignee_ids || '').split(',').map(Number).filter(Number.isInteger); if (!recipients.length && row.created_by) recipients.push(Number(row.created_by));
      const modulePermission = row.source_module_code && row.source_module_code !== 'tasks' ? moduleReadPermissionFor(row.source_module_code, row.business_unit_code) : null;
      for (const userId of [...new Set(recipients)]) {
        if (modulePermission && !await this.userHasPermission(userId, modulePermission)) continue;
        attempted += 1; const stamp = new Date(row.due_at).toISOString().replace(/[:.]/g, '-');
        await notifyBestEffort(() => notificationService.createForUser(userId, { organizationId: Number(row.organization_id), businessUnitId: row.business_unit_id == null ? null : Number(row.business_unit_id), notificationType: 'task_reminder', moduleCode: 'tasks', severityCode: 'warning', title: 'Pengingat tugas', message: row.title, actionUrl: `/app/calendar?tab=tasks&task=${row.id}`, entityType: 'task', entityId: Number(row.id), dedupeKey: `task:${row.id}:due:${stamp}:reminder:${row.reminder_minutes_before}` }, { businessUnitId: row.business_unit_id == null ? null : Number(row.business_unit_id), permissionCode: 'tasks.read' }));
      }
    }
    return attempted;
  }

  async runOnce() { const [event_attempts, task_attempts] = await Promise.all([this.sendEventReminders(), this.sendTaskReminders()]); return { event_attempts, task_attempts }; }
}
export const calendarReminderService = new CalendarReminderService();
