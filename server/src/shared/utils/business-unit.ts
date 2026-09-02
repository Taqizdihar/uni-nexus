import { pool } from '../../config/database';
import { AppError } from '../errors/AppError';

export interface BusinessUnitContext {
  id: number;
  organizationId: number;
  code: string;
}

const businessUnitCache: Record<string, BusinessUnitContext> = {};

const cacheKey = (organizationId: number, code: string) => `${organizationId}:${code.toUpperCase()}`;

/**
 * Legacy, code-only lookup.  It is intentionally retained for bootstrap/migration
 * code that has no authenticated tenant context.  Never use it in a request handler.
 */
export async function getBusinessUnitByCode(code: string): Promise<BusinessUnitContext> {
  const normalizedCode = code.toUpperCase();
  if (businessUnitCache[normalizedCode]) return businessUnitCache[normalizedCode];

  const [rows]: any = await pool.execute(
    `SELECT id, organization_id, code
     FROM business_units
     WHERE code = ? AND is_active = 1
     LIMIT 1`,
    [normalizedCode]
  );

  if (!rows.length) {
    throw new AppError(500, 'BU_NOT_FOUND', `Business unit '${normalizedCode}' tidak ditemukan atau tidak aktif.`);
  }

  const context: BusinessUnitContext = {
    id: Number(rows[0].id),
    organizationId: Number(rows[0].organization_id),
    code: rows[0].code,
  };
  businessUnitCache[normalizedCode] = context;
  return context;
}

/**
 * Resolves a stable workspace code within the authenticated organization.
 * Never use the legacy code-only lookup for request or worker-owned data.
 */
export async function getBusinessUnitByCodeForOrganization(organizationId: number, code: string): Promise<BusinessUnitContext> {
  const normalizedCode = code.toUpperCase();
  const key = cacheKey(organizationId, normalizedCode);
  if (businessUnitCache[key]) return businessUnitCache[key];

  const [rows]: any = await pool.execute(
    `SELECT id, organization_id, code
     FROM business_units
     WHERE organization_id = ? AND code = ? AND is_active = 1
     LIMIT 1`,
    [organizationId, normalizedCode],
  );

  if (!rows.length) {
    throw new AppError(404, 'AUTOMATION_WORKSPACE_NOT_FOUND', `Workspace '${normalizedCode}' tidak ditemukan atau tidak aktif untuk organisasi ini.`);
  }

  const context: BusinessUnitContext = {
    id: Number(rows[0].id),
    organizationId: Number(rows[0].organization_id),
    code: rows[0].code,
  };
  businessUnitCache[key] = context;
  return context;
}

/** Resolves a workspace in the authenticated tenant and verifies explicit user access. */
export async function getBusinessUnitByCodeForAuthenticatedUser(organizationId: number, userId: number, code: string): Promise<BusinessUnitContext> {
  const unit = await getBusinessUnitByCodeForOrganization(organizationId, code);
  const [rows]: any = await pool.execute(
    `SELECT 1 FROM user_business_units
     WHERE user_id=? AND business_unit_id=? AND can_access=1
     LIMIT 1`,
    [userId, unit.id],
  );
  if (!rows.length) throw new AppError(403, 'BUSINESS_UNIT_ACCESS_DENIED', 'Anda tidak memiliki akses ke unit bisnis ini.');
  return unit;
}
