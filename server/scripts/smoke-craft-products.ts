import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';

async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [buRows]: any = await connection.execute(
      `SELECT id, organization_id FROM business_units WHERE code = 'CRAFT' AND is_active = 1 LIMIT 1`,
    );
    if (!buRows.length) throw new Error('Business unit CRAFT tidak tersedia.');
    const craft = buRows[0];

    const [schemaRows]: any = await connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN ('products', 'product_categories', 'product_variants', 'product_boms', 'product_bom_items', 'design_files', 'print_profiles')
    `);
    if (schemaRows.length !== 7) throw new Error('Tabel Craft Products canonical tidak lengkap.');

    const temporarySku = `TMP-SMOKE-${randomUUID()}`;
    const [created]: any = await connection.execute(
      `INSERT INTO products (business_unit_id, sku, name, product_type, base_selling_price, estimated_cost)
       VALUES (?, ?, 'Rollback smoke product', 'premade', 0, 0)`,
      [craft.id, temporarySku],
    );
    const productId = Number(created.insertId);
    const [readRows]: any = await connection.execute(
      `SELECT id, sku, business_unit_id, is_active FROM products WHERE id = ? AND business_unit_id = ?`,
      [productId, craft.id],
    );
    if (readRows.length !== 1 || readRows[0].sku !== temporarySku) throw new Error('Kontrak SELECT products tidak sesuai.');

    const [variant]: any = await connection.execute(
      `INSERT INTO product_variants (product_id, sku, name, is_active) VALUES (?, ?, 'Rollback smoke variant', 1)`,
      [productId, `VAR-SMOKE-${randomUUID()}`],
    );
    const [variantRows]: any = await connection.execute(
      `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.id = ? AND p.business_unit_id = ?`,
      [variant.insertId, craft.id],
    );
    if (variantRows.length !== 1) throw new Error('Kontrak varian lintas business unit tidak sesuai.');

    await connection.rollback();
    console.log('Craft Products smoke test passed (transaction rolled back; no sample product persisted).');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

void main().catch(error => {
  console.error('Craft Products smoke test failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
