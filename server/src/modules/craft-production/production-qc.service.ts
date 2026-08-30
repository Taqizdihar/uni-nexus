import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import { asNumber } from './craft-production.helpers';
import { ProductionSyncService } from './production-sync.service';
import type { CraftContext, DbConnection, QcInspectionInput } from './craft-production.types';

const GENERIC_CHECKLIST = [
  'Dimensi sesuai',
  'Permukaan sesuai',
  'Tidak ada warping signifikan',
  'Tidak ada layer shift',
  'Warna sesuai',
  'Tidak ada cacat mayor',
];

export class ProductionQcService {
  private sync = new ProductionSyncService();

  async preparePendingInspection(connection: DbConnection, craft: CraftContext, jobId: number): Promise<number> {
    const [existing]: any = await connection.execute(
      `SELECT id FROM qc_inspections WHERE print_job_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [jobId],
    );
    if (existing.length) return Number(existing[0].id);

    const [templates]: any = await connection.execute(
      `SELECT id FROM qc_templates
       WHERE business_unit_id = ? AND is_active = 1
       ORDER BY is_default DESC, id ASC LIMIT 1`,
      [craft.id],
    );
    const templateId = templates.length ? Number(templates[0].id) : null;
    const [inserted]: any = await connection.execute(
      `INSERT INTO qc_inspections (print_job_id, template_id, result_code)
       VALUES (?, ?, 'pending')`,
      [jobId, templateId],
    );
    const inspectionId = Number(inserted.insertId);
    if (templateId) {
      const [items]: any = await connection.execute(
        `SELECT id, label FROM qc_template_items WHERE template_id = ? ORDER BY sort_order, id`,
        [templateId],
      );
      for (const item of items) {
        await connection.execute(
          `INSERT INTO qc_inspection_items (inspection_id, template_item_id, item_label)
           VALUES (?, ?, ?)`,
          [inspectionId, item.id, item.label],
        );
      }
    } else {
      for (const label of GENERIC_CHECKLIST) {
        await connection.execute(
          `INSERT INTO qc_inspection_items (inspection_id, template_item_id, item_label)
           VALUES (?, NULL, ?)`,
          [inspectionId, label],
        );
      }
    }
    return inspectionId;
  }

  async submit(jobId: number, input: QcInspectionInput, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [jobRows]: any = await connection.execute(
        `SELECT * FROM print_jobs WHERE id = ? AND business_unit_id = ? FOR UPDATE`,
        [jobId, craft.id],
      );
      if (!jobRows.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');
      const job = jobRows[0];
      if (job.status_code !== 'qc') throw new AppError(409, 'JOB_NOT_IN_QC', 'Pekerjaan tidak sedang menunggu kontrol kualitas.');
      if (input.result_code === 'pass' && input.items.some((item) => item.passed === false)) {
        throw new AppError(400, 'QC_RESULT_MISMATCH', 'Hasil Lulus tidak dapat memiliki item pemeriksaan yang gagal.');
      }

      let templateId = input.template_id ?? null;
      if (templateId) {
        const [templates]: any = await connection.execute(
          `SELECT id FROM qc_templates WHERE id = ? AND business_unit_id = ? AND is_active = 1`,
          [templateId, craft.id],
        );
        if (!templates.length) throw new AppError(400, 'INVALID_QC_TEMPLATE', 'Template QC tidak valid atau tidak aktif.');
        const suppliedTemplateItems = input.items.map((item) => item.template_item_id).filter(Boolean) as number[];
        if (suppliedTemplateItems.length) {
          const placeholders = suppliedTemplateItems.map(() => '?').join(',');
          const [validItems]: any = await connection.execute(
            `SELECT id FROM qc_template_items WHERE template_id = ? AND id IN (${placeholders})`,
            [templateId, ...suppliedTemplateItems],
          );
          if (validItems.length !== new Set(suppliedTemplateItems).size) {
            throw new AppError(400, 'INVALID_QC_TEMPLATE_ITEM', 'Salah satu item pemeriksaan bukan bagian dari template yang dipilih.');
          }
        }
      }

      let inspectionId = await this.preparePendingInspection(connection, craft, jobId);
      const [inspectionRows]: any = await connection.execute(
        `SELECT id, result_code, template_id FROM qc_inspections WHERE id = ? FOR UPDATE`,
        [inspectionId],
      );
      if (inspectionRows[0].result_code !== 'pending') {
        throw new AppError(409, 'QC_ALREADY_SUBMITTED', 'Hasil QC pekerjaan ini sudah dicatat.');
      }
      if (templateId === null && inspectionRows[0].template_id) templateId = Number(inspectionRows[0].template_id);
      await connection.execute(`DELETE FROM qc_inspection_items WHERE inspection_id = ?`, [inspectionId]);
      for (const item of input.items) {
        await connection.execute(
          `INSERT INTO qc_inspection_items (
            inspection_id, template_item_id, item_label, value_text, passed, notes
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            inspectionId, item.template_item_id ?? null, item.item_label,
            item.value_text ?? null, item.passed === undefined || item.passed === null ? null : (item.passed ? 1 : 0),
            item.notes ?? null,
          ],
        );
      }
      await connection.execute(
        `UPDATE qc_inspections SET template_id = ?, inspector_user_id = ?, result_code = ?,
          notes = ?, inspected_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [templateId, userId, input.result_code, input.notes ?? null, inspectionId],
      );

      if (input.result_code === 'pass' || input.result_code === 'conditional') {
        await connection.execute(`UPDATE print_jobs SET status_code = 'completed' WHERE id = ?`, [jobId]);
        await this.sync.addJobHistory(
          connection, jobId, 'qc', 'completed', userId,
          input.result_code === 'conditional' ? input.notes ?? 'QC diterima bersyarat.' : input.notes ?? 'QC lulus.', 100,
        );
        await this.sync.refreshQueueState(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
        await this.sync.completeOrderWhenFulfilled(connection, job.order_id ? Number(job.order_id) : null, userId);
        await this.sync.audit(
          connection, craft, userId, 'production.qc_pass', jobId, job.job_code,
          input.result_code === 'conditional' ? `${job.job_code} diterima dengan syarat QC.` : `${job.job_code} lulus QC.`,
          { status_code: 'qc', result_code: 'pending' },
          { status_code: 'completed', result_code: input.result_code, inspection_id: inspectionId },
        );
        await connection.commit();
        return { inspection_id: inspectionId, message: input.result_code === 'conditional' ? 'QC bersyarat diterima dan pekerjaan selesai.' : 'QC lulus dan pekerjaan selesai.' };
      }

      await connection.execute(`UPDATE print_jobs SET status_code = 'failed' WHERE id = ?`, [jobId]);
      const [failureResult]: any = await connection.execute(
        `INSERT INTO print_failures (
          print_job_id, failure_type, failure_stage, description,
          requires_reprint, reported_by, occurred_at
        ) VALUES (?, 'other', 'qc', ?, ?, ?, CURRENT_TIMESTAMP(3))`,
        [jobId, input.notes || 'Pekerjaan gagal pada pemeriksaan kontrol kualitas.', input.requires_reprint === false ? 0 : 1, userId],
      );
      const failureId = Number(failureResult.insertId);
      await this.sync.addJobHistory(connection, jobId, 'qc', 'failed', userId, input.notes ?? 'QC gagal.', 100);
      if (input.requires_reprint === false) await this.sync.cancelQueueRequirement(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      else await this.sync.refreshQueueState(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      await this.sync.audit(connection, craft, userId, 'production.qc_fail', jobId, job.job_code, `${job.job_code} gagal QC.`, { status_code: 'qc', result_code: 'pending' }, { status_code: 'failed', result_code: 'fail', failure_id: failureId });
      await this.sync.audit(connection, craft, userId, 'production.failure', jobId, job.job_code, `Kegagalan QC dicatat untuk ${job.job_code}.`, undefined, { failure_id: failureId, failure_stage: 'qc' });
      await domainEvents.publish(connection as any, {
        eventKey: `production.job_failed:qc:${failureId}`, eventName: 'production.job_failed', moduleCode: 'craft_production',
        organizationId: craft.organizationId, businessUnitId: craft.id, entityType: 'print_job', entityId: jobId, entityCode: job.job_code, actorUserId: userId,
        payload: { context: { production: { id: jobId, job_code: job.job_code, status_code: 'failed', failure_id: failureId, failure_type: 'qc_failed', requires_reprint: input.requires_reprint !== false } } },
      });
      await connection.commit();
      return { inspection_id: inspectionId, failure_id: failureId, message: 'QC gagal dan pekerjaan dicatat sebagai cetak gagal.' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
