import { AppError } from '../../shared/errors/AppError';
import type { CraftContext, DbConnection, PrintJobStatus } from './craft-production.types';

export class ProductionSyncService {
  async addJobHistory(
    connection: DbConnection,
    jobId: number,
    fromStatus: PrintJobStatus | null,
    toStatus: PrintJobStatus,
    userId: number,
    reason: string | null = null,
    progressPercent: number | null = null,
  ) {
    await connection.execute(
      `INSERT INTO print_job_status_history
        (print_job_id, from_status_code, to_status_code, progress_percent, reason, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [jobId, fromStatus, toStatus, progressPercent, reason, userId],
    );
  }

  async audit(
    connection: DbConnection,
    craft: CraftContext,
    userId: number,
    actionCode: string,
    entityId: number,
    entityCode: string | null,
    description: string,
    oldValues?: unknown,
    newValues?: unknown,
  ) {
    await connection.execute(
      `INSERT INTO audit_logs (
        organization_id, business_unit_id, user_id, module_code, action_code,
        entity_type, entity_id, entity_code, description, old_values, new_values
      ) VALUES (?, ?, ?, 'craft_production', ?, 'print_job', ?, ?, ?, ?, ?)`,
      [
        craft.organizationId, craft.id, userId, actionCode, entityId, entityCode, description,
        oldValues === undefined ? null : JSON.stringify(oldValues),
        newValues === undefined ? null : JSON.stringify(newValues),
      ],
    );
  }

  async syncOrderOnStart(connection: DbConnection, orderId: number | null, userId: number) {
    if (!orderId) return;
    const [rows]: any = await connection.execute(
      `SELECT status_code FROM craft_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [orderId],
    );
    if (!rows.length) throw new AppError(409, 'ORDER_NOT_FOUND', 'Pesanan asal pekerjaan cetak tidak ditemukan.');
    const oldStatus = String(rows[0].status_code);
    if (['cancelled', 'returned'].includes(oldStatus)) {
      throw new AppError(409, 'ORDER_NOT_PRODUCIBLE', 'Pesanan asal tidak lagi dapat diproduksi.');
    }
    if (!['new', 'confirmed', 'waiting', 'ready'].includes(oldStatus)) return;
    await connection.execute(`UPDATE craft_orders SET status_code = 'in_production' WHERE id = ?`, [orderId]);
    await connection.execute(
      `INSERT INTO craft_order_status_history (order_id, from_status_code, to_status_code, reason, changed_by)
       VALUES (?, ?, 'in_production', 'Produksi fisik pertama dimulai.', ?)`,
      [orderId, oldStatus, userId],
    );
  }

  async setQueuePrinting(connection: DbConnection, queueItemId: number | null) {
    if (!queueItemId) return;
    await connection.execute(
      `UPDATE production_queue_items SET status_code = 'printing' WHERE id = ? AND status_code NOT IN ('completed', 'cancelled')`,
      [queueItemId],
    );
  }

  async refreshQueueState(connection: DbConnection, queueItemId: number | null): Promise<string | null> {
    if (!queueItemId) return null;
    const [queueRows]: any = await connection.execute(
      `SELECT pqi.id, pqi.status_code, coi.quantity AS required_quantity
       FROM production_queue_items pqi
       JOIN craft_order_items coi ON coi.id = pqi.order_item_id
       WHERE pqi.id = ? FOR UPDATE`,
      [queueItemId],
    );
    if (!queueRows.length) return null;

    const [aggregates]: any = await connection.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN status_code = 'completed' THEN quantity ELSE 0 END), 0) AS good_quantity,
         COALESCE(SUM(CASE WHEN status_code IN ('printing', 'paused') THEN 1 ELSE 0 END), 0) AS physical_count,
         COALESCE(SUM(CASE WHEN status_code IN ('queued', 'ready', 'qc') THEN 1 ELSE 0 END), 0) AS pending_count
       FROM print_jobs WHERE queue_item_id = ?`,
      [queueItemId],
    );
    const required = Number(queueRows[0].required_quantity);
    const good = Number(aggregates[0].good_quantity);
    let status = 'queued';
    if (good + 0.0001 >= required) status = 'completed';
    else if (Number(aggregates[0].physical_count) > 0) status = 'printing';
    else if (Number(aggregates[0].pending_count) > 0) status = 'scheduled';
    await connection.execute(`UPDATE production_queue_items SET status_code = ? WHERE id = ?`, [status, queueItemId]);
    return status;
  }

  async cancelQueueRequirement(connection: DbConnection, queueItemId: number | null) {
    if (!queueItemId) return;
    const [active]: any = await connection.execute(
      `SELECT COUNT(*) AS count FROM print_jobs
       WHERE queue_item_id = ? AND status_code IN ('queued', 'ready', 'printing', 'paused', 'qc', 'completed')`,
      [queueItemId],
    );
    if (Number(active[0].count) === 0) {
      await connection.execute(`UPDATE production_queue_items SET status_code = 'cancelled' WHERE id = ?`, [queueItemId]);
    } else {
      await this.refreshQueueState(connection, queueItemId);
    }
  }

  async completeOrderWhenFulfilled(connection: DbConnection, orderId: number | null, userId: number) {
    if (!orderId) return false;
    const [orders]: any = await connection.execute(
      `SELECT status_code FROM craft_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [orderId],
    );
    if (!orders.length) return false;
    const oldStatus = String(orders[0].status_code);
    if (['completed', 'packed', 'shipped', 'cancelled', 'returned'].includes(oldStatus)) return false;

    const [incomplete]: any = await connection.execute(
      `SELECT COUNT(*) AS incomplete_count
       FROM craft_order_items coi
       LEFT JOIN (
         SELECT order_item_id, SUM(quantity) AS good_quantity
         FROM print_jobs
         WHERE order_id = ? AND status_code = 'completed'
         GROUP BY order_item_id
       ) good ON good.order_item_id = coi.id
       WHERE coi.order_id = ? AND COALESCE(good.good_quantity, 0) + 0.0001 < coi.quantity`,
      [orderId, orderId],
    );
    if (Number(incomplete[0].incomplete_count) > 0) return false;

    await connection.execute(
      `UPDATE craft_orders SET status_code = 'completed', completed_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [orderId],
    );
    await connection.execute(
      `INSERT INTO craft_order_status_history (order_id, from_status_code, to_status_code, reason, changed_by)
       VALUES (?, ?, 'completed', 'Seluruh kuantitas produksi lulus QC.', ?)`,
      [orderId, oldStatus, userId],
    );
    return true;
  }
}
