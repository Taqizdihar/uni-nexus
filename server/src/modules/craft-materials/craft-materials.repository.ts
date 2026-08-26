import type { RowDataPacket } from 'mysql2';
import { pool } from '../../config/database';
import type { MaterialFilters } from './craft-materials.types';

function numeric<T extends Record<string, any>>(row: T): T {
  const mutable = row as Record<string, any>;
  const fields = [
    'id', 'business_unit_id', 'category_id', 'base_unit_id', 'preferred_supplier_id', 'default_unit_cost',
    'low_stock_threshold', 'reorder_qty', 'total_qty', 'reserved_qty', 'available_qty', 'estimated_stock_value',
    'active_spool_count', 'material_id', 'material_batch_id', 'supplier_id', 'initial_qty', 'current_qty',
    'unit_cost', 'total_cost', 'quantity', 'unit_id', 'current_net_weight_g', 'nominal_net_weight_g',
    'tare_weight_g', 'diameter_mm', 'print_job_id', 'reference_id', 'reservation_id', 'spool_id', 'product_count',
  ];
  for (const field of fields) if (mutable[field] !== null && mutable[field] !== undefined) mutable[field] = Number(mutable[field]);
  for (const field of ['is_active']) if (mutable[field] !== null && mutable[field] !== undefined) mutable[field] = Boolean(mutable[field]);
  return row;
}

export class CraftMaterialsRepository {
  async listMaterials(businessUnitId: number, filters: MaterialFilters = {}) {
    const where = ['m.business_unit_id = ?', 'm.deleted_at IS NULL'];
    const params: unknown[] = [businessUnitId];
    if (filters.search) {
      where.push('(m.sku LIKE ? OR m.name LIKE ? OR m.brand LIKE ? OR m.material_type LIKE ? OR m.color_name LIKE ?)');
      const query = `%${filters.search}%`;
      params.push(query, query, query, query, query);
    }
    if (filters.categoryType) { where.push('mc.category_type = ?'); params.push(filters.categoryType); }
    if (filters.status === 'active') where.push('m.is_active = 1');
    if (filters.status === 'inactive') where.push('m.is_active = 0');
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT m.id, m.business_unit_id, m.category_id, m.sku, m.name, m.brand, m.material_type,
             m.color_name, m.color_hex, m.base_unit_id, m.default_unit_cost, m.low_stock_threshold,
             m.reorder_qty, m.preferred_supplier_id, m.notes, m.is_active, m.created_at, m.updated_at,
             mc.code AS category_code, mc.name AS category_name, mc.category_type,
             u.code AS unit_code, u.symbol AS unit_symbol,
             COALESCE(vs.total_qty, 0) AS total_qty, COALESCE(vs.reserved_qty, 0) AS reserved_qty,
             COALESCE(vs.available_qty, 0) AS available_qty, COALESCE(vs.stock_status, 'out_of_stock') AS stock_status,
             COALESCE((SELECT COUNT(1) FROM filament_spools fs JOIN material_batches fb ON fb.id = fs.material_batch_id
                       WHERE fb.material_id = m.id AND COALESCE(fs.current_net_weight_g, 0) > 0), 0) AS active_spool_count,
             COALESCE((SELECT SUM(mb.current_qty * mb.unit_cost) FROM material_batches mb
                       WHERE mb.material_id = m.id AND mb.status_code <> 'closed'), 0) AS estimated_stock_value
        FROM materials m
        JOIN material_categories mc ON mc.id = m.category_id
        JOIN units_of_measure u ON u.id = m.base_unit_id
        LEFT JOIN v_material_stock vs ON vs.material_id = m.id
       WHERE ${where.join(' AND ')}
       ORDER BY mc.category_type, m.name, m.id`, params as any[]);
    return rows.map((row) => numeric({ ...row }));
  }

  async getMaterial(materialId: number, businessUnitId: number) {
    const materials = await this.listMaterials(businessUnitId, { status: 'all' });
    return materials.find((material) => material.id === materialId) || null;
  }

  async getMaterialDetail(materialId: number, businessUnitId: number) {
    const material = await this.getMaterial(materialId, businessUnitId);
    if (!material) return null;
    const [batches, spools, reservations, movements, waste] = await Promise.all([
      pool.execute<RowDataPacket[]>(`
        SELECT mb.*, p.display_name AS supplier_name
          FROM material_batches mb
          LEFT JOIN parties p ON p.id = mb.supplier_id
         WHERE mb.material_id = ? ORDER BY mb.status_code <> 'available', mb.received_at DESC, mb.id DESC`, [materialId]),
      pool.execute<RowDataPacket[]>(`
        SELECT fs.*, mb.batch_code, mb.current_qty AS batch_current_qty, u.symbol AS unit_symbol
          FROM filament_spools fs
          JOIN material_batches mb ON mb.id = fs.material_batch_id
          JOIN materials m ON m.id = mb.material_id
          JOIN units_of_measure u ON u.id = m.base_unit_id
         WHERE mb.material_id = ? ORDER BY fs.id DESC`, [materialId]),
      pool.execute<RowDataPacket[]>(`
        SELECT sr.*, mb.batch_code, u.symbol AS unit_symbol, pj.job_code
          FROM stock_reservations sr
          LEFT JOIN material_batches mb ON mb.id = sr.material_batch_id
          JOIN units_of_measure u ON u.id = sr.unit_id
          LEFT JOIN print_jobs pj ON sr.reference_type = 'print_job' AND pj.id = sr.reference_id
          JOIN materials m ON m.id = sr.material_id
         WHERE sr.material_id = ? AND m.business_unit_id = ?
         ORDER BY sr.reserved_at DESC`, [materialId, businessUnitId]),
      pool.execute<RowDataPacket[]>(`
        SELECT im.*, mb.batch_code, u.symbol AS unit_symbol, creator.full_name AS created_by_name
          FROM inventory_movements im
          LEFT JOIN material_batches mb ON mb.id = im.material_batch_id
          JOIN units_of_measure u ON u.id = im.unit_id
          LEFT JOIN users creator ON creator.id = im.created_by
         WHERE im.material_id = ? AND im.business_unit_id = ?
         ORDER BY im.occurred_at DESC, im.id DESC LIMIT 100`, [materialId, businessUnitId]),
      pool.execute<RowDataPacket[]>(`
        SELECT mw.*, mb.batch_code, u.symbol AS unit_symbol, pj.job_code, creator.full_name AS created_by_name
          FROM material_waste mw
          JOIN materials m ON m.id = mw.material_id
          LEFT JOIN material_batches mb ON mb.id = mw.material_batch_id
          JOIN units_of_measure u ON u.id = mw.unit_id
          LEFT JOIN print_jobs pj ON pj.id = mw.print_job_id
          LEFT JOIN users creator ON creator.id = mw.created_by
         WHERE mw.material_id = ? AND m.business_unit_id = ?
         ORDER BY mw.occurred_at DESC, mw.id DESC LIMIT 100`, [materialId, businessUnitId]),
    ]);
    return {
      material,
      batches: batches[0].map((row) => numeric({ ...row })),
      spools: spools[0].map((row) => numeric({ ...row })),
      reservations: reservations[0].map((row) => numeric({ ...row })),
      movements: movements[0].map((row) => numeric({ ...row })),
      waste: waste[0].map((row) => numeric({ ...row })),
    };
  }

  async listCategories(businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT mc.*, COUNT(m.id) AS product_count
        FROM material_categories mc
        LEFT JOIN materials m ON m.category_id = mc.id AND m.deleted_at IS NULL
       WHERE mc.business_unit_id = ?
       GROUP BY mc.id, mc.business_unit_id, mc.code, mc.name, mc.category_type, mc.is_active
       ORDER BY FIELD(mc.category_type, 'filament', 'resin', 'hardware', 'packaging', 'consumable', 'other'), mc.name`, [businessUnitId]);
    return rows.map((row) => numeric({ ...row }));
  }

  async listUnits() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, code, name, symbol, unit_group, decimal_places FROM units_of_measure WHERE is_active = 1 ORDER BY unit_group, name',
    );
    return rows.map((row) => numeric({ ...row }));
  }

  async listSuppliers(organizationId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT id, code, display_name, legal_name
        FROM parties WHERE organization_id = ? AND status_code = 'active' AND deleted_at IS NULL
       ORDER BY display_name`, [organizationId]);
    return rows.map((row) => numeric({ ...row }));
  }

  async listSpools(businessUnitId: number, materialId?: number) {
    const where = ['m.business_unit_id = ?', 'm.deleted_at IS NULL']; const params: unknown[] = [businessUnitId];
    if (materialId) { where.push('m.id = ?'); params.push(materialId); }
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT fs.*, mb.id AS material_batch_id, mb.batch_code, mb.current_qty AS batch_current_qty,
             m.id AS material_id, m.sku AS material_sku, m.name AS material_name, m.brand, m.material_type,
             m.color_name, m.color_hex, u.code AS unit_code, u.symbol AS unit_symbol
        FROM filament_spools fs
        JOIN material_batches mb ON mb.id = fs.material_batch_id
        JOIN materials m ON m.id = mb.material_id
        JOIN units_of_measure u ON u.id = m.base_unit_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(fs.current_net_weight_g, 0) DESC, fs.id DESC`, params as any[]);
    return rows.map((row) => numeric({ ...row }));
  }

  async listMovements(businessUnitId: number, materialId?: number) {
    const where = ['im.business_unit_id = ?']; const params: unknown[] = [businessUnitId];
    if (materialId) { where.push('im.material_id = ?'); params.push(materialId); }
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT im.*, m.sku AS material_sku, m.name AS material_name, m.color_name, m.color_hex,
             mb.batch_code, u.symbol AS unit_symbol, creator.full_name AS created_by_name
        FROM inventory_movements im
        JOIN materials m ON m.id = im.material_id AND m.business_unit_id = im.business_unit_id
        LEFT JOIN material_batches mb ON mb.id = im.material_batch_id
        JOIN units_of_measure u ON u.id = im.unit_id
        LEFT JOIN users creator ON creator.id = im.created_by
       WHERE ${where.join(' AND ')}
       ORDER BY im.occurred_at DESC, im.id DESC LIMIT 300`, params as any[]);
    return rows.map((row) => numeric({ ...row }));
  }

  async listLowStock(businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT vs.*, m.brand, m.color_hex, m.category_id, mc.name AS category_name, mc.category_type,
             m.reorder_qty, m.is_active
        FROM v_material_stock vs
        JOIN materials m ON m.id = vs.material_id AND m.business_unit_id = vs.business_unit_id
        JOIN material_categories mc ON mc.id = m.category_id
       WHERE vs.business_unit_id = ? AND m.deleted_at IS NULL AND m.is_active = 1
         AND (BINARY vs.stock_status = BINARY 'low_stock' OR BINARY vs.stock_status = BINARY 'out_of_stock')
       ORDER BY vs.available_qty ASC, m.name`, [businessUnitId]);
    return rows.map((row) => numeric({ ...row }));
  }

  async listWaste(businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT mw.*, m.sku AS material_sku, m.name AS material_name, m.color_name, m.color_hex,
             mb.batch_code, u.symbol AS unit_symbol, pj.job_code, creator.full_name AS created_by_name
        FROM material_waste mw
        JOIN materials m ON m.id = mw.material_id AND m.business_unit_id = ?
        LEFT JOIN material_batches mb ON mb.id = mw.material_batch_id
        JOIN units_of_measure u ON u.id = mw.unit_id
        LEFT JOIN print_jobs pj ON pj.id = mw.print_job_id
        LEFT JOIN users creator ON creator.id = mw.created_by
       ORDER BY mw.occurred_at DESC, mw.id DESC LIMIT 300`, [businessUnitId]);
    return rows.map((row) => numeric({ ...row }));
  }
}
