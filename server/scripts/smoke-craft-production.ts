import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';
import mysql, {
  type Connection,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';

/**
 * Destructive-to-a-temporary-database end-to-end smoke test for Craft Production.
 *
 * Safety properties:
 * - never connects to DB_NAME from .env;
 * - generates and validates a unique `uni_nexus_smoke_*` database name;
 * - loads the checked-in dump only after rejecting database-selection DDL;
 * - sets DB_NAME before dynamically importing the application/database pool;
 * - closes the HTTP server and pool before dropping the temporary database; and
 * - validates the generated name again immediately before DROP DATABASE.
 *
 * Run from the repository root after the Craft Production backend has landed:
 *   npm --prefix server exec tsx scripts/smoke-craft-production.ts
 */

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const SERVER_ENV_PATH = path.join(REPOSITORY_ROOT, 'server', '.env');
const SQL_DUMP_PATH = path.join(REPOSITORY_ROOT, 'uni-nexus.sql');
const TEMP_DATABASE_PREFIX = 'uni_nexus_smoke_';
const TEMP_DATABASE_PATTERN = /^uni_nexus_smoke_\d{13}_\d+_[0-9a-f]{8}$/;
const API_ROOT = '/api/v1/craft/production';

loadEnv({ path: SERVER_ENV_PATH, override: false, quiet: true });

type JsonObject = Record<string, any>;

interface ApiResult<T = any> {
  status: number;
  data: T;
  body: JsonObject;
}

interface ApiClient {
  request<T = any>(
    method: string,
    route: string,
    body?: JsonObject,
    allowedStatuses?: number[],
  ): Promise<ApiResult<T>>;
}

interface FixtureIds {
  marker: string;
  organizationId: number;
  businessUnitId: number;
  actorUserId: number;
  actorUsername: string;
  salesChannelId: number;
  gramUnitId: number;
  printerId: number;
  materialId: number;
  materialBatchId: number;
  replacementMaterialBatchId: number;
  successAttachmentId: number;
  successOrderId: number;
  successOrderItemId: number;
  successQueueItemId: number;
  failureOrderId: number;
  failureOrderItemId: number;
  failureQueueItemId: number;
}

interface RuntimeResources {
  adminConnection?: Connection;
  fixtureConnection?: Connection;
  appPool?: Pool;
  httpServer?: Server;
  databaseCreated: boolean;
}

// Keep route and payload alignment in one place. If the HTTP contract changes,
// these are the only helpers that should normally need adjustment.
const routes = {
  board: () => '/board',
  queue: () => '/queue',
  jobs: () => '/jobs',
  job: (jobId: number) => `/jobs/${jobId}`,
  update: (jobId: number) => `/jobs/${jobId}`,
  cancel: (jobId: number) => `/jobs/${jobId}/cancel`,
  ready: (jobId: number) => `/jobs/${jobId}/ready`,
  start: (jobId: number) => `/jobs/${jobId}/start`,
  pause: (jobId: number) => `/jobs/${jobId}/pause`,
  resume: (jobId: number) => `/jobs/${jobId}/resume`,
  progress: (jobId: number) => `/jobs/${jobId}/progress`,
  finish: (jobId: number) => `/jobs/${jobId}/finish`,
  fail: (jobId: number) => `/jobs/${jobId}/fail`,
  qc: (jobId: number) => `/jobs/${jobId}/qc`,
  reprint: (failureId: number) => `/failures/${failureId}/reprint`,
  schedule: (jobId: number) => `/jobs/${jobId}/schedule`,
  calendar: (start: string, end: string, printerId: number) => {
    const query = new URLSearchParams({
      start,
      end,
      printerId: String(printerId),
    });
    return `/calendar?${query.toString()}`;
  },
};

const payloads = {
  createJob(input: {
    queueItemId?: number | null;
    jobName: string;
    quantity: number;
    printerId: number;
    operatorUserId: number;
    estimatedPrintMinutes: number;
    estimatedMaterialG?: number | null;
    material?: {
      materialId: number;
      batchId: number | null;
      unitId: number;
      plannedQty: number;
    };
  }): JsonObject {
    return {
      queue_item_id: input.queueItemId ?? null,
      job_name: input.jobName,
      quantity: input.quantity,
      printer_id: input.printerId,
      operator_user_id: input.operatorUserId,
      scheduled_start_at: null,
      print_profile_id: null,
      design_file_id: null,
      estimated_print_minutes: input.estimatedPrintMinutes,
      estimated_material_g: input.estimatedMaterialG ?? null,
      notes: 'Temporary Craft Production smoke fixture',
      materials: input.material
        ? [
            {
              material_id: input.material.materialId,
              material_batch_id: input.material.batchId,
              planned_qty: input.material.plannedQty,
              unit_id: input.material.unitId,
              reserve: true,
            },
          ]
        : [],
    };
  },

  finish(input: {
    materialLinkId: number;
    materialId: number;
    batchId: number;
    unitId: number;
    actualMinutes: number;
    actualQty: number;
  }): JsonObject {
    return {
      actual_print_minutes: input.actualMinutes,
      actual_material_g: input.actualQty,
      notes: 'Physical print completed by smoke test',
      materials: [
        {
          print_job_material_id: input.materialLinkId,
          material_id: input.materialId,
          material_batch_id: input.batchId,
          actual_qty: input.actualQty,
          unit_id: input.unitId,
        },
      ],
    };
  },

  qcPass(): JsonObject {
    return {
      template_id: null,
      result_code: 'pass',
      notes: 'Smoke inspection passed',
      items: [
        {
          template_item_id: null,
          item_label: 'Dimensi sesuai',
          value_text: 'pass',
          passed: true,
          notes: 'Verified by isolated smoke test',
        },
      ],
    };
  },

  failure(input: {
    materialId: number;
    batchId: number;
    wastedQty: number;
  }): JsonObject {
    return {
      failure_type: 'spaghetti',
      failure_stage: 'printing',
      description: 'Intentional isolated smoke failure',
      material_wasted_qty: input.wastedQty,
      material_id: input.materialId,
      batch_id: input.batchId,
      estimated_loss: 3_750,
      requires_reprint: true,
      printer_has_issue: false,
    };
  },

  schedule(scheduledStartAt: string, estimatedPrintMinutes: number): JsonObject {
    return {
      scheduled_start_at: scheduledStartAt,
      estimated_print_minutes: estimatedPrintMinutes,
    };
  },
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  assert(value && value.trim(), `Missing required environment variable ${name}`);
  return value;
}

function assertTemporaryDatabaseName(databaseName: string): void {
  assert(
    databaseName.startsWith(TEMP_DATABASE_PREFIX) && TEMP_DATABASE_PATTERN.test(databaseName),
    `Refusing unsafe temporary database name: ${databaseName}`,
  );
}

function quoteTemporaryDatabase(databaseName: string): string {
  assertTemporaryDatabaseName(databaseName);
  return `\`${databaseName}\``;
}

function createTemporaryDatabaseName(): string {
  const name = `${TEMP_DATABASE_PREFIX}${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}`;
  assertTemporaryDatabaseName(name);
  return name;
}

function numeric(value: unknown): number {
  const result = Number(value);
  assert(Number.isFinite(result), `Expected a finite number, received ${String(value)}`);
  return result;
}

function assertApproximately(actual: unknown, expected: number, message: string): void {
  assert(
    Math.abs(numeric(actual) - expected) < 0.0001,
    `${message}: expected ${expected}, received ${String(actual)}`,
  );
}

function collection(value: any, key: string): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.[key])) return value[key];
  return [];
}

function responseId(value: any, ...candidateKeys: string[]): number | null {
  const candidates = [
    value?.id,
    value?.job_id,
    value?.failure_id,
    value?.inspection_id,
    value?.job?.id,
    ...candidateKeys.map((key) => value?.[key]),
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

function errorCode(result: ApiResult): string | undefined {
  return result.body?.error?.code ?? result.data?.error?.code;
}

async function queryRows<T extends RowDataPacket = RowDataPacket>(
  connection: Connection,
  sql: string,
  parameters: any[] = [],
): Promise<T[]> {
  const [rows] = await connection.execute<T[]>(sql, parameters);
  return rows;
}

async function queryOne<T extends RowDataPacket = RowDataPacket>(
  connection: Connection,
  sql: string,
  parameters: any[] = [],
  label = 'row',
): Promise<T> {
  const rows = await queryRows<T>(connection, sql, parameters);
  assert.equal(rows.length, 1, `Expected exactly one ${label}, received ${rows.length}`);
  return rows[0];
}

async function insert(
  connection: Connection,
  sql: string,
  parameters: any[] = [],
): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(sql, parameters);
  assert(result.insertId > 0, 'Expected INSERT to return a positive insertId');
  return result.insertId;
}

function createApiClient(origin: string, token: string): ApiClient {
  return {
    async request<T = any>(
      method: string,
      route: string,
      body?: JsonObject,
      allowedStatuses?: number[],
    ): Promise<ApiResult<T>> {
      const response = await fetch(`${origin}${API_ROOT}${route}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      const text = await response.text();
      let parsed: JsonObject = {};
      if (text) {
        try {
          parsed = JSON.parse(text) as JsonObject;
        } catch {
          throw new Error(
            `${method} ${route} returned non-JSON HTTP ${response.status}: ${text.slice(0, 500)}`,
          );
        }
      }

      const accepted = allowedStatuses
        ? allowedStatuses.includes(response.status)
        : response.ok;
      if (!accepted) {
        throw new Error(
          `${method} ${route} returned HTTP ${response.status}: ${JSON.stringify(parsed)}`,
        );
      }

      const data = (Object.prototype.hasOwnProperty.call(parsed, 'data')
        ? parsed.data
        : parsed) as T;
      return { status: response.status, data, body: parsed };
    },
  };
}

async function seedFixtures(connection: Connection, marker: string): Promise<FixtureIds> {
  const businessUnit = await queryOne<any>(
    connection,
    `SELECT id, organization_id
       FROM business_units
      WHERE code = 'CRAFT' AND is_active = 1
      LIMIT 1`,
    [],
    'active Craft business unit',
  );

  const actor = await queryOne<any>(
    connection,
    `SELECT DISTINCT u.id, u.organization_id, u.username
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE u.deleted_at IS NULL
        AND u.status_code = 'active'
        AND u.approval_status_code = 'approved'
        AND p.code = 'craft.production.write'
      ORDER BY u.id
      LIMIT 1`,
    [],
    'authorized production actor',
  );

  const salesChannel = await queryOne<any>(
    connection,
    `SELECT id
       FROM sales_channels
      WHERE business_unit_id = ? AND is_active = 1
      ORDER BY id
      LIMIT 1`,
    [businessUnit.id],
    'active Craft sales channel',
  );
  const materialCategory = await queryOne<any>(
    connection,
    `SELECT id
       FROM material_categories
      WHERE business_unit_id = ? AND is_active = 1
      ORDER BY CASE WHEN category_type = 'filament' THEN 0 ELSE 1 END, id
      LIMIT 1`,
    [businessUnit.id],
    'active material category',
  );
  const gramUnit = await queryOne<any>(
    connection,
    `SELECT id FROM units_of_measure WHERE code = 'G' AND is_active = 1 LIMIT 1`,
    [],
    'gram unit',
  );

  const printerId = await insert(
    connection,
    `INSERT INTO printers
       (business_unit_id, code, name, brand, model, printer_type, status_code,
        total_print_hours, is_active, notes)
     VALUES (?, ?, ?, 'UNI-NEXUS', 'Smoke Virtual Fixture', 'FDM', 'available', 0, 1, ?)`,
    [
      businessUnit.id,
      `SMK-PRN-${marker}`,
      `Smoke Printer ${marker}`,
      'Temporary database fixture; not physical telemetry',
    ],
  );

  const materialId = await insert(
    connection,
    `INSERT INTO materials
       (business_unit_id, category_id, sku, name, brand, material_type, color_name,
        base_unit_id, default_unit_cost, low_stock_threshold, reorder_qty, is_active, notes)
     VALUES (?, ?, ?, ?, 'UNI-NEXUS', 'PLA', 'Smoke Yellow', ?, 250.0000, 50.0000,
             250.0000, 1, ?)`,
    [
      businessUnit.id,
      materialCategory.id,
      `SMK-MAT-${marker}`,
      `Smoke PLA ${marker}`,
      gramUnit.id,
      'Temporary database fixture',
    ],
  );

  const materialBatchId = await insert(
    connection,
    `INSERT INTO material_batches
       (material_id, batch_code, received_at, initial_qty, current_qty, reserved_qty,
        unit_cost, location_code, status_code)
     VALUES (?, ?, CURRENT_TIMESTAMP(3), 500.0000, 500.0000, 0.0000,
             250.0000, 'SMOKE', 'available')`,
    [materialId, `SMK-BATCH-${marker}`],
  );

  const replacementMaterialBatchId = await insert(
    connection,
    `INSERT INTO material_batches
       (material_id, batch_code, received_at, initial_qty, current_qty, reserved_qty,
        unit_cost, location_code, status_code)
     VALUES (?, ?, CURRENT_TIMESTAMP(3), 500.0000, 500.0000, 0.0000,
             255.0000, 'SMOKE', 'available')`,
    [materialId, `SMK-BATCH-REPLACEMENT-${marker}`],
  );

  const customerId = await insert(
    connection,
    `INSERT INTO parties
       (organization_id, code, party_kind, display_name, status_code, notes)
     VALUES (?, ?, 'internal', ?, 'active', ?)`,
    [
      businessUnit.organization_id,
      `SMK-CUST-${marker}`,
      `Smoke Customer ${marker}`,
      'Temporary database fixture',
    ],
  );

  async function seedOrder(
    suffix: string,
    itemQuantity: number,
    queuePosition: number,
  ): Promise<{ orderId: number; orderItemId: number; queueItemId: number }> {
    const orderId = await insert(
      connection,
      `INSERT INTO craft_orders
         (business_unit_id, order_code, customer_party_id, sales_channel_id, order_type,
          order_date, deadline_at, priority_code, priority_score, status_code,
          payment_status_code, subtotal, total_amount, paid_amount, created_by, internal_notes)
       VALUES (?, ?, ?, ?, 'standard', CURRENT_TIMESTAMP(3),
               DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY), 'normal', 0,
               'confirmed', 'paid', ?, ?, ?, ?, ?)`,
      [
        businessUnit.id,
        `SMK-ORD-${suffix}-${marker}`,
        customerId,
        salesChannel.id,
        itemQuantity * 100_000,
        itemQuantity * 100_000,
        itemQuantity * 100_000,
        actor.id,
        'Temporary Craft Production smoke order',
      ],
    );

    const orderItemId = await insert(
      connection,
      `INSERT INTO craft_order_items
         (order_id, item_name, item_description, quantity, unit_price, line_total,
          estimated_material_g, estimated_print_minutes)
       VALUES (?, ?, 'Temporary smoke item', ?, 100000, ?, ?, 60)`,
      [
        orderId,
        `Smoke ${suffix} Item ${marker}`,
        itemQuantity,
        itemQuantity * 100_000,
        itemQuantity * 20,
      ],
    );

    const queueItemId = await insert(
      connection,
      `INSERT INTO production_queue_items
         (business_unit_id, order_id, order_item_id, queue_position, priority_code,
          priority_score, status_code, created_by, notes)
       VALUES (?, ?, ?, ?, 'normal', 0, 'queued', ?, ?)`,
      [
        businessUnit.id,
        orderId,
        orderItemId,
        queuePosition,
        actor.id,
        'Temporary queue fixture',
      ],
    );

    return { orderId, orderItemId, queueItemId };
  }

  const success = await seedOrder('SUCCESS', 2, 1);
  const failure = await seedOrder('FAILURE', 1, 2);
  const successAttachmentId = await insert(
    connection,
    `INSERT INTO order_attachments
       (order_id, file_name, file_type, storage_path, file_size_bytes, attachment_type, uploaded_by)
     VALUES (?, ?, 'application/pdf', ?, 2048, 'brief', ?)`,
    [
      success.orderId,
      `smoke-reference-${marker}.pdf`,
      `orders/${success.orderId}/smoke-reference-${marker}.pdf`,
      actor.id,
    ],
  );

  return {
    marker,
    organizationId: numeric(businessUnit.organization_id),
    businessUnitId: numeric(businessUnit.id),
    actorUserId: numeric(actor.id),
    actorUsername: String(actor.username),
    salesChannelId: numeric(salesChannel.id),
    gramUnitId: numeric(gramUnit.id),
    printerId,
    materialId,
    materialBatchId,
    replacementMaterialBatchId,
    successAttachmentId,
    successOrderId: success.orderId,
    successOrderItemId: success.orderItemId,
    successQueueItemId: success.queueItemId,
    failureOrderId: failure.orderId,
    failureOrderItemId: failure.orderItemId,
    failureQueueItemId: failure.queueItemId,
  };
}

async function findJobId(
  connection: Connection,
  result: ApiResult,
  jobName: string,
): Promise<number> {
  const fromResponse = responseId(result.data);
  if (fromResponse) return fromResponse;
  const row = await queryOne<any>(
    connection,
    'SELECT id FROM print_jobs WHERE job_name = ? ORDER BY id DESC LIMIT 1',
    [jobName],
    `print job ${jobName}`,
  );
  return numeric(row.id);
}

async function ensureReady(
  connection: Connection,
  api: ApiClient,
  jobId: number,
): Promise<void> {
  let job = await queryOne<any>(
    connection,
    'SELECT status_code FROM print_jobs WHERE id = ?',
    [jobId],
    `print job ${jobId}`,
  );

  if (job.status_code === 'queued') {
    await api.request('POST', routes.ready(jobId), {});
    job = await queryOne<any>(
      connection,
      'SELECT status_code FROM print_jobs WHERE id = ?',
      [jobId],
      `print job ${jobId}`,
    );
  }
  assert.equal(job.status_code, 'ready', `Job ${jobId} should be ready`);
}

async function createJob(
  connection: Connection,
  api: ApiClient,
  body: JsonObject,
): Promise<number> {
  const result = await api.request('POST', routes.jobs(), body, [200, 201]);
  return findJobId(connection, result, String(body.job_name));
}

async function materialLinkId(connection: Connection, jobId: number): Promise<number> {
  const row = await queryOne<any>(
    connection,
    `SELECT id
       FROM print_job_materials
      WHERE print_job_id = ?
      ORDER BY id
      LIMIT 1`,
    [jobId],
    `material link for job ${jobId}`,
  );
  return numeric(row.id);
}

async function passQc(
  connection: Connection,
  api: ApiClient,
  jobId: number,
): Promise<void> {
  await api.request('POST', routes.qc(jobId), payloads.qcPass(), [200, 201]);
  const inspection = await queryOne<any>(
    connection,
    `SELECT qi.id, qi.result_code, qi.inspector_user_id, COUNT(qii.id) AS item_count
       FROM qc_inspections qi
       LEFT JOIN qc_inspection_items qii ON qii.inspection_id = qi.id
      WHERE qi.print_job_id = ?
      GROUP BY qi.id, qi.result_code, qi.inspector_user_id`,
    [jobId],
    `QC inspection for job ${jobId}`,
  );
  assert.equal(inspection.result_code, 'pass');
  assert(numeric(inspection.inspector_user_id) > 0);
  assert.equal(numeric(inspection.item_count), 1);

  const job = await queryOne<any>(
    connection,
    'SELECT status_code FROM print_jobs WHERE id = ?',
    [jobId],
  );
  assert.equal(job.status_code, 'completed');
}

async function finishTrackedJob(
  connection: Connection,
  api: ApiClient,
  fixtures: FixtureIds,
  jobId: number,
  actualMinutes: number,
  actualQty: number,
): Promise<void> {
  const linkId = await materialLinkId(connection, jobId);
  await api.request(
    'POST',
    routes.finish(jobId),
    payloads.finish({
      materialLinkId: linkId,
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      actualMinutes,
      actualQty,
    }),
  );

  const job = await queryOne<any>(
    connection,
    `SELECT status_code, progress_percent, actual_print_minutes, actual_material_g
       FROM print_jobs WHERE id = ?`,
    [jobId],
  );
  assert.equal(job.status_code, 'qc');
  assertApproximately(job.progress_percent, 100, `Job ${jobId} progress`);
  assert.equal(numeric(job.actual_print_minutes), actualMinutes);
  assertApproximately(job.actual_material_g, actualQty, `Job ${jobId} material grams`);

  const usage = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS movement_count, COALESCE(SUM(quantity), 0) AS quantity
       FROM inventory_movements
      WHERE movement_type = 'production_usage'
        AND reference_type = 'print_job'
        AND reference_id = ?`,
    [jobId],
  );
  assert.equal(numeric(usage.movement_count), 1);
  assertApproximately(usage.quantity, actualQty, `Job ${jobId} production usage`);
}

async function runHttpLifecycle(
  connection: Connection,
  api: ApiClient,
  fixtures: FixtureIds,
): Promise<void> {
  console.log('[smoke] queue attachment references');

  const queue = await api.request('GET', routes.queue());
  const queueItems = collection(queue.data, 'items');
  assert.equal(queueItems.length, 2);
  const successQueueItem = queueItems.find((item) => numeric(item.id) === fixtures.successQueueItemId);
  assert(successQueueItem, 'Success queue item should be returned');
  const queueAttachments = collection(successQueueItem, 'order_attachments');
  assert.equal(queueAttachments.length, 1);
  assert.equal(numeric(queueAttachments[0].id), fixtures.successAttachmentId);
  assert.equal(queueAttachments[0].attachment_type, 'brief');
  assert.equal(queueAttachments[0].file_size_bytes, 2048);
  assert(queueAttachments[0].uploaded_by_name, 'Attachment uploader name should be returned');
  assert(!Object.prototype.hasOwnProperty.call(queueAttachments[0], 'storage_path'));

  console.log('[smoke] ready-job planning edit and reservation replacement');
  const insufficientAutomaticName = `Smoke Automatic Insufficient ${fixtures.marker}`;
  const insufficientAutomatic = await api.request(
    'POST',
    routes.jobs(),
    payloads.createJob({
      queueItemId: null,
      jobName: insufficientAutomaticName,
      quantity: 1,
      printerId: fixtures.printerId,
      operatorUserId: fixtures.actorUserId,
      estimatedPrintMinutes: 30,
      estimatedMaterialG: 750,
      material: {
        materialId: fixtures.materialId,
        batchId: null,
        unitId: fixtures.gramUnitId,
        plannedQty: 750,
      },
    }),
    [409],
  );
  assert.equal(errorCode(insufficientAutomatic), 'INSUFFICIENT_MATERIAL');
  const rolledBackAutomatic = await queryOne<any>(
    connection,
    'SELECT COUNT(*) AS job_count FROM print_jobs WHERE job_name = ?',
    [insufficientAutomaticName],
  );
  assert.equal(numeric(rolledBackAutomatic.job_count), 0);

  const editableOriginalName = `Smoke Editable Plan ${fixtures.marker}`;
  const editableJobId = await createJob(
    connection,
    api,
    payloads.createJob({
      queueItemId: null,
      jobName: editableOriginalName,
      quantity: 1,
      printerId: fixtures.printerId,
      operatorUserId: fixtures.actorUserId,
      estimatedPrintMinutes: 30,
      estimatedMaterialG: 10,
      material: {
        materialId: fixtures.materialId,
        batchId: null,
        unitId: fixtures.gramUnitId,
        plannedQty: 10,
      },
    }),
  );
  await ensureReady(connection, api, editableJobId);
  const originalReservation = await queryOne<any>(
    connection,
    `SELECT id, material_batch_id, quantity, status_code
       FROM stock_reservations
      WHERE reference_type = 'print_job' AND reference_id = ? AND status_code = 'reserved'`,
    [editableJobId],
    'original editable-job reservation',
  );
  assert.equal(numeric(originalReservation.material_batch_id), fixtures.materialBatchId);
  assertApproximately(originalReservation.quantity, 10, 'Original editable-job reservation');
  const automaticPlan = await queryOne<any>(
    connection,
    'SELECT material_batch_id FROM print_job_materials WHERE print_job_id = ?',
    [editableJobId],
    'automatically batched material plan',
  );
  assert.equal(numeric(automaticPlan.material_batch_id), fixtures.materialBatchId);

  const immutableQuantityAttempt = await api.request(
    'PATCH',
    routes.update(editableJobId),
    { quantity: 2 },
    [400],
  );
  assert.equal(errorCode(immutableQuantityAttempt), 'VALIDATION_ERROR');

  const editableName = `${editableOriginalName} Updated`;
  const editResult = await api.request(
    'PATCH',
    routes.update(editableJobId),
    {
      job_name: editableName,
      printer_id: fixtures.printerId,
      operator_user_id: fixtures.actorUserId,
      print_profile_id: null,
      design_file_id: null,
      estimated_print_minutes: 35,
      estimated_material_g: 12,
      notes: 'Updated atomically by isolated smoke test',
      materials: [
        {
          material_id: fixtures.materialId,
          material_batch_id: fixtures.replacementMaterialBatchId,
          planned_qty: 12,
          unit_id: fixtures.gramUnitId,
          reserve: true,
        },
      ],
    },
  );
  assert.equal(numeric(editResult.data.id), editableJobId);
  assert.equal(editResult.data.status_code, 'ready');
  assert.equal(editResult.data.materials_replaced, true);

  const editedJob = await queryOne<any>(
    connection,
    `SELECT job_name, quantity, status_code, queue_item_id, order_id, order_item_id,
            estimated_print_minutes, estimated_material_g
       FROM print_jobs WHERE id = ?`,
    [editableJobId],
  );
  assert.equal(editedJob.job_name, editableName);
  assertApproximately(editedJob.quantity, 1, 'Edited job immutable quantity');
  assert.equal(editedJob.status_code, 'ready');
  assert.equal(editedJob.queue_item_id, null);
  assert.equal(editedJob.order_id, null);
  assert.equal(editedJob.order_item_id, null);
  assert.equal(numeric(editedJob.estimated_print_minutes), 35);
  assertApproximately(editedJob.estimated_material_g, 12, 'Edited job material estimate');

  const releasedOriginal = await queryOne<any>(
    connection,
    `SELECT status_code FROM stock_reservations WHERE id = ?`,
    [originalReservation.id],
    'released original reservation',
  );
  assert.equal(releasedOriginal.status_code, 'released');
  const replacementPlan = await queryOne<any>(
    connection,
    `SELECT pjm.material_batch_id, pjm.planned_qty, pjm.unit_id,
            sr.id AS reservation_id, sr.status_code AS reservation_status, sr.quantity AS reservation_qty
       FROM print_job_materials pjm
       LEFT JOIN stock_reservations sr ON sr.id = pjm.reservation_id
      WHERE pjm.print_job_id = ?`,
    [editableJobId],
    'replacement material plan',
  );
  assert.equal(numeric(replacementPlan.material_batch_id), fixtures.replacementMaterialBatchId);
  assertApproximately(replacementPlan.planned_qty, 12, 'Replacement planned material');
  assert.equal(numeric(replacementPlan.unit_id), fixtures.gramUnitId);
  assert.equal(replacementPlan.reservation_status, 'reserved');
  assertApproximately(replacementPlan.reservation_qty, 12, 'Replacement reservation');

  let originalBatch = await queryOne<any>(
    connection,
    'SELECT reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  let replacementBatch = await queryOne<any>(
    connection,
    'SELECT reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.replacementMaterialBatchId],
  );
  assertApproximately(originalBatch.reserved_qty, 0, 'Old reservation released after edit');
  assertApproximately(replacementBatch.reserved_qty, 12, 'New reservation held after edit');

  const updateAudit = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS audit_count FROM audit_logs
      WHERE action_code = 'production.job_update' AND entity_type = 'print_job' AND entity_id = ?`,
    [editableJobId],
  );
  assert.equal(numeric(updateAudit.audit_count), 1);

  await api.request('POST', routes.cancel(editableJobId), { reason: 'Smoke edit verification complete' });
  replacementBatch = await queryOne<any>(
    connection,
    'SELECT reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.replacementMaterialBatchId],
  );
  assertApproximately(replacementBatch.reserved_qty, 0, 'Replacement reservation released on cleanup');

  console.log('[smoke] concurrent printer ownership');
  const contenderNames = [
    `Smoke Concurrent A ${fixtures.marker}`,
    `Smoke Concurrent B ${fixtures.marker}`,
  ];
  const contenderIds = await Promise.all(contenderNames.map((jobName) => createJob(
    connection,
    api,
    payloads.createJob({
      queueItemId: null,
      jobName,
      quantity: 1,
      printerId: fixtures.printerId,
      operatorUserId: fixtures.actorUserId,
      estimatedPrintMinutes: 15,
    }),
  )));
  await Promise.all(contenderIds.map((jobId) => ensureReady(connection, api, jobId)));
  const concurrentStarts = await Promise.all(contenderIds.map((jobId) => api.request(
    'POST',
    routes.start(jobId),
    { operator_user_id: fixtures.actorUserId },
    [200, 409],
  )));
  const winningIndexes = concurrentStarts.flatMap((result, index) => result.status === 200 ? [index] : []);
  const losingIndexes = concurrentStarts.flatMap((result, index) => result.status === 409 ? [index] : []);
  assert.equal(winningIndexes.length, 1, 'Exactly one concurrent start should acquire the printer');
  assert.equal(losingIndexes.length, 1, 'Exactly one concurrent start should conflict');
  assert.equal(errorCode(concurrentStarts[losingIndexes[0]]), 'PRINTER_BUSY');
  const concurrentWinnerId = contenderIds[winningIndexes[0]];
  const concurrentLoserId = contenderIds[losingIndexes[0]];
  await api.request('POST', routes.fail(concurrentWinnerId), {
    failure_type: 'other',
    failure_stage: 'startup',
    description: 'Cleanup after concurrent printer ownership smoke assertion',
    material_wasted_qty: null,
    material_id: null,
    batch_id: null,
    estimated_loss: 0,
    requires_reprint: false,
    printer_has_issue: false,
  }, [200, 201]);
  await api.request('POST', routes.cancel(concurrentLoserId), { reason: 'Concurrent smoke cleanup' });
  const releasedPrinter = await queryOne<any>(
    connection,
    'SELECT status_code FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  assert.equal(releasedPrinter.status_code, 'available');

  console.log('[smoke] queue split and material reservation');

  const firstJobBody = payloads.createJob({
    queueItemId: fixtures.successQueueItemId,
    jobName: `Smoke Success Part A ${fixtures.marker}`,
    quantity: 1,
    printerId: fixtures.printerId,
    operatorUserId: fixtures.actorUserId,
    estimatedPrintMinutes: 60,
    estimatedMaterialG: 20,
    material: {
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      plannedQty: 20,
    },
  });
  const secondJobBody = payloads.createJob({
    queueItemId: fixtures.successQueueItemId,
    jobName: `Smoke Success Part B ${fixtures.marker}`,
    quantity: 1,
    printerId: fixtures.printerId,
    operatorUserId: fixtures.actorUserId,
    estimatedPrintMinutes: 60,
    estimatedMaterialG: 20,
    material: {
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      plannedQty: 20,
    },
  });

  const firstJobId = await createJob(connection, api, firstJobBody);
  const secondJobId = await createJob(connection, api, secondJobBody);
  assert.notEqual(firstJobId, secondJobId);
  await ensureReady(connection, api, firstJobId);
  await ensureReady(connection, api, secondJobId);

  const firstJobDetail = await api.request('GET', routes.job(firstJobId));
  const detailAttachments = collection(firstJobDetail.data, 'order_attachments');
  assert.equal(detailAttachments.length, 1);
  assert.equal(numeric(detailAttachments[0].id), fixtures.successAttachmentId);
  assert(!Object.prototype.hasOwnProperty.call(detailAttachments[0], 'storage_path'));
  const detailMaterials = collection(firstJobDetail.data, 'materials');
  assert.equal(detailMaterials.length, 1);
  assert.equal(Boolean(detailMaterials[0].is_reserved), true);
  assert.equal(detailMaterials[0].reservation_status, 'reserved');

  const jakartaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const jakartaPart = (type: Intl.DateTimeFormatPartTypes) =>
    jakartaParts.find((part) => part.type === type)?.value || '';
  const jakartaDay = `${jakartaPart('year')}-${jakartaPart('month')}-${jakartaPart('day')}`;
  const dayFilters = new URLSearchParams({
    dateFrom: jakartaDay,
    dateTo: jakartaDay,
    search: String(firstJobBody.job_name),
  });
  const sameJakartaDay = await api.request('GET', `${routes.jobs()}?${dayFilters.toString()}`);
  assert(
    collection(sameJakartaDay.data, 'items').some((job) => numeric(job.id) === firstJobId),
    'Jakarta local-day filter should include a job created today',
  );

  const split = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS job_count, SUM(quantity) AS planned_quantity,
            COUNT(DISTINCT job_code) AS distinct_codes
       FROM print_jobs
      WHERE queue_item_id = ?`,
    [fixtures.successQueueItemId],
  );
  assert.equal(numeric(split.job_count), 2);
  assertApproximately(split.planned_quantity, 2, 'Split planned quantity');
  assert.equal(numeric(split.distinct_codes), 2);

  const reservations = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS reservation_count, SUM(quantity) AS quantity
       FROM stock_reservations
      WHERE reference_type = 'print_job'
        AND reference_id IN (?, ?)
        AND status_code = 'reserved'`,
    [firstJobId, secondJobId],
  );
  assert.equal(numeric(reservations.reservation_count), 2);
  assertApproximately(reservations.quantity, 40, 'Initial reserved material');

  let batch = await queryOne<any>(
    connection,
    'SELECT current_qty, reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  assertApproximately(batch.current_qty, 500, 'Initial batch quantity');
  assertApproximately(batch.reserved_qty, 40, 'Batch reserved quantity');

  const queuedRequirement = await queryOne<any>(
    connection,
    'SELECT status_code FROM production_queue_items WHERE id = ?',
    [fixtures.successQueueItemId],
  );
  assert.equal(queuedRequirement.status_code, 'scheduled');

  console.log('[smoke] scheduled queue duplicate guard');
  await connection.execute(
    `UPDATE craft_orders SET status_code = 'ready' WHERE id = ?`,
    [fixtures.successOrderId],
  );
  const queueCountBeforeEnqueue = await queryOne<any>(
    connection,
    'SELECT COUNT(*) AS queue_count FROM production_queue_items WHERE order_item_id = ?',
    [fixtures.successOrderItemId],
  );
  const { CraftOrdersService } = await import('../src/modules/craft-orders/craft-orders.service');
  await new CraftOrdersService().enqueueOrderItems(
    fixtures.successOrderId,
    [fixtures.successOrderItemId],
    fixtures.actorUserId,
    fixtures.businessUnitId,
  );
  const queueCountAfterEnqueue = await queryOne<any>(
    connection,
    'SELECT COUNT(*) AS queue_count FROM production_queue_items WHERE order_item_id = ?',
    [fixtures.successOrderItemId],
  );
  assert.equal(numeric(queueCountAfterEnqueue.queue_count), numeric(queueCountBeforeEnqueue.queue_count));
  assert.equal(numeric(queueCountAfterEnqueue.queue_count), 1);

  console.log('[smoke] split-job queue schedule aggregation');
  const aggregateFirstStart = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  aggregateFirstStart.setUTCSeconds(0, 0);
  const aggregateSecondStart = new Date(aggregateFirstStart.getTime() + 2 * 60 * 60 * 1_000);
  await api.request('PATCH', routes.schedule(firstJobId), payloads.schedule(aggregateFirstStart.toISOString(), 60));
  await api.request('PATCH', routes.schedule(secondJobId), payloads.schedule(aggregateSecondStart.toISOString(), 60));
  let aggregateSchedule = await queryOne<any>(
    connection,
    `SELECT pqi.scheduled_start_at AS queue_start, pqi.scheduled_end_at AS queue_end,
            first_job.scheduled_start_at AS first_start, first_job.estimated_finish_at AS first_end,
            second_job.scheduled_start_at AS second_start, second_job.estimated_finish_at AS second_end
       FROM production_queue_items pqi
       JOIN print_jobs first_job ON first_job.id = ?
       JOIN print_jobs second_job ON second_job.id = ?
      WHERE pqi.id = ?`,
    [firstJobId, secondJobId, fixtures.successQueueItemId],
    'aggregate queue schedule',
  );
  assert.equal(new Date(aggregateSchedule.queue_start).getTime(), new Date(aggregateSchedule.first_start).getTime());
  assert.equal(new Date(aggregateSchedule.queue_end).getTime(), new Date(aggregateSchedule.second_end).getTime());

  await api.request('PATCH', routes.schedule(firstJobId), { scheduled_start_at: null });
  aggregateSchedule = await queryOne<any>(
    connection,
    `SELECT pqi.scheduled_start_at AS queue_start, pqi.scheduled_end_at AS queue_end,
            second_job.scheduled_start_at AS second_start, second_job.estimated_finish_at AS second_end
       FROM production_queue_items pqi
       JOIN print_jobs second_job ON second_job.id = ?
      WHERE pqi.id = ?`,
    [secondJobId, fixtures.successQueueItemId],
    'remaining queue schedule',
  );
  assert.equal(new Date(aggregateSchedule.queue_start).getTime(), new Date(aggregateSchedule.second_start).getTime());
  assert.equal(new Date(aggregateSchedule.queue_end).getTime(), new Date(aggregateSchedule.second_end).getTime());

  await api.request('PATCH', routes.schedule(secondJobId), { scheduled_start_at: null });
  aggregateSchedule = await queryOne<any>(
    connection,
    'SELECT scheduled_start_at AS queue_start, scheduled_end_at AS queue_end FROM production_queue_items WHERE id = ?',
    [fixtures.successQueueItemId],
    'cleared aggregate queue schedule',
  );
  assert.equal(aggregateSchedule.queue_start, null);
  assert.equal(aggregateSchedule.queue_end, null);

  console.log('[smoke] start synchronization and busy-printer protection');
  await api.request('POST', routes.start(firstJobId), {
    operator_user_id: fixtures.actorUserId,
  });

  let firstJob = await queryOne<any>(
    connection,
    'SELECT status_code, progress_percent, started_at FROM print_jobs WHERE id = ?',
    [firstJobId],
  );
  assert.equal(firstJob.status_code, 'printing');
  assertApproximately(firstJob.progress_percent, 0, 'Started job progress');
  assert(firstJob.started_at, 'Started job should have started_at');

  let printer = await queryOne<any>(
    connection,
    'SELECT status_code, total_print_hours FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  assert.equal(printer.status_code, 'busy');

  let order = await queryOne<any>(
    connection,
    'SELECT status_code FROM craft_orders WHERE id = ?',
    [fixtures.successOrderId],
  );
  assert.equal(order.status_code, 'in_production');

  let queueItem = await queryOne<any>(
    connection,
    'SELECT status_code FROM production_queue_items WHERE id = ?',
    [fixtures.successQueueItemId],
  );
  assert.equal(queueItem.status_code, 'printing');

  const busyAttempt = await api.request(
    'POST',
    routes.start(secondJobId),
    { operator_user_id: fixtures.actorUserId },
    [409],
  );
  assert.equal(errorCode(busyAttempt), 'PRINTER_BUSY');
  const stillReady = await queryOne<any>(
    connection,
    'SELECT status_code, started_at FROM print_jobs WHERE id = ?',
    [secondJobId],
  );
  assert.equal(stillReady.status_code, 'ready');
  assert.equal(stillReady.started_at, null);

  const startHistory = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS history_count
       FROM print_job_status_history
      WHERE print_job_id = ? AND to_status_code = 'printing'`,
    [firstJobId],
  );
  assert.equal(numeric(startHistory.history_count), 1);
  const orderHistory = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS history_count
       FROM craft_order_status_history
      WHERE order_id = ? AND to_status_code = 'in_production'`,
    [fixtures.successOrderId],
  );
  assert.equal(numeric(orderHistory.history_count), 1);

  console.log('[smoke] pause, resume, and manual progress');
  await api.request('POST', routes.pause(firstJobId), { reason: 'Smoke pause' });
  firstJob = await queryOne<any>(
    connection,
    'SELECT status_code FROM print_jobs WHERE id = ?',
    [firstJobId],
  );
  assert.equal(firstJob.status_code, 'paused');
  printer = await queryOne<any>(
    connection,
    'SELECT status_code FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  assert.equal(printer.status_code, 'busy');

  await api.request('POST', routes.resume(firstJobId), { reason: 'Smoke resume' });
  await api.request('PATCH', routes.progress(firstJobId), {
    progress_percent: 42.5,
    reason: 'Smoke manual progress',
  });
  firstJob = await queryOne<any>(
    connection,
    'SELECT status_code, progress_percent FROM print_jobs WHERE id = ?',
    [firstJobId],
  );
  assert.equal(firstJob.status_code, 'printing');
  assertApproximately(firstJob.progress_percent, 42.5, 'Manual progress');

  const incompleteFinish = await api.request(
    'POST',
    routes.finish(firstJobId),
    { actual_print_minutes: 24, actual_material_g: 0, materials: [] },
    [400],
  );
  assert.equal(errorCode(incompleteFinish), 'ACTUAL_MATERIALS_INCOMPLETE');
  const unchangedAfterIncomplete = await queryOne<any>(
    connection,
    `SELECT pj.status_code, p.status_code AS printer_status, sr.status_code AS reservation_status
       FROM print_jobs pj
       JOIN printers p ON p.id = pj.printer_id
       JOIN print_job_materials pjm ON pjm.print_job_id = pj.id
       JOIN stock_reservations sr ON sr.id = pjm.reservation_id
      WHERE pj.id = ?`,
    [firstJobId],
    'job after incomplete material finish',
  );
  assert.equal(unchangedAfterIncomplete.status_code, 'printing');
  assert.equal(unchangedAfterIncomplete.printer_status, 'busy');
  assert.equal(unchangedAfterIncomplete.reservation_status, 'reserved');

  console.log('[smoke] physical finish, inventory consumption, and printer hours');
  await finishTrackedJob(connection, api, fixtures, firstJobId, 24, 22.5);
  printer = await queryOne<any>(
    connection,
    'SELECT status_code, total_print_hours FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  assert.equal(printer.status_code, 'available');
  assertApproximately(printer.total_print_hours, 0.4, 'Printer hours after first finish');
  queueItem = await queryOne<any>(
    connection,
    'SELECT status_code FROM production_queue_items WHERE id = ?',
    [fixtures.successQueueItemId],
  );
  assert.equal(queueItem.status_code, 'scheduled', 'QC-only/pending queue work should not remain physically printing');

  batch = await queryOne<any>(
    connection,
    'SELECT current_qty, reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  assertApproximately(batch.current_qty, 477.5, 'Batch after first finish');
  assertApproximately(batch.reserved_qty, 20, 'Remaining second-job reservation');

  const beforeReplay = {
    hours: numeric(printer.total_print_hours),
    currentQty: numeric(batch.current_qty),
  };
  const firstMaterialLinkId = await materialLinkId(connection, firstJobId);
  await api.request(
    'POST',
    routes.finish(firstJobId),
    payloads.finish({
      materialLinkId: firstMaterialLinkId,
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      actualMinutes: 24,
      actualQty: 22.5,
    }),
    [200, 400, 409],
  );
  printer = await queryOne<any>(
    connection,
    'SELECT total_print_hours FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  batch = await queryOne<any>(
    connection,
    'SELECT current_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  assertApproximately(printer.total_print_hours, beforeReplay.hours, 'Idempotent printer hours');
  assertApproximately(batch.current_qty, beforeReplay.currentQty, 'Idempotent material usage');

  console.log('[smoke] QC pass and order completion aggregation');
  await passQc(connection, api, firstJobId);
  order = await queryOne<any>(
    connection,
    'SELECT status_code FROM craft_orders WHERE id = ?',
    [fixtures.successOrderId],
  );
  assert.equal(order.status_code, 'in_production');

  await api.request('POST', routes.start(secondJobId), {
    operator_user_id: fixtures.actorUserId,
  });
  await finishTrackedJob(connection, api, fixtures, secondJobId, 18, 18);
  await passQc(connection, api, secondJobId);

  order = await queryOne<any>(
    connection,
    'SELECT status_code, completed_at FROM craft_orders WHERE id = ?',
    [fixtures.successOrderId],
  );
  assert.equal(order.status_code, 'completed');
  assert(order.completed_at, 'Completed order should have completed_at');
  queueItem = await queryOne<any>(
    connection,
    'SELECT status_code FROM production_queue_items WHERE id = ?',
    [fixtures.successQueueItemId],
  );
  assert.equal(queueItem.status_code, 'completed');

  const completedHistory = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS history_count
       FROM craft_order_status_history
      WHERE order_id = ? AND to_status_code = 'completed'`,
    [fixtures.successOrderId],
  );
  assert.equal(numeric(completedHistory.history_count), 1);

  printer = await queryOne<any>(
    connection,
    'SELECT status_code, total_print_hours FROM printers WHERE id = ?',
    [fixtures.printerId],
  );
  assert.equal(printer.status_code, 'available');
  assertApproximately(printer.total_print_hours, 0.7, 'Printer hours after successful order');
  batch = await queryOne<any>(
    connection,
    'SELECT current_qty, reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  assertApproximately(batch.current_qty, 459.5, 'Batch after successful order');
  assertApproximately(batch.reserved_qty, 0, 'Reservations after successful order');

  console.log('[smoke] print failure, waste, and printer release');
  const failedJobBody = payloads.createJob({
    queueItemId: fixtures.failureQueueItemId,
    jobName: `Smoke Failed Print ${fixtures.marker}`,
    quantity: 1,
    printerId: fixtures.printerId,
    operatorUserId: fixtures.actorUserId,
    estimatedPrintMinutes: 50,
    estimatedMaterialG: 25,
    material: {
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      plannedQty: 25,
    },
  });
  const failedJobId = await createJob(connection, api, failedJobBody);
  await ensureReady(connection, api, failedJobId);
  await api.request('POST', routes.start(failedJobId), {
    operator_user_id: fixtures.actorUserId,
  });

  const failureResult = await api.request(
    'POST',
    routes.fail(failedJobId),
    payloads.failure({
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      wastedQty: 15,
    }),
    [200, 201],
  );

  let failureId = responseId(failureResult.data, 'failure_id');
  if (!failureId) {
    const failure = await queryOne<any>(
      connection,
      'SELECT id FROM print_failures WHERE print_job_id = ?',
      [failedJobId],
      `failure for job ${failedJobId}`,
    );
    failureId = numeric(failure.id);
  }

  const failedState = await queryOne<any>(
    connection,
    `SELECT pj.status_code AS job_status, p.status_code AS printer_status,
            pq.status_code AS queue_status, pf.failure_type, pf.material_wasted_g,
            pf.requires_reprint, pf.reprint_job_id
       FROM print_jobs pj
       JOIN printers p ON p.id = pj.printer_id
       JOIN production_queue_items pq ON pq.id = pj.queue_item_id
       JOIN print_failures pf ON pf.print_job_id = pj.id
      WHERE pj.id = ?`,
    [failedJobId],
  );
  assert.equal(failedState.job_status, 'failed');
  assert.equal(failedState.printer_status, 'available');
  assert.equal(failedState.queue_status, 'queued');
  assert.equal(failedState.failure_type, 'spaghetti');
  assertApproximately(failedState.material_wasted_g, 15, 'Failure wasted grams');
  assert.equal(numeric(failedState.requires_reprint), 1);
  assert.equal(failedState.reprint_job_id, null);

  const waste = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS waste_count, SUM(quantity) AS quantity
       FROM material_waste
      WHERE print_job_id = ? AND waste_reason = 'failed_print'`,
    [failedJobId],
  );
  assert.equal(numeric(waste.waste_count), 1);
  assertApproximately(waste.quantity, 15, 'Failure material waste');

  const wasteMovement = await queryOne<any>(
    connection,
    `SELECT COUNT(*) AS movement_count, SUM(quantity) AS quantity
       FROM inventory_movements
      WHERE movement_type = 'waste'
        AND reference_type = 'print_job'
        AND reference_id = ?`,
    [failedJobId],
  );
  assert.equal(numeric(wasteMovement.movement_count), 1);
  assertApproximately(wasteMovement.quantity, 15, 'Failure waste movement');

  batch = await queryOne<any>(
    connection,
    'SELECT current_qty, reserved_qty FROM material_batches WHERE id = ?',
    [fixtures.materialBatchId],
  );
  assertApproximately(batch.current_qty, 444.5, 'Batch after failed print');
  assertApproximately(batch.reserved_qty, 0, 'Reservations after failed print');

  const failureReservation = await queryOne<any>(
    connection,
    `SELECT status_code FROM stock_reservations
      WHERE reference_type = 'print_job' AND reference_id = ?`,
    [failedJobId],
    'failed-job reservation',
  );
  assert.notEqual(failureReservation.status_code, 'reserved');

  console.log('[smoke] reprint creation and idempotency');
  const reprintBody = payloads.createJob({
    queueItemId: fixtures.failureQueueItemId,
    jobName: `Smoke Reprint ${fixtures.marker}`,
    quantity: 1,
    printerId: fixtures.printerId,
    operatorUserId: fixtures.actorUserId,
    estimatedPrintMinutes: 60,
    estimatedMaterialG: 25,
    material: {
      materialId: fixtures.materialId,
      batchId: fixtures.materialBatchId,
      unitId: fixtures.gramUnitId,
      plannedQty: 25,
    },
  });
  const reprintResult = await api.request(
    'POST',
    routes.reprint(failureId),
    reprintBody,
    [200, 201],
  );
  const reprintJobId = await findJobId(connection, reprintResult, String(reprintBody.job_name));
  assert.notEqual(reprintJobId, failedJobId);
  await ensureReady(connection, api, reprintJobId);

  let failureLink = await queryOne<any>(
    connection,
    'SELECT reprint_job_id FROM print_failures WHERE id = ?',
    [failureId],
  );
  assert.equal(numeric(failureLink.reprint_job_id), reprintJobId);

  const beforeRepeat = await queryOne<any>(
    connection,
    'SELECT COUNT(*) AS job_count FROM print_jobs WHERE queue_item_id = ?',
    [fixtures.failureQueueItemId],
  );
  const repeatedReprint = await api.request(
    'POST',
    routes.reprint(failureId),
    reprintBody,
    [200, 201, 400, 409],
  );
  if (repeatedReprint.status === 200 || repeatedReprint.status === 201) {
    const returnedId = responseId(repeatedReprint.data);
    if (returnedId) assert.equal(returnedId, reprintJobId);
  }
  const afterRepeat = await queryOne<any>(
    connection,
    'SELECT COUNT(*) AS job_count FROM print_jobs WHERE queue_item_id = ?',
    [fixtures.failureQueueItemId],
  );
  assert.equal(numeric(afterRepeat.job_count), numeric(beforeRepeat.job_count));
  failureLink = await queryOne<any>(
    connection,
    'SELECT reprint_job_id FROM print_failures WHERE id = ?',
    [failureId],
  );
  assert.equal(numeric(failureLink.reprint_job_id), reprintJobId);
  const historicalFailure = await queryOne<any>(
    connection,
    'SELECT status_code FROM print_jobs WHERE id = ?',
    [failedJobId],
  );
  assert.equal(historicalFailure.status_code, 'failed');

  console.log('[smoke] scheduling, calendar synchronization, and overlap conflict');
  const internalJobBody = payloads.createJob({
    queueItemId: null,
    jobName: `Smoke Calendar Internal ${fixtures.marker}`,
    quantity: 1,
    printerId: fixtures.printerId,
    operatorUserId: fixtures.actorUserId,
    estimatedPrintMinutes: 45,
  });
  const internalJobId = await createJob(connection, api, internalJobBody);
  await ensureReady(connection, api, internalJobId);

  const firstStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000);
  firstStart.setUTCSeconds(0, 0);
  const secondStart = new Date(firstStart.getTime() + 2 * 60 * 60 * 1_000);
  const overlappingStart = new Date(firstStart.getTime() + 30 * 60 * 1_000);

  await api.request(
    'PATCH',
    routes.schedule(reprintJobId),
    payloads.schedule(firstStart.toISOString(), 60),
  );
  await api.request(
    'PATCH',
    routes.schedule(internalJobId),
    payloads.schedule(secondStart.toISOString(), 45),
  );

  const calendarRows = await queryRows<any>(
    connection,
    `SELECT source_id, event_type, source_type, start_at, end_at
       FROM calendar_events
      WHERE source_type = 'print_job' AND source_id IN (?, ?)
      ORDER BY source_id`,
    [reprintJobId, internalJobId],
  );
  assert.equal(calendarRows.length, 2);
  assert(calendarRows.every((row) => row.event_type === 'production'));

  const internalBeforeConflict = await queryOne<any>(
    connection,
    `SELECT scheduled_start_at, estimated_finish_at
       FROM print_jobs WHERE id = ?`,
    [internalJobId],
  );
  const conflict = await api.request(
    'PATCH',
    routes.schedule(internalJobId),
    payloads.schedule(overlappingStart.toISOString(), 45),
    [409],
  );
  assert.equal(errorCode(conflict), 'PRINTER_SCHEDULE_CONFLICT');

  const internalAfterConflict = await queryOne<any>(
    connection,
    `SELECT scheduled_start_at, estimated_finish_at
       FROM print_jobs WHERE id = ?`,
    [internalJobId],
  );
  assert.equal(
    new Date(internalAfterConflict.scheduled_start_at).getTime(),
    new Date(internalBeforeConflict.scheduled_start_at).getTime(),
  );
  assert.equal(
    new Date(internalAfterConflict.estimated_finish_at).getTime(),
    new Date(internalBeforeConflict.estimated_finish_at).getTime(),
  );

  const rangeStart = new Date(firstStart.getTime() - 24 * 60 * 60 * 1_000).toISOString();
  const rangeEnd = new Date(secondStart.getTime() + 24 * 60 * 60 * 1_000).toISOString();
  const calendar = await api.request(
    'GET',
    routes.calendar(rangeStart, rangeEnd, fixtures.printerId),
  );
  const events = collection(calendar.data, 'events');
  const eventJobIds = new Set(events.map((event) => numeric(event.print_job_id)));
  assert(eventJobIds.has(reprintJobId));
  assert(eventJobIds.has(internalJobId));

  console.log('[smoke] all Craft Production lifecycle assertions passed');
}

async function closeHttpServer(server: Server | undefined): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeIdleConnections?.();
  });
}

async function main(): Promise<void> {
  const temporaryDatabase = createTemporaryDatabaseName();
  const marker = temporaryDatabase.slice(-18).replace(/_/g, '-').toUpperCase();
  const resources: RuntimeResources = { databaseCreated: false };
  let cleanupPromise: Promise<void> | undefined;

  const adminConfig = {
    host: requiredEnvironment('DB_HOST'),
    port: Number(requiredEnvironment('DB_PORT')),
    user: requiredEnvironment('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
  };
  assert(Number.isInteger(adminConfig.port) && adminConfig.port > 0, 'DB_PORT must be valid');

  async function cleanup(): Promise<void> {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      const cleanupErrors: unknown[] = [];

      try {
        await closeHttpServer(resources.httpServer);
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await resources.appPool?.end();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await resources.fixtureConnection?.end();
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (resources.databaseCreated) {
        assertTemporaryDatabaseName(temporaryDatabase);
        let dropConnection = resources.adminConnection;
        let ownsDropConnection = false;
        try {
          if (!dropConnection) {
            dropConnection = await mysql.createConnection(adminConfig);
            ownsDropConnection = true;
          }
          const schema = await queryRows<any>(
            dropConnection,
            `SELECT SCHEMA_NAME
               FROM information_schema.SCHEMATA
              WHERE SCHEMA_NAME = ?`,
            [temporaryDatabase],
          );
          if (schema.length === 1) {
            await dropConnection.query(`DROP DATABASE ${quoteTemporaryDatabase(temporaryDatabase)}`);
            console.log(`[smoke] dropped temporary database ${temporaryDatabase}`);
          }
          resources.databaseCreated = false;
        } catch (error) {
          cleanupErrors.push(error);
        } finally {
          if (ownsDropConnection) {
            try {
              await dropConnection?.end();
            } catch (error) {
              cleanupErrors.push(error);
            }
          }
        }
      }

      try {
        await resources.adminConnection?.end();
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, 'Craft Production smoke cleanup failed');
      }
    })();
    return cleanupPromise;
  }

  for (const [signal, exitCode] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] as const) {
    process.once(signal, () => {
      console.error(`[smoke] received ${signal}; cleaning up`);
      void cleanup()
        .catch((error) => console.error(error))
        .finally(() => {
          process.exitCode = exitCode;
        });
    });
  }

  try {
    console.log(`[smoke] creating isolated database ${temporaryDatabase}`);
    resources.adminConnection = await mysql.createConnection(adminConfig);
    await resources.adminConnection.query(
      `CREATE DATABASE ${quoteTemporaryDatabase(temporaryDatabase)} ` +
        'CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
    );
    resources.databaseCreated = true;

    const dumpSql = await readFile(SQL_DUMP_PATH, 'utf8');
    assert(
      !/^\s*(?:USE|CREATE\s+DATABASE|DROP\s+DATABASE)\b/im.test(dumpSql),
      'SQL dump unexpectedly selects, creates, or drops a database',
    );
    assert(dumpSql.includes('CREATE TABLE `print_jobs`'), 'SQL dump is missing print_jobs');
    assert(
      dumpSql.includes('CREATE TABLE `production_queue_items`'),
      'SQL dump is missing production_queue_items',
    );

    const loaderConnection = await mysql.createConnection({
      ...adminConfig,
      database: temporaryDatabase,
      multipleStatements: true,
    });
    try {
      await loaderConnection.query(dumpSql);
    } finally {
      await loaderConnection.end();
    }

    // This assignment must remain before either project module is imported.
    process.env.DB_NAME = temporaryDatabase;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.CLIENT_URL = 'http://localhost';

    const [{ default: app }, databaseModule] = await Promise.all([
      import('../src/app'),
      import('../src/config/database'),
    ]);
    resources.appPool = databaseModule.pool;

    resources.fixtureConnection = await mysql.createConnection({
      ...adminConfig,
      database: temporaryDatabase,
    });

    resources.httpServer = await new Promise<Server>((resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => resolve(server));
      server.once('error', reject);
    });
    const address = resources.httpServer.address();
    assert(address && typeof address === 'object', 'HTTP server did not expose an address');
    const origin = `http://127.0.0.1:${address.port}`;

    const actor = await queryOne<any>(
      resources.fixtureConnection,
      `SELECT DISTINCT u.id, u.organization_id, u.username
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE u.deleted_at IS NULL
          AND u.status_code = 'active'
          AND u.approval_status_code = 'approved'
          AND p.code = 'craft.production.write'
        ORDER BY u.id
        LIMIT 1`,
      [],
      'active user with craft.production.write',
    );
    const token = jwt.sign(
      {
        id: numeric(actor.id),
        organization_id: numeric(actor.organization_id),
        username: String(actor.username),
      },
      requiredEnvironment('JWT_SECRET'),
      { expiresIn: '15m' },
    );
    const api = createApiClient(origin, token);

    console.log('[smoke] verifying empty production board');
    const emptyBoard = await api.request('GET', routes.board());
    assert.equal(collection(emptyBoard.data, 'jobs').length, 0);

    const fixtures = await seedFixtures(resources.fixtureConnection, marker);
    assert.equal(fixtures.actorUserId, numeric(actor.id));
    await runHttpLifecycle(resources.fixtureConnection, api, fixtures);
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error('[smoke] FAILED');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
