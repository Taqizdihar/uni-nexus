import { pool } from '../../config/database';

export const NOTIFICATION_SEVERITIES = ['info', 'success', 'warning', 'error', 'critical'] as const;
export type NotificationSeverity = typeof NOTIFICATION_SEVERITIES[number];
type DbExecutor = { execute: (sql: string, values?: any[]) => Promise<[any, any]> };

export type NotificationInput = {
  organizationId: number;
  businessUnitId?: number | null;
  notificationType: string;
  moduleCode?: string | null;
  severityCode?: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  dedupeKey?: string | null;
};

export type RecipientOptions = {
  businessUnitId?: number | null;
  permissionCode?: string | null;
  excludeUserId?: number | null;
};

const safeText = (value: string, length: number) => String(value || '').trim().slice(0, length);

/** Only application routes and explicit HTTPS URLs can be stored as actions. */
export const safeNotificationActionUrl = (value?: string | null): string | null => {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return null;
  if (url.startsWith('/app/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

/**
 * Canonical per-recipient delivery service. It deliberately never creates a
 * broadcast row: each eligible recipient receives an independently readable row.
 */
export class NotificationService {
  private executor(connection?: DbExecutor): DbExecutor { return connection || pool; }

  async eligibleUserIds(organizationId: number, options: RecipientOptions = {}, connection?: DbExecutor): Promise<number[]> {
    const db = this.executor(connection);
    const params: any[] = [organizationId];
    let sql = `SELECT DISTINCT u.id
      FROM users u
      WHERE u.organization_id = ?
        AND u.deleted_at IS NULL
        AND u.status_code = 'active'
        AND u.approval_status_code = 'approved'`;

    if (options.businessUnitId) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_business_units ubu
        WHERE ubu.user_id = u.id AND ubu.business_unit_id = ? AND ubu.can_access = 1
      )`;
      params.push(options.businessUnitId);
    }
    if (options.permissionCode) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = u.id AND p.code = ?
      )`;
      params.push(options.permissionCode);
    }
    if (options.excludeUserId) {
      sql += ' AND u.id <> ?';
      params.push(options.excludeUserId);
    }
    const [rows]: [any[], any] = await db.execute(sql, params);
    return rows.map((row: any) => Number(row.id));
  }

  async executiveUserIds(organizationId: number, connection?: DbExecutor): Promise<number[]> {
    const db = this.executor(connection);
    const [rows]: [any[], any] = await db.execute(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
       WHERE u.organization_id = ? AND u.deleted_at IS NULL
         AND u.status_code = 'active' AND u.approval_status_code = 'approved'
         AND r.code IN ('CEO', 'COO', 'CTO')
         AND EXISTS (
           SELECT 1 FROM user_roles pur
           JOIN role_permissions rp ON rp.role_id = pur.role_id
           JOIN permissions p ON p.id = rp.permission_id
           WHERE pur.user_id = u.id AND p.code = 'users.manage'
         )`,
      [organizationId],
    );
    return rows.map((row: any) => Number(row.id));
  }

  private normalized(input: NotificationInput) {
    return {
      organizationId: Number(input.organizationId),
      businessUnitId: input.businessUnitId ?? null,
      notificationType: safeText(input.notificationType, 60) || 'system',
      moduleCode: input.moduleCode ? safeText(input.moduleCode, 80) : null,
      severityCode: NOTIFICATION_SEVERITIES.includes(input.severityCode || 'info') ? input.severityCode || 'info' : 'info',
      title: safeText(input.title, 180) || 'Pemberitahuan UNI-NEXUS',
      message: safeText(input.message, 10_000) || 'Ada pembaruan yang perlu diperhatikan.',
      actionUrl: safeNotificationActionUrl(input.actionUrl),
      entityType: input.entityType ? safeText(input.entityType, 60) : null,
      entityId: input.entityId ?? null,
      dedupeKey: input.dedupeKey ? safeText(input.dedupeKey, 190) : null,
    };
  }

  /** Inserts one row for a valid recipient. A duplicate dedupe key is a successful skip. */
  async createForUser(userId: number, input: NotificationInput, options: RecipientOptions = {}, connection?: DbExecutor) {
    const db = this.executor(connection);
    const eligible = await this.eligibleUserIds(Number(input.organizationId), {
      businessUnitId: options.businessUnitId ?? input.businessUnitId ?? null,
      permissionCode: options.permissionCode ?? null,
    }, db);
    if (!eligible.includes(Number(userId))) return { status: 'skipped' as const, reason: 'RECIPIENT_INELIGIBLE' };
    const value = this.normalized(input);
    try {
      const [result]: any = await db.execute(
        `INSERT INTO notifications (
          organization_id, business_unit_id, user_id, notification_type, module_code,
          severity_code, title, message, action_url, entity_type, entity_id, dedupe_key,
          is_read, read_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
        [
          value.organizationId, value.businessUnitId, Number(userId), value.notificationType, value.moduleCode,
          value.severityCode, value.title, value.message, value.actionUrl, value.entityType, value.entityId, value.dedupeKey,
        ],
      );
      return { status: 'created' as const, id: Number(result.insertId), userId: Number(userId) };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY' && value.dedupeKey) return { status: 'skipped' as const, reason: 'DUPLICATE' };
      throw error;
    }
  }

  async createForUsers(userIds: number[], input: NotificationInput, options: RecipientOptions = {}, connection?: DbExecutor) {
    const uniqueUserIds = [...new Set(userIds.map(Number).filter(Number.isInteger))];
    const outcomes = [] as Array<Awaited<ReturnType<NotificationService['createForUser']>>>;
    for (const userId of uniqueUserIds) {
      const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:user:${userId}`.slice(0, 190) : null;
      outcomes.push(await this.createForUser(userId, { ...input, dedupeKey }, options, connection));
    }
    return outcomes;
  }

  async createForWorkspace(input: NotificationInput, options: RecipientOptions = {}, connection?: DbExecutor) {
    const businessUnitId = options.businessUnitId ?? input.businessUnitId;
    if (!businessUnitId) return [];
    const recipients = await this.eligibleUserIds(input.organizationId, { ...options, businessUnitId }, connection);
    return this.createForUsers(recipients, input, { ...options, businessUnitId }, connection);
  }

  async createForExecutives(input: NotificationInput, connection?: DbExecutor) {
    const recipients = await this.executiveUserIds(input.organizationId, connection);
    return this.createForUsers(recipients, input, {}, connection);
  }

  async createFromSystemEvent(event: { id: number; organization_id: number; business_unit_id?: number | null }, policyCode: string, input: NotificationInput, options: RecipientOptions = {}, connection?: DbExecutor) {
    const recipients = await this.eligibleUserIds(Number(event.organization_id), {
      businessUnitId: options.businessUnitId ?? event.business_unit_id ?? input.businessUnitId ?? null,
      permissionCode: options.permissionCode ?? null,
      excludeUserId: options.excludeUserId ?? null,
    }, connection);
    const outcomes = [] as Array<Awaited<ReturnType<NotificationService['createForUser']>>>;
    for (const userId of recipients) {
      outcomes.push(await this.createForUser(userId, {
        ...input,
        organizationId: Number(event.organization_id),
        businessUnitId: input.businessUnitId ?? event.business_unit_id ?? null,
        dedupeKey: `system:event:${event.id}:policy:${policyCode}:user:${userId}`,
      }, options, connection));
    }
    return outcomes;
  }
}

export const notificationService = new NotificationService();

/** Supplementary delivery must not roll back the source account/domain action. */
export const notifyBestEffort = async (work: () => Promise<unknown>) => {
  try { return await work(); }
  catch (error) {
    console.warn('[notifications] delivery skipped:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
};
