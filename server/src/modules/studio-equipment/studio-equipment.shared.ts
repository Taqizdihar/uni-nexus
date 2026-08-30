import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';

export const STUDIO_EQUIPMENT_MODULE = 'studio_equipment';

export const withEquipmentTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try { const result = await work(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

export const assetReference = (asset: { id: number; asset_code: string }) => ({ id: Number(asset.id), asset_code: asset.asset_code });

export const writeAssetAudit = async (
  connection: PoolConnection, studio: BusinessUnitContext, userId: number | null, actionCode: string,
  asset: { id: number; asset_code: string }, description: string, oldValues?: unknown, newValues?: unknown,
) => AuditService.write({ organizationId: studio.organizationId, businessUnitId: studio.id, userId, moduleCode: STUDIO_EQUIPMENT_MODULE, actionCode, entityType: 'asset', entityId: asset.id, entityCode: asset.asset_code, description, oldValues, newValues }, connection);

export const publishAssetEvent = async (
  connection: PoolConnection, studio: BusinessUnitContext, eventName: string,
  asset: { id: number; asset_code: string }, userId: number | null, payload: Record<string, unknown>,
) => domainEvents.publish(connection, {
  eventName, eventKey: `${eventName}:${asset.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
  moduleCode: STUDIO_EQUIPMENT_MODULE, organizationId: studio.organizationId, businessUnitId: studio.id,
  entityType: 'asset', entityId: asset.id, entityCode: asset.asset_code, actorUserId: userId, payload,
});

export const toSqlDateTime = (value?: string | null): string | null => {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return `${trimmed.replace('T', ' ').padEnd(19, ':00').slice(0, 19)}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
};

export const toSqlDate = (value?: string | null) => toSqlDateTime(value)?.slice(0, 10) || null;
export const toNumber = (value: unknown) => value === null || value === undefined ? null : Number(value);
export const isAtOrBeforeNow = (value: string | Date) => {
  const time = value instanceof Date
    ? value.getTime()
    : new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).getTime();
  return time <= Date.now();
};
