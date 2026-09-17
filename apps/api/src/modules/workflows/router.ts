import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { authorize, parseId } from '../../middleware/auth.js';
import { audit, type WorkspaceContext } from '../../services/audit.js';
import { decimal, documentTotal, money, sumMoney } from '../../services/money.js';
import { InAppNotificationProvider } from '../../services/notifications.js';

export const workflowsRouter = Router();
export async function convertQuotation(tx: Prisma.TransactionClient, quotationId: bigint, context: WorkspaceContext) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM quotations WHERE id = ${quotationId} AND workspace_id = ${context.workspaceId} FOR UPDATE`);
  const quote = await tx.quotations.findFirst({ where: { id: quotationId, workspace_id: context.workspaceId }, include: { quotation_items: true, custom_requests: true } });
  if (!quote) throw new AppError(404, 'Quotation not found.');
  const previous = await tx.orders.findFirst({ where: { quotation_id: quotationId, workspace_id: context.workspaceId } });
  if (previous) return previous;
  if (quote.status !== 'ACCEPTED') throw new AppError(409, 'Accept the quotation before converting it to an order.');
  if (!quote.quotation_items.length) throw new AppError(422, 'The quotation must contain at least one item.');
  for (const item of quote.quotation_items) if (!decimal(item.quantity).isInteger() || decimal(item.quantity).lte(0) || decimal(item.quantity).gt(4294967295)) throw new AppError(422, 'Order quantities must be positive whole numbers. Create a quotation revision with whole quantities.');
  const subtotal = decimal(sumMoney(quote.quotation_items.map((item) => item.amount))).plus(decimal(quote.additional_cost));
  const order = await tx.orders.create({ data: { workspace_id: context.workspaceId, customer_id: quote.customer_id, custom_request_id: quote.custom_request_id,
    quotation_id: quote.id, order_source: quote.custom_requests.source, status: 'CONFIRMED', payment_status: 'UNPAID', target_date: quote.custom_requests.target_date,
    subtotal: money(subtotal), discount_amount: quote.discount_amount, total_price: documentTotal(subtotal, quote.discount_amount), currency_code: quote.currency_code, created_by_user_id: context.userId,
    internal_notes: `Created from quotation ${quote.quotation_number ?? quote.id.toString()}, revision ${quote.revision_no}.`,
    order_items: { create: [
      ...quote.quotation_items.map((item) => ({ product_id: item.product_id, product_variant_id: item.product_variant_id, item_name: item.description.slice(0, 180), description: item.description, quantity: decimal(item.quantity).toNumber(), unit_price: item.unit_price, total_price: item.amount })),
      ...(decimal(quote.additional_cost).gt(0) ? [{ item_name: 'Quotation additional cost', description: 'Additional charge carried from the accepted quotation.', quantity: 1, unit_price: quote.additional_cost, total_price: quote.additional_cost }] : []),
    ] },
  } });
  await audit(tx, context, 'QUOTATION_CONVERTED', 'orders', order.id, undefined, order);
  await new InAppNotificationProvider(tx).send({ workspaceId: context.workspaceId, recipientUserId: context.userId, event: 'order.created', title: 'Quotation converted to order', entityType: 'orders', entityId: order.id });
  return order;
}
workflowsRouter.post(['/quotations/:id/convert', '/quotations/:id/convert-to-order'], authorize('sales'), async (req, res) => {
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  const data = await prisma.$transaction((tx) => convertQuotation(tx, parseId(req.params.id), context), { timeout: 15000 });
  res.json({ data });
});

workflowsRouter.post('/design-assets/:id/create-product', authorize('design'), async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(180).optional() }).parse(req.body ?? {});
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  const assetId = parseId(req.params.id);
  const data = await prisma.$transaction(async (tx) => {
    const asset = await tx.design_assets.findFirst({ where: { id: assetId, workspace_id: context.workspaceId } });
    if (!asset) throw new AppError(404, 'Design asset not found.');
    if (!asset.object_key && !asset.external_url) throw new AppError(422, 'Upload a design file or add an external URL first.');
    const product = await tx.products.create({ data: { workspace_id: context.workspaceId, name: input.name ?? asset.file_name.replace(/\.[^.]+$/, '').slice(0, 180), product_type: 'READY_MODEL', status: 'DRAFT', catalog_visibility: 'INTERNAL', created_by_user_id: context.userId,
      product_assets: { create: { source_design_asset_id: asset.id, asset_type: asset.asset_type, file_name: asset.file_name, storage_provider: asset.storage_provider, bucket_name: asset.bucket_name, object_key: asset.object_key, external_url: asset.external_url, version_label: asset.version_label, is_primary: true, is_internal_only: true, uploaded_by_user_id: context.userId, notes: asset.notes } } } });
    await audit(tx, context, 'CREATED_FROM_DESIGN', 'products', product.id, { design_asset_id: asset.id }, product);
    return product;
  });
  res.status(201).json({ data });
});
