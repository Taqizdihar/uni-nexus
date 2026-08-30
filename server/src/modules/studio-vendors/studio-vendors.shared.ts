import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { STUDIO_EXTERNAL_ROLES, type StudioExternalRole } from '../../shared/party/studio-external-party.service';

export const STUDIO_VENDORS_MODULE = 'studio_vendors';
export const externalRoleLabels: Record<string, string> = { vendor: 'Vendor', freelancer: 'Freelancer', studio_partner: 'Mitra Studio', supplier: 'Supplier', studio_client: 'Klien Studio', craft_customer: 'Pelanggan Craft', craft_partner: 'Mitra Craft' };
export const externalRoleToAssignmentRole: Record<StudioExternalRole, string> = { vendor: 'vendor', freelancer: 'freelancer', studio_partner: 'partner' };

export const withVendorTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection(); await connection.beginTransaction();
  try { const value = await work(connection); await connection.commit(); return value; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};
export const assertManagedRole = (role: string): asserts role is StudioExternalRole => {
  if (!(STUDIO_EXTERNAL_ROLES as readonly string[]).includes(role)) throw new AppError(400, 'STUDIO_EXTERNAL_ROLE_INVALID', 'Peran pihak eksternal tidak didukung.');
};
export const assertGloballyActive = (party: { status_code: string }) => {
  if (party.status_code !== 'active') throw new AppError(409, 'PARTY_GLOBALLY_INACTIVE', 'Party ini berstatus tidak aktif secara global. Aktivasi global dikelola administrasi data induk.');
};
export const vendorRef = (party: { id: number; code: string }) => ({ id: Number(party.id), code: party.code });
export const writeVendorAudit = async (connection: PoolConnection, studio: BusinessUnitContext, userId: number | null, action: string, party: { id: number; code: string }, description: string, oldValues?: unknown, newValues?: unknown) => {
  await AuditService.write({ organizationId: studio.organizationId, businessUnitId: studio.id, userId, moduleCode: STUDIO_VENDORS_MODULE, actionCode: action, entityType: 'party', entityId: party.id, entityCode: party.code, description, oldValues, newValues }, connection);
};
export const loadExternalPartyForUpdate = async (connection: PoolConnection, partyId: number, studio: BusinessUnitContext) => {
  const [rows]: any = await connection.execute(
    `SELECT p.* FROM parties p WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM party_roles pr WHERE pr.party_id = p.id AND pr.business_unit_id = ? AND pr.role_code IN ('vendor', 'freelancer', 'studio_partner'))
       LIMIT 1 FOR UPDATE`, [partyId, studio.organizationId, studio.id],
  );
  if (!rows.length) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.');
  return rows[0];
};
