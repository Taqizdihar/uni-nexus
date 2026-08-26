import { AppError } from '../../shared/errors/AppError';
import { applyFilamentBatchQuantityDelta } from '../craft-materials/material-spools.service';
import { asNumber } from './craft-production.helpers';
import type {
  ActualMaterialInput,
  CraftContext,
  DbConnection,
  PlannedMaterialInput,
} from './craft-production.types';

interface MaterialReference {
  id: number;
  name: string;
  base_unit_id: number;
  unit_code: string;
  default_unit_cost: number;
}

export class ProductionMaterialsService {
  private async lockPlannedMaterialBatches(
    connection: DbConnection,
    materials: PlannedMaterialInput[],
  ) {
    const explicitBatchIds = [...new Set(materials.flatMap((material) =>
      material.material_batch_id ? [material.material_batch_id] : [],
    ))];
    const automaticMaterialIds = [...new Set(materials.flatMap((material) =>
      !material.material_batch_id && material.reserve !== false ? [material.material_id] : [],
    ))];
    const conditions: string[] = [];
    const params: number[] = [];
    if (explicitBatchIds.length) {
      conditions.push(`id IN (${explicitBatchIds.map(() => '?').join(', ')})`);
      params.push(...explicitBatchIds);
    }
    if (automaticMaterialIds.length) {
      conditions.push(`(material_id IN (${automaticMaterialIds.map(() => '?').join(', ')}) AND status_code = 'available')`);
      params.push(...automaticMaterialIds);
    }
    if (!conditions.length) return;
    await connection.execute(
      `SELECT id FROM material_batches WHERE ${conditions.map((condition) => `(${condition})`).join(' OR ')}
       ORDER BY id FOR UPDATE`,
      params,
    );
  }

  private async getMaterial(
    connection: DbConnection,
    materialId: number,
    unitId: number,
    businessUnitId: number,
  ): Promise<MaterialReference> {
    const [rows]: any = await connection.execute(
      `SELECT m.id, m.name, m.base_unit_id, m.default_unit_cost, u.code AS unit_code
       FROM materials m
       JOIN units_of_measure u ON u.id = m.base_unit_id AND u.is_active = 1
       WHERE m.id = ? AND m.business_unit_id = ? AND m.is_active = 1
         AND m.deleted_at IS NULL
       LIMIT 1`,
      [materialId, businessUnitId],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_MATERIAL', 'Material tidak valid atau tidak aktif.');
    if (Number(rows[0].base_unit_id) !== unitId) {
      throw new AppError(400, 'MATERIAL_UNIT_MISMATCH', 'Satuan material harus menggunakan satuan dasar inventaris.');
    }
    return {
      id: Number(rows[0].id),
      name: rows[0].name,
      base_unit_id: Number(rows[0].base_unit_id),
      unit_code: rows[0].unit_code,
      default_unit_cost: asNumber(rows[0].default_unit_cost),
    };
  }

  private async insertMovement(
    connection: DbConnection,
    craft: CraftContext,
    userId: number,
    materialId: number,
    batchId: number | null,
    movementType: string,
    quantity: number,
    unitId: number,
    unitCost: number | null,
    jobId: number,
    jobCode: string,
    notes: string,
  ) {
    await connection.execute(
      `INSERT INTO inventory_movements (
        business_unit_id, material_id, material_batch_id, movement_type, quantity,
        unit_id, unit_cost, total_cost, reference_type, reference_id, reference_code,
        notes, occurred_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'print_job', ?, ?, ?, CURRENT_TIMESTAMP(3), ?)`,
      [
        craft.id, materialId, batchId, movementType, quantity, unitId, unitCost,
        unitCost === null ? null : quantity * unitCost, jobId, jobCode, notes, userId,
      ],
    );
  }

  async planMaterials(
    connection: DbConnection,
    craft: CraftContext,
    jobId: number,
    jobCode: string,
    materials: PlannedMaterialInput[],
    userId: number,
  ) {
    // Acquire every explicit batch and every automatic-selection candidate in a
    // deterministic order before calculating availability. This serializes
    // concurrent planners and prevents two jobs reserving the same free stock.
    await this.lockPlannedMaterialBatches(connection, materials);
    for (const input of materials) {
      const material = await this.getMaterial(connection, input.material_id, input.unit_id, craft.id);
      let batchId = input.material_batch_id ?? null;
      let reservationId: number | null = null;
      let unitCost = material.default_unit_cost;
      const shouldReserve = input.reserve !== false;
      let batch: any = null;

      if (!batchId && shouldReserve) {
        const [batchRows]: any = await connection.execute(
          `SELECT id, batch_code, current_qty, reserved_qty, unit_cost, status_code,
                  expiry_date, received_at, created_at
           FROM material_batches
           WHERE material_id = ? AND status_code = 'available'
           ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
                    expiry_date ASC, COALESCE(received_at, created_at) ASC, id ASC
           FOR UPDATE`,
          [material.id],
        );
        batch = batchRows.find((candidate: any) =>
          asNumber(candidate.current_qty) - asNumber(candidate.reserved_qty) + 0.0001 >= input.planned_qty,
        );
        if (!batch) {
          const availability = batchRows.map((candidate: any) => ({
            batch_id: Number(candidate.id),
            batch_code: candidate.batch_code,
            available_qty: Math.max(0, asNumber(candidate.current_qty) - asNumber(candidate.reserved_qty)),
          }));
          throw new AppError(409, 'INSUFFICIENT_MATERIAL', 'Tidak ada satu batch material yang memiliki stok bebas cukup untuk reservasi.', {
            material_id: material.id,
            material_name: material.name,
            unit_id: input.unit_id,
            required_qty: input.planned_qty,
            total_available_qty: availability.reduce((total: number, candidate: any) => total + candidate.available_qty, 0),
            largest_batch_available_qty: availability.reduce((largest: number, candidate: any) => Math.max(largest, candidate.available_qty), 0),
            automatic_batch_selection: true,
            available_batches: availability,
          });
        }
        batchId = Number(batch.id);
      }

      if (batchId) {
        if (!batch) {
          const [batches]: any = await connection.execute(
            `SELECT id, current_qty, reserved_qty, unit_cost, status_code
             FROM material_batches
             WHERE id = ? AND material_id = ? FOR UPDATE`,
            [batchId, material.id],
          );
          if (!batches.length || batches[0].status_code !== 'available') {
            throw new AppError(400, 'INVALID_MATERIAL_BATCH', 'Batch/spool material tidak tersedia.');
          }
          batch = batches[0];
        }
        unitCost = asNumber(batch.unit_cost, unitCost);
        if (shouldReserve) {
          const available = asNumber(batch.current_qty) - asNumber(batch.reserved_qty);
          if (available + 0.0001 < input.planned_qty) {
            throw new AppError(409, 'INSUFFICIENT_MATERIAL', 'Stok material pada batch yang dipilih tidak mencukupi.', {
              material_id: material.id,
              material_name: material.name,
              batch_id: batchId,
              available_qty: available,
              required_qty: input.planned_qty,
            });
          }
          const [reservation]: any = await connection.execute(
            `INSERT INTO stock_reservations (
              material_id, material_batch_id, quantity, unit_id, reference_type,
              reference_id, status_code, created_by
            ) VALUES (?, ?, ?, ?, 'print_job', ?, 'reserved', ?)`,
            [material.id, batchId, input.planned_qty, input.unit_id, jobId, userId],
          );
          reservationId = Number(reservation.insertId);
          await connection.execute(
            `UPDATE material_batches SET reserved_qty = reserved_qty + ? WHERE id = ?`,
            [input.planned_qty, batchId],
          );
          await this.insertMovement(
            connection, craft, userId, material.id, batchId, 'reservation', input.planned_qty,
            input.unit_id, unitCost, jobId, jobCode, `Reservasi material untuk ${jobCode}.`,
          );
        }
      }

      await connection.execute(
        `INSERT INTO print_job_materials (
          print_job_id, material_id, material_batch_id, reservation_id,
          planned_qty, unit_id, unit_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [jobId, material.id, batchId, reservationId, input.planned_qty, input.unit_id, unitCost],
      );
    }
  }

  private async releaseReservationRow(
    connection: DbConnection,
    craft: CraftContext,
    userId: number,
    row: any,
    jobId: number,
    jobCode: string,
    status: 'released' | 'consumed',
  ) {
    if (!row.reservation_id || row.reservation_status !== 'reserved') return;
    const reservationQuantity = asNumber(row.reservation_quantity);
    if (row.material_batch_id) {
      await connection.execute(
        `UPDATE material_batches
         SET reserved_qty = GREATEST(0, reserved_qty - ?)
         WHERE id = ?`,
        [reservationQuantity, row.material_batch_id],
      );
    }
    await connection.execute(
      `UPDATE stock_reservations SET status_code = ?, released_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND status_code = 'reserved'`,
      [status, row.reservation_id],
    );
    await this.insertMovement(
      connection, craft, userId, Number(row.material_id), row.material_batch_id ? Number(row.material_batch_id) : null,
      'release', reservationQuantity, Number(row.unit_id), row.unit_cost === null ? null : asNumber(row.unit_cost),
      jobId, jobCode, `Pelepasan reservasi material untuk ${jobCode}.`,
    );
  }

  private async lockedJobMaterials(connection: DbConnection, jobId: number): Promise<any[]> {
    const [rows]: any = await connection.execute(
      `SELECT pjm.*, u.code AS unit_code,
              sr.quantity AS reservation_quantity, sr.status_code AS reservation_status
       FROM print_job_materials pjm
       JOIN units_of_measure u ON u.id = pjm.unit_id
       LEFT JOIN stock_reservations sr ON sr.id = pjm.reservation_id
       WHERE pjm.print_job_id = ? ORDER BY pjm.id FOR UPDATE`,
      [jobId],
    );
    return rows;
  }

  private toGrams(quantity: number, unitCode: string): number | null {
    const code = unitCode.toUpperCase();
    if (code === 'G') return quantity;
    if (code === 'KG') return quantity * 1000;
    if (code === 'MG') return quantity / 1000;
    return null;
  }

  async consumeActualMaterials(
    connection: DbConnection,
    craft: CraftContext,
    jobId: number,
    jobCode: string,
    actualInputs: ActualMaterialInput[],
    userId: number,
  ): Promise<{ actualCost: number; actualGrams: number | null }> {
    const rows = await this.lockedJobMaterials(connection, jobId);
    const byId = new Map<number, any>(rows.map((row) => [Number(row.id), row]));
    const matchExistingRow = (input: ActualMaterialInput) => {
      if (input.print_job_material_id) {
        const matched = byId.get(input.print_job_material_id);
        if (!matched) {
          throw new AppError(400, 'PRINT_JOB_MATERIAL_NOT_FOUND', 'Baris material aktual tidak termasuk dalam pekerjaan ini.');
        }
        return matched;
      }
      return rows.find((candidate) =>
        Number(candidate.material_id) === input.material_id
        && Number(candidate.unit_id) === input.unit_id
        && (candidate.material_batch_id === null
          ? input.material_batch_id == null
          : Number(candidate.material_batch_id) === input.material_batch_id),
      );
    };
    const plannedRows = rows.filter((row) => row.planned_qty !== null);
    if (plannedRows.length) {
      const suppliedPlannedRows = new Set<number>();
      for (const input of actualInputs) {
        const row = matchExistingRow(input);
        if (!row || row.planned_qty === null) continue;
        const rowId = Number(row.id);
        if (suppliedPlannedRows.has(rowId)) {
          throw new AppError(400, 'DUPLICATE_ACTUAL_MATERIAL', 'Material aktual yang sama dikirim lebih dari sekali.');
        }
        if (Number(row.material_id) !== input.material_id || Number(row.unit_id) !== input.unit_id) {
          throw new AppError(400, 'MATERIAL_ACTUAL_MISMATCH', 'Material aktual tidak sesuai dengan rencana pekerjaan.');
        }
        if (input.material_batch_id !== undefined
          && (row.material_batch_id === null
            ? input.material_batch_id !== null
            : Number(row.material_batch_id) !== input.material_batch_id)) {
          throw new AppError(400, 'MATERIAL_BATCH_MISMATCH', 'Batch material aktual tidak sesuai dengan material pekerjaan yang dipilih.');
        }
        suppliedPlannedRows.add(rowId);
      }
      const missing = plannedRows
        .map((row) => Number(row.id))
        .filter((rowId) => !suppliedPlannedRows.has(rowId));
      if (missing.length) {
        throw new AppError(400, 'ACTUAL_MATERIALS_INCOMPLETE', 'Kuantitas aktual wajib dikirim untuk setiap material rencana; kirim 0 bila tidak terpakai.', {
          missing_print_job_material_ids: missing,
        });
      }
    }
    const processed = new Set<number>();
    let actualCost = 0;
    let actualGrams = 0;
    let hasWeight = false;

    for (const input of actualInputs) {
      let row = matchExistingRow(input);
      if (!row) {
        const material = await this.getMaterial(connection, input.material_id, input.unit_id, craft.id);
        let unitCost = material.default_unit_cost;
        if (input.material_batch_id) {
          const [batchRows]: any = await connection.execute(
            `SELECT unit_cost FROM material_batches WHERE id = ? AND material_id = ? FOR UPDATE`,
            [input.material_batch_id, input.material_id],
          );
          if (!batchRows.length) throw new AppError(400, 'INVALID_MATERIAL_BATCH', 'Batch material aktual tidak valid.');
          unitCost = asNumber(batchRows[0].unit_cost, unitCost);
        }
        const [inserted]: any = await connection.execute(
          `INSERT INTO print_job_materials
            (print_job_id, material_id, material_batch_id, planned_qty, actual_qty, unit_id, unit_cost)
           VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
          [jobId, input.material_id, input.material_batch_id ?? null, input.unit_id, unitCost],
        );
        row = {
          id: Number(inserted.insertId), material_id: input.material_id,
          material_batch_id: input.material_batch_id ?? null, unit_id: input.unit_id,
          unit_code: material.unit_code, unit_cost: unitCost,
          reservation_id: null, reservation_quantity: null, reservation_status: null,
        };
      }
      const rowId = Number(row.id);
      if (processed.has(rowId)) throw new AppError(400, 'DUPLICATE_ACTUAL_MATERIAL', 'Material aktual yang sama dikirim lebih dari sekali.');
      if (Number(row.material_id) !== input.material_id || Number(row.unit_id) !== input.unit_id) {
        throw new AppError(400, 'MATERIAL_ACTUAL_MISMATCH', 'Material aktual tidak sesuai dengan rencana pekerjaan.');
      }
      if (input.material_batch_id !== undefined
        && (row.material_batch_id === null ? input.material_batch_id !== null : Number(row.material_batch_id) !== input.material_batch_id)) {
        throw new AppError(400, 'MATERIAL_BATCH_MISMATCH', 'Batch material aktual tidak sesuai dengan material pekerjaan yang dipilih.');
      }
      processed.add(rowId);

      const unitCost = row.unit_cost === null ? 0 : asNumber(row.unit_cost);
      if (row.material_batch_id) {
        const [batchRows]: any = await connection.execute(
          `SELECT current_qty, reserved_qty, status_code FROM material_batches WHERE id = ? FOR UPDATE`,
          [row.material_batch_id],
        );
        if (!batchRows.length) throw new AppError(409, 'MATERIAL_BATCH_NOT_FOUND', 'Batch material pekerjaan tidak ditemukan.');
        const ownReserved = row.reservation_status === 'reserved' ? asNumber(row.reservation_quantity) : 0;
        const availableForJob = asNumber(batchRows[0].current_qty) - asNumber(batchRows[0].reserved_qty) + ownReserved;
        if (availableForJob + 0.0001 < input.actual_qty) {
          throw new AppError(409, 'INSUFFICIENT_MATERIAL', 'Stok material aktual tidak mencukupi untuk penyelesaian cetak.', {
            material_id: input.material_id,
            batch_id: Number(row.material_batch_id),
            available_qty: availableForJob,
            required_qty: input.actual_qty,
          });
        }
        await connection.execute(
          `UPDATE material_batches SET current_qty = current_qty - ? WHERE id = ?`,
          [input.actual_qty, row.material_batch_id],
        );
        // Reservations only affect available stock. Physical consumption is the
        // event that reduces both the batch and its tracked filament spool.
        await applyFilamentBatchQuantityDelta(
          connection, Number(row.material_batch_id), -input.actual_qty, String(row.unit_code),
        );
      }

      await this.releaseReservationRow(connection, craft, userId, row, jobId, jobCode, input.actual_qty > 0 ? 'consumed' : 'released');
      const cost = input.actual_qty * unitCost;
      await connection.execute(
        `UPDATE print_job_materials SET actual_qty = ?, actual_cost = ? WHERE id = ?`,
        [input.actual_qty, cost, rowId],
      );
      if (input.actual_qty > 0) {
        await this.insertMovement(
          connection, craft, userId, input.material_id,
          row.material_batch_id ? Number(row.material_batch_id) : null,
          'production_usage', input.actual_qty, input.unit_id, unitCost, jobId, jobCode,
          `Pemakaian produksi untuk ${jobCode}.`,
        );
      }
      actualCost += cost;
      const grams = this.toGrams(input.actual_qty, String(row.unit_code));
      if (grams !== null) {
        actualGrams += grams;
        hasWeight = true;
      }
    }

    for (const row of rows) {
      if (!processed.has(Number(row.id))) {
        await this.releaseReservationRow(connection, craft, userId, row, jobId, jobCode, 'released');
      }
    }
    return { actualCost, actualGrams: hasWeight ? actualGrams : null };
  }

  async releaseAllReservations(
    connection: DbConnection,
    craft: CraftContext,
    jobId: number,
    jobCode: string,
    userId: number,
  ) {
    const rows = await this.lockedJobMaterials(connection, jobId);
    for (const row of rows) {
      await this.releaseReservationRow(connection, craft, userId, row, jobId, jobCode, 'released');
    }
  }

  async recordFailureWaste(
    connection: DbConnection,
    craft: CraftContext,
    jobId: number,
    jobCode: string,
    wastedGrams: number,
    materialId: number | null,
    batchId: number | null,
    userId: number,
    notes: string,
  ): Promise<number> {
    const rows = await this.lockedJobMaterials(connection, jobId);
    let selected = rows.find((row) =>
      (!materialId || Number(row.material_id) === materialId)
      && (!batchId || Number(row.material_batch_id) === batchId),
    );
    if (!selected && materialId) {
      const [materialRows]: any = await connection.execute(
        `SELECT m.base_unit_id, m.default_unit_cost, u.code AS unit_code
         FROM materials m JOIN units_of_measure u ON u.id = m.base_unit_id
         WHERE m.id = ? AND m.business_unit_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL`,
        [materialId, craft.id],
      );
      if (!materialRows.length) throw new AppError(400, 'INVALID_MATERIAL', 'Material limbah tidak valid.');
      let unitCost = asNumber(materialRows[0].default_unit_cost);
      if (batchId) {
        const [batchRows]: any = await connection.execute(
          `SELECT unit_cost FROM material_batches WHERE id = ? AND material_id = ? FOR UPDATE`,
          [batchId, materialId],
        );
        if (!batchRows.length) throw new AppError(400, 'INVALID_MATERIAL_BATCH', 'Batch material limbah tidak valid.');
        unitCost = asNumber(batchRows[0].unit_cost, unitCost);
      }
      const [inserted]: any = await connection.execute(
        `INSERT INTO print_job_materials
          (print_job_id, material_id, material_batch_id, planned_qty, unit_id, unit_cost)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [jobId, materialId, batchId, materialRows[0].base_unit_id, unitCost],
      );
      selected = {
        id: Number(inserted.insertId), material_id: materialId, material_batch_id: batchId,
        unit_id: Number(materialRows[0].base_unit_id), unit_code: materialRows[0].unit_code,
        unit_cost: unitCost, reservation_id: null, reservation_status: null, reservation_quantity: null,
      };
    }

    let actualCost = 0;
    if (wastedGrams > 0 && selected) {
      const unitCode = String(selected.unit_code).toUpperCase();
      let baseQuantity: number;
      if (unitCode === 'G') baseQuantity = wastedGrams;
      else if (unitCode === 'KG') baseQuantity = wastedGrams / 1000;
      else if (unitCode === 'MG') baseQuantity = wastedGrams * 1000;
      else throw new AppError(400, 'WASTE_UNIT_UNSUPPORTED', 'Limbah cetak hanya dapat dicatat untuk material berbasis berat.');

      if (selected.material_batch_id) {
        const [batchRows]: any = await connection.execute(
          `SELECT current_qty, reserved_qty FROM material_batches WHERE id = ? FOR UPDATE`,
          [selected.material_batch_id],
        );
        if (!batchRows.length) throw new AppError(409, 'MATERIAL_BATCH_NOT_FOUND', 'Batch material limbah tidak ditemukan.');
        const ownReserved = selected.reservation_status === 'reserved' ? asNumber(selected.reservation_quantity) : 0;
        const availableForJob = asNumber(batchRows[0].current_qty) - asNumber(batchRows[0].reserved_qty) + ownReserved;
        if (availableForJob + 0.0001 < baseQuantity) {
          throw new AppError(409, 'INSUFFICIENT_MATERIAL', 'Stok batch tidak mencukupi untuk mencatat limbah cetak.');
        }
        await connection.execute(`UPDATE material_batches SET current_qty = current_qty - ? WHERE id = ?`, [baseQuantity, selected.material_batch_id]);
        await applyFilamentBatchQuantityDelta(
          connection, Number(selected.material_batch_id), -baseQuantity, String(selected.unit_code),
        );
      }
      const unitCost = selected.unit_cost === null ? 0 : asNumber(selected.unit_cost);
      actualCost = baseQuantity * unitCost;
      await connection.execute(
        `UPDATE print_job_materials SET actual_qty = COALESCE(actual_qty, 0) + ?,
          actual_cost = COALESCE(actual_cost, 0) + ? WHERE id = ?`,
        [baseQuantity, actualCost, selected.id],
      );
      await connection.execute(
        `INSERT INTO material_waste (
          material_id, material_batch_id, quantity, unit_id, waste_reason,
          print_job_id, notes, occurred_at, created_by
        ) VALUES (?, ?, ?, ?, 'failed_print', ?, ?, CURRENT_TIMESTAMP(3), ?)`,
        [selected.material_id, selected.material_batch_id, baseQuantity, selected.unit_id, jobId, notes, userId],
      );
      await this.insertMovement(
        connection, craft, userId, Number(selected.material_id),
        selected.material_batch_id ? Number(selected.material_batch_id) : null,
        'waste', baseQuantity, Number(selected.unit_id), unitCost, jobId, jobCode,
        `Limbah cetak gagal untuk ${jobCode}.`,
      );
    }

    for (const row of rows) {
      await this.releaseReservationRow(connection, craft, userId, row, jobId, jobCode, 'released');
    }
    if (selected && !rows.some((row) => Number(row.id) === Number(selected.id))) {
      await this.releaseReservationRow(connection, craft, userId, selected, jobId, jobCode, 'released');
    }
    return actualCost;
  }
}
