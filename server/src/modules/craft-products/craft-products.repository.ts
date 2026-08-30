import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import type {
  BomItemInput, CraftProductFilters, DbConnection, ProductUpdateInput, PrintProfileInput, VariantInput,
} from './craft-products.types';

type Queryable = typeof pool | DbConnection;

const numbers = (row: Record<string, any>, fields: string[]) => {
  const result = { ...row };
  for (const field of fields) if (result[field] !== null && result[field] !== undefined) result[field] = Number(result[field]);
  return result;
};

const booleans = (row: Record<string, any>, fields: string[]) => {
  const result = { ...row };
  for (const field of fields) if (result[field] !== null && result[field] !== undefined) result[field] = Boolean(Number(result[field]));
  return result;
};

function nullableJson(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

export class CraftProductsRepository {
  async listProducts(businessUnitId: number, filters: CraftProductFilters) {
    const conditions = ['p.business_unit_id = ?'];
    const params: unknown[] = [businessUnitId];
    if (filters.status !== 'all') {
      conditions.push(filters.status === 'inactive' ? '(p.is_active = 0 OR p.deleted_at IS NOT NULL)' : 'p.is_active = 1 AND p.deleted_at IS NULL');
    }
    if (filters.categoryId) { conditions.push('p.category_id = ?'); params.push(filters.categoryId); }
    if (filters.productType) { conditions.push('p.product_type = ?'); params.push(filters.productType); }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(`(
        p.sku LIKE ? OR p.name LIKE ? OR p.description LIKE ? OR
        EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND (pv.sku LIKE ? OR pv.name LIKE ?))
      )`);
      params.push(term, term, term, term, term);
    }
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT p.id, p.business_unit_id, p.category_id, p.sku, p.name, p.description, p.product_type,
             p.base_selling_price, p.estimated_cost, p.estimated_weight_g, p.estimated_print_minutes,
             p.default_margin_percent, p.image_path, p.is_active, p.created_at, p.updated_at, p.deleted_at,
             c.name AS category_name, c.code AS category_code,
             (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) AS active_variant_count,
             (SELECT COUNT(*) FROM product_boms b WHERE b.product_id = p.id AND b.is_active = 1) AS active_bom_count,
             (SELECT COUNT(*) FROM design_files d WHERE d.product_id = p.id) AS design_file_count,
             (SELECT COUNT(*) FROM print_profiles pp WHERE pp.product_id = p.id) AS print_profile_count,
             (SELECT SUM(bi.quantity * (1 + bi.waste_factor_percent / 100) * m.default_unit_cost)
                FROM product_boms b
                JOIN product_bom_items bi ON bi.bom_id = b.id
                JOIN materials m ON m.id = bi.material_id AND m.business_unit_id = p.business_unit_id
               WHERE b.product_id = p.id AND b.variant_id IS NULL AND b.is_active = 1) AS bom_cost
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id AND c.business_unit_id = p.business_unit_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.is_active DESC, p.name ASC, p.id DESC`, params as any[]);
    return rows.map(row => booleans(numbers(row, [
      'id', 'business_unit_id', 'category_id', 'base_selling_price', 'estimated_cost', 'estimated_weight_g',
      'estimated_print_minutes', 'default_margin_percent', 'active_variant_count', 'active_bom_count',
      'design_file_count', 'print_profile_count', 'bom_cost',
    ]), ['is_active']));
  }

  async getProduct(id: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT p.id, p.business_unit_id, p.category_id, p.sku, p.name, p.description, p.product_type,
             p.base_selling_price, p.estimated_cost, p.estimated_weight_g, p.estimated_print_minutes,
             p.default_margin_percent, p.image_path, p.is_active, p.created_at, p.updated_at, p.deleted_at,
             c.name AS category_name, c.code AS category_code,
             (SELECT COUNT(*) FROM product_boms b WHERE b.product_id = p.id AND b.is_active = 1) AS active_bom_count,
             (SELECT COUNT(*) FROM design_files d WHERE d.product_id = p.id) AS design_file_count,
             (SELECT COUNT(*) FROM print_profiles pp WHERE pp.product_id = p.id) AS print_profile_count
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id AND c.business_unit_id = p.business_unit_id
       WHERE p.id = ? AND p.business_unit_id = ?
       LIMIT 1`, [id, businessUnitId]);
    if (!rows.length) return null;
    return booleans(numbers(rows[0], [
      'id', 'business_unit_id', 'category_id', 'base_selling_price', 'estimated_cost', 'estimated_weight_g',
      'estimated_print_minutes', 'default_margin_percent', 'active_bom_count', 'design_file_count', 'print_profile_count',
    ]), ['is_active']);
  }

  async createProduct(businessUnitId: number, data: {
    sku: string; name: string; categoryId: number | null; description: string | null; productType: string;
    sellingPrice: number; estimatedCost: number; weight: number | null; minutes: number | null; margin: number | null;
  }, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO products (business_unit_id, category_id, sku, name, description, product_type, base_selling_price,
        estimated_cost, estimated_weight_g, estimated_print_minutes, default_margin_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      businessUnitId, data.categoryId, data.sku, data.name, data.description, data.productType,
      data.sellingPrice, data.estimatedCost, data.weight, data.minutes, data.margin,
    ]);
    return Number(result.insertId);
  }

  async updateProduct(id: number, data: ProductUpdateInput, categoryId: number | null | undefined, connection: DbConnection) {
    const values: Array<[string, unknown]> = [];
    if (data.sku !== undefined) values.push(['sku', data.sku?.trim() || null]);
    if (data.name !== undefined) values.push(['name', data.name.trim()]);
    if (data.category_id !== undefined) values.push(['category_id', categoryId ?? null]);
    if (data.description !== undefined) values.push(['description', data.description?.trim() || null]);
    if (data.product_type !== undefined) values.push(['product_type', data.product_type]);
    if (data.base_selling_price !== undefined) values.push(['base_selling_price', data.base_selling_price]);
    if (data.estimated_cost !== undefined) values.push(['estimated_cost', data.estimated_cost]);
    if (data.estimated_weight_g !== undefined) values.push(['estimated_weight_g', data.estimated_weight_g]);
    if (data.estimated_print_minutes !== undefined) values.push(['estimated_print_minutes', data.estimated_print_minutes]);
    if (data.default_margin_percent !== undefined) values.push(['default_margin_percent', data.default_margin_percent]);
    if (!values.length) return;
    await connection.execute(`UPDATE products SET ${values.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [
      ...values.map(([, value]) => value), id,
    ] as any[]);
  }

  async setProductImage(id: number, imagePath: string | null, connection: DbConnection) {
    await connection.execute('UPDATE products SET image_path = ? WHERE id = ?', [imagePath, id]);
  }

  async setProductArchive(id: number, active: boolean, connection: DbConnection) {
    await connection.execute('UPDATE products SET is_active = ?, deleted_at = ? WHERE id = ?', [active ? 1 : 0, active ? null : new Date(), id]);
  }

  async getCategories(businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT c.id, c.business_unit_id, c.code, c.name, c.parent_id, c.is_active,
             parent.name AS parent_name, COUNT(p.id) AS product_count
        FROM product_categories c
        LEFT JOIN product_categories parent ON parent.id = c.parent_id AND parent.business_unit_id = c.business_unit_id
        LEFT JOIN products p ON p.category_id = c.id
       WHERE c.business_unit_id = ?
       GROUP BY c.id, c.business_unit_id, c.code, c.name, c.parent_id, c.is_active, parent.name
       ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.name`, [businessUnitId]);
    return rows.map(row => booleans(numbers(row, ['id', 'business_unit_id', 'parent_id', 'product_count']), ['is_active']));
  }

  async getCategory(id: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, business_unit_id, code, name, parent_id, is_active FROM product_categories WHERE id = ? AND business_unit_id = ? LIMIT 1',
      [id, businessUnitId],
    );
    return rows.length ? booleans(numbers(rows[0], ['id', 'business_unit_id', 'parent_id']), ['is_active']) : null;
  }

  async createCategory(businessUnitId: number, code: string, name: string, parentId: number | null, isActive: boolean, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO product_categories (business_unit_id, code, name, parent_id, is_active) VALUES (?, ?, ?, ?, ?)',
      [businessUnitId, code, name, parentId, isActive ? 1 : 0],
    );
    return Number(result.insertId);
  }

  async updateCategory(id: number, data: { code?: string | null; name?: string; parent_id?: number | null; is_active?: boolean }, parentId: number | null | undefined, connection: DbConnection) {
    const values: Array<[string, unknown]> = [];
    if (data.code !== undefined) values.push(['code', data.code?.trim() || null]);
    if (data.name !== undefined) values.push(['name', data.name.trim()]);
    if (data.parent_id !== undefined) values.push(['parent_id', parentId ?? null]);
    if (data.is_active !== undefined) values.push(['is_active', data.is_active ? 1 : 0]);
    if (!values.length) return;
    await connection.execute(`UPDATE product_categories SET ${values.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...values.map(([, value]) => value), id] as any[]);
  }

  async setCategoryActive(id: number, active: boolean, connection: DbConnection) {
    await connection.execute('UPDATE product_categories SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
  }

  async getVariants(productId: number, businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT v.id, v.product_id, v.sku, v.name, v.attributes, v.selling_price, v.estimated_cost,
             v.estimated_weight_g, v.estimated_print_minutes, v.is_active, v.created_at, v.updated_at
        FROM product_variants v
        JOIN products p ON p.id = v.product_id AND p.business_unit_id = ?
       WHERE v.product_id = ?
       ORDER BY v.is_active DESC, v.name`, [businessUnitId, productId]);
    return rows.map(row => {
      const result = booleans(numbers(row, ['id', 'product_id', 'selling_price', 'estimated_cost', 'estimated_weight_g', 'estimated_print_minutes']), ['is_active']);
      if (typeof result.attributes === 'string') { try { result.attributes = JSON.parse(result.attributes); } catch { result.attributes = {}; } }
      return result;
    });
  }

  async getVariant(id: number, productId: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT v.* FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.id = ? AND v.product_id = ? AND p.business_unit_id = ? LIMIT 1`, [id, productId, businessUnitId]);
    if (!rows.length) return null;
    const result = booleans(numbers(rows[0], ['id', 'product_id', 'selling_price', 'estimated_cost', 'estimated_weight_g', 'estimated_print_minutes']), ['is_active']);
    if (typeof result.attributes === 'string') { try { result.attributes = JSON.parse(result.attributes); } catch { result.attributes = {}; } }
    return result;
  }

  async createVariant(productId: number, data: { sku: string; name: string; attributes: Record<string, string> | null; sellingPrice: number | null; estimatedCost: number | null; weight: number | null; minutes: number | null; active: boolean }, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO product_variants (product_id, sku, name, attributes, selling_price, estimated_cost, estimated_weight_g, estimated_print_minutes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      productId, data.sku, data.name, nullableJson(data.attributes), data.sellingPrice, data.estimatedCost, data.weight, data.minutes, data.active ? 1 : 0,
    ]);
    return Number(result.insertId);
  }

  async updateVariant(id: number, data: Partial<VariantInput>, connection: DbConnection) {
    const values: Array<[string, unknown]> = [];
    if (data.sku !== undefined) values.push(['sku', data.sku?.trim() || null]);
    if (data.name !== undefined) values.push(['name', data.name.trim()]);
    if (data.attributes !== undefined) values.push(['attributes', nullableJson(data.attributes)]);
    if (data.selling_price !== undefined) values.push(['selling_price', data.selling_price]);
    if (data.estimated_cost !== undefined) values.push(['estimated_cost', data.estimated_cost]);
    if (data.estimated_weight_g !== undefined) values.push(['estimated_weight_g', data.estimated_weight_g]);
    if (data.estimated_print_minutes !== undefined) values.push(['estimated_print_minutes', data.estimated_print_minutes]);
    if (data.is_active !== undefined) values.push(['is_active', data.is_active ? 1 : 0]);
    if (!values.length) return;
    await connection.execute(`UPDATE product_variants SET ${values.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...values.map(([, value]) => value), id] as any[]);
  }

  async getBoms(productId: number, businessUnitId: number) {
    const [bomRows] = await pool.execute<RowDataPacket[]>(`
      SELECT b.id, b.product_id, b.variant_id, b.version_no, b.name, b.is_active, b.notes, b.created_at, b.updated_at,
             v.name AS variant_name
        FROM product_boms b
        JOIN products p ON p.id = b.product_id AND p.business_unit_id = ?
        LEFT JOIN product_variants v ON v.id = b.variant_id
       WHERE b.product_id = ?
       ORDER BY b.is_active DESC, b.variant_id IS NOT NULL, b.version_no DESC`, [businessUnitId, productId]);
    const boms = bomRows.map(row => booleans(numbers(row, ['id', 'product_id', 'variant_id', 'version_no']), ['is_active']));
    if (!boms.length) return boms;
    const placeholders = boms.map(() => '?').join(',');
    const [itemRows] = await pool.execute<RowDataPacket[]>(`
      SELECT bi.id, bi.bom_id, bi.material_id, bi.quantity, bi.unit_id, bi.waste_factor_percent, bi.is_optional, bi.notes,
             m.sku AS material_sku, m.name AS material_name, m.default_unit_cost, u.code AS unit_code, u.symbol AS unit_symbol,
             (bi.quantity * (1 + bi.waste_factor_percent / 100) * m.default_unit_cost) AS estimated_line_cost
        FROM product_bom_items bi
        JOIN materials m ON m.id = bi.material_id AND m.business_unit_id = ?
        JOIN units_of_measure u ON u.id = bi.unit_id
       WHERE bi.bom_id IN (${placeholders})
       ORDER BY bi.id`, [businessUnitId, ...boms.map(bom => bom.id)]);
    const byBom = new Map<number, any[]>();
    for (const raw of itemRows) {
      const item = booleans(numbers(raw, ['id', 'bom_id', 'material_id', 'quantity', 'unit_id', 'waste_factor_percent', 'default_unit_cost', 'estimated_line_cost']), ['is_optional']);
      byBom.set(item.bom_id, [...(byBom.get(item.bom_id) || []), item]);
    }
    return boms.map(bom => ({ ...bom, items: byBom.get(bom.id) || [] }));
  }

  async getBom(id: number, productId: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT b.* FROM product_boms b JOIN products p ON p.id = b.product_id
       WHERE b.id = ? AND b.product_id = ? AND p.business_unit_id = ? LIMIT 1`, [id, productId, businessUnitId]);
    return rows.length ? booleans(numbers(rows[0], ['id', 'product_id', 'variant_id', 'version_no']), ['is_active']) : null;
  }

  async createBom(productId: number, variantId: number | null, versionNo: number, name: string, notes: string | null, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO product_boms (product_id, variant_id, version_no, name, is_active, notes) VALUES (?, ?, ?, ?, 1, ?)',
      [productId, variantId, versionNo, name, notes],
    );
    return Number(result.insertId);
  }

  async replaceBomItems(bomId: number, items: BomItemInput[], connection: DbConnection) {
    await connection.execute('DELETE FROM product_bom_items WHERE bom_id = ?', [bomId]);
    for (const item of items) {
      await connection.execute(`INSERT INTO product_bom_items (bom_id, material_id, quantity, unit_id, waste_factor_percent, is_optional, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        bomId, item.material_id, item.quantity, item.unit_id, item.waste_factor_percent || 0, item.is_optional ? 1 : 0, item.notes?.trim() || null,
      ]);
    }
  }

  async setActiveBom(productId: number, variantId: number | null, bomId: number, connection: DbConnection) {
    await connection.execute('UPDATE product_boms SET is_active = 0 WHERE product_id = ? AND variant_id <=> ?', [productId, variantId]);
    await connection.execute('UPDATE product_boms SET is_active = 1 WHERE id = ?', [bomId]);
  }

  async updateBom(id: number, values: { name?: string; notes?: string | null }, connection: DbConnection) {
    const fields: Array<[string, unknown]> = [];
    if (values.name !== undefined) fields.push(['name', values.name]);
    if (values.notes !== undefined) fields.push(['notes', values.notes]);
    if (fields.length) await connection.execute(`UPDATE product_boms SET ${fields.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`, [...fields.map(([, value]) => value), id] as any[]);
  }

  async listDesignFiles(businessUnitId: number, filters: { productId?: number; variantId?: number }) {
    const conditions = ['d.business_unit_id = ?', '(d.product_id IS NULL OR p.business_unit_id = ?)'];
    const params: unknown[] = [businessUnitId, businessUnitId];
    if (filters.productId) { conditions.push('d.product_id = ?'); params.push(filters.productId); }
    if (filters.variantId) { conditions.push('d.variant_id = ?'); params.push(filters.variantId); }
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT d.id, d.business_unit_id, d.product_id, d.variant_id, d.design_code, d.name, d.file_type, d.file_name,
             d.version_label, d.file_size_bytes, d.checksum_sha256, d.is_final, d.uploaded_at, d.notes,
             p.name AS product_name, v.name AS variant_name, u.full_name AS uploaded_by_name
        FROM design_files d
        LEFT JOIN products p ON p.id = d.product_id
        LEFT JOIN product_variants v ON v.id = d.variant_id
        LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.is_final DESC, d.uploaded_at DESC`, params as any[]);
    return rows.map(row => booleans(numbers(row, ['id', 'business_unit_id', 'product_id', 'variant_id', 'file_size_bytes']), ['is_final']));
  }

  async getDesignFile(id: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT d.*, p.business_unit_id AS product_business_unit_id
        FROM design_files d LEFT JOIN products p ON p.id = d.product_id
       WHERE d.id = ? AND d.business_unit_id = ? AND (d.product_id IS NULL OR p.business_unit_id = ?)
       LIMIT 1`, [id, businessUnitId, businessUnitId]);
    return rows.length ? booleans(numbers(rows[0], ['id', 'business_unit_id', 'product_id', 'variant_id', 'file_size_bytes', 'uploaded_by']), ['is_final']) : null;
  }

  async createDesignFile(input: { businessUnitId: number; productId: number | null; variantId: number | null; designCode: string; name: string; fileType: string; fileName: string; storagePath: string; versionLabel: string | null; size: number; checksum: string; isFinal: boolean; uploadedBy: number; notes: string | null }, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO design_files (business_unit_id, product_id, variant_id, design_code, name, file_type, file_name,
        storage_path, version_label, file_size_bytes, checksum_sha256, is_final, uploaded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      input.businessUnitId, input.productId, input.variantId, input.designCode, input.name, input.fileType, input.fileName,
      input.storagePath, input.versionLabel, input.size, input.checksum, input.isFinal ? 1 : 0, input.uploadedBy, input.notes,
    ]);
    return Number(result.insertId);
  }

  async updateDesignFile(id: number, input: Record<string, unknown>, connection: DbConnection) {
    const fields: Array<[string, unknown]> = [];
    const map: Record<string, string> = { product_id: 'product_id', variant_id: 'variant_id', name: 'name', version_label: 'version_label', is_final: 'is_final', notes: 'notes' };
    for (const [key, column] of Object.entries(map)) {
      if (input[key] !== undefined) fields.push([column, key === 'is_final' ? (input[key] ? 1 : 0) : input[key]]);
    }
    if (fields.length) await connection.execute(`UPDATE design_files SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...fields.map(([, value]) => value), id] as any[]);
  }

  async setDesignFinal(businessUnitId: number, productId: number | null, variantId: number | null, designId: number, connection: DbConnection) {
    await connection.execute('UPDATE design_files SET is_final = 0 WHERE business_unit_id = ? AND product_id <=> ? AND variant_id <=> ?', [businessUnitId, productId, variantId]);
    await connection.execute('UPDATE design_files SET is_final = 1 WHERE id = ?', [designId]);
  }

  async deleteDesignFile(id: number, connection: DbConnection) { await connection.execute('DELETE FROM design_files WHERE id = ?', [id]); }

  async listPrintProfiles(businessUnitId: number, filters: { productId?: number; variantId?: number; printerId?: number }) {
    const conditions = ['pp.business_unit_id = ?'];
    const params: unknown[] = [businessUnitId];
    if (filters.productId) { conditions.push('pp.product_id = ?'); params.push(filters.productId); }
    if (filters.variantId) { conditions.push('pp.variant_id = ?'); params.push(filters.variantId); }
    if (filters.printerId) { conditions.push('pp.printer_id = ?'); params.push(filters.printerId); }
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT pp.*, p.name AS product_name, v.name AS variant_name, pr.name AS printer_name,
             u.code AS estimated_material_unit_code
        FROM print_profiles pp
        LEFT JOIN products p ON p.id = pp.product_id AND p.business_unit_id = pp.business_unit_id
        LEFT JOIN product_variants v ON v.id = pp.variant_id
        LEFT JOIN printers pr ON pr.id = pp.printer_id AND pr.business_unit_id = pp.business_unit_id
        LEFT JOIN units_of_measure u ON u.id = pp.estimated_material_unit_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pp.is_default DESC, pp.name`, params as any[]);
    return rows.map(row => {
      const result = booleans(numbers(row, [
        'id', 'business_unit_id', 'product_id', 'variant_id', 'printer_id', 'nozzle_diameter_mm', 'layer_height_mm', 'infill_percent',
        'estimated_print_minutes', 'estimated_material_qty', 'estimated_material_unit_id',
      ]), ['support_enabled', 'is_default']);
      if (typeof result.settings_json === 'string') { try { result.settings_json = JSON.parse(result.settings_json); } catch { result.settings_json = null; } }
      return result;
    });
  }

  async getPrintProfile(id: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM print_profiles WHERE id = ? AND business_unit_id = ? LIMIT 1', [id, businessUnitId]);
    if (!rows.length) return null;
    const result = booleans(numbers(rows[0], [
      'id', 'business_unit_id', 'product_id', 'variant_id', 'printer_id', 'nozzle_diameter_mm', 'layer_height_mm', 'infill_percent',
      'estimated_print_minutes', 'estimated_material_qty', 'estimated_material_unit_id',
    ]), ['support_enabled', 'is_default']);
    if (typeof result.settings_json === 'string') { try { result.settings_json = JSON.parse(result.settings_json); } catch { result.settings_json = null; } }
    return result;
  }

  async createPrintProfile(businessUnitId: number, data: PrintProfileInput, connection: DbConnection) {
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO print_profiles (business_unit_id, product_id, variant_id, printer_id, name, slicer_name, nozzle_diameter_mm,
        layer_height_mm, infill_percent, support_enabled, estimated_print_minutes, estimated_material_qty,
        estimated_material_unit_id, settings_json, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      businessUnitId, data.product_id ?? null, data.variant_id ?? null, data.printer_id ?? null, data.name,
      data.slicer_name?.trim() || null, data.nozzle_diameter_mm ?? null, data.layer_height_mm ?? null, data.infill_percent ?? null,
      data.support_enabled === undefined || data.support_enabled === null ? null : (data.support_enabled ? 1 : 0),
      data.estimated_print_minutes ?? null, data.estimated_material_qty ?? null, data.estimated_material_unit_id ?? null,
      nullableJson(data.settings_json), data.is_default ? 1 : 0,
    ]);
    return Number(result.insertId);
  }

  async updatePrintProfile(id: number, data: Partial<PrintProfileInput>, connection: DbConnection) {
    const fields: Array<[string, unknown]> = [];
    const columns: Record<string, string> = {
      product_id: 'product_id', variant_id: 'variant_id', printer_id: 'printer_id', name: 'name', slicer_name: 'slicer_name',
      nozzle_diameter_mm: 'nozzle_diameter_mm', layer_height_mm: 'layer_height_mm', infill_percent: 'infill_percent',
      support_enabled: 'support_enabled', estimated_print_minutes: 'estimated_print_minutes', estimated_material_qty: 'estimated_material_qty',
      estimated_material_unit_id: 'estimated_material_unit_id', settings_json: 'settings_json', is_default: 'is_default',
    };
    for (const [key, column] of Object.entries(columns)) {
      if ((data as any)[key] === undefined) continue;
      let value = (data as any)[key];
      if (key === 'slicer_name') value = value?.trim() || null;
      if (key === 'support_enabled') value = value === null ? null : (value ? 1 : 0);
      if (key === 'settings_json') value = nullableJson(value);
      if (key === 'is_default') value = value ? 1 : 0;
      fields.push([column, value]);
    }
    if (fields.length) await connection.execute(`UPDATE print_profiles SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...fields.map(([, value]) => value), id] as any[]);
  }

  async setDefaultPrintProfile(businessUnitId: number, productId: number | null, variantId: number | null, printerId: number | null, profileId: number, connection: DbConnection) {
    await connection.execute('UPDATE print_profiles SET is_default = 0 WHERE business_unit_id = ? AND product_id <=> ? AND variant_id <=> ? AND printer_id <=> ?', [businessUnitId, productId, variantId, printerId]);
    await connection.execute('UPDATE print_profiles SET is_default = 1 WHERE id = ?', [profileId]);
  }

  async deletePrintProfile(id: number, connection: DbConnection) { await connection.execute('DELETE FROM print_profiles WHERE id = ?', [id]); }

  async validateCategory(categoryId: number, businessUnitId: number, connection: Queryable = pool) {
    return this.getCategory(categoryId, businessUnitId, connection);
  }

  async validatePrinter(printerId: number, businessUnitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM printers WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL LIMIT 1', [printerId, businessUnitId]);
    return rows.length > 0;
  }

  async validateUnit(unitId: number, connection: Queryable = pool) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM units_of_measure WHERE id = ? AND is_active = 1 LIMIT 1', [unitId]);
    return rows.length > 0;
  }

  async validateBomItems(items: BomItemInput[], businessUnitId: number, connection: Queryable = pool) {
    for (const item of items) {
      const [rows] = await connection.execute<RowDataPacket[]>(`
        SELECT m.id, m.base_unit_id, u.id AS unit_exists
          FROM materials m LEFT JOIN units_of_measure u ON u.id = ? AND u.is_active = 1
         WHERE m.id = ? AND m.business_unit_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL LIMIT 1`,
        [item.unit_id, item.material_id, businessUnitId]);
      if (!rows.length || !rows[0].unit_exists || Number(rows[0].base_unit_id) !== item.unit_id) return false;
    }
    return true;
  }

  async getCosting(productId: number, businessUnitId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT p.id, p.sku, p.name, p.base_selling_price, p.estimated_cost, p.default_margin_percent,
             b.id AS bom_id, b.name AS bom_name, b.version_no,
             SUM(bi.quantity * (1 + bi.waste_factor_percent / 100) * m.default_unit_cost) AS bom_cost
        FROM products p
        LEFT JOIN product_boms b ON b.product_id = p.id AND b.variant_id IS NULL AND b.is_active = 1
        LEFT JOIN product_bom_items bi ON bi.bom_id = b.id
        LEFT JOIN materials m ON m.id = bi.material_id AND m.business_unit_id = p.business_unit_id
       WHERE p.id = ? AND p.business_unit_id = ?
       GROUP BY p.id, p.sku, p.name, p.base_selling_price, p.estimated_cost, p.default_margin_percent, b.id, b.name, b.version_no
       ORDER BY b.version_no DESC LIMIT 1`, [productId, businessUnitId]);
    if (!rows.length) return null;
    return numbers(rows[0], ['id', 'base_selling_price', 'estimated_cost', 'default_margin_percent', 'bom_id', 'version_no', 'bom_cost']);
  }

  async getUsage(productId: number) {
    const [[orderRows], [jobRows]] = await Promise.all([
      pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS count, MAX(created_at) AS last_used_at FROM craft_order_items WHERE product_id = ?', [productId]),
      pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS count, MAX(created_at) AS last_used_at FROM print_jobs WHERE product_id = ?', [productId]),
    ]);
    return { order_count: Number(orderRows[0]?.count || 0), last_order_at: orderRows[0]?.last_used_at || null, print_job_count: Number(jobRows[0]?.count || 0), last_print_job_at: jobRows[0]?.last_used_at || null };
  }

  async insertAudit(input: { organizationId: number; businessUnitId: number; userId: number; action: string; entityType: string; entityId: number; entityCode?: string | null; description: string; oldValues?: unknown; newValues?: unknown; ip?: string | undefined; userAgent?: string | undefined }, connection: DbConnection) {
    await AuditService.write({ organizationId: input.organizationId, businessUnitId: input.businessUnitId, userId: input.userId, moduleCode: 'craft_products', actionCode: input.action, entityType: input.entityType, entityId: input.entityId, entityCode: input.entityCode, description: input.description, oldValues: input.oldValues, newValues: input.newValues, ipAddress: input.ip, userAgent: input.userAgent }, connection);
  }
}
