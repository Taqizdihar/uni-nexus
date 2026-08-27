import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { asNumber, paddedCode, temporaryCode, toMysqlDateTime } from './craft-production.helpers';
import { ProductionMaterialsService } from './production-materials.service';
import { ProductionQcService } from './production-qc.service';
import { ProductionSchedulerService } from './production-scheduler.service';
import { ProductionSyncService } from './production-sync.service';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type {
  CraftContext,
  CreatePrintJobInput,
  DbConnection,
  FinishPrintInput,
  PrintJobStatus,
  UpdatePrintJobPlanningInput,
} from './craft-production.types';

export class ProductionJobsService {
  private materials = new ProductionMaterialsService();
  private scheduler = new ProductionSchedulerService();
  private sync = new ProductionSyncService();
  private qc = new ProductionQcService();

  private async getPrinter(connection: DbConnection, printerId: number, businessUnitId: number, lock = false) {
    const [rows]: any = await connection.execute(
      `SELECT id, code, name, status_code, is_active, deleted_at
       FROM printers WHERE id = ? AND business_unit_id = ? ${lock ? 'FOR UPDATE' : ''}`,
      [printerId, businessUnitId],
    );
    if (!rows.length || !rows[0].is_active || rows[0].deleted_at) {
      throw new AppError(400, 'INVALID_PRINTER', 'Printer tidak valid atau tidak aktif.');
    }
    return rows[0];
  }

  private async assertOperator(connection: DbConnection, userId: number, businessUnitId: number) {
    const [rows]: any = await connection.execute(
      `SELECT u.id FROM users u
       JOIN user_business_units ubu ON ubu.user_id = u.id AND ubu.business_unit_id = ? AND ubu.can_access = 1
       WHERE u.id = ? AND u.status_code = 'active' AND u.approval_status_code = 'approved'
         AND u.deleted_at IS NULL LIMIT 1`,
      [businessUnitId, userId],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_OPERATOR', 'Operator tidak valid atau tidak aktif untuk Craft.');
  }

  private async resolveSource(
    connection: DbConnection,
    input: CreatePrintJobInput,
    businessUnitId: number,
  ) {
    if (!input.queue_item_id) {
      if (input.variant_id && !input.product_id) {
        throw new AppError(400, 'PRODUCT_REQUIRED_FOR_VARIANT', 'Produk wajib dipilih ketika varian dipilih.');
      }
      if (input.product_id) {
        const [products]: any = await connection.execute(
          `SELECT id FROM products WHERE id = ? AND business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL`,
          [input.product_id, businessUnitId],
        );
        if (!products.length) throw new AppError(400, 'INVALID_PRODUCT', 'Produk internal tidak valid.');
      }
      if (input.variant_id) {
        const [variants]: any = await connection.execute(
          `SELECT id FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1`,
          [input.variant_id, input.product_id as number],
        );
        if (!variants.length) throw new AppError(400, 'INVALID_VARIANT', 'Varian internal tidak valid.');
      }
      return {
        queue_item_id: null, order_id: null, order_item_id: null,
        product_id: input.product_id ?? null, variant_id: input.variant_id ?? null,
        item_name: input.job_name, item_quantity: null,
        item_estimated_print_minutes: null, item_estimated_material_g: null,
        item_print_profile_id: null,
      };
    }

    const [queueRows]: any = await connection.execute(
      `SELECT id, order_id, order_item_id, status_code
       FROM production_queue_items
       WHERE id = ? AND business_unit_id = ? FOR UPDATE`,
      [input.queue_item_id, businessUnitId],
    );
    if (!queueRows.length) throw new NotFoundError('Item antrean produksi tidak ditemukan.');
    if (['completed', 'done', 'cancelled'].includes(queueRows[0].status_code)) {
      throw new AppError(409, 'QUEUE_ITEM_CLOSED', 'Item antrean ini sudah selesai atau dibatalkan.');
    }
    const [sourceRows]: any = await connection.execute(
      `SELECT coi.id AS order_item_id, coi.order_id, coi.product_id, coi.variant_id,
              coi.item_name, coi.quantity AS item_quantity,
              coi.estimated_print_minutes AS item_estimated_print_minutes,
              coi.estimated_material_g AS item_estimated_material_g,
              coi.print_profile_id AS item_print_profile_id,
              o.status_code AS order_status
       FROM craft_order_items coi
       JOIN craft_orders o ON o.id = coi.order_id AND o.business_unit_id = ? AND o.deleted_at IS NULL
       WHERE coi.id = ? AND coi.order_id = ? FOR UPDATE`,
      [businessUnitId, queueRows[0].order_item_id, queueRows[0].order_id],
    );
    if (!sourceRows.length) throw new AppError(409, 'QUEUE_SOURCE_MISSING', 'Pesanan atau item asal antrean tidak ditemukan.');
    if (['cancelled', 'returned'].includes(sourceRows[0].order_status)) {
      throw new AppError(409, 'ORDER_NOT_PRODUCIBLE', 'Pesanan asal tidak lagi dapat diproduksi.');
    }

    const [jobRows]: any = await connection.execute(
      `SELECT id, quantity, status_code FROM print_jobs WHERE order_item_id = ? FOR UPDATE`,
      [sourceRows[0].order_item_id],
    );
    let committed = 0;
    for (const job of jobRows) {
      if (!['failed', 'cancelled'].includes(job.status_code)) committed += asNumber(job.quantity);
    }
    const required = asNumber(sourceRows[0].item_quantity);
    if (committed + input.quantity > required + 0.0001) {
      throw new AppError(409, 'JOB_QUANTITY_EXCEEDS_REMAINING', 'Kuantitas pekerjaan melebihi sisa kebutuhan item pesanan.', {
        required_quantity: required,
        committed_quantity: committed,
        remaining_quantity: Math.max(0, required - committed),
        requested_quantity: input.quantity,
      });
    }
    return {
      queue_item_id: Number(queueRows[0].id), order_id: Number(sourceRows[0].order_id),
      order_item_id: Number(sourceRows[0].order_item_id),
      product_id: sourceRows[0].product_id ? Number(sourceRows[0].product_id) : null,
      variant_id: sourceRows[0].variant_id ? Number(sourceRows[0].variant_id) : null,
      item_name: sourceRows[0].item_name, item_quantity: required,
      item_estimated_print_minutes: sourceRows[0].item_estimated_print_minutes === null ? null : Number(sourceRows[0].item_estimated_print_minutes),
      item_estimated_material_g: sourceRows[0].item_estimated_material_g === null ? null : Number(sourceRows[0].item_estimated_material_g),
      item_print_profile_id: sourceRows[0].item_print_profile_id ? Number(sourceRows[0].item_print_profile_id) : null,
    };
  }

  private async resolveProfileAndDesign(
    connection: DbConnection,
    input: CreatePrintJobInput,
    source: any,
    craft: CraftContext,
  ) {
    const profileId = input.print_profile_id ?? source.item_print_profile_id ?? null;
    let profile: any = null;
    if (profileId) {
      const [rows]: any = await connection.execute(
        `SELECT id, product_id, variant_id, printer_id, estimated_print_minutes, estimated_material_qty,
                estimated_material_unit_id
         FROM print_profiles WHERE id = ? AND business_unit_id = ?`,
        [profileId, craft.id],
      );
      if (!rows.length) throw new AppError(400, 'INVALID_PRINT_PROFILE', 'Profil cetak tidak valid untuk Craft.');
      profile = rows[0];
      if ((profile.product_id && source.product_id && Number(profile.product_id) !== source.product_id)
        || (profile.variant_id && source.variant_id && Number(profile.variant_id) !== source.variant_id)
        || (profile.printer_id && Number(profile.printer_id) !== input.printer_id)) {
        throw new AppError(400, 'PRINT_PROFILE_MISMATCH', 'Profil cetak tidak sesuai dengan produk, varian, atau printer pekerjaan.');
      }
    }
    if (input.design_file_id) {
      const [rows]: any = await connection.execute(
        `SELECT id, product_id, variant_id FROM design_files WHERE id = ? AND business_unit_id = ?`,
        [input.design_file_id, craft.id],
      );
      if (!rows.length) throw new AppError(400, 'INVALID_DESIGN_FILE', 'File desain tidak valid untuk Craft.');
      const design = rows[0];
      if ((design.product_id && source.product_id && Number(design.product_id) !== source.product_id)
        || (design.variant_id && source.variant_id && Number(design.variant_id) !== source.variant_id)) {
        throw new AppError(400, 'DESIGN_FILE_MISMATCH', 'File desain tidak sesuai dengan produk atau varian pekerjaan.');
      }
    }
    return { profileId, profile };
  }

  async createJob(input: CreatePrintJobInput, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await this.createJobWithinTransaction(connection, input, userId, craft);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createJobWithinTransaction(
    connection: DbConnection,
    input: CreatePrintJobInput,
    userId: number,
    craft: CraftContext,
    auditAction = 'production.job_create',
  ) {
    // Scheduling is serialized on the printer row so two concurrent creates cannot
    // both observe an empty interval and reserve the same printer/time window.
    await this.getPrinter(connection, input.printer_id, craft.id, Boolean(input.scheduled_start_at));
    if (input.operator_user_id) await this.assertOperator(connection, input.operator_user_id, craft.id);
    const source = await this.resolveSource(connection, input, craft.id);
    const { profileId, profile } = await this.resolveProfileAndDesign(connection, input, source, craft);
    const estimatedMinutes = input.estimated_print_minutes
      ?? (profile?.estimated_print_minutes ? Number(profile.estimated_print_minutes) * input.quantity : null)
      ?? (source.item_estimated_print_minutes ? source.item_estimated_print_minutes * input.quantity : null);
    const estimatedMaterial = input.estimated_material_g
      ?? (source.item_estimated_material_g ? source.item_estimated_material_g * input.quantity : null);

    const [inserted]: any = await connection.execute(
      `INSERT INTO print_jobs (
        business_unit_id, job_code, queue_item_id, order_id, order_item_id, product_id, variant_id,
        printer_id, print_profile_id, design_file_id, job_name, quantity, status_code,
        estimated_print_minutes, estimated_material_g, operator_user_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`,
      [
        craft.id, temporaryCode('JOB'), source.queue_item_id, source.order_id, source.order_item_id,
        source.product_id, source.variant_id, input.printer_id, profileId, input.design_file_id ?? null,
        input.job_name, input.quantity, estimatedMinutes, estimatedMaterial,
        input.operator_user_id ?? null, input.notes ?? null,
      ],
    );
    const jobId = Number(inserted.insertId);
    const jobCode = paddedCode('JOB', jobId);
    await connection.execute(`UPDATE print_jobs SET job_code = ? WHERE id = ?`, [jobCode, jobId]);
    await this.materials.planMaterials(connection, craft, jobId, jobCode, input.materials || [], userId);

    const [materialTotals]: any = await connection.execute(
      `SELECT SUM(pjm.planned_qty * COALESCE(pjm.unit_cost, 0)) AS estimated_cost,
              SUM(CASE UPPER(u.code) WHEN 'G' THEN pjm.planned_qty WHEN 'KG' THEN pjm.planned_qty * 1000
                    WHEN 'MG' THEN pjm.planned_qty / 1000 ELSE 0 END) AS estimated_grams,
              SUM(CASE WHEN UPPER(u.code) IN ('G','KG','MG') THEN 1 ELSE 0 END) AS weight_rows
       FROM print_job_materials pjm JOIN units_of_measure u ON u.id = pjm.unit_id
       WHERE pjm.print_job_id = ?`,
      [jobId],
    );
    const materialCost = materialTotals[0].estimated_cost === null ? null : Number(materialTotals[0].estimated_cost);
    const trackedEstimate = Number(materialTotals[0].weight_rows) > 0 ? Number(materialTotals[0].estimated_grams) : null;
    await connection.execute(
      `UPDATE print_jobs SET estimated_cost = ?, estimated_material_g = COALESCE(estimated_material_g, ?) WHERE id = ?`,
      [materialCost, trackedEstimate, jobId],
    );

    if (source.queue_item_id) {
      await connection.execute(
        `UPDATE production_queue_items SET status_code = 'scheduled' WHERE id = ? AND status_code NOT IN ('printing','completed','cancelled')`,
        [source.queue_item_id],
      );
    }
    await this.sync.addJobHistory(connection, jobId, null, 'queued', userId, 'Pekerjaan cetak dibuat.', 0);
    await this.sync.audit(
      connection, craft, userId, auditAction, jobId, jobCode,
      `${jobCode} dibuat${source.order_id ? ' dari antrean pesanan' : ' sebagai pekerjaan internal'}.`,
      undefined, { status_code: 'queued', quantity: input.quantity, printer_id: input.printer_id },
    );

    if (input.scheduled_start_at) {
      if (!estimatedMinutes) throw new AppError(400, 'SCHEDULE_DURATION_REQUIRED', 'Estimasi waktu cetak diperlukan untuk jadwal pekerjaan.');
      const scheduled = await this.scheduler.schedule(
        connection, craft,
        { id: jobId, job_code: jobCode, job_name: input.job_name, printer_id: input.printer_id, queue_item_id: source.queue_item_id },
        input.scheduled_start_at, estimatedMinutes, userId,
      );
      await this.sync.audit(
        connection, craft, userId, 'production.job_schedule', jobId, jobCode,
        `Jadwal ${jobCode} ditetapkan.`, undefined, scheduled,
      );
    }
    // Printer and positive quantity are mandatory in this schema. Optional design
    // or material links are warnings, so a successfully planned job is immediately ready.
    await connection.execute(`UPDATE print_jobs SET status_code = 'ready' WHERE id = ?`, [jobId]);
    await this.sync.addJobHistory(connection, jobId, 'queued', 'ready', userId, 'Persyaratan minimum pekerjaan terpenuhi.', 0);
    await this.sync.audit(
      connection, craft, userId, 'production.job_ready', jobId, jobCode,
      `${jobCode} siap dicetak.`, { status_code: 'queued' }, { status_code: 'ready' },
    );
    await domainEvents.publish(connection, {
      eventKey: `production.job_created:${jobId}`, eventName: 'production.job_created', moduleCode: 'craft_production',
      organizationId: craft.organizationId, businessUnitId: craft.id, entityType: 'print_job', entityId: jobId, entityCode: jobCode, actorUserId: userId,
      payload: { context: { production: { id: jobId, job_code: jobCode, status_code: 'ready', order_id: source.order_id, queue_item_id: source.queue_item_id } } },
    });
    return { id: jobId, job_code: jobCode, status_code: 'ready' as PrintJobStatus };
  }

  private async lockJob(connection: DbConnection, id: number, craft: CraftContext) {
    const [rows]: any = await connection.execute(
      `SELECT * FROM print_jobs WHERE id = ? AND business_unit_id = ? FOR UPDATE`,
      [id, craft.id],
    );
    if (!rows.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');
    return rows[0];
  }

  private async lockPrinterAndJob(connection: DbConnection, id: number, craft: CraftContext) {
    const [initial]: any = await connection.execute(
      `SELECT printer_id FROM print_jobs WHERE id = ? AND business_unit_id = ?`,
      [id, craft.id],
    );
    if (!initial.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');
    const printer = await this.getPrinter(connection, Number(initial[0].printer_id), craft.id, true);
    const job = await this.lockJob(connection, id, craft);
    return { printer, job };
  }

  private async lockPlanningJobAndPrinters(
    connection: DbConnection,
    id: number,
    requestedPrinterId: number | undefined,
    craft: CraftContext,
  ) {
    const [initialRows]: any = await connection.execute(
      `SELECT printer_id FROM print_jobs WHERE id = ? AND business_unit_id = ?`,
      [id, craft.id],
    );
    if (!initialRows.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');

    const initialPrinterId = Number(initialRows[0].printer_id);
    const targetPrinterId = requestedPrinterId ?? initialPrinterId;
    const printerIds = [...new Set([initialPrinterId, targetPrinterId])].sort((a, b) => a - b);
    const placeholders = printerIds.map(() => '?').join(', ');
    const [printerRows]: any = await connection.execute(
      `SELECT id, business_unit_id, code, name, status_code, is_active, deleted_at
       FROM printers WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
      printerIds,
    );
    const targetPrinter = printerRows.find((printer: any) => Number(printer.id) === targetPrinterId);
    if (!targetPrinter
      || Number(targetPrinter.business_unit_id) !== craft.id
      || !targetPrinter.is_active
      || targetPrinter.deleted_at) {
      throw new AppError(400, 'INVALID_PRINTER', 'Printer tidak valid atau tidak aktif untuk Craft.');
    }

    const job = await this.lockJob(connection, id, craft);
    if (Number(job.printer_id) !== initialPrinterId) {
      throw new AppError(409, 'JOB_PLANNING_CHANGED', 'Perencanaan pekerjaan berubah secara bersamaan. Muat ulang data lalu coba lagi.');
    }
    return { job, targetPrinterId };
  }

  async updatePlanning(
    id: number,
    input: UpdatePrintJobPlanningInput,
    userId: number,
    craft: CraftContext,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const has = (key: keyof UpdatePrintJobPlanningInput) => Object.prototype.hasOwnProperty.call(input, key);
      const { job, targetPrinterId } = await this.lockPlanningJobAndPrinters(
        connection,
        id,
        has('printer_id') ? input.printer_id : undefined,
        craft,
      );
      if (!['queued', 'ready'].includes(job.status_code)) {
        throw new AppError(409, 'JOB_PLANNING_LOCKED', 'Perencanaan hanya dapat diedit saat pekerjaan Menunggu atau Siap.');
      }

      const operatorUserId = has('operator_user_id')
        ? input.operator_user_id ?? null
        : job.operator_user_id === null ? null : Number(job.operator_user_id);
      if (operatorUserId) await this.assertOperator(connection, operatorUserId, craft.id);

      const jobName = has('job_name') ? input.job_name as string : String(job.job_name);
      const printProfileId = has('print_profile_id')
        ? input.print_profile_id ?? null
        : job.print_profile_id === null ? null : Number(job.print_profile_id);
      const designFileId = has('design_file_id')
        ? input.design_file_id ?? null
        : job.design_file_id === null ? null : Number(job.design_file_id);
      const source = {
        queue_item_id: job.queue_item_id === null ? null : Number(job.queue_item_id),
        order_id: job.order_id === null ? null : Number(job.order_id),
        order_item_id: job.order_item_id === null ? null : Number(job.order_item_id),
        product_id: job.product_id === null ? null : Number(job.product_id),
        variant_id: job.variant_id === null ? null : Number(job.variant_id),
        item_name: jobName,
        item_quantity: asNumber(job.quantity),
        item_estimated_print_minutes: null,
        item_estimated_material_g: null,
        item_print_profile_id: null,
      };
      const planningInput: CreatePrintJobInput = {
        queue_item_id: source.queue_item_id,
        product_id: source.product_id,
        variant_id: source.variant_id,
        printer_id: targetPrinterId,
        job_name: jobName,
        quantity: asNumber(job.quantity),
        operator_user_id: operatorUserId,
        scheduled_start_at: has('scheduled_start_at') ? input.scheduled_start_at ?? null : null,
        print_profile_id: printProfileId,
        design_file_id: designFileId,
        estimated_print_minutes: has('estimated_print_minutes') ? input.estimated_print_minutes ?? null : null,
        estimated_material_g: has('estimated_material_g') ? input.estimated_material_g ?? null : null,
        notes: has('notes') ? input.notes ?? null : job.notes,
        materials: input.materials || [],
      };
      const { profileId, profile } = await this.resolveProfileAndDesign(connection, planningInput, source, craft);

      let estimatedMinutes = has('estimated_print_minutes')
        ? input.estimated_print_minutes ?? null
        : job.estimated_print_minutes === null ? null : Number(job.estimated_print_minutes);
      if (!has('estimated_print_minutes') && has('print_profile_id')
        && profile && profile.estimated_print_minutes !== null) {
        estimatedMinutes = Number(profile.estimated_print_minutes) * asNumber(job.quantity);
      }
      let estimatedMaterial = has('estimated_material_g')
        ? input.estimated_material_g ?? null
        : job.estimated_material_g === null ? null : Number(job.estimated_material_g);
      let estimatedCost = job.estimated_cost === null ? null : Number(job.estimated_cost);

      const [oldMaterialRows]: any = has('materials')
        ? await connection.execute(
          `SELECT material_id, material_batch_id, planned_qty, unit_id, reservation_id, actual_qty
           FROM print_job_materials WHERE print_job_id = ? ORDER BY id FOR UPDATE`,
          [id],
        )
        : [[]];
      if (has('materials')) {
        const materialBatchIds = [...new Set([
          ...oldMaterialRows.map((row: any) => row.material_batch_id === null ? null : Number(row.material_batch_id)),
          ...(input.materials || []).map((material) => material.material_batch_id ?? null),
        ].filter((batchId): batchId is number => batchId !== null))].sort((a, b) => a - b);
        const automaticMaterialIds = [...new Set((input.materials || []).flatMap((material) =>
          !material.material_batch_id && material.reserve !== false ? [material.material_id] : [],
        ))];
        const batchLockConditions: string[] = [];
        const batchLockParams: number[] = [];
        if (materialBatchIds.length) {
          batchLockConditions.push(`id IN (${materialBatchIds.map(() => '?').join(', ')})`);
          batchLockParams.push(...materialBatchIds);
        }
        if (automaticMaterialIds.length) {
          batchLockConditions.push(`(material_id IN (${automaticMaterialIds.map(() => '?').join(', ')}) AND status_code = 'available')`);
          batchLockParams.push(...automaticMaterialIds);
        }
        if (batchLockConditions.length) {
          await connection.execute(
            `SELECT id FROM material_batches
             WHERE ${batchLockConditions.map((condition) => `(${condition})`).join(' OR ')}
             ORDER BY id FOR UPDATE`,
            batchLockParams,
          );
        }
        if (oldMaterialRows.some((row: any) => row.actual_qty !== null && asNumber(row.actual_qty) > 0)) {
          throw new AppError(409, 'JOB_MATERIALS_ALREADY_USED', 'Rencana material tidak dapat diganti karena pemakaian aktual sudah tercatat.');
        }
        await this.materials.releaseAllReservations(connection, craft, id, job.job_code, userId);
        await connection.execute(`DELETE FROM print_job_materials WHERE print_job_id = ?`, [id]);
        await this.materials.planMaterials(connection, craft, id, job.job_code, input.materials || [], userId);
        const [materialTotals]: any = await connection.execute(
          `SELECT SUM(pjm.planned_qty * COALESCE(pjm.unit_cost, 0)) AS estimated_cost,
                  SUM(CASE UPPER(u.code) WHEN 'G' THEN pjm.planned_qty WHEN 'KG' THEN pjm.planned_qty * 1000
                        WHEN 'MG' THEN pjm.planned_qty / 1000 ELSE 0 END) AS estimated_grams,
                  SUM(CASE WHEN UPPER(u.code) IN ('G','KG','MG') THEN 1 ELSE 0 END) AS weight_rows
           FROM print_job_materials pjm JOIN units_of_measure u ON u.id = pjm.unit_id
           WHERE pjm.print_job_id = ?`,
          [id],
        );
        estimatedCost = materialTotals[0].estimated_cost === null ? null : Number(materialTotals[0].estimated_cost);
        if (!has('estimated_material_g')) {
          estimatedMaterial = Number(materialTotals[0].weight_rows) > 0
            ? Number(materialTotals[0].estimated_grams)
            : null;
        }
      }

      const notes = has('notes') ? input.notes ?? null : job.notes;
      await connection.execute(
        `UPDATE print_jobs SET job_name = ?, printer_id = ?, operator_user_id = ?,
          print_profile_id = ?, design_file_id = ?, estimated_print_minutes = ?,
          estimated_material_g = ?, estimated_cost = ?, notes = ?
         WHERE id = ?`,
        [
          jobName, targetPrinterId, operatorUserId, profileId, designFileId,
          estimatedMinutes, estimatedMaterial, estimatedCost, notes, id,
        ],
      );

      const hasSchedule = has('scheduled_start_at');
      const scheduleNeedsRefresh = Boolean(job.scheduled_start_at) && (
        targetPrinterId !== Number(job.printer_id)
        || jobName !== String(job.job_name)
        || estimatedMinutes !== (job.estimated_print_minutes === null ? null : Number(job.estimated_print_minutes))
      );
      let newSchedule: { scheduled_start_at: string | null; scheduled_end_at: string | null } = {
        scheduled_start_at: job.scheduled_start_at ? toMysqlDateTime(job.scheduled_start_at) : null,
        scheduled_end_at: job.estimated_finish_at ? toMysqlDateTime(job.estimated_finish_at) : null,
      };
      if (hasSchedule && input.scheduled_start_at == null) {
        await this.scheduler.clearSchedule(connection, id, source.queue_item_id);
        newSchedule = { scheduled_start_at: null, scheduled_end_at: null };
      } else if ((hasSchedule && input.scheduled_start_at) || scheduleNeedsRefresh) {
        if (!estimatedMinutes) {
          throw new AppError(400, 'SCHEDULE_DURATION_REQUIRED', 'Estimasi waktu cetak diperlukan untuk mempertahankan jadwal pekerjaan.');
        }
        const scheduled = await this.scheduler.schedule(
          connection,
          craft,
          {
            id,
            job_code: job.job_code,
            job_name: jobName,
            printer_id: targetPrinterId,
            queue_item_id: source.queue_item_id,
          },
          input.scheduled_start_at || toMysqlDateTime(job.scheduled_start_at),
          estimatedMinutes,
          userId,
        );
        newSchedule = scheduled;
      }
      if (hasSchedule || scheduleNeedsRefresh) {
        await this.sync.audit(
          connection,
          craft,
          userId,
          'production.job_schedule',
          id,
          job.job_code,
          `Jadwal ${job.job_code} diperbarui bersama perencanaan.`,
          { scheduled_start_at: job.scheduled_start_at, estimated_finish_at: job.estimated_finish_at, printer_id: Number(job.printer_id) },
          { ...newSchedule, printer_id: targetPrinterId, estimated_print_minutes: estimatedMinutes },
        );
      }

      const oldValues = {
        job_name: job.job_name,
        printer_id: Number(job.printer_id),
        operator_user_id: job.operator_user_id === null ? null : Number(job.operator_user_id),
        print_profile_id: job.print_profile_id === null ? null : Number(job.print_profile_id),
        design_file_id: job.design_file_id === null ? null : Number(job.design_file_id),
        estimated_print_minutes: job.estimated_print_minutes === null ? null : Number(job.estimated_print_minutes),
        estimated_material_g: job.estimated_material_g === null ? null : Number(job.estimated_material_g),
        notes: job.notes,
        ...(has('materials') ? { materials: oldMaterialRows } : {}),
      };
      const newValues = {
        job_name: jobName,
        printer_id: targetPrinterId,
        operator_user_id: operatorUserId,
        print_profile_id: profileId,
        design_file_id: designFileId,
        estimated_print_minutes: estimatedMinutes,
        estimated_material_g: estimatedMaterial,
        notes,
        ...(has('materials') ? { materials: input.materials || [] } : {}),
      };
      await this.sync.audit(
        connection,
        craft,
        userId,
        'production.job_update',
        id,
        job.job_code,
        `Perencanaan ${job.job_code} diperbarui.`,
        oldValues,
        newValues,
      );
      await connection.commit();
      return {
        message: 'Perencanaan pekerjaan diperbarui.',
        id,
        job_code: String(job.job_code),
        status_code: job.status_code as PrintJobStatus,
        materials_replaced: has('materials'),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async markReady(id: number, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const job = await this.lockJob(connection, id, craft);
      if (job.status_code !== 'queued') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Hanya pekerjaan Menunggu yang dapat dijadikan Siap.');
      await this.getPrinter(connection, Number(job.printer_id), craft.id);
      if (asNumber(job.quantity) <= 0) throw new AppError(409, 'INVALID_JOB_QUANTITY', 'Kuantitas pekerjaan tidak valid.');
      await connection.execute(`UPDATE print_jobs SET status_code = 'ready' WHERE id = ?`, [id]);
      await this.sync.addJobHistory(connection, id, 'queued', 'ready', userId, 'Persyaratan minimum pekerjaan terpenuhi.', asNumber(job.progress_percent));
      await this.sync.audit(connection, craft, userId, 'production.job_ready', id, job.job_code, `${job.job_code} siap dicetak.`, { status_code: 'queued' }, { status_code: 'ready' });
      const [materialRows]: any = await connection.execute(`SELECT COUNT(*) AS count FROM print_job_materials WHERE print_job_id = ?`, [id]);
      await connection.commit();
      return {
        message: 'Pekerjaan siap dicetak.',
        warnings: Number(materialRows[0].count) === 0
          ? ['Material belum ditautkan ke inventaris. Pemakaian material tidak akan tercatat otomatis.'] : [],
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async scheduleJob(id: number, scheduledStart: string | null, estimatedMinutes: number | null | undefined, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const { job } = await this.lockPrinterAndJob(connection, id, craft);
      if (!['queued', 'ready'].includes(job.status_code)) {
        throw new AppError(409, 'JOB_NOT_SCHEDULABLE', 'Hanya pekerjaan Menunggu atau Siap yang dapat dijadwalkan.');
      }
      const oldSchedule = { scheduled_start_at: job.scheduled_start_at, estimated_finish_at: job.estimated_finish_at };
      if (!scheduledStart) {
        await this.scheduler.clearSchedule(connection, id, job.queue_item_id ? Number(job.queue_item_id) : null);
      } else {
        await this.scheduler.schedule(
          connection, craft,
          { id, job_code: job.job_code, job_name: job.job_name, printer_id: Number(job.printer_id), queue_item_id: job.queue_item_id ? Number(job.queue_item_id) : null },
          scheduledStart, estimatedMinutes ?? (job.estimated_print_minutes === null ? 0 : Number(job.estimated_print_minutes)), userId,
        );
      }
      await this.sync.audit(connection, craft, userId, 'production.job_schedule', id, job.job_code, `Jadwal ${job.job_code} diperbarui.`, oldSchedule, { scheduled_start_at: scheduledStart, estimated_print_minutes: estimatedMinutes });
      await connection.commit();
      return { message: scheduledStart ? 'Jadwal pekerjaan diperbarui.' : 'Jadwal pekerjaan dihapus.' };
    } catch (error) {
      await connection.rollback(); throw error;
    } finally { connection.release(); }
  }

  async start(id: number, operatorUserId: number | null | undefined, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const { printer, job } = await this.lockPrinterAndJob(connection, id, craft);
      if (job.status_code !== 'ready') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Hanya pekerjaan Siap yang dapat mulai dicetak.');
      if (printer.status_code !== 'available') throw new AppError(409, 'PRINTER_BUSY', 'Printer tidak tersedia untuk memulai pekerjaan.', { printer_id: printer.id, status_code: printer.status_code });
      const [activeRows]: any = await connection.execute(
        `SELECT id, job_code FROM print_jobs WHERE printer_id = ? AND id <> ? AND status_code IN ('printing','paused') LIMIT 1 FOR UPDATE`,
        [printer.id, id],
      );
      if (activeRows.length) throw new AppError(409, 'PRINTER_BUSY', 'Printer sedang digunakan oleh pekerjaan lain.', { conflicting_job: activeRows[0] });
      const operator = operatorUserId ?? (job.operator_user_id ? Number(job.operator_user_id) : userId);
      await this.assertOperator(connection, operator, craft.id);
      await connection.execute(
        `UPDATE print_jobs SET status_code = 'printing', started_at = CURRENT_TIMESTAMP(3), progress_percent = 0,
          estimated_finish_at = CASE WHEN estimated_print_minutes IS NULL THEN NULL
            ELSE DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL estimated_print_minutes MINUTE) END,
          operator_user_id = ? WHERE id = ?`,
        [operator, id],
      );
      await connection.execute(`UPDATE printers SET status_code = 'busy' WHERE id = ?`, [printer.id]);
      await this.sync.setQueuePrinting(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      await this.sync.syncOrderOnStart(connection, job.order_id ? Number(job.order_id) : null, userId);
      await this.sync.addJobHistory(connection, id, 'ready', 'printing', userId, 'Pencetakan fisik dimulai.', 0);
      await this.sync.audit(connection, craft, userId, 'production.start', id, job.job_code, `${job.job_code} mulai dicetak pada ${printer.name}.`, { status_code: 'ready', printer_status: 'available' }, { status_code: 'printing', printer_status: 'busy', operator_user_id: operator });
      const [materialRows]: any = await connection.execute(`SELECT COUNT(*) AS count FROM print_job_materials WHERE print_job_id = ?`, [id]);
      await connection.commit();
      return {
        message: 'Pencetakan dimulai. Ini mencatat operasi dan tidak mengirim kontrol ke printer.',
        warnings: Number(materialRows[0].count) === 0
          ? ['Material belum ditautkan ke inventaris. Pemakaian material tidak akan tercatat otomatis.'] : [],
      };
    } catch (error) {
      await connection.rollback(); throw error;
    } finally { connection.release(); }
  }

  private async simpleTransition(
    id: number,
    from: PrintJobStatus,
    to: PrintJobStatus,
    reason: string | null | undefined,
    userId: number,
    craft: CraftContext,
    actionCode: string,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const { printer, job } = await this.lockPrinterAndJob(connection, id, craft);
      if (job.status_code !== from) throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Pekerjaan tidak dapat berubah dari ${job.status_code} ke ${to}.`);
      if (printer.status_code !== 'busy') throw new AppError(409, 'PRINTER_STATE_CONFLICT', 'Status printer tidak konsisten dengan pekerjaan aktif.');
      const [other]: any = await connection.execute(
        `SELECT id, job_code FROM print_jobs WHERE printer_id = ? AND id <> ? AND status_code IN ('printing','paused') LIMIT 1 FOR UPDATE`,
        [printer.id, id],
      );
      if (other.length) throw new AppError(409, 'PRINTER_BUSY', 'Printer dimiliki pekerjaan aktif lain.', { conflicting_job: other[0] });
      await connection.execute(`UPDATE print_jobs SET status_code = ? WHERE id = ?`, [to, id]);
      await this.sync.addJobHistory(connection, id, from, to, userId, reason ?? null, asNumber(job.progress_percent));
      await this.sync.audit(connection, craft, userId, actionCode, id, job.job_code, `${job.job_code}: ${from} -> ${to}.`, { status_code: from }, { status_code: to, reason: reason ?? null });
      await connection.commit();
      return { message: to === 'paused' ? 'Pencetakan dijeda.' : 'Pencetakan dilanjutkan.' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  pause(id: number, reason: string | null | undefined, userId: number, craft: CraftContext) {
    return this.simpleTransition(id, 'printing', 'paused', reason, userId, craft, 'production.pause');
  }

  resume(id: number, reason: string | null | undefined, userId: number, craft: CraftContext) {
    return this.simpleTransition(id, 'paused', 'printing', reason, userId, craft, 'production.resume');
  }

  async updateProgress(id: number, progress: number, reason: string | null | undefined, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const job = await this.lockJob(connection, id, craft);
      if (!['printing', 'paused'].includes(job.status_code)) throw new AppError(409, 'JOB_PROGRESS_LOCKED', 'Progress hanya dapat diperbarui saat mencetak atau dijeda.');
      await connection.execute(`UPDATE print_jobs SET progress_percent = ? WHERE id = ?`, [progress, id]);
      await this.sync.addJobHistory(connection, id, job.status_code, job.status_code, userId, reason ?? 'Pembaruan progress manual.', progress);
      await this.sync.audit(connection, craft, userId, 'production.progress', id, job.job_code, `Progress manual ${job.job_code} diperbarui menjadi ${progress}%.`, { progress_percent: Number(job.progress_percent) }, { progress_percent: progress });
      await connection.commit();
      return { message: 'Progress manual diperbarui.' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async finish(id: number, input: FinishPrintInput, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const { printer, job } = await this.lockPrinterAndJob(connection, id, craft);
      if (job.status_code !== 'printing') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Hanya pekerjaan yang sedang dicetak dapat diselesaikan secara fisik.');
      if (printer.status_code !== 'busy') throw new AppError(409, 'PRINTER_STATE_CONFLICT', 'Printer tidak berstatus sibuk untuk pekerjaan ini.');
      const [elapsedRows]: any = await connection.execute(
        `SELECT GREATEST(0, TIMESTAMPDIFF(MINUTE, started_at, CURRENT_TIMESTAMP(3))) AS elapsed FROM print_jobs WHERE id = ?`,
        [id],
      );
      const actualMinutes = input.actual_print_minutes ?? Number(elapsedRows[0].elapsed || 0);
      const materialResult = await this.materials.consumeActualMaterials(connection, craft, id, job.job_code, input.materials || [], userId);
      const actualGrams = input.actual_material_g ?? materialResult.actualGrams;
      await connection.execute(
        `UPDATE print_jobs SET status_code = 'qc', progress_percent = 100, finished_at = CURRENT_TIMESTAMP(3),
          actual_print_minutes = ?, actual_material_g = ?, actual_cost = ?, notes = COALESCE(?, notes)
         WHERE id = ?`,
        [actualMinutes, actualGrams, materialResult.actualCost, input.notes ?? null, id],
      );
      await connection.execute(
        `UPDATE printers SET status_code = 'available', total_print_hours = total_print_hours + ? WHERE id = ?`,
        [actualMinutes / 60, printer.id],
      );
      const inspectionId = await this.qc.preparePendingInspection(connection, craft, id);
      await this.sync.refreshQueueState(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      await this.sync.addJobHistory(connection, id, 'printing', 'qc', userId, input.notes ?? 'Pencetakan fisik selesai; menunggu QC.', 100);
      await this.sync.audit(connection, craft, userId, 'production.print_complete', id, job.job_code, `${job.job_code} selesai dicetak dan menunggu QC.`, { status_code: 'printing', printer_status: 'busy' }, { status_code: 'qc', printer_status: 'available', actual_print_minutes: actualMinutes, actual_material_g: actualGrams });
      await this.sync.audit(connection, craft, userId, 'production.qc_start', id, job.job_code, `Pemeriksaan QC ${job.job_code} disiapkan.`, undefined, { inspection_id: inspectionId, result_code: 'pending' });
      await this.sync.notify(connection, craft, 'production_qc_ready', 'info', 'Cetak selesai - menunggu QC', `${job.job_code} selesai dicetak dan siap diperiksa.`, id);
      await domainEvents.publish(connection, {
        eventKey: `production.job_completed:${id}`, eventName: 'production.job_completed', moduleCode: 'craft_production',
        organizationId: craft.organizationId, businessUnitId: craft.id, entityType: 'print_job', entityId: id, entityCode: job.job_code, actorUserId: userId,
        payload: { context: { production: { id, job_code: job.job_code, status_code: 'qc', actual_print_minutes: actualMinutes, actual_material_g: actualGrams } } },
      });
      await connection.commit();
      return { message: 'Pencetakan fisik selesai. Pekerjaan menunggu kontrol kualitas.' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async cancel(id: number, reason: string, userId: number, craft: CraftContext) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const job = await this.lockJob(connection, id, craft);
      if (!['queued', 'ready'].includes(job.status_code)) throw new AppError(409, 'JOB_NOT_CANCELLABLE', 'Hanya pekerjaan Menunggu atau Siap yang dapat dibatalkan.');
      await this.materials.releaseAllReservations(connection, craft, id, job.job_code, userId);
      await this.scheduler.clearSchedule(connection, id, job.queue_item_id ? Number(job.queue_item_id) : null);
      await connection.execute(`UPDATE print_jobs SET status_code = 'cancelled' WHERE id = ?`, [id]);
      await this.sync.addJobHistory(connection, id, job.status_code, 'cancelled', userId, reason, asNumber(job.progress_percent));
      await this.sync.refreshQueueState(connection, job.queue_item_id ? Number(job.queue_item_id) : null);
      await this.sync.audit(connection, craft, userId, 'production.job_cancel', id, job.job_code, `${job.job_code} dibatalkan: ${reason}`, { status_code: job.status_code }, { status_code: 'cancelled', reason });
      await connection.commit();
      return { message: 'Pekerjaan cetak dibatalkan.' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
}
