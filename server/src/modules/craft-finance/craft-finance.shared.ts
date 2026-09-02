import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { PostingContext } from '../../shared/finance/finance-posting.service';

export const CRAFT_FINANCE_MODULE = 'craft_finance';
export const money = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
export const financeCode = (prefix: string, id: number) => `${prefix}-${String(id).padStart(6, '0')}`;

export const craftFinanceContext = async (userId: number): Promise<PostingContext> => {
  const craft = await getCraftBusinessUnit();
  return { organizationId: craft.organizationId, businessUnitId: craft.id, userId };
};

export const toSqlDateTime = (value: string) => {
  const date = String(value || '').trim();
  if (!date || Number.isNaN(new Date(date).getTime())) throw new AppError(400, 'INVALID_DATE', 'Tanggal transaksi tidak valid.');
  return date;
};

export const withCraftFinanceTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
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

export const writeCraftFinanceAudit = async (
  connection: PoolConnection,
  ctx: PostingContext,
  action: string,
  entityType: string,
  entityId: number,
  entityCode: string,
  description: string,
  oldValues?: unknown,
  newValues?: unknown,
) => {
  await AuditService.write({ organizationId: ctx.organizationId, businessUnitId: ctx.businessUnitId, userId: ctx.userId, moduleCode: CRAFT_FINANCE_MODULE, actionCode: action, entityType, entityId, entityCode, description, oldValues, newValues }, connection);
};

/** Publishes finance facts only after cash posting succeeds in the same transaction. */
export const publishCraftFinanceEvent = async (connection: PoolConnection, ctx: PostingContext, eventName: string, entityType: string, entityId: number, entityCode: string, payload: Record<string, unknown>) =>
  domainEvents.publish(connection, { eventName, moduleCode: CRAFT_FINANCE_MODULE, organizationId: ctx.organizationId, businessUnitId: ctx.businessUnitId, entityType, entityId, entityCode, actorUserId: ctx.userId, payload: { context: payload } });
