import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { audit, type WorkspaceContext } from './audit.js';
import { validateTransition } from './status.js';

type Tx = Prisma.TransactionClient;

const productionStartedStatuses = new Set([
  'QUEUED',
  'IN_PROGRESS',
  'PRINTING',
  'QC',
  'PACKAGING',
  'COMPLETED',
]);

async function updateOrderStatus(
  tx: Tx,
  orderId: bigint,
  nextStatus: string,
  context: WorkspaceContext,
) {
  const order = await tx.orders.findFirst({
    where: { id: orderId, workspace_id: context.workspaceId },
  });
  if (!order || order.status === nextStatus) return order;
  validateTransition('orders', order.status, nextStatus);
  const updated = await tx.orders.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      ...(nextStatus === 'COMPLETED' ? { completed_at: new Date() } : {}),
      updated_at: new Date(),
    },
  });
  await audit(tx, context, 'WORKFLOW_STATUS_SYNCHRONIZED', 'orders', order.id, order, updated);
  return updated;
}

async function updateProductionStatus(
  tx: Tx,
  productionJobId: bigint,
  nextStatus: string,
  context: WorkspaceContext,
) {
  const job = await tx.production_jobs.findFirst({
    where: { id: productionJobId, workspace_id: context.workspaceId },
  });
  if (!job || job.status === nextStatus) return job;
  validateTransition('production_jobs', job.status, nextStatus);
  const updated = await tx.production_jobs.update({
    where: { id: job.id },
    data: {
      status: nextStatus,
      ...(nextStatus === 'COMPLETED' ? { actual_end: new Date() } : {}),
      ...(nextStatus === 'IN_PROGRESS' || nextStatus === 'PRINTING'
        ? { actual_start: job.actual_start ?? new Date() }
        : {}),
      updated_at: new Date(),
    },
  });
  await audit(
    tx,
    context,
    'PRODUCTION_STATUS_SYNCHRONIZED',
    'production_jobs',
    job.id,
    job,
    updated,
  );
  return updated;
}

async function advanceProductionTo(
  tx: Tx,
  jobId: bigint,
  target: 'QUEUED' | 'IN_PROGRESS' | 'PRINTING' | 'QC' | 'PACKAGING' | 'ON_HOLD',
  context: WorkspaceContext,
) {
  const paths: Record<string, string[]> = {
    WAITING: ['QUEUED', 'IN_PROGRESS', 'PRINTING', 'QC', 'PACKAGING'],
    QUEUED: ['IN_PROGRESS', 'PRINTING', 'QC', 'PACKAGING'],
    IN_PROGRESS: ['PRINTING', 'QC', 'PACKAGING'],
    PRINTING: ['QC', 'PACKAGING'],
    QC: ['PACKAGING'],
    ON_HOLD: ['QUEUED', 'IN_PROGRESS', 'PRINTING', 'QC', 'PACKAGING'],
    PACKAGING: [],
    COMPLETED: [],
    CANCELLED: [],
  };
  let current = await tx.production_jobs.findFirst({
    where: { id: jobId, workspace_id: context.workspaceId },
  });
  if (!current || current.status === target) return current;
  if (target === 'ON_HOLD') {
    if (current.status === 'WAITING') {
      await updateProductionStatus(tx, jobId, 'QUEUED', context);
      current = await tx.production_jobs.findFirst({ where: { id: jobId, workspace_id: context.workspaceId } });
    }
    if (current && ['QUEUED', 'IN_PROGRESS', 'PRINTING'].includes(current.status))
      return updateProductionStatus(tx, jobId, target, context);
    if (current?.status === 'QC') {
      await updateProductionStatus(tx, jobId, 'IN_PROGRESS', context);
      return updateProductionStatus(tx, jobId, target, context);
    }
  }
  if (!current) return current;
  if (target === 'IN_PROGRESS' && current.status === 'QC')
    return updateProductionStatus(tx, jobId, target, context);
  const path = paths[current.status] ?? [];
  const index = path.indexOf(target);
  if (index < 0) {
    if (target === 'ON_HOLD' && current.status === 'PRINTING') {
      return updateProductionStatus(tx, jobId, target, context);
    }
    if (target === 'ON_HOLD' && current.status === 'QC') {
      await updateProductionStatus(tx, jobId, 'IN_PROGRESS', context);
      return updateProductionStatus(tx, jobId, target, context);
    }
    return current;
  }
  for (const next of path.slice(0, index + 1))
    current = await updateProductionStatus(tx, jobId, next, context);
  return current;
}

async function allProductionJobsReadyForPackaging(tx: Tx, orderId: bigint, workspaceId: bigint) {
  const jobs = await tx.production_jobs.findMany({
    where: { workspace_id: workspaceId, order_items: { order_id: orderId } },
    include: {
      print_jobs: { orderBy: { created_at: 'desc' }, take: 1, select: { status: true } },
      qc_inspections: { orderBy: { created_at: 'desc' }, take: 1, select: { result: true } },
    },
  });
  if (!jobs.length) return true;
  return jobs.every(
    (job) => job.print_jobs[0]?.status === 'SUCCESS' && job.qc_inspections[0]?.result === 'PASS',
  );
}

async function allProductionJobsPrinted(tx: Tx, orderId: bigint, workspaceId: bigint) {
  const jobs = await tx.production_jobs.findMany({
    where: { workspace_id: workspaceId, order_items: { order_id: orderId } },
    include: { print_jobs: { orderBy: { created_at: 'desc' }, take: 1, select: { status: true } } },
  });
  return jobs.length > 0 && jobs.every((job) => job.print_jobs[0]?.status === 'SUCCESS');
}

async function orderProductionJobs(tx: Tx, orderId: bigint, workspaceId: bigint) {
  return tx.production_jobs.findMany({
    where: { workspace_id: workspaceId, order_items: { order_id: orderId } },
    select: { id: true, status: true },
  });
}

export async function assertPackagingReady(tx: Tx, orderId: bigint, context: WorkspaceContext) {
  const order = await tx.orders.findFirst({
    where: { id: orderId, workspace_id: context.workspaceId },
    select: { id: true, status: true },
  });
  if (!order) throw new AppError(404, 'Pesanan tidak ditemukan.', 'ORDER_NOT_FOUND');
  if (!(await allProductionJobsReadyForPackaging(tx, orderId, context.workspaceId)))
    throw new AppError(
      409,
      'Pengemasan baru dapat dimulai setelah seluruh pekerjaan produksi lulus QC.',
      'QC_REQUIRED',
    );
}

export async function assertOrderCanComplete(tx: Tx, orderId: bigint, context: WorkspaceContext) {
  const jobs = await orderProductionJobs(tx, orderId, context.workspaceId);
  if (jobs.length && !(await allProductionJobsReadyForPackaging(tx, orderId, context.workspaceId)))
    throw new AppError(
      409,
      'Pesanan belum dapat diselesaikan karena produksi atau QC belum lengkap.',
      'WORKFLOW_NOT_READY',
    );
  const order = await tx.orders.findFirst({
    where: { id: orderId, workspace_id: context.workspaceId },
    select: { status: true },
  });
  if (order?.status === 'PACKAGING') {
    const packed = await tx.order_packaging.findFirst({
      where: { order_id: orderId, workspace_id: context.workspaceId, status: 'PACKED' },
      select: { id: true },
    });
    if (!packed)
      throw new AppError(409, 'Tandai pengemasan sebagai PACKED sebelum menyelesaikan pesanan.', 'PACKING_REQUIRED');
  }
}

export async function syncProductionWorkflow(
  tx: Tx,
  table: 'production_jobs' | 'print_jobs' | 'qc_inspections' | 'order_packaging',
  recordId: bigint,
  context: WorkspaceContext,
) {
  if (table === 'production_jobs') {
    const job = await tx.production_jobs.findFirst({
      where: { id: recordId, workspace_id: context.workspaceId },
      include: { order_items: { select: { order_id: true } } },
    });
    if (job && productionStartedStatuses.has(job.status)) {
      const order = await tx.orders.findFirst({
        where: { id: job.order_items.order_id, workspace_id: context.workspaceId },
        select: { id: true, status: true },
      });
      if (order?.status === 'CONFIRMED') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
    }
    return;
  }

  if (table === 'print_jobs') {
    const print = await tx.print_jobs.findFirst({
      where: { id: recordId, workspace_id: context.workspaceId },
      include: { production_jobs: { include: { order_items: { include: { orders: true } } } } },
    });
    if (!print) return;
    const job = print.production_jobs;
    const order = job.order_items.orders;
    if (print.status === 'QUEUED') {
      if (job.status === 'WAITING' || job.status === 'ON_HOLD') await advanceProductionTo(tx, job.id, 'QUEUED', context);
      if (order.status === 'CONFIRMED' || order.status === 'ON_HOLD') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
    } else if (print.status === 'PRINTING') {
      await advanceProductionTo(tx, job.id, 'PRINTING', context);
      if (order.status === 'CONFIRMED' || order.status === 'ON_HOLD') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
    } else if (print.status === 'SUCCESS') {
      await advanceProductionTo(tx, job.id, 'QC', context);
      if (order.status === 'CONFIRMED') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
      if (order.status === 'IN_PRODUCTION' && await allProductionJobsPrinted(tx, order.id, context.workspaceId))
        await updateOrderStatus(tx, order.id, 'QC', context);
    } else if (print.status === 'FAILED') {
      await advanceProductionTo(tx, job.id, 'ON_HOLD', context);
      if (order.status === 'IN_PRODUCTION') await updateOrderStatus(tx, order.id, 'ON_HOLD', context);
      else if (order.status === 'QC') {
        await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
        await updateOrderStatus(tx, order.id, 'ON_HOLD', context);
      }
    }
    return;
  }

  if (table === 'qc_inspections') {
    const inspection = await tx.qc_inspections.findFirst({
      where: { id: recordId, workspace_id: context.workspaceId },
      include: { production_jobs: { include: { order_items: { include: { orders: true } } } } },
    });
    if (!inspection) return;
    const job = inspection.production_jobs;
    const order = job.order_items.orders;
    if (inspection.result === 'PASS') {
      await advanceProductionTo(tx, job.id, 'PACKAGING', context);
      if (await allProductionJobsReadyForPackaging(tx, order.id, context.workspaceId)) {
        if (order.status === 'CONFIRMED') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
        if (order.status === 'IN_PRODUCTION') await updateOrderStatus(tx, order.id, 'QC', context);
        if (order.status === 'QC') await updateOrderStatus(tx, order.id, 'PACKAGING', context);
      }
    } else if (inspection.result === 'REPRINT' || inspection.result === 'REWORK') {
      await advanceProductionTo(tx, job.id, 'IN_PROGRESS', context);
      if (order.status === 'QC') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
      if (order.status === 'ON_HOLD') await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
    } else if (inspection.result === 'FAIL') {
      await advanceProductionTo(tx, job.id, 'ON_HOLD', context);
      if (order.status === 'QC') {
        await updateOrderStatus(tx, order.id, 'IN_PRODUCTION', context);
        await updateOrderStatus(tx, order.id, 'ON_HOLD', context);
      } else if (order.status === 'IN_PRODUCTION') await updateOrderStatus(tx, order.id, 'ON_HOLD', context);
    }
    return;
  }

  const packaging = await tx.order_packaging.findFirst({
    where: { id: recordId, workspace_id: context.workspaceId },
    include: { orders: true },
  });
  if (!packaging) return;
  const order = packaging.orders;
  if (packaging.status === 'PENDING' || packaging.status === 'PACKING') {
    if (order.status === 'QC') await updateOrderStatus(tx, order.id, 'PACKAGING', context);
  } else if (packaging.status === 'PACKED') {
    if (order.status === 'QC') await updateOrderStatus(tx, order.id, 'PACKAGING', context);
    if (order.status === 'PACKAGING') await updateOrderStatus(tx, order.id, 'READY', context);
    const jobs = await orderProductionJobs(tx, order.id, context.workspaceId);
    for (const job of jobs)
      if (job.status === 'PACKAGING') await updateProductionStatus(tx, job.id, 'COMPLETED', context);
  }
}
