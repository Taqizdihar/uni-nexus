import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authorize, hasPermission } from '../../middleware/auth.js';
import { money } from '../../services/money.js';
import { salesWorkflowCounts } from '../workflows/service.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', authorize('read'), async (req, res) => {
  const workspace_id = req.workspace!.id;
  const [openRequests, pendingQuotations, activeOrders, queuedProduction, activePrints, printers, recentFailures, materialUsage, costs, recentActivity, workflowCounts] = await Promise.all([
    prisma.custom_requests.count({ where: { workspace_id, status: { notIn: ['ACCEPTED', 'DECLINED', 'CANCELLED', 'NOT_FEASIBLE'] } } }),
    prisma.quotations.count({ where: { workspace_id, status: { in: ['DRAFT', 'APPROVED', 'SENT'] } } }),
    prisma.orders.count({ where: { workspace_id, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.production_jobs.count({ where: { workspace_id, status: { in: ['WAITING', 'QUEUED'] } } }),
    prisma.print_jobs.count({ where: { workspace_id, status: { in: ['QUEUED', 'PRINTING', 'PAUSED'] } } }),
    prisma.printers.groupBy({ by: ['status'], where: { workspace_id, is_active: true }, _count: { id: true } }),
    prisma.print_failures.findMany({ where: { workspace_id }, orderBy: { created_at: 'desc' }, take: 5, select: { id: true, print_job_id: true, failure_type: true, description: true, wasted_weight_gram: true, created_at: true } }),
    prisma.material_usages.aggregate({ where: { workspace_id }, _sum: { weight_gram: true } }),
    prisma.production_costs.groupBy({ by: ['cost_type'], where: { workspace_id }, _sum: { total_cost: true } }),
    prisma.audit_logs.findMany({ where: { workspace_id }, orderBy: { created_at: 'desc' }, take: 8, select: { id: true, action: true, entity_type: true, entity_id: true, created_at: true } }),
    salesWorkflowCounts(prisma, workspace_id),
  ]);
  const canSeeCosts = hasPermission(req.workspace!.role, 'finance');
  res.json({ data: { metrics: { openRequests, pendingQuotations, activeOrders, queuedProduction, activePrints, workflowCounts, materialUsageGram: materialUsage._sum.weight_gram?.toString() ?? '0',
    estimatedHpp: canSeeCosts ? money(costs.find((cost) => cost.cost_type === 'ESTIMATED')?._sum.total_cost) : null,
    actualHpp: canSeeCosts ? money(costs.find((cost) => cost.cost_type === 'ACTUAL')?._sum.total_cost) : null },
    printers: printers.map((printer) => ({ status: printer.status, count: printer._count.id })), recentFailures, recentActivity } });
});
