import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import { getBusinessUnitByCode, type BusinessUnitContext } from '../../shared/utils/business-unit';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';

export const STUDIO_FINANCE_MODULE = 'studio_finance';
export const getStudioFinanceBusinessUnit = () => getBusinessUnitByCode('STUDIO');
export const money = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
export const financeCode = (prefix: string, id: number) => `${prefix}-${String(id).padStart(6, '0')}`;

export const parseFinanceId = (value: unknown, label = 'ID') => {
  const id = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ID', `${label} tidak valid.`);
  return id;
};

export const toSqlDateTime = (value: string) => {
  const date = String(value || '').trim();
  if (!date || Number.isNaN(new Date(date).getTime())) throw new AppError(400, 'INVALID_DATE', 'Tanggal transaksi tidak valid.');
  return date;
};

export const withStudioFinanceTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const writeStudioFinanceAudit = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  entityCode: string,
  description: string,
  oldValues?: unknown,
  newValues?: unknown,
) => {
  await AuditService.write({ organizationId: studio.organizationId, businessUnitId: studio.id, userId, moduleCode: STUDIO_FINANCE_MODULE, actionCode: action, entityType, entityId, entityCode, description, oldValues, newValues }, connection);
};

/** Publishes finance facts only after cash posting succeeds in the same transaction. */
export const publishStudioFinanceEvent = async (connection: PoolConnection, studio: BusinessUnitContext, eventName: string, entityType: string, entityId: number, entityCode: string, userId: number, payload: Record<string, unknown>) =>
  domainEvents.publish(connection, { eventName, moduleCode: STUDIO_FINANCE_MODULE, organizationId: studio.organizationId, businessUnitId: studio.id, entityType, entityId, entityCode, actorUserId: userId, payload: { context: payload } });

export type StudioFinanceContext = BusinessUnitContext & { userId: number; businessUnitId: number };
