import type { Prisma, PrismaClient } from '@prisma/client';
import { decimal, money, sumMoney } from './money.js';

/** The only manual cost components included in HPP v1. */
export const HPP_V1_COMPONENT_CODES = ['HPP_DESIGN', 'HPP_PAINT'] as const;
export type HppV1ComponentCode = (typeof HPP_V1_COMPONENT_CODES)[number];

/** PURGE is an explicit waste event in the current material usage vocabulary. */
export const WASTE_USAGE_TYPES = ['WASTE', 'PURGE', 'FAILURE', 'FAILED_PRINT'] as const;

export function isWasteUsage(usageType: unknown): boolean {
  return WASTE_USAGE_TYPES.includes(String(usageType).toUpperCase() as (typeof WASTE_USAGE_TYPES)[number]);
}

export function isHppFilamentUsage(usageType: unknown): boolean {
  return !isWasteUsage(usageType);
}

export function isHppV1Component(code: unknown): code is HppV1ComponentCode {
  return HPP_V1_COMPONENT_CODES.includes(String(code).toUpperCase() as HppV1ComponentCode);
}

export async function costSummary(
  db: Prisma.TransactionClient | PrismaClient,
  workspaceId: bigint,
  orderId?: bigint,
) {
  const orderWhere = { workspace_id: workspaceId, ...(orderId ? { id: orderId } : {}) };
  const scope: Prisma.production_costsWhereInput = {
    workspace_id: workspaceId,
    ...(orderId
      ? {
          OR: [
            { order_id: orderId },
            { production_jobs: { order_items: { order_id: orderId } } },
            { print_jobs: { production_jobs: { order_items: { order_id: orderId } } } },
          ],
        }
      : {}),
  };
  const [costs, sales, usages, packaging] = await Promise.all([
    db.production_costs.findMany({
      where: scope,
      distinct: ['id'],
      include: { cost_components: { select: { id: true, code: true, name: true, category: true } } },
    }),
    db.orders.aggregate({
      where: { ...orderWhere, status: { not: 'CANCELLED' } },
      _sum: { total_price: true },
    }),
    db.material_usages.findMany({
      where: {
        workspace_id: workspaceId,
        ...(orderId
          ? { print_jobs: { production_jobs: { order_items: { order_id: orderId } } } }
          : {}),
      },
      select: { id: true, total_cost: true, weight_gram: true, usage_type: true },
    }),
    db.order_packaging.aggregate({
      where: {
        workspace_id: workspaceId,
        ...(orderId ? { order_id: orderId } : {}),
        status: 'PACKED',
      },
      _sum: { actual_cost: true },
    }),
  ]);

  const normalUsages = usages.filter((usage) => isHppFilamentUsage(usage.usage_type));
  const wasteUsages = usages.filter((usage) => isWasteUsage(usage.usage_type));
  const actualDesign = costs.filter(
    (cost) => cost.cost_type === 'ACTUAL' && cost.cost_components.code === 'HPP_DESIGN',
  );
  const actualPaint = costs.filter(
    (cost) => cost.cost_type === 'ACTUAL' && cost.cost_components.code === 'HPP_PAINT',
  );
  const estimatedManual = costs.filter(
    (cost) => cost.cost_type === 'ESTIMATED' && isHppV1Component(cost.cost_components.code),
  );
  const filamentCost = sumMoney(normalUsages.map((usage) => usage.total_cost));
  const designCost = sumMoney(actualDesign.map((cost) => cost.total_cost));
  const paintCost = sumMoney(actualPaint.map((cost) => cost.total_cost));
  const actualHpp = sumMoney([filamentCost, designCost, paintCost]);
  const estimatedHpp = estimatedManual.length
    ? sumMoney(estimatedManual.map((cost) => cost.total_cost))
    : null;
  const sellingPrice = money(sales._sum.total_price);
  const margin = decimal(sellingPrice).minus(actualHpp);
  const components = costs.map((cost) => ({
    id: cost.id.toString(),
    code: cost.cost_components.code,
    name: cost.cost_components.name,
    category: cost.cost_components.category,
    type: cost.cost_type,
    quantity: cost.quantity.toString(),
    unitCost: cost.unit_cost.toString(),
    total: money(cost.total_cost),
  }));

  return {
    estimatedHpp,
    actualHpp,
    sellingPrice,
    margin: money(margin),
    marginPercent: decimal(sellingPrice).isZero()
      ? null
      : margin.div(sellingPrice).mul(100).toFixed(2),
    filamentCost,
    designCost,
    paintCost,
    materialCost: filamentCost,
    wasteCost: sumMoney(wasteUsages.map((usage) => usage.total_cost)),
    filamentUsageGram: normalUsages
      .reduce((total, usage) => total.plus(decimal(usage.weight_gram)), decimal(0))
      .toFixed(3),
    materialUsageGram: usages
      .reduce((total, usage) => total.plus(decimal(usage.weight_gram)), decimal(0))
      .toFixed(3),
    packagingCost: money(packaging._sum.actual_cost),
    components,
    calculationNote:
      'HPP Aktual v1 = pemakaian filamen normal + HPP_DESIGN + HPP_PAINT. Waste, pengemasan, dan komponen lain hanya ditampilkan sebagai informasi.',
  };
}
