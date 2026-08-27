import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { paddedCode, temporaryCode } from './craft-production.helpers';
import { ProductionJobsService } from './production-jobs.service';
import { ProductionMaterialsService } from './production-materials.service';
import { ProductionSyncService } from './production-sync.service';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { CraftContext, CreatePrintJobInput, FailPrintInput } from './craft-production.types';

export class ProductionFailuresService {
  private jobs = new ProductionJobsService();
  private materials = new ProductionMaterialsService();
  private sync = new ProductionSyncService();

  async fail(jobId: number, input: FailPrintInput, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [initial]: any = await connection.execute(
        `SELECT printer_id FROM print_jobs WHERE id = ? AND business_unit_id = ?`,
        [jobId, craft.id],
      );
      if (!initial.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');
      const [printerRows]: any = await connection.execute(
        `SELECT id, name, status_code, is_active, deleted_at
         FROM printers WHERE id = ? AND business_unit_id = ? FOR UPDATE`,
        [initial[0].printer_id, craft.id],
      );
      if (!printerRows.length) throw new AppError(409, 'PRINTER_NOT_FOUND', 'Printer pekerjaan tidak ditemukan.');
      const printer = printerRows[0];
      const [jobRows]: any = await connection.execute(
        `SELECT * FROM print_jobs WHERE id = ? AND business_unit_id = ? FOR UPDATE`,
        [jobId, craft.id],
      );
      const job = jobRows[0];
      if (!['printing', 'paused'].includes(job.status_code)) {
        throw new AppError(409, 'JOB_NOT_FAILABLE', 'Kegagalan hanya dapat dilaporkan saat pekerjaan mencetak atau dijeda.');
      }
      if (printer.status_code !== 'busy') throw new AppError(409, 'PRINTER_STATE_CONFLICT', 'Status printer tidak konsisten dengan pekerjaan aktif.');

      const [elapsedRows]: any = await connection.execute(
        `SELECT GREATEST(0, TIMESTAMPDIFF(MINUTE, started_at, CURRENT_TIMESTAMP(3))) AS elapsed FROM print_jobs WHERE id = ?`,
        [jobId],
      );
      const actualMinutes = Number(elapsedRows[0].elapsed || 0);
      const wastedGrams = Number(input.material_wasted_qty || 0);
      const wasteCost = await this.materials.recordFailureWaste(
        connection, craft, jobId, job.job_code, wastedGrams,
        input.material_id ?? null, input.batch_id ?? null, userId, input.description,
      );
      const [failureResult]: any = await connection.execute(
        `INSERT INTO print_failures (
          print_job_id, failure_type, failure_stage, description, material_wasted_g,
          estimated_loss, requires_reprint, reported_by, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
        [
          jobId, input.failure_type, input.failure_stage, input.description,
          input.material_wasted_qty ?? null, input.estimated_loss ?? null,
          input.requires_reprint ? 1 : 0, userId,
        ],
      );
      const failureId = Number(failureResult.insertId);
      let printerStatus = 'available';
      if (input.printer_has_issue) {
        const [issueResult]: any = await connection.execute(
          `INSERT INTO printer_issues (
            printer_id, issue_code, title, severity_code, status_code,
            description, reported_by, reported_at
          ) VALUES (?, ?, ?, 'high', 'open', ?, ?, CURRENT_TIMESTAMP(3))`,
          [printer.id, temporaryCode('ISS'), `Masalah saat ${job.job_code}`, input.description, userId],
        );
        const issueCode = paddedCode('ISS', Number(issueResult.insertId));
        await connection.execute(`UPDATE printer_issues SET issue_code = ? WHERE id = ?`, [issueCode, issueResult.insertId]);
        printerStatus = 'error';
      }
      await connection.execute(
        `UPDATE print_jobs SET status_code = 'failed', finished_at = CURRENT_TIMESTAMP(3),
          actual_print_minutes = ?, actual_material_g = ?, actual_cost = COALESCE(actual_cost, 0) + ?
         WHERE id = ?`,
        [actualMinutes, input.material_wasted_qty ?? null, wasteCost, jobId],
      );
      await connection.execute(
        `UPDATE printers SET status_code = ?, total_print_hours = total_print_hours + ? WHERE id = ?`,
        [printerStatus, actualMinutes / 60, printer.id],
      );
      await connection.execute(`DELETE FROM calendar_events WHERE source_type = 'print_job' AND source_id = ?`, [jobId]);
      if (input.requires_reprint) await this.sync.refreshQueueState(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      else await this.sync.cancelQueueRequirement(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      await this.sync.addJobHistory(connection, jobId, job.status_code, 'failed', userId, input.description, Number(job.progress_percent));
      await this.sync.audit(
        connection, craft, userId, 'production.failure', jobId, job.job_code,
        `${job.job_code} gagal: ${input.failure_type}.`,
        { status_code: job.status_code, printer_status: 'busy' },
        { status_code: 'failed', printer_status: printerStatus, failure_id: failureId, material_wasted_g: input.material_wasted_qty ?? null },
      );
      await this.sync.notify(connection, craft, 'production_failure', 'error', 'Cetak gagal', `${job.job_code} gagal: ${input.description}`, jobId);
      await domainEvents.publish(connection, {
        eventKey: `production.job_failed:${failureId}`, eventName: 'production.job_failed', moduleCode: 'craft_production',
        organizationId: craft.organizationId, businessUnitId: craft.id, entityType: 'print_job', entityId: jobId, entityCode: job.job_code, actorUserId: userId,
        payload: { context: { production: { id: jobId, job_code: job.job_code, status_code: 'failed', failure_id: failureId, failure_type: input.failure_type, requires_reprint: Boolean(input.requires_reprint) } } },
      });
      await connection.commit();
      return { failure_id: failureId, message: 'Kegagalan cetak berhasil dicatat.' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createReprint(failureId: number, input: CreatePrintJobInput, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [failureRows]: any = await connection.execute(
        `SELECT pf.id, pf.requires_reprint, pf.reprint_job_id,
                pj.id AS original_job_id, pj.job_code AS original_job_code, pj.job_name,
                pj.queue_item_id, pj.product_id, pj.variant_id, pj.quantity,
                pj.print_profile_id, pj.design_file_id
         FROM print_failures pf
         JOIN print_jobs pj ON pj.id = pf.print_job_id
         WHERE pf.id = ? AND pj.business_unit_id = ? FOR UPDATE`,
        [failureId, craft.id],
      );
      if (!failureRows.length) throw new NotFoundError('Catatan kegagalan tidak ditemukan.');
      const failure = failureRows[0];
      if (!failure.requires_reprint) throw new AppError(409, 'REPRINT_NOT_REQUIRED', 'Catatan kegagalan ini tidak memerlukan reprint.');
      if (failure.reprint_job_id) throw new AppError(409, 'REPRINT_ALREADY_CREATED', 'Reprint untuk kegagalan ini sudah dibuat.', { reprint_job_id: Number(failure.reprint_job_id) });

      const reprintInput: CreatePrintJobInput = {
        ...input,
        queue_item_id: failure.queue_item_id ? Number(failure.queue_item_id) : null,
        product_id: failure.product_id ? Number(failure.product_id) : input.product_id ?? null,
        variant_id: failure.variant_id ? Number(failure.variant_id) : input.variant_id ?? null,
        job_name: input.job_name || `${failure.job_name} (Reprint)`,
        quantity: input.quantity || Number(failure.quantity),
        print_profile_id: input.print_profile_id ?? (failure.print_profile_id ? Number(failure.print_profile_id) : null),
        design_file_id: input.design_file_id ?? (failure.design_file_id ? Number(failure.design_file_id) : null),
      };
      const created = await this.jobs.createJobWithinTransaction(connection, reprintInput, userId, craft);
      const [updated]: any = await connection.execute(
        `UPDATE print_failures SET reprint_job_id = ? WHERE id = ? AND reprint_job_id IS NULL`,
        [created.id, failureId],
      );
      if (!updated.affectedRows) throw new AppError(409, 'REPRINT_ALREADY_CREATED', 'Reprint dibuat oleh permintaan lain.');
      await this.sync.audit(
        connection, craft, userId, 'production.reprint', created.id, created.job_code,
        `${created.job_code} dibuat sebagai reprint dari ${failure.original_job_code}.`,
        { original_job_id: Number(failure.original_job_id), failure_id: failureId },
        { reprint_job_id: created.id },
      );
      await connection.commit();
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
