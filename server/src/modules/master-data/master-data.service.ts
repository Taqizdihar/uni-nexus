import ExcelJS from 'exceljs';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import { masterDataAccessService } from './master-data-access.service';
import { masterDataGroups, masterDataRegistry, masterDataScopes } from './master-data.registry';
import type { FinanceScope, MasterDataAccess, MasterDataActor, MasterDataDatasetKey, MasterDataItem, MasterDataListFilters, MasterDataUsage } from './master-data.types';

type SqlExecutor = Pick<PoolConnection, 'execute'>;
type ListQuery = { select: string; count: string; where: string[]; params: unknown[]; orderBy: string; idColumn: string };

const CORE_TRANSACTION_CODES = new Set(['CRAFT_SALES', 'CRAFT_MATERIAL', 'STUDIO_PROJECT', 'STUDIO_PROJECT_COST']);
const scopeLabel: Record<FinanceScope, string> = { craft: 'Craft', studio: 'Studio', shared: 'Shared' };
const duplicate = (error: unknown) => (error as { code?: string })?.code === 'ER_DUP_ENTRY';
const number = (value: unknown) => Number(value || 0);
const bool = (value: unknown) => Boolean(Number(value));
// MySQL's parameterized LIKE keeps the default backslash escape semantics.
// Escape the three special characters before wrapping the user's term in %.
const escapeLike = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
const own = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

export class MasterDataService {
  async overview(actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    const definitions = Object.values(masterDataRegistry).filter(definition => access.datasetCapabilities[definition.key].canRead);
    const datasets = await Promise.all(definitions.map(async definition => {
      const counts = await this.countRows(definition.key, access);
      return {
        key: definition.key, name: definition.name, description: definition.description, group: definition.group,
        group_label: masterDataGroups[definition.group], scope: definition.scope, scope_label: masterDataScopes[definition.scope],
        row_count: counts.total, active_count: counts.active, inactive_count: counts.inactive,
        can_read: true, can_manage: access.datasetCapabilities[definition.key].canManage, last_updated_at: counts.lastUpdatedAt,
      };
    }));
    const aggregate = datasets.reduce((total, item) => ({
      row_count: total.row_count + item.row_count, active_count: total.active_count + item.active_count, inactive_count: total.inactive_count + item.inactive_count,
    }), { row_count: 0, active_count: 0, inactive_count: 0 });
    return {
      dataset_count: datasets.length, total_reference_rows: aggregate.row_count, active_rows: aggregate.active_count, inactive_rows: aggregate.inactive_count,
      groups: Object.entries(masterDataGroups).map(([key, label]) => ({ key, label, datasets: datasets.filter(dataset => dataset.group === key) })),
      datasets,
    };
  }

  async meta(actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    const [units]: any = await pool.execute('SELECT id, code, name, symbol, unit_group FROM units_of_measure WHERE is_active = 1 ORDER BY unit_group, name');
    const financeScopes = access.datasetCapabilities['finance-transaction-categories'].financeScopes || [];
    const financeUnitIds = financeScopes.map(scope => masterDataAccessService.requireBusinessUnit(access, scope.toUpperCase() as 'CRAFT' | 'STUDIO' | 'SHARED').id);
    const coa: any[] = financeUnitIds.length ? (await pool.execute<any[]>(`SELECT id, account_code, account_name, business_unit_id FROM chart_of_accounts WHERE organization_id = ? AND is_active = 1 AND (business_unit_id IS NULL OR business_unit_id IN (${financeUnitIds.map(() => '?').join(',')})) ORDER BY account_code`, [access.actor.organizationId, ...financeUnitIds]))[0] : [];
    return {
      datasets: Object.values(masterDataRegistry).filter(definition => access.datasetCapabilities[definition.key].canRead).map(definition => ({
        key: definition.key, name: definition.name, description: definition.description, group: definition.group,
        group_label: masterDataGroups[definition.group], scope: definition.scope, scope_label: masterDataScopes[definition.scope],
        capabilities: access.datasetCapabilities[definition.key],
      })),
      groups: masterDataGroups,
      enums: {
        unit_groups: ['weight', 'count', 'length', 'volume', 'time', 'other'],
        payment_method_types: ['cash', 'bank_transfer', 'ewallet', 'marketplace', 'other'],
        material_category_types: ['filament', 'resin', 'hardware', 'packaging', 'consumable', 'other'],
        sales_channel_types: ['marketplace', 'direct', 'partner', 'internal'],
        transaction_types: ['income', 'expense'],
      },
      active_units: units.map((item: any) => ({ id: Number(item.id), code: item.code, name: item.name, symbol: item.symbol, unit_group: item.unit_group })),
      finance_scopes: financeScopes,
      chart_of_accounts: coa.map((item: any) => ({ id: Number(item.id), account_code: item.account_code, account_name: item.account_name, business_unit_id: item.business_unit_id == null ? null : Number(item.business_unit_id) })),
    };
  }

  async list(dataset: MasterDataDatasetKey, actor: MasterDataActor, filters: MasterDataListFilters) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    return this.listWithAccess(dataset, access, filters);
  }

  async detail(dataset: MasterDataDatasetKey, id: number, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    const row = await this.getRaw(dataset, access, id);
    const usage = await this.usageFor(dataset, id, row);
    return this.normalize(dataset, row, access, usage);
  }

  async usage(dataset: MasterDataDatasetKey, id: number, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    const row = await this.getRaw(dataset, access, id);
    return this.usageFor(dataset, id, row);
  }

  async create(dataset: MasterDataDatasetKey, data: Record<string, unknown>, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    const financeScope = dataset === 'finance-transaction-categories' ? data.scope as FinanceScope : undefined;
    masterDataAccessService.requireManageable(access, dataset, financeScope);
    try {
      const id = await this.transaction(async connection => {
        const createdId = await this.insert(dataset, data, access, connection);
        const created = await this.getRaw(dataset, access, createdId, connection);
        await this.audit(access, dataset, created, 'master_data.create', null, created, connection);
        return createdId;
      });
      return this.detail(dataset, id, actor);
    } catch (error) {
      if (duplicate(error)) throw new AppError(409, 'MASTER_DATA_CODE_ALREADY_EXISTS', 'Kode referensi sudah digunakan pada scope ini.');
      throw error;
    }
  }

  async update(dataset: MasterDataDatasetKey, id: number, data: Record<string, unknown>, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    const current = await this.getRaw(dataset, access, id);
    const financeScope = dataset === 'finance-transaction-categories' ? this.financeScope(current) : undefined;
    masterDataAccessService.requireManageable(access, dataset, financeScope);
    await this.transaction(async connection => {
      const previous = await this.getRaw(dataset, access, id, connection, true);
      await this.applyUpdate(dataset, id, data, previous, access, connection);
      const updated = await this.getRaw(dataset, access, id, connection);
      await this.audit(access, dataset, updated, 'master_data.update', previous, updated, connection);
    });
    return this.detail(dataset, id, actor);
  }

  async setActive(dataset: MasterDataDatasetKey, id: number, active: boolean, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    const existing = await this.getRaw(dataset, access, id);
    const financeScope = dataset === 'finance-transaction-categories' ? this.financeScope(existing) : undefined;
    masterDataAccessService.requireManageable(access, dataset, financeScope);
    await this.transaction(async connection => {
      const previous = await this.getRaw(dataset, access, id, connection, true);
      if (!active) {
        const usage = await this.usageFor(dataset, id, previous, connection, true);
        if (!usage.deactivation_allowed) {
          const code = usage.blocking_reason?.includes('subkategori') ? 'MASTER_DATA_ACTIVE_CHILDREN' : 'MASTER_DATA_REFERENCE_PROTECTED';
          throw new AppError(409, code, usage.blocking_reason || 'Referensi ini tidak dapat dinonaktifkan.');
        }
      }
      await this.updateActive(dataset, id, active, connection);
      const updated = await this.getRaw(dataset, access, id, connection);
      await this.audit(access, dataset, updated, active ? 'master_data.activate' : 'master_data.deactivate', previous, updated, connection);
    });
    return this.detail(dataset, id, actor);
  }

  async export(dataset: MasterDataDatasetKey, format: 'csv' | 'xlsx', filters: MasterDataListFilters, actor: MasterDataActor) {
    const access = await masterDataAccessService.resolve(actor);
    masterDataAccessService.requireReadable(access, dataset);
    const result = await this.listWithAccess(dataset, access, { ...filters, page: 1, limit: Math.min(filters.limit, 500) });
    const headers = ['Kode', 'Nama', 'Scope', 'Status', 'Penggunaan', 'Rincian'];
    const values = result.items.map(item => [item.code, item.name, item.scope_label, item.is_active ? 'Aktif' : 'Nonaktif', item.usage_total || 0, this.exportDetails(item)]);
    let buffer: Buffer;
    let mime: string;
    let extension: string;
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Data Master');
      sheet.addRow(headers);
      values.forEach(row => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.columns = headers.map((header, index) => ({ header, width: index === 5 ? 46 : 20 }));
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else {
      buffer = Buffer.from(`\uFEFF${[headers, ...values].map(row => row.map(value => this.csv(value)).join(',')).join('\r\n')}\r\n`, 'utf8');
      mime = 'text/csv; charset=utf-8';
      extension = 'csv';
    }
    await AuditService.write({
      organizationId: access.actor.organizationId, userId: access.actor.id, moduleCode: 'master_data', actionCode: 'master_data.export',
      entityType: 'master_data_dataset', entityCode: dataset, description: `Mengekspor Data Master ${masterDataRegistry[dataset].name}.`,
      newValues: { dataset, format, filters: this.safeFilters(filters) }, ipAddress: access.actor.ip, userAgent: access.actor.userAgent,
    });
    return { buffer, mime, filename: `uni-nexus-data-master-${dataset}-${new Date().toISOString().slice(0, 10)}.${extension}`, total: result.pagination.total };
  }

  private async listWithAccess(dataset: MasterDataDatasetKey, access: MasterDataAccess, filters: MasterDataListFilters) {
    const query = this.listQuery(dataset, access, filters);
    // Use the regular query protocol for the paginated read. The local MySQL
    // development build rejects a prepared LIMIT/OFFSET statement despite
    // accepting the same bounded numeric values in ordinary parameterized SQL.
    const [rows]: any = await pool.query(`${query.select} WHERE ${query.where.join(' AND ')} ORDER BY ${query.orderBy} LIMIT ? OFFSET ?`, [...query.params, filters.limit, (filters.page - 1) * filters.limit] as any[]);
    const [countRows]: any = await pool.execute(`${query.count} WHERE ${query.where.join(' AND ')}`, query.params as any[]);
    const items = await Promise.all(rows.map(async (row: any) => this.normalize(dataset, row, access, await this.usageFor(dataset, Number(row.id), row))));
    const total = number(countRows[0]?.total);
    return { items, pagination: { total, page: filters.page, limit: filters.limit, total_pages: Math.max(1, Math.ceil(total / filters.limit)) } };
  }

  private listQuery(dataset: MasterDataDatasetKey, access: MasterDataAccess, filters: MasterDataListFilters): ListQuery {
    const where: string[] = [];
    const params: unknown[] = [];
    let select = '';
    let count = '';
    let alias = '';
    let orderBy = '';
    switch (dataset) {
      case 'units':
        alias = 'u'; select = 'SELECT u.id,u.code,u.name,u.symbol,u.unit_group,u.decimal_places,u.is_active,NULL AS created_at,NULL AS updated_at FROM units_of_measure u'; count = 'SELECT COUNT(*) AS total FROM units_of_measure u'; orderBy = 'u.unit_group ASC, u.name ASC'; break;
      case 'payment-methods':
        alias = 'pm'; select = 'SELECT pm.id,pm.code,pm.name,pm.method_type,pm.is_active,pm.created_at,NULL AS updated_at FROM payment_methods pm'; count = 'SELECT COUNT(*) AS total FROM payment_methods pm'; orderBy = 'pm.name ASC'; break;
      case 'craft-product-categories': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        alias = 'pc'; select = 'SELECT pc.id,pc.code,pc.name,pc.parent_id,parent.name AS parent_name,pc.business_unit_id,pc.is_active,NULL AS created_at,NULL AS updated_at FROM product_categories pc LEFT JOIN product_categories parent ON parent.id=pc.parent_id'; count = 'SELECT COUNT(*) AS total FROM product_categories pc'; orderBy = 'pc.name ASC'; where.push('pc.business_unit_id = ?'); params.push(craft.id); break;
      }
      case 'craft-material-categories': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        alias = 'mc'; select = 'SELECT mc.id,mc.code,mc.name,mc.category_type,mc.business_unit_id,mc.is_active,NULL AS created_at,NULL AS updated_at FROM material_categories mc'; count = 'SELECT COUNT(*) AS total FROM material_categories mc'; orderBy = 'mc.name ASC'; where.push('mc.business_unit_id = ?'); params.push(craft.id); break;
      }
      case 'craft-sales-channels': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        alias = 'sc'; select = 'SELECT sc.id,sc.code,sc.name,sc.channel_type,sc.external_url,sc.is_integrated,sc.business_unit_id,sc.is_active,sc.created_at,sc.updated_at FROM sales_channels sc'; count = 'SELECT COUNT(*) AS total FROM sales_channels sc'; orderBy = 'sc.name ASC'; where.push('sc.business_unit_id = ?'); params.push(craft.id); break;
      }
      case 'studio-service-categories': {
        const studio = masterDataAccessService.requireBusinessUnit(access, 'STUDIO');
        alias = 'ssc'; select = 'SELECT ssc.id,ssc.code,ssc.name,ssc.business_unit_id,ssc.is_active,NULL AS created_at,NULL AS updated_at FROM studio_service_categories ssc'; count = 'SELECT COUNT(*) AS total FROM studio_service_categories ssc'; orderBy = 'ssc.name ASC'; where.push('ssc.business_unit_id = ?'); params.push(studio.id); break;
      }
      case 'finance-transaction-categories': {
        const scopes = access.datasetCapabilities[dataset].financeScopes || [];
        const ids = scopes.map(scope => masterDataAccessService.requireBusinessUnit(access, scope.toUpperCase() as 'CRAFT' | 'STUDIO' | 'SHARED').id);
        alias = 'tc'; select = 'SELECT tc.id,tc.code,tc.name,tc.transaction_type,tc.default_coa_account_id,coa.account_code AS coa_code,coa.account_name AS coa_name,tc.organization_id,tc.business_unit_id,bu.code AS business_unit_code,bu.name AS business_unit_name,tc.is_active,NULL AS created_at,NULL AS updated_at FROM transaction_categories tc JOIN business_units bu ON bu.id=tc.business_unit_id LEFT JOIN chart_of_accounts coa ON coa.id=tc.default_coa_account_id'; count = 'SELECT COUNT(*) AS total FROM transaction_categories tc'; orderBy = 'bu.code ASC, tc.name ASC'; where.push('tc.organization_id = ?', `tc.business_unit_id IN (${ids.map(() => '?').join(',')})`); params.push(access.actor.organizationId, ...ids); break;
      }
    }
    if (filters.status !== 'all') { where.push(`${alias}.is_active = ?`); params.push(filters.status === 'active' ? 1 : 0); }
    if (filters.q) { where.push(`(${alias}.code LIKE ? OR ${alias}.name LIKE ?)`); const q = `%${escapeLike(filters.q)}%`; params.push(q, q); }
    if (dataset === 'units' && filters.unitGroup) { where.push('u.unit_group = ?'); params.push(filters.unitGroup); }
    if (dataset === 'craft-sales-channels' && filters.channelType) { where.push('sc.channel_type = ?'); params.push(filters.channelType); }
    if (dataset === 'finance-transaction-categories') {
      if (filters.transactionType) { where.push('tc.transaction_type = ?'); params.push(filters.transactionType); }
      if (filters.businessUnit) {
        const allowed = access.datasetCapabilities[dataset].financeScopes || [];
        if (!allowed.includes(filters.businessUnit)) where.push('1 = 0');
        else { const unit = masterDataAccessService.requireBusinessUnit(access, filters.businessUnit.toUpperCase() as 'CRAFT' | 'STUDIO' | 'SHARED'); where.push('tc.business_unit_id = ?'); params.push(unit.id); }
      }
    }
    if (dataset === 'craft-product-categories' && filters.parentId !== undefined) { where.push(filters.parentId === null ? 'pc.parent_id IS NULL' : 'pc.parent_id = ?'); if (filters.parentId !== null) params.push(filters.parentId); }
    return { select, count, where: where.length ? where : ['1 = 1'], params, orderBy, idColumn: `${alias}.id` };
  }

  private async getRaw(dataset: MasterDataDatasetKey, access: MasterDataAccess, id: number, executor: SqlExecutor = pool, lock = false) {
    const query = this.listQuery(dataset, access, { status: 'all', page: 1, limit: 1 });
    const [rows]: any = await executor.execute(`${query.select} WHERE ${[...query.where, `${query.idColumn} = ?`].join(' AND ')} LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [...query.params, id] as any[]);
    if (!rows.length) throw new AppError(404, 'MASTER_DATA_ITEM_NOT_FOUND', 'Data referensi tidak ditemukan.');
    return rows[0];
  }

  private async countRows(dataset: MasterDataDatasetKey, access: MasterDataAccess) {
    const query = this.listQuery(dataset, access, { status: 'all', page: 1, limit: 1 });
    const [rows]: any = await pool.execute(`SELECT COUNT(*) AS total, COALESCE(SUM(${this.activeColumn(dataset)} = 1),0) AS active_count, COALESCE(SUM(${this.activeColumn(dataset)} = 0),0) AS inactive_count${this.updatedColumn(dataset) ? `, MAX(${this.updatedColumn(dataset)}) AS last_updated_at` : ''} FROM (${query.select} WHERE ${query.where.join(' AND ')}) master_rows`, query.params as any[]);
    return { total: number(rows[0]?.total), active: number(rows[0]?.active_count), inactive: number(rows[0]?.inactive_count), lastUpdatedAt: rows[0]?.last_updated_at || null };
  }

  private activeColumn(_dataset: MasterDataDatasetKey) { return 'is_active'; }
  private updatedColumn(dataset: MasterDataDatasetKey) { return ['units', 'payment-methods', 'craft-product-categories', 'craft-material-categories', 'studio-service-categories', 'finance-transaction-categories'].includes(dataset) ? null : 'updated_at'; }

  private normalize(dataset: MasterDataDatasetKey, row: any, access: MasterDataAccess, usage?: MasterDataUsage): MasterDataItem {
    const financeScope = dataset === 'finance-transaction-categories' ? this.financeScope(row) : undefined;
    const scope = financeScope || masterDataRegistry[dataset].scope;
    const capabilities = { ...access.datasetCapabilities[dataset], canRead: true, canManage: this.canManage(access, dataset, financeScope) };
    const details: Record<string, unknown> = {};
    if (dataset === 'units') Object.assign(details, { symbol: row.symbol, unit_group: row.unit_group, decimal_places: number(row.decimal_places) });
    if (dataset === 'payment-methods') Object.assign(details, { method_type: row.method_type });
    if (dataset === 'craft-product-categories') Object.assign(details, { parent_id: row.parent_id === null ? null : number(row.parent_id), parent_name: row.parent_name || null });
    if (dataset === 'craft-material-categories') Object.assign(details, { category_type: row.category_type });
    if (dataset === 'craft-sales-channels') Object.assign(details, { channel_type: row.channel_type, external_url: row.external_url || null, is_integrated: bool(row.is_integrated) });
    if (dataset === 'finance-transaction-categories') Object.assign(details, { transaction_type: row.transaction_type, default_coa_account_id: row.default_coa_account_id === null ? null : number(row.default_coa_account_id), coa_code: row.coa_code || null, coa_name: row.coa_name || null, business_unit_name: row.business_unit_name || null });
    return {
      id: number(row.id), dataset, code: row.code, name: row.name, scope: scope as MasterDataItem['scope'], scope_label: financeScope ? scopeLabel[financeScope] : masterDataScopes[masterDataRegistry[dataset].scope],
      is_active: bool(row.is_active), is_protected: dataset === 'finance-transaction-categories' && CORE_TRANSACTION_CODES.has(row.code), is_code_locked: true,
      usage_total: usage?.usage_total, created_at: row.created_at || null, updated_at: row.updated_at || null, capabilities, details,
    };
  }

  private canManage(access: MasterDataAccess, dataset: MasterDataDatasetKey, financeScope?: FinanceScope) {
    try { masterDataAccessService.requireManageable(access, dataset, financeScope); return true; } catch { return false; }
  }

  private financeScope(row: any): FinanceScope {
    const value = String(row.business_unit_code || '').toLowerCase();
    if (value === 'craft' || value === 'studio' || value === 'shared') return value;
    throw new AppError(400, 'MASTER_DATA_INVALID_SCOPE', 'Scope kategori transaksi tidak valid.');
  }

  private async usageFor(dataset: MasterDataDatasetKey, id: number, row: any, executor: SqlExecutor = pool, lockProductChildren = false): Promise<MasterDataUsage> {
    const count = async (sql: string, params: unknown[] = [id]) => {
      const [rows]: any = await executor.execute(sql, params as any[]);
      return number(rows[0]?.count);
    };
    let breakdown: Array<{ source: string; label: string; count: number }> = [];
    if (dataset === 'units') {
      const counts = await Promise.all([
        count('SELECT COUNT(*) AS count FROM materials WHERE base_unit_id = ?'), count('SELECT COUNT(*) AS count FROM inventory_movements WHERE unit_id = ?'), count('SELECT COUNT(*) AS count FROM material_waste WHERE unit_id = ?'),
        count('SELECT COUNT(*) AS count FROM print_job_materials WHERE unit_id = ?'), count('SELECT COUNT(*) AS count FROM print_profiles WHERE estimated_material_unit_id = ?'), count('SELECT COUNT(*) AS count FROM product_bom_items WHERE unit_id = ?'),
        count('SELECT COUNT(*) AS count FROM purchase_order_items WHERE unit_id = ?'), count('SELECT COUNT(*) AS count FROM purchase_request_items WHERE unit_id = ?'), count('SELECT COUNT(*) AS count FROM stock_reservations WHERE unit_id = ?'),
      ]);
      breakdown = [['materials', 'Material'], ['inventory_movements', 'Pergerakan stok'], ['material_waste', 'Limbah material'], ['print_job_materials', 'Material pekerjaan cetak'], ['print_profiles', 'Profil cetak'], ['product_bom_items', 'BOM produk'], ['purchase_order_items', 'Item pesanan pembelian'], ['purchase_request_items', 'Item permintaan pembelian'], ['stock_reservations', 'Reservasi stok']].map(([source, label], index) => ({ source, label, count: counts[index] }));
    } else if (dataset === 'payment-methods') breakdown = [{ source: 'payments', label: 'Pembayaran', count: await count('SELECT COUNT(*) AS count FROM payments WHERE payment_method_id = ?') }];
    else if (dataset === 'craft-product-categories') {
      const activeChildren = lockProductChildren
        ? executor.execute('SELECT id FROM product_categories WHERE parent_id = ? AND is_active = 1 FOR UPDATE', [id]).then(([rows]: any) => rows.length)
        : count('SELECT COUNT(*) AS count FROM product_categories WHERE parent_id = ? AND is_active = 1');
      const [products, children] = await Promise.all([count('SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND deleted_at IS NULL'), activeChildren]);
      breakdown = [{ source: 'products', label: 'Produk', count: products }, { source: 'active_children', label: 'Subkategori aktif', count: children }];
    } else if (dataset === 'craft-material-categories') breakdown = [{ source: 'materials', label: 'Material', count: await count('SELECT COUNT(*) AS count FROM materials WHERE category_id = ?') }];
    else if (dataset === 'craft-sales-channels') {
      const counts = await Promise.all([count('SELECT COUNT(*) AS count FROM craft_orders WHERE sales_channel_id = ? AND deleted_at IS NULL'), count('SELECT COUNT(*) AS count FROM channel_product_mappings WHERE sales_channel_id = ?'), count('SELECT COUNT(*) AS count FROM marketplace_fee_rules WHERE sales_channel_id = ?'), count('SELECT COUNT(*) AS count FROM marketplace_settlements WHERE sales_channel_id = ?'), count('SELECT COUNT(*) AS count FROM integrations WHERE sales_channel_id = ?')]);
      breakdown = [['craft_orders', 'Pesanan Craft'], ['channel_product_mappings', 'Pemetaan produk'], ['marketplace_fee_rules', 'Aturan biaya'], ['marketplace_settlements', 'Settlement'], ['integrations', 'Integrasi']].map(([source, label], index) => ({ source, label, count: counts[index] }));
    } else if (dataset === 'studio-service-categories') breakdown = [{ source: 'studio_services', label: 'Layanan Studio', count: await count('SELECT COUNT(*) AS count FROM studio_services WHERE category_id = ?') }];
    else if (dataset === 'finance-transaction-categories') {
      const counts = await Promise.all([count('SELECT COUNT(*) AS count FROM financial_transactions WHERE category_id = ?'), count('SELECT COUNT(*) AS count FROM expenses WHERE category_id = ?'), count('SELECT COUNT(*) AS count FROM budget_items WHERE category_id = ?')]);
      breakdown = [['financial_transactions', 'Transaksi keuangan'], ['expenses', 'Pengeluaran'], ['budget_items', 'Item anggaran']].map(([source, label], index) => ({ source, label, count: counts[index] }));
    }
    const usageTotal = breakdown.reduce((total, item) => total + item.count, 0);
    const protectedReference = dataset === 'finance-transaction-categories' && CORE_TRANSACTION_CODES.has(row.code);
    const activeChildren = breakdown.find(item => item.source === 'active_children')?.count || 0;
    return {
      usage_total: usageTotal, usage_breakdown: breakdown.filter(item => item.count > 0), deactivation_allowed: !protectedReference && activeChildren === 0,
      blocking_reason: protectedReference ? 'Kategori keuangan ini merupakan referensi inti sistem dan tidak dapat dinonaktifkan.' : activeChildren > 0 ? 'Kategori masih memiliki subkategori aktif.' : null,
    };
  }

  private async insert(dataset: MasterDataDatasetKey, data: Record<string, any>, access: MasterDataAccess, connection: PoolConnection) {
    let result: any;
    switch (dataset) {
      case 'units': result = await connection.execute('INSERT INTO units_of_measure (code,name,symbol,unit_group,decimal_places,is_active) VALUES (?,?,?,?,?,?)', [data.code, data.name, data.symbol, data.unit_group, data.decimal_places, data.is_active === false ? 0 : 1]); break;
      case 'payment-methods': result = await connection.execute('INSERT INTO payment_methods (code,name,method_type,is_active) VALUES (?,?,?,?)', [data.code, data.name, data.method_type, data.is_active === false ? 0 : 1]); break;
      case 'craft-product-categories': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        await this.assertProductParent(connection, craft.id, null, data.parent_id);
        result = await connection.execute('INSERT INTO product_categories (business_unit_id,code,name,parent_id,is_active) VALUES (?,?,?,?,?)', [craft.id, data.code, data.name, data.parent_id ?? null, data.is_active === false ? 0 : 1]); break;
      }
      case 'craft-material-categories': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        result = await connection.execute('INSERT INTO material_categories (business_unit_id,code,name,category_type,is_active) VALUES (?,?,?,?,?)', [craft.id, data.code, data.name, data.category_type, data.is_active === false ? 0 : 1]); break;
      }
      case 'craft-sales-channels': {
        const craft = masterDataAccessService.requireBusinessUnit(access, 'CRAFT');
        result = await connection.execute('INSERT INTO sales_channels (business_unit_id,code,name,channel_type,external_url,is_integrated,is_active) VALUES (?,?,?,?,?,0,?)', [craft.id, data.code, data.name, data.channel_type, data.external_url ?? null, data.is_active === false ? 0 : 1]); break;
      }
      case 'studio-service-categories': {
        const studio = masterDataAccessService.requireBusinessUnit(access, 'STUDIO');
        result = await connection.execute('INSERT INTO studio_service_categories (business_unit_id,code,name,is_active) VALUES (?,?,?,?)', [studio.id, data.code, data.name, data.is_active === false ? 0 : 1]); break;
      }
      case 'finance-transaction-categories': {
        const unit = masterDataAccessService.requireBusinessUnit(access, String(data.scope).toUpperCase() as 'CRAFT' | 'STUDIO' | 'SHARED');
        await this.assertCoa(connection, data.default_coa_account_id, access.actor.organizationId, unit.id);
        result = await connection.execute('INSERT INTO transaction_categories (organization_id,business_unit_id,code,name,transaction_type,default_coa_account_id,is_active) VALUES (?,?,?,?,?,?,?)', [access.actor.organizationId, unit.id, data.code, data.name, data.transaction_type, data.default_coa_account_id ?? null, data.is_active === false ? 0 : 1]); break;
      }
    }
    return Number((result[0] as { insertId: number }).insertId);
  }

  private async applyUpdate(dataset: MasterDataDatasetKey, id: number, data: Record<string, any>, previous: any, access: MasterDataAccess, connection: PoolConnection) {
    switch (dataset) {
      case 'units': if (data.name !== undefined) await connection.execute('UPDATE units_of_measure SET name=? WHERE id=?', [data.name, id]); if (data.symbol !== undefined) await connection.execute('UPDATE units_of_measure SET symbol=? WHERE id=?', [data.symbol, id]); if (data.unit_group !== undefined) await connection.execute('UPDATE units_of_measure SET unit_group=? WHERE id=?', [data.unit_group, id]); if (data.decimal_places !== undefined) await connection.execute('UPDATE units_of_measure SET decimal_places=? WHERE id=?', [data.decimal_places, id]); break;
      case 'payment-methods': if (data.name !== undefined) await connection.execute('UPDATE payment_methods SET name=? WHERE id=?', [data.name, id]); if (data.method_type !== undefined) await connection.execute('UPDATE payment_methods SET method_type=? WHERE id=?', [data.method_type, id]); break;
      case 'craft-product-categories': if (data.name !== undefined) await connection.execute('UPDATE product_categories SET name=? WHERE id=?', [data.name, id]); if (own(data, 'parent_id')) { await this.assertProductParent(connection, Number(previous.business_unit_id), id, data.parent_id); await connection.execute('UPDATE product_categories SET parent_id=? WHERE id=?', [data.parent_id ?? null, id]); } break;
      case 'craft-material-categories': if (data.name !== undefined) await connection.execute('UPDATE material_categories SET name=? WHERE id=?', [data.name, id]); if (data.category_type !== undefined) await connection.execute('UPDATE material_categories SET category_type=? WHERE id=?', [data.category_type, id]); break;
      case 'craft-sales-channels': if (data.name !== undefined) await connection.execute('UPDATE sales_channels SET name=? WHERE id=?', [data.name, id]); if (data.channel_type !== undefined) await connection.execute('UPDATE sales_channels SET channel_type=? WHERE id=?', [data.channel_type, id]); if (own(data, 'external_url')) await connection.execute('UPDATE sales_channels SET external_url=? WHERE id=?', [data.external_url ?? null, id]); break;
      case 'studio-service-categories': if (data.name !== undefined) await connection.execute('UPDATE studio_service_categories SET name=? WHERE id=?', [data.name, id]); break;
      case 'finance-transaction-categories': if (data.name !== undefined) await connection.execute('UPDATE transaction_categories SET name=? WHERE id=?', [data.name, id]); if (own(data, 'default_coa_account_id')) { await this.assertCoa(connection, data.default_coa_account_id, access.actor.organizationId, Number(previous.business_unit_id)); await connection.execute('UPDATE transaction_categories SET default_coa_account_id=? WHERE id=?', [data.default_coa_account_id ?? null, id]); } break;
    }
  }

  private async updateActive(dataset: MasterDataDatasetKey, id: number, active: boolean, connection: PoolConnection) {
    const value = active ? 1 : 0;
    switch (dataset) {
      case 'units': await connection.execute('UPDATE units_of_measure SET is_active=? WHERE id=?', [value, id]); break;
      case 'payment-methods': await connection.execute('UPDATE payment_methods SET is_active=? WHERE id=?', [value, id]); break;
      case 'craft-product-categories': await connection.execute('UPDATE product_categories SET is_active=? WHERE id=?', [value, id]); break;
      case 'craft-material-categories': await connection.execute('UPDATE material_categories SET is_active=? WHERE id=?', [value, id]); break;
      case 'craft-sales-channels': await connection.execute('UPDATE sales_channels SET is_active=? WHERE id=?', [value, id]); break;
      case 'studio-service-categories': await connection.execute('UPDATE studio_service_categories SET is_active=? WHERE id=?', [value, id]); break;
      case 'finance-transaction-categories': await connection.execute('UPDATE transaction_categories SET is_active=? WHERE id=?', [value, id]); break;
    }
  }

  private async assertProductParent(connection: PoolConnection, businessUnitId: number, categoryId: number | null, parentId: number | null | undefined) {
    if (parentId === undefined || parentId === null) return;
    if (categoryId !== null && parentId === categoryId) throw new AppError(400, 'MASTER_DATA_INVALID_PARENT', 'Kategori tidak dapat menjadi induk dirinya sendiri.');
    const [parents]: any = await connection.execute('SELECT id,parent_id FROM product_categories WHERE id=? AND business_unit_id=? LIMIT 1 FOR UPDATE', [parentId, businessUnitId]);
    if (!parents.length) throw new AppError(400, 'MASTER_DATA_INVALID_PARENT', 'Induk kategori harus berada di workspace Craft yang sama.');
    if (categoryId === null) return;
    const visited = new Set<number>();
    let cursor: number | null = Number(parentId);
    while (cursor !== null) {
      if (cursor === categoryId) throw new AppError(409, 'MASTER_DATA_HIERARCHY_CYCLE', 'Perubahan induk akan membentuk siklus kategori.');
      if (visited.has(cursor)) throw new AppError(409, 'MASTER_DATA_HIERARCHY_CYCLE', 'Struktur kategori saat ini tidak valid.');
      visited.add(cursor);
      const [rows]: any = await connection.execute('SELECT parent_id FROM product_categories WHERE id=? AND business_unit_id=? LIMIT 1 FOR UPDATE', [cursor, businessUnitId]);
      if (!rows.length) throw new AppError(400, 'MASTER_DATA_INVALID_PARENT', 'Induk kategori tidak valid.');
      cursor = rows[0].parent_id === null ? null : Number(rows[0].parent_id);
    }
  }

  private async assertCoa(connection: PoolConnection, coaId: number | null | undefined, organizationId: number, businessUnitId: number) {
    if (coaId === undefined || coaId === null) return;
    const [rows]: any = await connection.execute('SELECT id FROM chart_of_accounts WHERE id=? AND organization_id=? AND is_active=1 AND (business_unit_id IS NULL OR business_unit_id=?) LIMIT 1 FOR UPDATE', [coaId, organizationId, businessUnitId]);
    if (!rows.length) throw new AppError(400, 'MASTER_DATA_INVALID_COA', 'Akun COA harus aktif, berasal dari organisasi yang sama, dan kompatibel dengan scope kategori.');
  }

  private async audit(access: MasterDataAccess, dataset: MasterDataDatasetKey, row: any, actionCode: string, oldRow: any, newRow: any, connection: PoolConnection) {
    const businessUnitId = row.business_unit_id == null ? null : Number(row.business_unit_id);
    await AuditService.write({
      organizationId: access.actor.organizationId, businessUnitId, userId: access.actor.id, moduleCode: 'master_data', actionCode,
      entityType: `master_data:${dataset}`, entityId: Number(row.id), entityCode: row.code,
      description: `${actionCode === 'master_data.create' ? 'Membuat' : actionCode === 'master_data.update' ? 'Memperbarui' : actionCode === 'master_data.activate' ? 'Mengaktifkan' : 'Menonaktifkan'} ${masterDataRegistry[dataset].name}: ${row.name}.`,
      oldValues: oldRow ? this.auditValues(dataset, oldRow) : null, newValues: this.auditValues(dataset, newRow), ipAddress: access.actor.ip, userAgent: access.actor.userAgent,
    }, connection);
  }

  private auditValues(dataset: MasterDataDatasetKey, row: any) {
    const values: Record<string, unknown> = { dataset, code: row.code, name: row.name, is_active: bool(row.is_active) };
    if (dataset === 'units') Object.assign(values, { symbol: row.symbol, unit_group: row.unit_group, decimal_places: number(row.decimal_places) });
    if (dataset === 'payment-methods') values.method_type = row.method_type;
    if (dataset === 'craft-product-categories') values.parent_id = row.parent_id == null ? null : number(row.parent_id);
    if (dataset === 'craft-material-categories') values.category_type = row.category_type;
    if (dataset === 'craft-sales-channels') Object.assign(values, { channel_type: row.channel_type, external_url: row.external_url || null });
    if (dataset === 'finance-transaction-categories') Object.assign(values, { transaction_type: row.transaction_type, default_coa_account_id: row.default_coa_account_id == null ? null : number(row.default_coa_account_id), scope: this.financeScope(row) });
    return values;
  }

  private transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
    return (async () => {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try { const value = await work(connection); await connection.commit(); return value; }
      catch (error) { await connection.rollback(); throw error; }
      finally { connection.release(); }
    })();
  }

  private exportDetails(item: MasterDataItem) { return Object.entries(item.details).map(([key, value]) => `${key}: ${value === null ? '—' : String(value)}`).join('; '); }
  private csv(value: unknown) { const text = String(value ?? ''); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; }
  private safeFilters(filters: MasterDataListFilters) { const { q, status, unitGroup, channelType, transactionType, businessUnit, parentId } = filters; return { q: q || null, status, unit_group: unitGroup || null, channel_type: channelType || null, transaction_type: transactionType || null, business_unit: businessUnit || null, parent_id: parentId ?? null }; }
}

export const masterDataService = new MasterDataService();
