import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';

export const STUDIO_SERVICES_MODULE = 'studio_services';

export interface EntityRef { id: number; code: string; entityType: 'studio_service' | 'service_package' | 'studio_service_category'; }

export const withStudioServicesTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try { const result = await work(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

export const writeStudioServicesAudit = async (
  connection: PoolConnection, studio: BusinessUnitContext, userId: number | null, actionCode: string,
  entity: EntityRef, description: string, oldValues?: unknown, newValues?: unknown,
) => {
  await AuditService.write({ organizationId: studio.organizationId, businessUnitId: studio.id, userId, moduleCode: STUDIO_SERVICES_MODULE, actionCode, entityType: entity.entityType, entityId: entity.id, entityCode: entity.code, description, oldValues, newValues }, connection);
};

/** Outbox publication is supplemental. A catalog mutation remains valid without an automation worker. */
export const publishStudioServicesEvent = async (
  connection: PoolConnection, studio: BusinessUnitContext, eventName: string, entity: EntityRef, userId: number | null, payload: Record<string, unknown>,
) => {
  try {
    await domainEvents.publish(connection, {
      eventName, moduleCode: STUDIO_SERVICES_MODULE, organizationId: studio.organizationId, businessUnitId: studio.id,
      entityType: entity.entityType, entityId: entity.id, entityCode: entity.code, actorUserId: userId, payload: { context: payload },
    });
  } catch (error) {
    console.error(`Failed to publish Studio Services domain event ${eventName}:`, error);
  }
};
