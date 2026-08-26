import { AppError } from '../../shared/errors/AppError';
import { addMinutes, toMysqlDateTime } from './craft-production.helpers';
import type { CraftContext, DbConnection } from './craft-production.types';

export class ProductionSchedulerService {
  private async refreshQueueSchedule(connection: DbConnection, queueItemId: number | null) {
    if (!queueItemId) return;
    await connection.execute(
      `UPDATE production_queue_items pqi
       LEFT JOIN (
         SELECT queue_item_id, MIN(scheduled_start_at) AS first_start_at,
                MAX(COALESCE(
                  estimated_finish_at,
                  DATE_ADD(scheduled_start_at, INTERVAL COALESCE(estimated_print_minutes, 1) MINUTE)
                )) AS last_end_at
         FROM print_jobs
         WHERE queue_item_id = ? AND scheduled_start_at IS NOT NULL
           AND status_code NOT IN ('failed', 'cancelled')
         GROUP BY queue_item_id
       ) aggregate_schedule ON aggregate_schedule.queue_item_id = pqi.id
       SET pqi.scheduled_start_at = aggregate_schedule.first_start_at,
           pqi.scheduled_end_at = aggregate_schedule.last_end_at
       WHERE pqi.id = ?`,
      [queueItemId, queueItemId],
    );
  }

  async assertNoConflict(
    connection: DbConnection,
    jobId: number,
    printerId: number,
    startAt: string,
    endAt: string,
  ) {
    const [rows]: any = await connection.execute(
      `SELECT id, job_code, job_name, scheduled_start_at, estimated_finish_at
       FROM print_jobs
       WHERE printer_id = ? AND id <> ?
         AND status_code IN ('queued', 'ready', 'printing', 'paused')
         AND scheduled_start_at IS NOT NULL
         AND scheduled_start_at < ?
         AND COALESCE(
           estimated_finish_at,
           DATE_ADD(scheduled_start_at, INTERVAL COALESCE(estimated_print_minutes, 1) MINUTE)
         ) > ?
       ORDER BY scheduled_start_at ASC
       LIMIT 1 FOR UPDATE`,
      [printerId, jobId, endAt, startAt],
    );
    if (rows.length) {
      throw new AppError(409, 'PRINTER_SCHEDULE_CONFLICT', 'Jadwal bertabrakan dengan pekerjaan lain pada printer yang sama.', {
        conflicting_job: rows[0],
      });
    }
  }

  async schedule(
    connection: DbConnection,
    craft: CraftContext,
    job: { id: number; job_code: string; job_name: string; printer_id: number; queue_item_id: number | null },
    scheduledStart: string,
    estimatedMinutes: number,
    userId: number,
  ) {
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0) {
      throw new AppError(400, 'SCHEDULE_DURATION_REQUIRED', 'Estimasi waktu cetak diperlukan untuk membuat jadwal.');
    }
    const startAt = toMysqlDateTime(scheduledStart);
    const endAt = addMinutes(scheduledStart, estimatedMinutes);
    await this.assertNoConflict(connection, job.id, job.printer_id, startAt, endAt);
    await connection.execute(
      `UPDATE print_jobs
       SET scheduled_start_at = ?, estimated_print_minutes = ?, estimated_finish_at = ?
       WHERE id = ?`,
      [startAt, estimatedMinutes, endAt, job.id],
    );
    if (job.queue_item_id) {
      await connection.execute(
        `UPDATE production_queue_items
         SET status_code = IF(status_code = 'queued', 'scheduled', status_code)
         WHERE id = ?`,
        [job.queue_item_id],
      );
      await this.refreshQueueSchedule(connection, job.queue_item_id);
    }

    const [events]: any = await connection.execute(
      `SELECT id FROM calendar_events WHERE source_type = 'print_job' AND source_id = ? ORDER BY id FOR UPDATE`,
      [job.id],
    );
    const values = [
      craft.organizationId, craft.id, `${job.job_code} - ${job.job_name}`, startAt, endAt, userId,
    ];
    if (events.length) {
      await connection.execute(
        `UPDATE calendar_events SET organization_id = ?, business_unit_id = ?, title = ?,
          event_type = 'production', start_at = ?, end_at = ?, all_day = 0, created_by = ?
         WHERE id = ?`,
        [...values, events[0].id],
      );
      await connection.execute(
        `DELETE FROM calendar_events WHERE source_type = 'print_job' AND source_id = ? AND id <> ?`,
        [job.id, events[0].id],
      );
    } else {
      await connection.execute(
        `INSERT INTO calendar_events (
          organization_id, business_unit_id, title, event_type, start_at, end_at,
          all_day, source_type, source_id, created_by
        ) VALUES (?, ?, ?, 'production', ?, ?, 0, 'print_job', ?, ?)`,
        [craft.organizationId, craft.id, `${job.job_code} - ${job.job_name}`, startAt, endAt, job.id, userId],
      );
    }
    return { scheduled_start_at: startAt, scheduled_end_at: endAt };
  }

  async clearSchedule(connection: DbConnection, jobId: number, queueItemId: number | null) {
    await connection.execute(
      `UPDATE print_jobs SET scheduled_start_at = NULL, estimated_finish_at = NULL WHERE id = ?`,
      [jobId],
    );
    await this.refreshQueueSchedule(connection, queueItemId);
    await connection.execute(`DELETE FROM calendar_events WHERE source_type = 'print_job' AND source_id = ?`, [jobId]);
  }
}
