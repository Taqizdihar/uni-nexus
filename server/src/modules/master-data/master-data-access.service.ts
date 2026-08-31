import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import type { AccessibleBusinessUnit, DatasetCapabilities, FinanceScope, MasterDataAccess, MasterDataActor, MasterDataDatasetKey } from './master-data.types';
import { masterDataDatasetKeys } from './master-data.types';

const has = (actor: MasterDataActor, permission: string) => actor.permissions.includes(permission);

export class MasterDataAccessService {
  async resolve(actor: MasterDataActor): Promise<MasterDataAccess> {
    const [rows]: any = await pool.execute(
      `SELECT bu.id, bu.code, bu.name
       FROM user_business_units ubu
       JOIN business_units bu ON bu.id = ubu.business_unit_id
       WHERE ubu.user_id = ? AND ubu.can_access = 1 AND bu.organization_id = ? AND bu.is_active = 1
       ORDER BY bu.id`,
      [actor.id, actor.organizationId],
    );
    const businessUnits = rows.filter((row: any) => ['CRAFT', 'STUDIO', 'SHARED'].includes(row.code)).map((row: any) => ({ id: Number(row.id), code: row.code, name: row.name })) as AccessibleBusinessUnit[];
    const hasBu = (code: AccessibleBusinessUnit['code']) => businessUnits.some(unit => unit.code === code);
    const masterRead = has(actor, 'master_data.read');
    const masterManage = has(actor, 'master_data.manage');
    const craftRead = masterRead && hasBu('CRAFT') && has(actor, 'craft.products.read');
    const craftMaterialsRead = masterRead && hasBu('CRAFT') && has(actor, 'craft.materials.read');
    const craftMarketplaceRead = masterRead && hasBu('CRAFT') && has(actor, 'craft.marketplace.read');
    const studioRead = masterRead && hasBu('STUDIO') && has(actor, 'studio.services.read');
    const financeScopes: FinanceScope[] = [];
    if (masterRead && hasBu('CRAFT') && has(actor, 'craft.finance.read')) financeScopes.push('craft');
    if (masterRead && hasBu('STUDIO') && has(actor, 'studio.finance.read')) financeScopes.push('studio');
    if (masterRead && hasBu('SHARED') && has(actor, 'finance.read')) financeScopes.push('shared');
    const capabilities: Record<MasterDataDatasetKey, DatasetCapabilities> = {
      units: { canRead: masterRead, canManage: masterRead && masterManage },
      'payment-methods': { canRead: masterRead, canManage: masterRead && masterManage },
      'craft-product-categories': { canRead: craftRead, canManage: craftRead && masterManage && has(actor, 'craft.products.write') },
      'craft-material-categories': { canRead: craftMaterialsRead, canManage: craftMaterialsRead && masterManage && has(actor, 'craft.materials.write') },
      'craft-sales-channels': { canRead: craftMarketplaceRead, canManage: craftMarketplaceRead && masterManage && has(actor, 'craft.marketplace.write') },
      'studio-service-categories': { canRead: studioRead, canManage: studioRead && masterManage && has(actor, 'studio.services.write') },
      'finance-transaction-categories': {
        canRead: financeScopes.length > 0,
        canManage: financeScopes.some(scope => this.canManageFinanceScope(actor, hasBu, scope)),
        financeScopes,
      },
    };
    return { actor, businessUnits, datasetCapabilities: capabilities };
  }

  requireReadable(access: MasterDataAccess, dataset: MasterDataDatasetKey) {
    if (!access.datasetCapabilities[dataset].canRead) throw new AppError(403, 'MASTER_DATA_ACCESS_DENIED', 'Anda tidak memiliki akses ke dataset Data Master ini.');
  }

  requireManageable(access: MasterDataAccess, dataset: MasterDataDatasetKey, scope?: FinanceScope) {
    this.requireReadable(access, dataset);
    if (dataset === 'finance-transaction-categories' && scope) {
      const hasBu = (code: AccessibleBusinessUnit['code']) => access.businessUnits.some(unit => unit.code === code);
      if (!this.canManageFinanceScope(access.actor, hasBu, scope)) throw new AppError(403, 'MASTER_DATA_ACCESS_DENIED', 'Anda tidak memiliki hak kelola untuk scope keuangan ini.');
      return;
    }
    if (!access.datasetCapabilities[dataset].canManage) throw new AppError(403, 'MASTER_DATA_ACCESS_DENIED', 'Anda tidak memiliki hak kelola Data Master untuk dataset ini.');
  }

  requireBusinessUnit(access: MasterDataAccess, code: AccessibleBusinessUnit['code']) {
    const unit = access.businessUnits.find(item => item.code === code);
    if (!unit) throw new AppError(403, 'MASTER_DATA_ACCESS_DENIED', 'Akses ke workspace yang dibutuhkan tidak tersedia.');
    return unit;
  }

  financeScopeForBusinessUnit(access: MasterDataAccess, businessUnitId: number): FinanceScope {
    const unit = access.businessUnits.find(item => item.id === businessUnitId);
    if (!unit) throw new AppError(404, 'MASTER_DATA_ITEM_NOT_FOUND', 'Data referensi tidak ditemukan.');
    return unit.code.toLowerCase() as FinanceScope;
  }

  private canManageFinanceScope(actor: MasterDataActor, hasBu: (code: AccessibleBusinessUnit['code']) => boolean, scope: FinanceScope) {
    if (!has(actor, 'master_data.read') || !has(actor, 'master_data.manage')) return false;
    if (scope === 'craft') return hasBu('CRAFT') && has(actor, 'craft.finance.write');
    if (scope === 'studio') return hasBu('STUDIO') && has(actor, 'studio.finance.write');
    return hasBu('SHARED') && has(actor, 'finance.manage');
  }
}

export const masterDataAccessService = new MasterDataAccessService();
