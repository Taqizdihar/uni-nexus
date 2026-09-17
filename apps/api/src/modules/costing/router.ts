import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { authorize, parseId } from '../../middleware/auth.js';
import { costSummary } from '../../services/costing.js';
import { estimatePrice } from '../../services/money.js';

export const costingRouter = Router();
costingRouter.use(authorize('finance'));
costingRouter.get('/summary', async (req, res) => {
  const orderId = req.query.orderId == null ? undefined : parseId(req.query.orderId);
  if (orderId && !await prisma.orders.findFirst({ where: { id: orderId, workspace_id: req.workspace!.id }, select: { id: true } })) throw new AppError(404, 'Order not found.');
  res.json({ data: await costSummary(prisma, req.workspace!.id, orderId) });
});
costingRouter.post('/estimate', async (req, res) => {
  const input = z.object({ pricingRuleId: z.string().regex(/^\d+$/), billableGrams: z.string().regex(/^\d+(\.\d{1,3})?$/) }).parse(req.body);
  const now = new Date();
  const rule = await prisma.pricing_rules.findFirst({ where: { id: BigInt(input.pricingRuleId), workspace_id: req.workspace!.id, is_active: true, AND: [ { OR: [{ effective_from: null }, { effective_from: { lte: now } }] }, { OR: [{ effective_until: null }, { effective_until: { gte: now } }] } ] } });
  if (!rule) throw new AppError(404, 'Active pricing rule not found for the current date.');
  if (rule.rule_type !== 'PER_GRAM' || rule.price_per_gram == null) throw new AppError(422, 'The estimator requires a configured PER_GRAM rule.');
  res.json({ data: { pricingRuleId: rule.id.toString(), billableGrams: input.billableGrams, ...estimatePrice(rule, input.billableGrams) } });
});
