import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { audit, type WorkspaceContext } from './audit.js';
import { HPP_V1_COMPONENT_CODES } from './costing.js';
import { money } from './money.js';

export type ManualHppInput = {
  componentCode: (typeof HPP_V1_COMPONENT_CODES)[number];
  amount: string;
};

/** Upserts the single simplified order-level manual HPP entry for a component. */
export async function upsertOrderHpp(
  tx: Prisma.TransactionClient,
  orderId: bigint,
  input: ManualHppInput,
  context: WorkspaceContext,
) {
  const order = await tx.orders.findFirst({
    where: { id: orderId, workspace_id: context.workspaceId },
    select: { id: true },
  });
  if (!order) throw new AppError(404, 'Pesanan tidak ditemukan.', 'ORDER_NOT_FOUND');
  const component = await tx.cost_components.findFirst({
    where: { workspace_id: context.workspaceId, code: input.componentCode, is_active: true },
    select: { id: true, code: true, name: true },
  });
  if (!component)
    throw new AppError(
      404,
      `Komponen ${input.componentCode} belum tersedia di workspace ini.`,
      'COST_COMPONENT_NOT_FOUND',
    );
  const existing = await tx.production_costs.findFirst({
    where: {
      workspace_id: context.workspaceId,
      cost_component_id: component.id,
      cost_type: 'ACTUAL',
      OR: [
        { order_id: orderId },
        { production_jobs: { order_items: { order_id: orderId } } },
        { print_jobs: { production_jobs: { order_items: { order_id: orderId } } } },
      ],
    },
    orderBy: { created_at: 'asc' },
  });
  const amount = money(input.amount);
  const payload = {
    order_id: orderId,
    production_job_id: null,
    print_job_id: null,
    quantity: '1.0000',
    unit: 'lump_sum',
    unit_cost: amount,
    total_cost: amount,
    description: component.name,
    recorded_by_user_id: context.userId,
    updated_at: new Date(),
  };
  const row = existing
    ? await tx.production_costs.update({ where: { id: existing.id }, data: payload })
    : await tx.production_costs.create({
        data: {
          workspace_id: context.workspaceId,
          cost_component_id: component.id,
          cost_type: 'ACTUAL',
          ...payload,
        },
      });
  await audit(
    tx,
    context,
    existing ? `${input.componentCode}_UPDATED` : `${input.componentCode}_CREATED`,
    'production_costs',
    row.id,
    existing,
    row,
  );
  return row;
}
