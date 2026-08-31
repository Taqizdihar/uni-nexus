import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { masterDataAccessService } from '../src/modules/master-data/master-data-access.service';
import { requireMasterDataDataset } from '../src/modules/master-data/master-data.registry';
import { masterDataService } from '../src/modules/master-data/master-data.service';
import type { MasterDataActor } from '../src/modules/master-data/master-data.types';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const suffix = randomBytes(5).toString('hex').toUpperCase();
const codes = { unit: `SMK_DM_U_${suffix}`, payment: `SMK_DM_P_${suffix}`, productA: `SMK_DM_PA_${suffix}`, productB: `SMK_DM_PB_${suffix}`, material: `SMK_DM_M_${suffix}`, sales: `SMK_DM_S_${suffix}`, service: `SMK_DM_V_${suffix}`, transaction: `SMK_DM_T_${suffix}` };
const required = ['master_data.read', 'master_data.manage', 'craft.products.read', 'craft.products.write', 'craft.materials.read', 'craft.materials.write', 'craft.marketplace.read', 'craft.marketplace.write', 'studio.services.read', 'studio.services.write', 'craft.finance.read', 'craft.finance.write', 'studio.finance.read', 'studio.finance.write', 'finance.read', 'finance.manage'];

function codeOf(error: unknown) { return (error as { code?: string })?.code; }
async function expectCode(work: () => Promise<unknown>, expected: string, message: string) { try { await work(); } catch (error) { if (codeOf(error) === expected) return; throw error; } throw new Error(message); }

async function fixtureActor(): Promise<MasterDataActor> {
  const [rows]: any = await pool.execute(`SELECT u.id,u.organization_id
    FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
    WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved'
      AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='CRAFT' AND bu.is_active=1)
      AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='STUDIO' AND bu.is_active=1)
      AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id=ubu.business_unit_id WHERE ubu.user_id=u.id AND ubu.can_access=1 AND bu.code='SHARED' AND bu.is_active=1)
    GROUP BY u.id,u.organization_id HAVING ${required.map(() => 'SUM(p.code = ?) > 0').join(' AND ')} LIMIT 1`, required);
  assert(rows.length, 'No active fixture user has the complete Data Master permission set.');
  const [permissionRows]: any = await pool.execute(`SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=?`, [rows[0].id]);
  return { id: Number(rows[0].id), organizationId: Number(rows[0].organization_id), permissions: permissionRows.map((row: any) => row.code), userAgent: 'smoke-master-data' };
}

async function run() {
  const actor = await fixtureActor();
  const created: Record<string, number> = {};
  try {
    // Closed registry and module/domain RBAC are checked before any mutation.
    await expectCode(async () => { requireMasterDataDataset('users'); }, 'MASTER_DATASET_NOT_FOUND', 'Arbitrary table-like dataset names were accepted.');
    await expectCode(() => masterDataService.create('units', { code: `SMK_DM_DENY_${suffix}`, name: 'Denied', symbol: 'x', unit_group: 'count', decimal_places: 0 }, { ...actor, permissions: actor.permissions.filter(permission => permission !== 'master_data.manage') }), 'MASTER_DATA_ACCESS_DENIED', 'Read-only actor could mutate global Data Master.');
    const noFinance = await masterDataAccessService.resolve({ ...actor, permissions: actor.permissions.filter(permission => !['craft.finance.read', 'studio.finance.read', 'finance.read'].includes(permission)) });
    assert(!noFinance.datasetCapabilities['finance-transaction-categories'].canRead, 'Finance dataset is visible without underlying finance read access.');

    const overview = await masterDataService.overview(actor);
    assert(overview.datasets.some(item => item.key === 'units') && overview.datasets.some(item => item.key === 'finance-transaction-categories'), 'Overview did not expose the registered datasets for an authorized actor.');
    const fullAccess = await masterDataAccessService.resolve(actor);
    assert(fullAccess.datasetCapabilities['studio-service-categories'].canManage, `Fixture actor cannot manage Studio categories: ${JSON.stringify({ permissions: actor.permissions, units: fullAccess.businessUnits, studio: fullAccess.datasetCapabilities['studio-service-categories'] })}`);
    const writableFinanceScope = (fullAccess.datasetCapabilities['finance-transaction-categories'].financeScopes || []).find(scope => {
      try { masterDataAccessService.requireManageable(fullAccess, 'finance-transaction-categories', scope); return true; } catch { return false; }
    });
    assert(writableFinanceScope, `Fixture actor cannot manage an accessible finance scope: ${JSON.stringify({ permissions: actor.permissions, units: fullAccess.businessUnits, capabilities: fullAccess.datasetCapabilities['finance-transaction-categories'] })}`);
    const meta = await masterDataService.meta(actor);
    assert(meta.active_units.length > 0 && meta.finance_scopes.includes('craft'), 'Meta did not return safe unit and finance scope data.');

    const unit = await masterDataService.create('units', { code: codes.unit, name: `Satuan Smoke ${suffix}`, symbol: 'smk', unit_group: 'count', decimal_places: 0 }, actor); created.unit = unit.id;
    assert(unit.code === codes.unit && unit.details.symbol === 'smk', 'Unit creation did not return its canonical record.');
    await expectCode(() => masterDataService.create('units', { code: codes.unit, name: 'Duplikat', symbol: 'd', unit_group: 'count', decimal_places: 0 }, actor), 'MASTER_DATA_CODE_ALREADY_EXISTS', 'Duplicate unit code was not controlled.');
    const unitUpdated = await masterDataService.update('units', unit.id, { name: `Satuan Smoke Diperbarui ${suffix}`, symbol: 'sm' }, actor);
    assert(unitUpdated.name.includes('Diperbarui') && unitUpdated.details.symbol === 'sm', 'Unit partial update did not preserve/update expected fields.');
    const unitUsage = await masterDataService.usage('units', unit.id, actor); assert(unitUsage.usage_total === 0 && unitUsage.deactivation_allowed, 'New unit usage analysis is incorrect.');
    await masterDataService.setActive('units', unit.id, false, actor);
    const inactiveUnits = await masterDataService.list('units', actor, { status: 'inactive', q: codes.unit, page: 1, limit: 25 }); assert(inactiveUnits.items.some(item => item.id === unit.id), 'Inactive status filtering did not return fixture unit.');
    await masterDataService.setActive('units', unit.id, true, actor);

    const payment = await masterDataService.create('payment-methods', { code: codes.payment, name: `Metode Smoke ${suffix}`, method_type: 'other' }, actor); created.payment = payment.id;
    await masterDataService.update('payment-methods', payment.id, { name: `Metode Smoke Edit ${suffix}` }, actor);
    await masterDataService.setActive('payment-methods', payment.id, false, actor); await masterDataService.setActive('payment-methods', payment.id, true, actor);

    const productA = await masterDataService.create('craft-product-categories', { code: codes.productA, name: `Produk Root ${suffix}` }, actor); created.productA = productA.id;
    const productB = await masterDataService.create('craft-product-categories', { code: codes.productB, name: `Produk Anak ${suffix}`, parent_id: productA.id }, actor); created.productB = productB.id;
    await expectCode(() => masterDataService.update('craft-product-categories', productA.id, { parent_id: productB.id }, actor), 'MASTER_DATA_HIERARCHY_CYCLE', 'Product category hierarchy cycle was accepted.');
    await expectCode(() => masterDataService.update('craft-product-categories', productA.id, { parent_id: productA.id }, actor), 'MASTER_DATA_INVALID_PARENT', 'Product category self-parent was accepted.');
    await expectCode(() => masterDataService.setActive('craft-product-categories', productA.id, false, actor), 'MASTER_DATA_ACTIVE_CHILDREN', 'Parent with active child could be deactivated.');
    await masterDataService.setActive('craft-product-categories', productB.id, false, actor); await masterDataService.setActive('craft-product-categories', productA.id, false, actor); await masterDataService.setActive('craft-product-categories', productA.id, true, actor); await masterDataService.setActive('craft-product-categories', productB.id, true, actor);

    const material = await masterDataService.create('craft-material-categories', { code: codes.material, name: `Material Smoke ${suffix}`, category_type: 'filament' }, actor); created.material = material.id;
    await masterDataService.update('craft-material-categories', material.id, { name: `Material Smoke Edit ${suffix}`, category_type: 'resin' }, actor); await masterDataService.setActive('craft-material-categories', material.id, false, actor); await masterDataService.setActive('craft-material-categories', material.id, true, actor);

    const channel = await masterDataService.create('craft-sales-channels', { code: codes.sales, name: `Kanal Smoke ${suffix}`, channel_type: 'marketplace', external_url: 'https://example.test/smoke' }, actor); created.sales = channel.id;
    await masterDataService.update('craft-sales-channels', channel.id, { name: `Kanal Smoke Edit ${suffix}`, channel_type: 'direct', external_url: null }, actor); await masterDataService.setActive('craft-sales-channels', channel.id, false, actor); await masterDataService.setActive('craft-sales-channels', channel.id, true, actor);

    const service = await masterDataService.create('studio-service-categories', { code: codes.service, name: `Layanan Smoke ${suffix}` }, actor); created.service = service.id;
    await masterDataService.update('studio-service-categories', service.id, { name: `Layanan Smoke Edit ${suffix}` }, actor); await masterDataService.setActive('studio-service-categories', service.id, false, actor); await masterDataService.setActive('studio-service-categories', service.id, true, actor);

    const coa = meta.chart_of_accounts[0]; assert(coa, 'No active chart of accounts is available for transaction-category test.');
    masterDataAccessService.requireManageable(await masterDataAccessService.resolve(actor), 'finance-transaction-categories', writableFinanceScope);
    const transaction = await masterDataService.create('finance-transaction-categories', { scope: writableFinanceScope, code: codes.transaction, name: `Transaksi Smoke ${suffix}`, transaction_type: 'expense', default_coa_account_id: coa.id }, actor); created.transaction = transaction.id;
    await masterDataService.update('finance-transaction-categories', transaction.id, { name: `Transaksi Smoke Edit ${suffix}`, default_coa_account_id: null }, actor); await masterDataService.setActive('finance-transaction-categories', transaction.id, false, actor); await masterDataService.setActive('finance-transaction-categories', transaction.id, true, actor);
    const protectedCategory = await masterDataService.list('finance-transaction-categories', actor, { status: 'all', q: 'CRAFT_SALES', page: 1, limit: 25 }); const core = protectedCategory.items.find(item => item.code === 'CRAFT_SALES'); assert(core?.is_protected, 'Directly-resolved core finance category is not marked protected.');

    const searched = await masterDataService.list('units', actor, { status: 'active', q: `Satuan Smoke Diperbarui ${suffix}`, page: 1, limit: 1 }); assert(searched.pagination.total === 1 && searched.items[0].id === unit.id, 'Search or pagination did not return the expected unit.');
    const csv = await masterDataService.export('units', 'csv', { status: 'active', q: codes.unit, page: 1, limit: 100 }, actor); const xlsx = await masterDataService.export('units', 'xlsx', { status: 'active', q: codes.unit, page: 1, limit: 100 }, actor); assert(csv.buffer.length > 20 && xlsx.buffer.length > 100, 'CSV/XLSX export did not generate content.');

    const [auditRows]: any = await pool.execute("SELECT action_code FROM audit_logs WHERE module_code='master_data' AND entity_code IN (?,?,?,?,?,?,?,?)", Object.values(codes));
    const [exportAuditRows]: any = await pool.execute("SELECT action_code FROM audit_logs WHERE module_code='master_data' AND entity_code='units' AND action_code='master_data.export' AND new_values LIKE ?", [`%${codes.unit}%`]);
    const actions = auditRows.map((row: any) => row.action_code); assert(actions.includes('master_data.create') && actions.includes('master_data.update') && actions.includes('master_data.activate') && actions.includes('master_data.deactivate') && exportAuditRows.length > 0, 'Master Data audit lifecycle entries are incomplete.');
    console.log('Master Data smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM audit_logs WHERE module_code='master_data' AND (entity_code IN (?,?,?,?,?,?,?,?) OR description LIKE ?)", [...Object.values(codes), `%${suffix}%`]);
      if (created.transaction) await connection.execute('DELETE FROM transaction_categories WHERE id=?', [created.transaction]);
      if (created.service) await connection.execute('DELETE FROM studio_service_categories WHERE id=?', [created.service]);
      if (created.sales) await connection.execute('DELETE FROM sales_channels WHERE id=?', [created.sales]);
      if (created.material) await connection.execute('DELETE FROM material_categories WHERE id=?', [created.material]);
      if (created.productB) await connection.execute('DELETE FROM product_categories WHERE id=?', [created.productB]);
      if (created.productA) await connection.execute('DELETE FROM product_categories WHERE id=?', [created.productA]);
      if (created.payment) await connection.execute('DELETE FROM payment_methods WHERE id=?', [created.payment]);
      if (created.unit) await connection.execute('DELETE FROM units_of_measure WHERE id=?', [created.unit]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
