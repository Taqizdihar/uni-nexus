import { pool } from '../../config/database';
import { NotFoundError } from '../../shared/errors/AppError';
import { asNumber } from './craft-production.helpers';
import type { FailureFilters, OrderAttachmentReference, ProductionFilters } from './craft-production.types';

const JOB_STATUSES = new Set(['queued', 'ready', 'printing', 'paused', 'qc', 'completed', 'failed', 'cancelled']);
const BOARD_STATUSES = ['queued', 'ready', 'printing', 'paused', 'qc', 'completed'];

const DEADLINE_RISK_SQL = `CASE
  WHEN o.deadline_at IS NULL THEN 'unknown'
  WHEN o.deadline_at < CURRENT_TIMESTAMP(3) AND pj.status_code <> 'completed' THEN 'late'
  WHEN COALESCE(
    pj.estimated_finish_at,
    DATE_ADD(COALESCE(pj.scheduled_start_at, CURRENT_TIMESTAMP(3)), INTERVAL COALESCE(pj.estimated_print_minutes, 0) MINUTE)
  ) > o.deadline_at THEN 'at_risk'
  ELSE 'on_track'
END`;

const DISPLAY_PROGRESS_SQL = `CASE
  WHEN pj.status_code = 'printing' AND pj.progress_percent = 0
    AND pj.started_at IS NOT NULL AND pj.estimated_print_minutes > 0
  THEN LEAST(99, GREATEST(0,
    TIMESTAMPDIFF(SECOND, pj.started_at, CURRENT_TIMESTAMP(3)) / (pj.estimated_print_minutes * 60) * 100
  ))
  ELSE pj.progress_percent
END`;

const JOB_SELECT = `
  SELECT
    pj.id, pj.job_code, pj.job_name, pj.status_code, pj.queue_item_id,
    pj.order_id, o.order_code, pj.order_item_id,
    COALESCE(coi.item_name, pj.job_name) AS item_name,
    o.customer_party_id, customer.display_name AS customer_name,
    channel.name AS sales_channel_name,
    pj.product_id, pj.variant_id, pj.quantity,
    COALESCE(pqi.priority_code, o.priority_code, 'normal') AS priority_code,
    COALESCE(pqi.priority_score, o.priority_score, 0) AS priority_score,
    o.deadline_at, ${DEADLINE_RISK_SQL} AS deadline_risk,
    pj.printer_id, printer.code AS printer_code, printer.name AS printer_name,
    printer.status_code AS printer_status,
    pj.operator_user_id, operator.full_name AS operator_name,
    pj.design_file_id, design.name AS design_file_name,
    pj.print_profile_id, profile.name AS print_profile_name,
    pj.scheduled_start_at, pj.estimated_finish_at AS scheduled_end_at,
    pj.estimated_finish_at, pj.started_at, pj.finished_at,
    pj.estimated_print_minutes, pj.actual_print_minutes,
    ${DISPLAY_PROGRESS_SQL} AS progress_percent,
    CASE
      WHEN pj.status_code = 'printing' AND pj.progress_percent = 0
        AND pj.started_at IS NOT NULL AND pj.estimated_print_minutes > 0 THEN 'estimated'
      WHEN pj.progress_percent > 0 THEN 'manual'
      ELSE 'none'
    END AS progress_source,
    (
      SELECT GROUP_CONCAT(CONCAT(m.name, ' ', FORMAT(COALESCE(pjm.actual_qty, pjm.planned_qty), 3), u.symbol)
        ORDER BY pjm.id SEPARATOR ', ')
      FROM print_job_materials pjm
      JOIN materials m ON m.id = pjm.material_id
      JOIN units_of_measure u ON u.id = pjm.unit_id
      WHERE pjm.print_job_id = pj.id
    ) AS material_summary,
    pj.estimated_material_g AS estimated_material_qty,
    pj.actual_material_g AS actual_material_qty,
    CASE WHEN pj.estimated_material_g IS NOT NULL OR pj.actual_material_g IS NOT NULL THEN 'g' ELSE NULL END AS material_unit,
    pj.estimated_cost, pj.actual_cost, pj.notes, pj.created_at, pj.updated_at
  FROM print_jobs pj
  LEFT JOIN production_queue_items pqi ON pqi.id = pj.queue_item_id
  LEFT JOIN craft_orders o ON o.id = pj.order_id
  LEFT JOIN craft_order_items coi ON coi.id = pj.order_item_id
  LEFT JOIN parties customer ON customer.id = o.customer_party_id
  LEFT JOIN sales_channels channel ON channel.id = o.sales_channel_id
  JOIN printers printer ON printer.id = pj.printer_id
  LEFT JOIN users operator ON operator.id = pj.operator_user_id
  LEFT JOIN design_files design ON design.id = pj.design_file_id
  LEFT JOIN print_profiles profile ON profile.id = pj.print_profile_id
`;

const NUMERIC_JOB_FIELDS = [
  'id', 'queue_item_id', 'order_id', 'order_item_id', 'customer_party_id', 'product_id', 'variant_id',
  'quantity', 'priority_score', 'printer_id', 'operator_user_id', 'design_file_id', 'print_profile_id',
  'estimated_print_minutes', 'actual_print_minutes', 'progress_percent', 'estimated_material_qty',
  'actual_material_qty', 'estimated_cost', 'actual_cost',
];

function normalizeNumericFields(row: any, fields: string[]) {
  const result = { ...row };
  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) result[field] = Number(result[field]);
  }
  return result;
}

function normalizeJob(row: any) {
  return normalizeNumericFields(row, NUMERIC_JOB_FIELDS);
}

export class CraftProductionRepository {
  private async getOrderAttachments(orderIds: number[], businessUnitId: number) {
    const uniqueOrderIds = [...new Set(orderIds.filter((id) => Number.isInteger(id) && id > 0))];
    const grouped = new Map<number, OrderAttachmentReference[]>();
    if (!uniqueOrderIds.length) return grouped;
    const [rows]: any = await pool.execute(
      `SELECT attachment.id, attachment.order_id, attachment.file_name, attachment.file_type,
              attachment.file_size_bytes, attachment.attachment_type, attachment.uploaded_at,
              uploader.full_name AS uploaded_by_name
       FROM order_attachments attachment
       JOIN craft_orders orders ON orders.id = attachment.order_id
         AND orders.business_unit_id = ? AND orders.deleted_at IS NULL
       LEFT JOIN users uploader ON uploader.id = attachment.uploaded_by
       WHERE attachment.order_id IN (${uniqueOrderIds.map(() => '?').join(', ')})
       ORDER BY attachment.uploaded_at DESC, attachment.id DESC`,
      [businessUnitId, ...uniqueOrderIds],
    );
    for (const row of rows) {
      const orderId = Number(row.order_id);
      const attachment: OrderAttachmentReference = {
        id: Number(row.id),
        file_name: String(row.file_name),
        file_type: row.file_type === null ? null : String(row.file_type),
        file_size_bytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes),
        attachment_type: String(row.attachment_type),
        uploaded_at: row.uploaded_at,
        uploaded_by_name: row.uploaded_by_name === null ? null : String(row.uploaded_by_name),
      };
      const attachments = grouped.get(orderId) || [];
      attachments.push(attachment);
      grouped.set(orderId, attachments);
    }
    return grouped;
  }

  private buildJobWhere(filters: ProductionFilters, businessUnitId: number) {
    const conditions = ['pj.business_unit_id = ?'];
    const params: any[] = [businessUnitId];
    if (filters.search) {
      conditions.push(`(pj.job_code LIKE ? OR pj.job_name LIKE ? OR o.order_code LIKE ? OR coi.item_name LIKE ? OR customer.display_name LIKE ?)`);
      const search = `%${filters.search}%`;
      params.push(search, search, search, search, search);
    }
    if (filters.status && JOB_STATUSES.has(filters.status)) {
      conditions.push('pj.status_code = ?');
      params.push(filters.status);
    } else if (filters.statuses?.length) {
      const statuses = filters.statuses.filter((status) => JOB_STATUSES.has(status));
      if (statuses.length) {
        conditions.push(`pj.status_code IN (${statuses.map(() => '?').join(', ')})`);
        params.push(...statuses);
      }
    }
    if (filters.printerId) {
      conditions.push('pj.printer_id = ?');
      params.push(filters.printerId);
    }
    if (filters.operatorId) {
      conditions.push('pj.operator_user_id = ?');
      params.push(filters.operatorId);
    }
    if (filters.priority) {
      conditions.push(`COALESCE(pqi.priority_code, o.priority_code, 'normal') = ?`);
      params.push(filters.priority);
    }
    if (filters.orderId) {
      conditions.push('pj.order_id = ?');
      params.push(filters.orderId);
    }
    if (filters.deadlineRisk && ['on_track', 'at_risk', 'late', 'unknown'].includes(filters.deadlineRisk)) {
      conditions.push(`${DEADLINE_RISK_SQL} = ?`);
      params.push(filters.deadlineRisk);
    }
    if (filters.dateFrom) {
      conditions.push('pj.created_at >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('pj.created_at < ?');
      params.push(filters.dateTo);
    }
    return { where: conditions.join(' AND '), params };
  }

  private async queryJobs(filters: ProductionFilters, businessUnitId: number, paginate: boolean) {
    const { where, params } = this.buildJobWhere(filters, businessUnitId);
    const sortFields: Record<string, string> = {
      priority: 'priority_score', deadline: 'o.deadline_at', schedule: 'pj.scheduled_start_at',
      created: 'pj.created_at', started: 'pj.started_at',
    };
    const sort = sortFields[filters.sortBy || ''] || 'pj.created_at';
    const direction = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    let query = `${JOB_SELECT} WHERE ${where} ORDER BY ${sort} ${direction}, pj.id ${direction}`;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    if (paginate) query += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    else query += ' LIMIT 1000';
    const [rows]: any = await pool.execute(query, params);
    return { rows: rows.map(normalizeJob), where, params, page, limit };
  }

  async getBoard(filters: ProductionFilters, businessUnitId: number) {
    const selected = filters.status || filters.statuses?.length ? filters : { ...filters, statuses: BOARD_STATUSES };
    const { rows } = await this.queryJobs(selected, businessUnitId, false);
    return { jobs: rows };
  }

  async getJobs(filters: ProductionFilters, businessUnitId: number) {
    const result = await this.queryJobs(filters, businessUnitId, true);
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM print_jobs pj
       LEFT JOIN production_queue_items pqi ON pqi.id = pj.queue_item_id
       LEFT JOIN craft_orders o ON o.id = pj.order_id
       LEFT JOIN craft_order_items coi ON coi.id = pj.order_item_id
       LEFT JOIN parties customer ON customer.id = o.customer_party_id
       WHERE ${result.where}`,
      result.params,
    );
    const total = Number(countRows[0].total);
    return {
      items: result.rows,
      meta: { page: result.page, limit: result.limit, total, totalPages: Math.ceil(total / result.limit) },
    };
  }

  async getJobSummary(id: number, businessUnitId: number) {
    const { rows } = await this.queryJobs({ statuses: Array.from(JOB_STATUSES), limit: 1 }, businessUnitId, false);
    const match = rows.find((job: any) => job.id === id);
    if (match) return match;
    const [jobRows]: any = await pool.execute(`${JOB_SELECT} WHERE pj.business_unit_id = ? AND pj.id = ? LIMIT 1`, [businessUnitId, id]);
    return jobRows.length ? normalizeJob(jobRows[0]) : null;
  }

  async getActive(businessUnitId: number) {
    const { rows: jobs } = await this.queryJobs(
      { statuses: ['ready', 'printing', 'paused', 'qc'], sortBy: 'priority', sortOrder: 'desc' },
      businessUnitId,
      false,
    );
    const [printerRows]: any = await pool.execute(
      `SELECT id, code, name, status_code FROM printers
       WHERE business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name`,
      [businessUnitId],
    );
    const printers = printerRows.map((printer: any) => ({
      id: Number(printer.id), code: printer.code, name: printer.name, status_code: printer.status_code,
      current_job: jobs.find((job: any) => job.printer_id === Number(printer.id) && ['printing', 'paused'].includes(job.status_code)) || null,
    }));
    return {
      jobs,
      printers,
      metrics: {
        printing: jobs.filter((job: any) => job.status_code === 'printing').length,
        paused: jobs.filter((job: any) => job.status_code === 'paused').length,
        qc: jobs.filter((job: any) => job.status_code === 'qc').length,
        available_printers: printerRows.filter((printer: any) => printer.status_code === 'available').length,
      },
    };
  }

  async getQueue(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT
        pqi.id, pqi.queue_position, pqi.status_code, pqi.order_id, o.order_code,
        pqi.order_item_id, coi.item_name, customer.display_name AS customer_name,
        channel.name AS sales_channel_name, coi.product_id, coi.variant_id, coi.quantity,
        COALESCE(jobs.active_quantity, 0) AS planned_quantity,
        COALESCE(jobs.good_quantity, 0) AS completed_good_quantity,
        GREATEST(0, coi.quantity - COALESCE(jobs.good_quantity, 0) - COALESCE(jobs.active_quantity, 0)) AS remaining_quantity,
        pqi.priority_code, pqi.priority_score, o.deadline_at,
        CASE
          WHEN o.deadline_at IS NULL THEN 'unknown'
          WHEN o.deadline_at < CURRENT_TIMESTAMP(3) THEN 'late'
          WHEN COALESCE(pqi.scheduled_end_at,
            DATE_ADD(COALESCE(pqi.scheduled_start_at, CURRENT_TIMESTAMP(3)), INTERVAL COALESCE(coi.estimated_print_minutes * coi.quantity, 0) MINUTE)
          ) > o.deadline_at THEN 'at_risk'
          ELSE 'on_track'
        END AS deadline_risk,
        CASE WHEN coi.estimated_material_g IS NULL THEN NULL ELSE coi.estimated_material_g * coi.quantity END AS estimated_material_qty,
        CASE WHEN coi.estimated_material_g IS NULL THEN NULL ELSE 'g' END AS material_unit,
        CASE WHEN coi.estimated_print_minutes IS NULL THEN NULL ELSE coi.estimated_print_minutes * coi.quantity END AS estimated_print_minutes,
        pqi.scheduled_start_at, pqi.scheduled_end_at, pqi.notes
       FROM production_queue_items pqi
       JOIN craft_orders o ON o.id = pqi.order_id AND o.deleted_at IS NULL
       JOIN craft_order_items coi ON coi.id = pqi.order_item_id
       JOIN parties customer ON customer.id = o.customer_party_id
       LEFT JOIN sales_channels channel ON channel.id = o.sales_channel_id
       LEFT JOIN (
         SELECT queue_item_id,
           SUM(CASE WHEN status_code IN ('queued','ready','printing','paused','qc') THEN quantity ELSE 0 END) AS active_quantity,
           SUM(CASE WHEN status_code = 'completed' THEN quantity ELSE 0 END) AS good_quantity
         FROM print_jobs GROUP BY queue_item_id
       ) jobs ON jobs.queue_item_id = pqi.id
       WHERE pqi.business_unit_id = ? AND pqi.status_code NOT IN ('completed', 'done', 'cancelled')
       ORDER BY pqi.priority_score DESC, pqi.queue_position ASC`,
      [businessUnitId],
    );
    const numeric = ['id', 'queue_position', 'order_id', 'order_item_id', 'product_id', 'variant_id', 'quantity',
      'planned_quantity', 'completed_good_quantity', 'remaining_quantity', 'priority_score', 'estimated_material_qty',
      'estimated_print_minutes'];
    const attachments = await this.getOrderAttachments(rows.map((row: any) => Number(row.order_id)), businessUnitId);
    return {
      items: rows.map((row: any) => {
        const item = normalizeNumericFields(row, numeric);
        return { ...item, order_attachments: attachments.get(Number(item.order_id)) || [] };
      }),
    };
  }

  private async getQcInspection(jobId: number) {
    const [inspectionRows]: any = await pool.execute(
      `SELECT qi.*, qt.name AS template_name, u.full_name AS inspector_name
       FROM qc_inspections qi
       LEFT JOIN qc_templates qt ON qt.id = qi.template_id
       LEFT JOIN users u ON u.id = qi.inspector_user_id
       WHERE qi.print_job_id = ? ORDER BY qi.id DESC LIMIT 1`,
      [jobId],
    );
    if (!inspectionRows.length) return null;
    const inspection = normalizeNumericFields(inspectionRows[0], ['id', 'print_job_id', 'template_id', 'inspector_user_id']);
    const [itemRows]: any = await pool.execute(
      `SELECT qii.id, qii.template_item_id, qii.item_label AS label, qii.value_text,
              CASE WHEN qii.passed = 1 THEN 'pass' WHEN qii.passed = 0 THEN 'fail' ELSE 'pending' END AS result,
              qii.passed, qii.notes, COALESCE(qti.sort_order, qii.id) AS sort_order
       FROM qc_inspection_items qii
       LEFT JOIN qc_template_items qti ON qti.id = qii.template_item_id
       WHERE qii.inspection_id = ? ORDER BY sort_order, qii.id`,
      [inspection.id],
    );
    inspection.items = itemRows.map((row: any) => normalizeNumericFields(row, ['id', 'template_item_id', 'sort_order']));
    return inspection;
  }

  private async getFailureForJob(jobId: number) {
    const [rows]: any = await pool.execute(
      `SELECT pf.id, pf.print_job_id, pj.job_code, pj.job_name, pj.order_id, o.order_code,
              COALESCE(coi.item_name, pj.job_name) AS item_name,
              pj.printer_id, p.name AS printer_name, pf.failure_type, pf.failure_stage,
              pf.description, pf.material_wasted_g AS material_wasted_qty,
              CASE WHEN pf.material_wasted_g IS NULL THEN NULL ELSE 'g' END AS material_unit,
              pf.estimated_loss, reporter.full_name AS reported_by_name,
              pf.requires_reprint, pf.reprint_job_id, reprint.job_code AS reprint_job_code,
              (p.status_code = 'error') AS printer_has_issue, pf.occurred_at AS failed_at
       FROM print_failures pf
       JOIN print_jobs pj ON pj.id = pf.print_job_id
       LEFT JOIN craft_orders o ON o.id = pj.order_id
       LEFT JOIN craft_order_items coi ON coi.id = pj.order_item_id
       LEFT JOIN printers p ON p.id = pj.printer_id
       LEFT JOIN users reporter ON reporter.id = pf.reported_by
       LEFT JOIN print_jobs reprint ON reprint.id = pf.reprint_job_id
       WHERE pf.print_job_id = ? ORDER BY pf.id DESC LIMIT 1`,
      [jobId],
    );
    return rows.length ? normalizeNumericFields(rows[0], [
      'id', 'print_job_id', 'order_id', 'printer_id', 'material_wasted_qty', 'estimated_loss', 'reprint_job_id',
    ]) : null;
  }

  async getJobDetail(id: number, businessUnitId: number) {
    const [jobRows]: any = await pool.execute(`${JOB_SELECT} WHERE pj.business_unit_id = ? AND pj.id = ? LIMIT 1`, [businessUnitId, id]);
    if (!jobRows.length) throw new NotFoundError('Pekerjaan cetak tidak ditemukan.');
    const job = normalizeJob(jobRows[0]);
    const [materialRows]: any = await pool.execute(
      `SELECT pjm.id, pjm.print_job_id, pjm.material_id, m.name AS material_name,
              pjm.material_batch_id AS batch_id, mb.batch_code, pjm.unit_id,
              u.code AS unit_code, pjm.planned_qty, pjm.actual_qty,
              CASE WHEN mb.id IS NULL THEN NULL ELSE mb.current_qty - mb.reserved_qty END AS available_qty,
              mb.reserved_qty, (sr.status_code = 'reserved') AS is_reserved,
              sr.status_code AS reservation_status, pjm.planned_qty * pjm.unit_cost AS planned_cost,
              pjm.actual_cost, (mb.id IS NOT NULL) AS is_tracked
       FROM print_job_materials pjm
       JOIN materials m ON m.id = pjm.material_id
       LEFT JOIN material_batches mb ON mb.id = pjm.material_batch_id
       LEFT JOIN stock_reservations sr ON sr.id = pjm.reservation_id
       JOIN units_of_measure u ON u.id = pjm.unit_id
       WHERE pjm.print_job_id = ? ORDER BY pjm.id`,
      [id],
    );
    const [historyRows]: any = await pool.execute(
      `SELECT h.id, h.from_status_code, h.to_status_code, h.progress_percent,
              h.reason, u.full_name AS changed_by_name, h.changed_at
       FROM print_job_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.print_job_id = ? ORDER BY h.changed_at, h.id`,
      [id],
    );
    const qcInspection = await this.getQcInspection(id);
    const failure = await this.getFailureForJob(id);
    let reprintJob = null;
    if (failure?.reprint_job_id) {
      const [reprintRows]: any = await pool.execute(`${JOB_SELECT} WHERE pj.business_unit_id = ? AND pj.id = ? LIMIT 1`, [businessUnitId, failure.reprint_job_id]);
      if (reprintRows.length) reprintJob = normalizeJob(reprintRows[0]);
    }
    const materialNumeric = ['id', 'print_job_id', 'material_id', 'batch_id', 'unit_id', 'planned_qty', 'actual_qty',
      'available_qty', 'reserved_qty', 'planned_cost', 'actual_cost'];
    const attachments = job.order_id
      ? await this.getOrderAttachments([Number(job.order_id)], businessUnitId)
      : new Map<number, OrderAttachmentReference[]>();
    return {
      job,
      materials: materialRows.map((row: any) => normalizeNumericFields(row, materialNumeric)),
      history: historyRows.map((row: any) => normalizeNumericFields(row, ['id', 'progress_percent'])),
      qc_inspection: qcInspection,
      failure,
      reprint_job: reprintJob,
      order_attachments: job.order_id ? attachments.get(Number(job.order_id)) || [] : [],
    };
  }

  async getFailures(filters: FailureFilters, businessUnitId: number) {
    const conditions = ['pj.business_unit_id = ?'];
    const params: any[] = [businessUnitId];
    if (filters.failureType) { conditions.push('pf.failure_type = ?'); params.push(filters.failureType); }
    if (filters.printerId) { conditions.push('pj.printer_id = ?'); params.push(filters.printerId); }
    if (filters.dateFrom) { conditions.push('pf.occurred_at >= ?'); params.push(filters.dateFrom); }
    if (filters.dateTo) { conditions.push('pf.occurred_at < ?'); params.push(filters.dateTo); }
    if (filters.requiresReprint !== undefined) { conditions.push('pf.requires_reprint = ?'); params.push(filters.requiresReprint ? 1 : 0); }
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const where = conditions.join(' AND ');
    const [rows]: any = await pool.execute(
      `SELECT pf.id, pf.print_job_id, pj.job_code, pj.job_name, pj.order_id, o.order_code,
              COALESCE(coi.item_name, pj.job_name) AS item_name, pj.printer_id, p.name AS printer_name,
              pf.failure_type, pf.failure_stage, pf.description,
              pf.material_wasted_g AS material_wasted_qty,
              CASE WHEN pf.material_wasted_g IS NULL THEN NULL ELSE 'g' END AS material_unit,
              pf.estimated_loss, reporter.full_name AS reported_by_name,
              pf.requires_reprint, pf.reprint_job_id, reprint.job_code AS reprint_job_code,
              (p.status_code = 'error') AS printer_has_issue, pf.occurred_at AS failed_at
       FROM print_failures pf
       JOIN print_jobs pj ON pj.id = pf.print_job_id
       LEFT JOIN craft_orders o ON o.id = pj.order_id
       LEFT JOIN craft_order_items coi ON coi.id = pj.order_item_id
       LEFT JOIN printers p ON p.id = pj.printer_id
       LEFT JOIN users reporter ON reporter.id = pf.reported_by
       LEFT JOIN print_jobs reprint ON reprint.id = pf.reprint_job_id
       WHERE ${where} ORDER BY pf.occurred_at DESC, pf.id DESC
       LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) AS total FROM print_failures pf JOIN print_jobs pj ON pj.id = pf.print_job_id WHERE ${where}`,
      params,
    );
    const total = Number(countRows[0].total);
    const numeric = ['id', 'print_job_id', 'order_id', 'printer_id', 'material_wasted_qty', 'estimated_loss', 'reprint_job_id'];
    return { items: rows.map((row: any) => normalizeNumericFields(row, numeric)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getQcQueue(businessUnitId: number) {
    const { rows: jobs } = await this.queryJobs({ status: 'qc', sortBy: 'created', sortOrder: 'asc' }, businessUnitId, false);
    const items = await Promise.all(jobs.map(async (job: any) => {
      const inspection = await this.getQcInspection(job.id);
      return { job, inspection, qc_state: inspection?.result_code || 'pending' };
    }));
    return { items };
  }

  async getCalendar(start: string, end: string, printerId: number | undefined, businessUnitId: number) {
    const conditions = [
      'pj.business_unit_id = ?', "pj.status_code NOT IN ('failed', 'cancelled')", 'pj.scheduled_start_at IS NOT NULL',
      'pj.scheduled_start_at < ?',
      `COALESCE(pj.estimated_finish_at, DATE_ADD(pj.scheduled_start_at, INTERVAL COALESCE(pj.estimated_print_minutes, 1) MINUTE)) > ?`,
    ];
    const params: any[] = [businessUnitId, end, start];
    if (printerId) { conditions.push('pj.printer_id = ?'); params.push(printerId); }
    const [rows]: any = await pool.execute(
      `SELECT pj.id, pj.id AS print_job_id, pj.job_code, pj.job_name,
              COALESCE(coi.item_name, pj.job_name) AS item_name, pj.order_id, o.order_code,
              pj.printer_id, p.name AS printer_name,
              COALESCE(pqi.priority_code, o.priority_code, 'normal') AS priority_code,
              pj.status_code, pj.scheduled_start_at,
              COALESCE(pj.estimated_finish_at, DATE_ADD(pj.scheduled_start_at, INTERVAL COALESCE(pj.estimated_print_minutes, 1) MINUTE)) AS scheduled_end_at,
              pj.estimated_finish_at, o.deadline_at, ${DEADLINE_RISK_SQL} AS deadline_risk
       FROM print_jobs pj
       LEFT JOIN production_queue_items pqi ON pqi.id = pj.queue_item_id
       LEFT JOIN craft_orders o ON o.id = pj.order_id
       LEFT JOIN craft_order_items coi ON coi.id = pj.order_item_id
       JOIN printers p ON p.id = pj.printer_id
       WHERE ${conditions.join(' AND ')} ORDER BY pj.scheduled_start_at, pj.id`,
      params,
    );
    const numeric = ['id', 'print_job_id', 'order_id', 'printer_id'];
    return { events: rows.map((row: any) => normalizeNumericFields(row, numeric)) };
  }

  async getPrinters(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT id, code, name, brand, model, printer_type, status_code, location_name, is_active
       FROM printers WHERE business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name`,
      [businessUnitId],
    );
    return rows.map((row: any) => normalizeNumericFields(row, ['id']));
  }

  async getOperators(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT u.id, u.full_name, u.username
       FROM users u
       JOIN user_business_units ubu ON ubu.user_id = u.id AND ubu.business_unit_id = ? AND ubu.can_access = 1
       WHERE u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL
       ORDER BY u.full_name`,
      [businessUnitId],
    );
    return rows.map((row: any) => normalizeNumericFields(row, ['id']));
  }

  async getMaterials(businessUnitId: number) {
    const [rows]: any = await pool.execute(
      `SELECT m.id, m.sku AS code, m.name, m.material_type, m.color_name AS color,
              m.base_unit_id AS unit_id, u.code AS unit_code, m.default_unit_cost AS unit_cost,
              stock.available_qty, stock.reserved_qty,
              mb.id AS batch_id, mb.batch_code, mb.current_qty AS batch_current_qty,
              mb.reserved_qty AS batch_reserved_qty, (mb.current_qty - mb.reserved_qty) AS batch_available_qty
       FROM materials m
       JOIN units_of_measure u ON u.id = m.base_unit_id
       LEFT JOIN v_material_stock stock ON stock.material_id = m.id
       LEFT JOIN material_batches mb ON mb.material_id = m.id AND mb.status_code = 'available'
       WHERE m.business_unit_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL
       ORDER BY m.name, mb.received_at, mb.id`,
      [businessUnitId],
    );
    const grouped = new Map<number, any>();
    for (const raw of rows) {
      const id = Number(raw.id);
      if (!grouped.has(id)) {
        grouped.set(id, normalizeNumericFields({
          id, code: raw.code, name: raw.name, material_type: raw.material_type, color: raw.color,
          available_qty: raw.available_qty, reserved_qty: raw.reserved_qty,
          unit_id: raw.unit_id, unit_code: raw.unit_code, unit_cost: raw.unit_cost, batches: [],
        }, ['id', 'available_qty', 'reserved_qty', 'unit_id', 'unit_cost']));
      }
      if (raw.batch_id) {
        grouped.get(id).batches.push(normalizeNumericFields({
          id: raw.batch_id, batch_code: raw.batch_code, current_qty: raw.batch_current_qty,
          reserved_qty: raw.batch_reserved_qty, available_qty: raw.batch_available_qty,
          unit_code: raw.unit_code,
        }, ['id', 'current_qty', 'reserved_qty', 'available_qty']));
      }
    }
    return Array.from(grouped.values());
  }

  async getUnits() {
    const [rows]: any = await pool.execute(
      `SELECT id, code, name, symbol, unit_group, decimal_places
       FROM units_of_measure WHERE is_active = 1 ORDER BY unit_group, name`,
    );
    return rows.map((row: any) => normalizeNumericFields(row, ['id', 'decimal_places']));
  }

  async getPrintProfiles(businessUnitId: number, productId?: number, variantId?: number, printerId?: number) {
    const conditions = ['business_unit_id = ?'];
    const params: any[] = [businessUnitId];
    if (productId) { conditions.push('(product_id IS NULL OR product_id = ?)'); params.push(productId); }
    if (variantId) { conditions.push('(variant_id IS NULL OR variant_id = ?)'); params.push(variantId); }
    if (printerId) { conditions.push('(printer_id IS NULL OR printer_id = ?)'); params.push(printerId); }
    const [rows]: any = await pool.execute(
      `SELECT id, name, product_id, variant_id, printer_id, estimated_print_minutes,
              estimated_material_qty, estimated_material_unit_id, is_default
       FROM print_profiles WHERE ${conditions.join(' AND ')}
       ORDER BY is_default DESC, name`,
      params,
    );
    const numeric = ['id', 'product_id', 'variant_id', 'printer_id', 'estimated_print_minutes', 'estimated_material_qty', 'estimated_material_unit_id'];
    return rows.map((row: any) => normalizeNumericFields(row, numeric));
  }

  async getDesignFiles(businessUnitId: number, productId?: number, variantId?: number) {
    const conditions = ['business_unit_id = ?'];
    const params: any[] = [businessUnitId];
    if (productId) { conditions.push('product_id = ?'); params.push(productId); }
    if (variantId) { conditions.push('(variant_id IS NULL OR variant_id = ?)'); params.push(variantId); }
    const [rows]: any = await pool.execute(
      `SELECT id, name, file_name, product_id, variant_id, file_type, version_label, is_final
       FROM design_files WHERE ${conditions.join(' AND ')} ORDER BY is_final DESC, uploaded_at DESC`,
      params,
    );
    return rows.map((row: any) => normalizeNumericFields(row, ['id', 'product_id', 'variant_id']));
  }

  async getBomSuggestion(businessUnitId: number, productId?: number, variantId?: number) {
    if (!productId) return null;
    const [bomRows]: any = await pool.execute(
      `SELECT b.id, b.name, b.version_no, b.variant_id
       FROM product_boms b
       JOIN products p ON p.id = b.product_id AND p.business_unit_id = ?
       WHERE b.product_id = ? AND b.is_active = 1 AND (b.variant_id <=> ? OR b.variant_id IS NULL)
       ORDER BY (b.variant_id <=> ?) DESC, b.version_no DESC
       LIMIT 1`,
      [businessUnitId, productId, variantId ?? null, variantId ?? null],
    );
    if (!bomRows.length) return null;
    const bom = bomRows[0];
    const [items]: any = await pool.execute(
      `SELECT bi.material_id, bi.unit_id, bi.quantity, bi.waste_factor_percent, bi.is_optional,
              m.name AS material_name, u.code AS unit_code,
              (bi.quantity * (1 + bi.waste_factor_percent / 100)) AS planned_qty
       FROM product_bom_items bi
       JOIN materials m ON m.id = bi.material_id AND m.business_unit_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL
       JOIN units_of_measure u ON u.id = bi.unit_id AND u.is_active = 1
       WHERE bi.bom_id = ?
       ORDER BY bi.id`,
      [businessUnitId, bom.id],
    );
    return normalizeNumericFields({ ...bom, items: items.map((item: any) => normalizeNumericFields(item, [
      'material_id', 'unit_id', 'quantity', 'waste_factor_percent', 'planned_qty',
    ])) }, ['id', 'version_no', 'variant_id']);
  }

  async getQcTemplates(businessUnitId: number) {
    const [templateRows]: any = await pool.execute(
      `SELECT id, name, description, is_default FROM qc_templates
       WHERE business_unit_id = ? AND is_active = 1 ORDER BY is_default DESC, name`,
      [businessUnitId],
    );
    const result = [];
    for (const template of templateRows) {
      const [itemRows]: any = await pool.execute(
        `SELECT id, item_code, label, check_type, required, config_json, sort_order
         FROM qc_template_items WHERE template_id = ? ORDER BY sort_order, id`,
        [template.id],
      );
      result.push({
        ...normalizeNumericFields(template, ['id']),
        product_id: null,
        items: itemRows.map((item: any) => normalizeNumericFields(item, ['id', 'sort_order'])),
      });
    }
    return result;
  }

  async getReferences(businessUnitId: number, productId?: number, variantId?: number, printerId?: number) {
    const [printers, operators, materials, units, printProfiles, designFiles, qcTemplates, bomSuggestion] = await Promise.all([
      this.getPrinters(businessUnitId), this.getOperators(businessUnitId), this.getMaterials(businessUnitId), this.getUnits(),
      this.getPrintProfiles(businessUnitId, productId, variantId, printerId),
      this.getDesignFiles(businessUnitId, productId, variantId), this.getQcTemplates(businessUnitId), this.getBomSuggestion(businessUnitId, productId, variantId),
    ]);
    return { printers, operators, materials, units, print_profiles: printProfiles, design_files: designFiles, qc_templates: qcTemplates, bom_suggestion: bomSuggestion };
  }
}
