import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { getBusinessUnitByCode, type BusinessUnitContext } from '../../shared/utils/business-unit';

export const STUDIO_BILLING_MODULE = 'studio_billing';
export const STUDIO_PROJECT_INVOICE_SOURCE = 'studio_project';
export const STUDIO_DATE_SQL = `DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`;

export const getStudioBillingBusinessUnit = () => getBusinessUnitByCode('STUDIO');

export const withBillingTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
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

export const parseBillingId = (value: unknown, label: string): number => {
  const id = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ID', `${label} tidak valid.`);
  return id;
};

export const toNumber = (value: unknown): number => value === null || value === undefined ? 0 : Number(value);
export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const toSqlDate = (value?: string | null): string | null => {
  if (!value?.trim()) return null;
  const date = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new AppError(400, 'INVALID_DATE', 'Format tanggal tidak valid.');
  }
  return date;
};

export const assertDateOrder = (start: string, end?: string | null, label = 'Tanggal berlaku') => {
  if (end && end < start) throw new AppError(400, 'INVALID_DATE_RANGE', `${label} tidak boleh sebelum tanggal terbit.`);
};

export const effectiveQuotationStatus = (row: { status_code: string; valid_until?: string | null }): string =>
  row.status_code === 'sent' && Boolean(row.valid_until) && String(row.valid_until).slice(0, 10) < studioDate() ? 'expired' : row.status_code;

export const effectiveInvoiceStatus = (row: { status_code: string; due_date?: string | null; balance_due?: unknown }): string => {
  const settled = ['draft', 'paid', 'void', 'refunded'].includes(row.status_code);
  return !settled && Boolean(row.due_date) && String(row.due_date).slice(0, 10) < studioDate() && toNumber(row.balance_due) > 0.005
    ? 'overdue'
    : row.status_code;
};

/** Local wall date used by the Studio UI; GET endpoints never persist this derived state. */
export const studioDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

export const writeBillingAudit = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  userId: number | null,
  actionCode: string,
  entityType: 'quotation' | 'invoice' | 'quotation_template',
  entityId: number,
  entityCode: string,
  description: string,
  oldValues?: unknown,
  newValues?: unknown,
) => {
  await connection.execute(
    `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, old_values, new_values)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studio.organizationId, studio.id, userId, STUDIO_BILLING_MODULE, actionCode, entityType, entityId, entityCode,
      description.slice(0, 500), oldValues === undefined ? null : JSON.stringify(oldValues), newValues === undefined ? null : JSON.stringify(newValues),
    ],
  );
};

export const publishBillingEvent = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  eventName: string,
  entityType: 'quotation' | 'invoice',
  entityId: number,
  entityCode: string,
  actorUserId: number | null,
  payload: Record<string, unknown>,
) => {
    await domainEvents.publish(connection, {
      eventName,
      moduleCode: STUDIO_BILLING_MODULE,
      organizationId: studio.organizationId,
      businessUnitId: studio.id,
      entityType,
      entityId,
      entityCode,
      actorUserId,
      correlationId: randomUUID(),
      payload: { context: payload },
    });
};

export const loadStudioProjectForBilling = async (connection: PoolConnection, projectId: number, studio: BusinessUnitContext) => {
  const [rows]: any = await connection.execute(
    `SELECT * FROM studio_projects WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
    [projectId, studio.id],
  );
  if (!rows.length) throw new NotFoundError('Proyek Studio tidak ditemukan.');
  return rows[0];
};

export const assignCommercialNumber = async (connection: PoolConnection, table: 'quotations' | 'invoices' | 'quotation_templates', id: number, prefix: 'QTN' | 'INV' | 'QTM') => {
  const column = table === 'quotation_templates' ? 'template_code' : table === 'quotations' ? 'quotation_number' : 'invoice_number';
  const value = `${prefix}-${id.toString().padStart(6, '0')}`;
  await connection.execute(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [value, id]);
  return value;
};

export const tempCode = () => `TMP-${randomUUID()}`;
