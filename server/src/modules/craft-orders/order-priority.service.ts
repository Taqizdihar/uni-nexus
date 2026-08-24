import { pool } from '../../config/database';

export class OrderPriorityService {
  /**
   * Recalculates the priority score and code for an order based on:
   * 1. Deadline urgency
   * 2. Overdue status
   * 3. Total estimated print duration
   * 4. Age of order in waiting states
   */
  async calculatePriority(orderId: number, connection = pool): Promise<void> {
    const [orders]: any = await connection.execute(
      `SELECT status_code, deadline_at, is_priority_manual, priority_code, priority_score, order_date 
       FROM craft_orders WHERE id = ?`,
      [orderId]
    );

    if (!orders.length) return;
    const order = orders[0];

    // If manual, do not overwrite
    if (order.is_priority_manual) {
      return;
    }

    // Terminal statuses don't need priority calculation
    if (['completed', 'packed', 'shipped', 'cancelled', 'returned'].includes(order.status_code)) {
      return;
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Deadline Risk
    if (order.deadline_at) {
      const now = new Date();
      const deadline = new Date(order.deadline_at);
      const hoursToDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursToDeadline < 0) {
        score += 100;
        reasons.push('Melewati tenggat waktu');
      } else if (hoursToDeadline <= 6) {
        score += 80;
        reasons.push('Tenggat <= 6 jam');
      } else if (hoursToDeadline <= 12) {
        score += 70;
        reasons.push('Tenggat <= 12 jam');
      } else if (hoursToDeadline <= 24) {
        score += 60;
        reasons.push('Tenggat <= 24 jam');
      } else if (hoursToDeadline <= 48) {
        score += 40;
        reasons.push('Tenggat <= 48 jam');
      } else if (hoursToDeadline <= 72) {
        score += 25;
        reasons.push('Tenggat <= 3 hari');
      } else if (hoursToDeadline <= 168) { // 7 days
        score += 10;
        reasons.push('Tenggat <= 7 hari');
      }
    }

    // 2. Print Time Risk
    const [items]: any = await connection.execute(
      `SELECT SUM(estimated_print_minutes * quantity) as total_print_minutes
       FROM craft_order_items WHERE order_id = ?`,
      [orderId]
    );
    const totalPrintMinutes = items[0].total_print_minutes || 0;
    const printHours = totalPrintMinutes / 60;

    if (printHours > 24) {
        score += 20;
        reasons.push(`Waktu cetak panjang (>24j)`);
    } else if (printHours > 12) {
        score += 10;
        reasons.push(`Waktu cetak panjang (>12j)`);
    } else if (printHours > 6) {
        score += 5;
    }

    // 3. Waiting Age
    if (['new', 'confirmed', 'waiting'].includes(order.status_code)) {
        const orderDate = new Date(order.order_date);
        const daysWaiting = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysWaiting > 3) {
            score += 15;
            reasons.push(`Menunggu > 3 hari`);
        } else if (daysWaiting > 1) {
            score += 5;
        }
    }

    // Determine priority code based on score
    let code = 'normal';
    if (score >= 80) code = 'critical';
    else if (score >= 50) code = 'high';
    else if (score < 10) code = 'low';

    const reasonText = reasons.join(', ') || 'Normal';

    await connection.execute(
      `UPDATE craft_orders 
       SET priority_score = ?, priority_code = ?, priority_reason = ? 
       WHERE id = ?`,
      [score, code, reasonText, orderId]
    );
  }

  async recalculateAllAutomaticPriorities(): Promise<void> {
    const [orders]: any = await pool.execute(
      `SELECT id FROM craft_orders 
       WHERE is_priority_manual = 0 
       AND status_code NOT IN ('completed', 'packed', 'shipped', 'cancelled', 'returned')
       AND deleted_at IS NULL`
    );

    for (const row of orders) {
      await this.calculatePriority(row.id);
    }
  }
}
