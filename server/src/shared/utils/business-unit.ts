import { pool } from '../../config/database';
import { AppError } from '../errors/AppError';

export interface BusinessUnitContext {
  id: number;
  organizationId: number;
  code: string;
}

const businessUnitCache: Record<string, BusinessUnitContext> = {};

/** Resolves a business unit by its stable code so numeric IDs never get hardcoded. */
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
