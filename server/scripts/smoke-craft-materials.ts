import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function smoke() {
  const connection = await pool.getConnection();
  try {
    const requiredTables = ['material_categories', 'materials', 'material_batches', 'filament_spools', 'inventory_movements', 'stock_reservations', 'material_waste'];
    for (const table of requiredTables) {
      const [rows]: any = await connection.query(`SHOW COLUMNS FROM ${table}`);
      assert(rows.length > 0, `Missing required table: ${table}`);
    }
    const [viewRows]: any = await connection.query('SHOW COLUMNS FROM v_material_stock');
    assert(viewRows.some((row: any) => row.Field === 'available_qty'), 'v_material_stock.available_qty is missing');

    const [craftRows]: any = await connection.execute("SELECT id, organization_id FROM business_units WHERE code = 'CRAFT' AND is_active = 1 LIMIT 1");
    const [categoryRows]: any = await connection.execute("SELECT id FROM material_categories WHERE business_unit_id = ? AND category_type = 'filament' LIMIT 1", [craftRows[0]?.id]);
    const [unitRows]: any = await connection.execute("SELECT id FROM units_of_measure WHERE code = 'G' AND is_active = 1 LIMIT 1");
    const [userRows]: any = await connection.execute("SELECT id FROM users WHERE status_code = 'active' AND approval_status_code = 'approved' LIMIT 1");
    assert(craftRows.length && categoryRows.length && unitRows.length && userRows.length, 'CRAFT, filament category, G unit, or active user is unavailable');

    await connection.beginTransaction();
    const tag = randomUUID().slice(0, 10).toUpperCase();
    const craft = craftRows[0]; const userId = userRows[0].id;
    const [materialResult]: any = await connection.execute(
      `INSERT INTO materials (business_unit_id, category_id, sku, name, material_type, color_name, color_hex, base_unit_id, default_unit_cost, low_stock_threshold, reorder_qty, is_active)
       VALUES (?, ?, ?, ?, 'PLA+', 'Smoke Yellow', '#FFD232', ?, 170, 200, 1000, 1)`,
      [craft.id, categoryRows[0].id, `SMK-${tag}`, `Smoke Material ${tag}`, unitRows[0].id],
    );
    const materialId = Number(materialResult.insertId);
    const [batchResult]: any = await connection.execute(
      `INSERT INTO material_batches (material_id, batch_code, initial_qty, current_qty, reserved_qty, unit_cost, status_code)
       VALUES (?, ?, 1000, 1000, 0, 170, 'available')`, [materialId, `SMK-BAT-${tag}`],
    );
    const batchId = Number(batchResult.insertId);
    await connection.execute(
      `INSERT INTO filament_spools (material_batch_id, spool_code, nominal_net_weight_g, current_net_weight_g)
       VALUES (?, ?, 1000, 1000)`, [batchId, `SMK-SPL-${tag}`],
    );
    await connection.execute(
      `INSERT INTO inventory_movements (business_unit_id, material_id, material_batch_id, movement_type, quantity, unit_id, unit_cost, total_cost, notes, created_by)
       VALUES (?, ?, ?, 'stock_in', 1000, ?, 170, 170000, 'Craft Materials smoke receipt', ?)`,
      [craft.id, materialId, batchId, unitRows[0].id, userId],
    );
    await connection.execute(
      `INSERT INTO stock_reservations (material_id, material_batch_id, quantity, unit_id, reference_type, reference_id, status_code, created_by)
       VALUES (?, ?, 100, ?, 'print_job', 1, 'reserved', ?)`, [materialId, batchId, unitRows[0].id, userId],
    );
    await connection.execute('UPDATE material_batches SET reserved_qty = 100 WHERE id = ?', [batchId]);
    await connection.execute('UPDATE material_batches SET current_qty = current_qty - 5 WHERE id = ?', [batchId]);
    await connection.execute('UPDATE filament_spools SET current_net_weight_g = current_net_weight_g - 5 WHERE material_batch_id = ?', [batchId]);
    await connection.execute(
      `INSERT INTO material_waste (material_id, material_batch_id, quantity, unit_id, waste_reason, notes, created_by)
       VALUES (?, ?, 5, ?, 'purge', 'Craft Materials smoke waste', ?)`, [materialId, batchId, unitRows[0].id, userId],
    );
    await connection.execute(
      `INSERT INTO inventory_movements (business_unit_id, material_id, material_batch_id, movement_type, quantity, unit_id, unit_cost, total_cost, notes, created_by)
       VALUES (?, ?, ?, 'waste', 5, ?, 170, 850, 'Craft Materials smoke waste', ?)`,
      [craft.id, materialId, batchId, unitRows[0].id, userId],
    );
    const [stockRows]: any = await connection.execute('SELECT total_qty, reserved_qty, available_qty FROM v_material_stock WHERE material_id = ?', [materialId]);
    assert(stockRows.length === 1, 'v_material_stock did not return the smoke material');
    assert(Number(stockRows[0].total_qty) === 995 && Number(stockRows[0].reserved_qty) === 100 && Number(stockRows[0].available_qty) === 895, 'Stock view quantities are inconsistent');
    await connection.rollback();
    console.log('Craft Materials DB smoke test passed (transaction rolled back).');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); await pool.end(); }
}

smoke().catch((error) => { console.error(error); process.exit(1); });
