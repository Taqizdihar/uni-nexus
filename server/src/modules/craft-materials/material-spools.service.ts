import { AppError } from '../../shared/errors/AppError';
import type { DbConnection } from './craft-materials.types';

function quantityToGrams(quantity: number, unitCode: string) {
  if (unitCode.toUpperCase() === 'G') return quantity;
  if (unitCode.toUpperCase() === 'KG') return quantity * 1000;
  return null;
}

/** Keep physical spool weights aligned with a batch when the batch uses a weight unit. */
export async function applyFilamentBatchQuantityDelta(
  connection: DbConnection,
  batchId: number,
  quantityDelta: number,
  unitCode: string,
) {
  const grams = quantityToGrams(quantityDelta, unitCode);
  if (grams === null || Math.abs(grams) < 0.00001) return;
  const [rows]: any = await connection.execute(
    `SELECT id, current_net_weight_g FROM filament_spools
     WHERE material_batch_id = ? ORDER BY id FOR UPDATE`,
    [batchId],
  );
  if (!rows.length) return;

  if (grams > 0) {
    const target = rows[rows.length - 1];
    if (target.current_net_weight_g === null) return;
    await connection.execute(
      'UPDATE filament_spools SET current_net_weight_g = current_net_weight_g + ? WHERE id = ?',
      [grams, target.id],
    );
    return;
  }

  let remaining = Math.abs(grams);
  for (const spool of rows) {
    if (spool.current_net_weight_g === null) continue;
    const current = Number(spool.current_net_weight_g);
    const deducted = Math.min(current, remaining);
    if (deducted > 0) await connection.execute(
      'UPDATE filament_spools SET current_net_weight_g = current_net_weight_g - ? WHERE id = ?',
      [deducted, spool.id],
    );
    remaining -= deducted;
    if (remaining < 0.00001) return;
  }
  // Historical batches can predate physical spool rows. Do not reject production
  // that has valid batch stock solely because tracked spool data is incomplete.
}

export async function changeSpoolWeight(
  connection: DbConnection,
  spoolId: number,
  nextWeightGrams: number,
  businessUnitId: number,
) {
  const [rows]: any = await connection.execute(
    `SELECT fs.id, fs.material_batch_id, fs.current_net_weight_g, mb.current_qty, mb.reserved_qty,
            u.code AS unit_code
       FROM filament_spools fs
       JOIN material_batches mb ON mb.id = fs.material_batch_id
       JOIN materials m ON m.id = mb.material_id AND m.business_unit_id = ?
       JOIN units_of_measure u ON u.id = m.base_unit_id
      WHERE fs.id = ? FOR UPDATE`,
    [businessUnitId, spoolId],
  );
  if (!rows.length) throw new AppError(404, 'SPOOL_NOT_FOUND', 'Spool filament tidak ditemukan.');
  const spool = rows[0];
  if (spool.current_net_weight_g === null) {
    throw new AppError(409, 'SPOOL_WEIGHT_UNAVAILABLE', 'Spool ini belum memiliki berat bersih yang dapat diperbarui.');
  }
  const deltaGrams = nextWeightGrams - Number(spool.current_net_weight_g);
  const unitCode = String(spool.unit_code).toUpperCase();
  const deltaQuantity = unitCode === 'G' ? deltaGrams : unitCode === 'KG' ? deltaGrams / 1000 : null;
  if (deltaQuantity === null) throw new AppError(400, 'SPOOL_UNIT_UNSUPPORTED', 'Spool hanya dapat digunakan untuk material berbasis gram atau kilogram.');
  const nextBatchQty = Number(spool.current_qty) + deltaQuantity;
  if (nextBatchQty + 0.0001 < Number(spool.reserved_qty)) {
    throw new AppError(409, 'RESERVED_STOCK_PROTECTED', 'Penyesuaian tidak boleh membuat stok fisik lebih kecil dari stok yang direservasi.');
  }
  await connection.execute('UPDATE filament_spools SET current_net_weight_g = ? WHERE id = ?', [nextWeightGrams, spoolId]);
  await connection.execute('UPDATE material_batches SET current_qty = ? WHERE id = ?', [nextBatchQty, spool.material_batch_id]);
  return { batchId: Number(spool.material_batch_id), deltaQuantity, unitCode, currentQty: nextBatchQty };
}
