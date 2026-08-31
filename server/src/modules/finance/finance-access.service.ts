import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import type { AccessibleFinanceUnit, FinanceAccess, FinanceActor } from './finance.types';

const CODES = ['CRAFT', 'STUDIO', 'SHARED'] as const;
type UnitCode = typeof CODES[number];

/** Centralized, permission-aware access policy for every Unified Finance query. */
export class UnifiedFinanceAccessService {
  async resolve(actor: FinanceActor): Promise<FinanceAccess> {
    const [rows]: any = await pool.execute(
      `SELECT bu.id,bu.code,bu.name
       FROM business_units bu
       JOIN user_business_units ubu ON ubu.business_unit_id=bu.id AND ubu.user_id=? AND ubu.can_access=1
       WHERE bu.organization_id=? AND bu.is_active=1 AND bu.code IN ('CRAFT','STUDIO','SHARED')`,
      [actor.id, actor.organization_id],
    );
    const permissions = new Set(actor.permissions || []);
    const allowed: AccessibleFinanceUnit[] = rows
      .map((row: any) => ({ id: Number(row.id), code: String(row.code).toUpperCase() as UnitCode, name: String(row.name) }))
      .filter((unit: AccessibleFinanceUnit) => unit.code === 'SHARED' || (unit.code === 'CRAFT' ? permissions.has('craft.finance.read') : permissions.has('studio.finance.read')));
    const byCode: FinanceAccess['byCode'] = {};
    for (const unit of allowed) byCode[unit.code] = unit;
    return { organizationId: Number(actor.organization_id), actorId: Number(actor.id), units: allowed, byCode, permissions };
  }

  ids(access: FinanceAccess, workspace: string = 'all') {
    const code = String(workspace || 'all').toUpperCase();
    return access.units.filter(unit => code === 'ALL' || unit.code === code).map(unit => unit.id);
  }

  unit(access: FinanceAccess, businessUnitId: number) {
    return access.units.find(unit => unit.id === Number(businessUnitId)) || null;
  }

  requireShared(access: FinanceAccess) {
    const shared = access.byCode.SHARED;
    if (!shared) throw new AppError(403, 'SHARED_ACCESS_REQUIRED', 'Akses ke unit Shared diperlukan.');
    return shared;
  }

  requireWrite(access: FinanceAccess, unit: AccessibleFinanceUnit) {
    const required = unit.code === 'CRAFT' ? 'craft.finance.write' : unit.code === 'STUDIO' ? 'studio.finance.write' : 'finance.write';
    if (!access.permissions.has(required)) throw new AppError(403, 'FORBIDDEN', 'Anda tidak memiliki hak tulis keuangan untuk unit bisnis ini.');
  }

  requireManage(access: FinanceAccess) {
    if (!access.permissions.has('finance.manage')) throw new AppError(403, 'FORBIDDEN', 'Administrasi keuangan memerlukan izin finance.manage.');
  }

  requireTransfer(access: FinanceAccess, fromBusinessUnitId: number, toBusinessUnitId: number) {
    if (!access.permissions.has('finance.transfer')) throw new AppError(403, 'FORBIDDEN', 'Transfer dana internal memerlukan izin finance.transfer.');
    this.requireShared(access);
    const from = this.unit(access, fromBusinessUnitId); const to = this.unit(access, toBusinessUnitId);
    if (!from || !to) throw new AppError(403, 'BUSINESS_UNIT_ACCESS_REQUIRED', 'Akses ke unit asal dan tujuan diperlukan.');
    this.requireWrite(access, from); this.requireWrite(access, to);
    return { from, to };
  }
}

export const unifiedFinanceAccess = new UnifiedFinanceAccessService();
