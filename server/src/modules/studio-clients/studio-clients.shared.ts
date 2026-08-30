import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { AuditService } from '../../shared/audit/audit.service';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { STUDIO_CLIENT_ROLE } from '../../shared/party/studio-client.service';

export const STUDIO_CLIENTS_MODULE = 'studio_clients';
export const PARTY_ENTITY = 'party';

export interface ClientRef {
  id: number;
  code: string;
}

/** Runs `work` inside a transaction, releasing the connection either way. */
export const withTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
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

export const writeClientAudit = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  userId: number | null,
  actionCode: string,
  client: ClientRef,
  description: string,
  oldValues?: unknown,
  newValues?: unknown,
) => {
  await AuditService.write({ organizationId: studio.organizationId, businessUnitId: studio.id, userId, moduleCode: STUDIO_CLIENTS_MODULE, actionCode, entityType: PARTY_ENTITY, entityId: client.id, entityCode: client.code, description, oldValues, newValues }, connection);
};

/**
 * Publishes a Studio Client domain event to the shared transactional outbox.
 * Best-effort: a failure here must never fail a correct write, and the module
 * must work identically with the automation worker stopped.
 */
export const publishClientEvent = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  eventName: string,
  client: ClientRef,
  userId: number | null,
  payload: Record<string, unknown>,
) => {
  try {
    await domainEvents.publish(connection, {
      eventName,
      moduleCode: STUDIO_CLIENTS_MODULE,
      organizationId: studio.organizationId,
      businessUnitId: studio.id,
      entityType: PARTY_ENTITY,
      entityId: client.id,
      entityCode: client.code,
      actorUserId: userId,
      payload: { context: payload },
    });
  } catch (error) {
    console.error(`Failed to publish Studio Client domain event ${eventName}:`, error);
  }
};

/** True when the studio_client role row is active and within its optional date window. */
export const isRoleEffectivelyActive = (role: { is_active: number | boolean; valid_from: string | Date | null; valid_until: string | Date | null }) => {
  if (!role.is_active) return false;
  const today = new Date().toISOString().slice(0, 10);
  const from = role.valid_from ? String(role.valid_from).slice(0, 10) : null;
  const until = role.valid_until ? String(role.valid_until).slice(0, 10) : null;
  if (from && from > today) return false;
  if (until && until < today) return false;
  return true;
};

/** Loads and row-locks the Party plus its studio_client role, requiring the role to exist (active or not). */
export const loadClientForUpdate = async (connection: PoolConnection, partyId: number, studio: BusinessUnitContext) => {
  const [rows]: any = await connection.execute(
    `SELECT p.*, role.id AS role_id, role.is_active AS role_is_active, role.valid_from AS role_valid_from, role.valid_until AS role_valid_until
     FROM parties p
     JOIN party_roles role ON role.party_id = p.id AND role.business_unit_id = ? AND role.role_code = ?
     WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
     LIMIT 1 FOR UPDATE`,
    [studio.id, STUDIO_CLIENT_ROLE, partyId, studio.organizationId],
  );
  if (!rows.length) throw new NotFoundError('Klien Studio tidak ditemukan.');
  return rows[0];
};

export const assertPartyGloballyUsable = (party: { status_code: string }) => {
  if (party.status_code !== 'active') {
    throw new AppError(409, 'PARTY_GLOBALLY_INACTIVE', 'Party ini berstatus tidak aktif secara global. Aktivasi Party adalah wewenang administrasi data induk.');
  }
};

export const clientRef = (party: any): ClientRef => ({ id: Number(party.id), code: party.code });
