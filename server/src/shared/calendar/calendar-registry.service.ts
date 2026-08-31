import { createHash } from 'crypto';
import { pool } from '../../config/database';

/**
 * The canonical writer for source-owned calendar projections.  Domain modules
 * retain ownership of their records and only ask this registry to reflect a
 * deterministic schedule in `calendar_events`.
 */
export type CalendarSourceInput = {
  organizationId: number;
  businessUnitId?: number | null;
  sourceKey: string;
  sourceModuleCode: string;
  sourceType: string;
  sourceId?: number | null;
  sourceCode?: string | null;
  title: string;
  description?: string | null;
  locationName?: string | null;
  eventType: 'order_deadline' | 'production' | 'project_deadline' | 'maintenance' | 'payment' | 'meeting' | 'task' | 'other';
  startAt: string | Date;
  endAt?: string | Date | null;
  allDay?: boolean;
  statusCode?: 'scheduled' | 'completed' | 'cancelled';
  updatedBy?: number | null;
};

type DbExecutor = { execute: (sql: string, values?: any[]) => Promise<[any, any]> };

const sourceEventCode = (organizationId: number, sourceKey: string) =>
  `SRC-${createHash('sha256').update(`${organizationId}:${sourceKey}`).digest('hex').slice(0, 20).toUpperCase()}`;

const sqlDateTime = (value: string | Date) => {
  // Source modules already persist UTC DATETIME(3) values.  Preserve that
  // representation instead of letting Node reinterpret it in host-local time.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(value.trim())) return value.trim();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid calendar source datetime.');
  return date.toISOString().slice(0, 23).replace('T', ' ');
};

const sourceKey = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.length > 190) throw new RangeError('Invalid calendar source key.');
  return normalized;
};

export class CalendarRegistryService {
  private executor(connection?: DbExecutor): DbExecutor { return connection || pool; }

  async upsertSourceEvent(input: CalendarSourceInput, connection?: DbExecutor) {
    const db = this.executor(connection);
    const key = sourceKey(input.sourceKey);
    const startAt = sqlDateTime(input.startAt);
    const endAt = input.endAt == null ? null : sqlDateTime(input.endAt);
    if (endAt && endAt < startAt) throw new RangeError('Calendar source event ends before it starts.');
    const [result]: any = await db.execute(
      `INSERT INTO calendar_events (
        organization_id,business_unit_id,event_code,title,description,location_name,event_type,
        source_module_code,start_at,end_at,all_day,status_code,reminder_minutes_before,
        source_type,source_id,source_code,source_key,created_by,updated_by,deleted_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,NULL)
      ON DUPLICATE KEY UPDATE
        business_unit_id=VALUES(business_unit_id),title=VALUES(title),description=VALUES(description),
        location_name=VALUES(location_name),event_type=VALUES(event_type),source_module_code=VALUES(source_module_code),
        start_at=VALUES(start_at),end_at=VALUES(end_at),all_day=VALUES(all_day),status_code=VALUES(status_code),
        source_type=VALUES(source_type),source_id=VALUES(source_id),source_code=VALUES(source_code),
        updated_by=VALUES(updated_by),deleted_at=NULL`,
      [
        Number(input.organizationId), input.businessUnitId == null ? null : Number(input.businessUnitId), sourceEventCode(Number(input.organizationId), key),
        String(input.title || '').trim().slice(0, 220), input.description == null ? null : String(input.description).trim().slice(0, 10_000),
        input.locationName == null ? null : String(input.locationName).trim().slice(0, 220), input.eventType,
        String(input.sourceModuleCode || '').trim().slice(0, 80), startAt, endAt, input.allDay ? 1 : 0, input.statusCode || 'scheduled',
        String(input.sourceType || '').trim().slice(0, 60), input.sourceId == null ? null : Number(input.sourceId),
        input.sourceCode == null ? null : String(input.sourceCode).trim().slice(0, 120), key,
        input.updatedBy == null ? null : Number(input.updatedBy), input.updatedBy == null ? null : Number(input.updatedBy),
      ],
    );
    const [rows]: any = await db.execute('SELECT id,event_code FROM calendar_events WHERE organization_id=? AND source_key=? LIMIT 1', [Number(input.organizationId), key]);
    return { id: Number(rows[0]?.id || result.insertId), event_code: rows[0]?.event_code, source_key: key };
  }

  async setSourceStatus(organizationId: number, key: string, status: 'completed' | 'cancelled' | 'scheduled', updatedBy?: number | null, connection?: DbExecutor) {
    const [result]: any = await this.executor(connection).execute(
      'UPDATE calendar_events SET status_code=?,updated_by=?,deleted_at=NULL WHERE organization_id=? AND source_key=?',
      [status, updatedBy == null ? null : Number(updatedBy), Number(organizationId), sourceKey(key)],
    );
    return Number(result.affectedRows || 0);
  }

  async removeSourceEvent(organizationId: number, key: string, updatedBy?: number | null, connection?: DbExecutor) {
    const [result]: any = await this.executor(connection).execute(
      'UPDATE calendar_events SET deleted_at=UTC_TIMESTAMP(3),updated_by=? WHERE organization_id=? AND source_key=? AND deleted_at IS NULL',
      [updatedBy == null ? null : Number(updatedBy), Number(organizationId), sourceKey(key)],
    );
    return Number(result.affectedRows || 0);
  }
}

export const calendarRegistry = new CalendarRegistryService();
