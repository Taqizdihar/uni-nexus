import type { Prisma, PrismaClient } from '@prisma/client';
import { decimal, money, sumMoney } from './money.js';

export async function costSummary(db: Prisma.TransactionClient | PrismaClient, workspaceId: bigint, orderId?: bigint) {
  const orderWhere = { workspace_id: workspaceId, ...(orderId ? { id: orderId } : {}) };
  const scope: Prisma.production_costsWhereInput = { workspace_id: workspaceId, ...(orderId ? { OR: [ { order_id: orderId }, { production_jobs: { order_items: { order_id: orderId } } }, { print_jobs: { production_jobs: { order_items: { order_id: orderId } } } } ] } : {}) };
  const [costs, sales, usages, packaging] = await Promise.all([
    db.production_costs.findMany({ where: scope, include: { cost_components: { select: { name: true, category: true } } } }),
    db.orders.aggregate({ where: { ...orderWhere, status: { not: 'CANCELLED' } }, _sum: { total_price: true } }),
    db.material_usages.findMany({ where: { workspace_id: workspaceId, ...(orderId ? { print_jobs: { production_jobs: { order_items: { order_id: orderId } } } } : {}) }, select: { total_cost: true, weight_gram: true, usage_type: true } }),
    db.order_packaging.aggregate({ where: { workspace_id: workspaceId, ...(orderId ? { order_id: orderId } : {}), status: 'PACKED' }, _sum: { actual_cost: true } }),
  ]);
  // The cost ledger is authoritative. Supporting material/packaging figures are
  // displayed separately to avoid counting the same expense twice.
  const estimatedHpp = sumMoney(costs.filter((cost) => cost.cost_type === 'ESTIMATED').map((cost) => cost.total_cost));
  const actualHpp = sumMoney(costs.filter((cost) => cost.cost_type === 'ACTUAL').map((cost) => cost.total_cost));
  const sellingPrice = money(sales._sum.total_price);
  const margin = decimal(sellingPrice).minus(actualHpp);
  const components = costs.map((cost) => ({ id: cost.id.toString(), name: cost.cost_components.name, category: cost.cost_components.category, type: cost.cost_type, quantity: cost.quantity.toString(), unitCost: cost.unit_cost.toString(), total: money(cost.total_cost) }));
  return { estimatedHpp, actualHpp, sellingPrice, margin: money(margin), marginPercent: decimal(sellingPrice).isZero() ? null : margin.div(sellingPrice).mul(100).toFixed(2),
    materialCost: sumMoney(usages.filter((usage) => !['WASTE', 'FAILURE', 'FAILED_PRINT'].includes(usage.usage_type)).map((usage) => usage.total_cost)),
    wasteCost: sumMoney(usages.filter((usage) => ['WASTE', 'FAILURE', 'FAILED_PRINT'].includes(usage.usage_type)).map((usage) => usage.total_cost)),
    materialUsageGram: usages.reduce((total, usage) => total.plus(decimal(usage.weight_gram)), decimal(0)).toFixed(3),
    packagingCost: money(packaging._sum.actual_cost), components,
    calculationNote: 'HPP is the sum of production cost entries. Record material consumption, waste and packaging as cost entries when including them in HPP; the supporting figures are not added twice.',
  };
}
