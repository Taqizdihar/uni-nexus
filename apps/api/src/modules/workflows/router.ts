import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { authorize, parseId } from '../../middleware/auth.js';
import { audit, type WorkspaceContext } from '../../services/audit.js';
import { decimal, documentTotal, money, sumMoney } from '../../services/money.js';
import { InAppNotificationProvider } from '../../services/notifications.js';
import { calculateQuotationItemPricing } from './pricing.js';
import {
  listProductionWorkflows,
  listSalesWorkflows,
  salesWorkflowDetail,
  type ProductionWorkflowFilters,
  type SalesWorkflowFilters,
} from './service.js';

export const workflowsRouter = Router();

const decimalInput = z
  .string()
  .regex(
    /^\d+(\.\d{1,3})?$/,
    'Gunakan angka desimal non-negatif dengan maksimal tiga angka di belakang koma.',
  );
const optionalId = z.string().regex(/^\d+$/).optional();
const workflowListInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  stage: z
    .enum([
      'REQUEST',
      'DESIGN',
      'QUOTATION',
      'READY_FOR_PRODUCTION',
      'PRODUCTION',
      'COMPLETION',
      'COMPLETED',
      'CANCELLED',
    ])
    .optional(),
  tab: z
    .enum([
      'NEEDS_PROCESSING',
      'PRINT_QUEUE',
      'PRINTING',
      'ATTENTION',
      'QC',
      'PACKAGING',
      'COMPLETED',
    ])
    .optional(),
  search: z.string().trim().max(150).optional(),
  customer: z.string().trim().max(150).optional(),
  status: z.string().trim().max(60).optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  deadline: z.enum(['OVERDUE', 'UPCOMING']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assigned: z.string().trim().max(150).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED']).optional(),
  source: z
    .enum([
      'CUSTOMER_APP',
      'WHATSAPP',
      'SHOPEE',
      'TOKOPEDIA',
      'TIKTOK_SHOP',
      'SHOPIFY',
      'OFFLINE',
      'OTHER',
    ])
    .optional(),
  sort: z.enum(['updated_at', 'target_date', 'value']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

async function currentPricingRule(
  tx: Prisma.TransactionClient,
  pricingRuleId: bigint,
  workspaceId: bigint,
) {
  const now = new Date();
  const rule = await tx.pricing_rules.findFirst({
    where: {
      id: pricingRuleId,
      workspace_id: workspaceId,
      is_active: true,
      AND: [
        { OR: [{ effective_from: null }, { effective_from: { lte: now } }] },
        { OR: [{ effective_until: null }, { effective_until: { gte: now } }] },
      ],
    },
  });
  if (!rule)
    throw new AppError(
      404,
      'Aturan harga aktif tidak ditemukan untuk tanggal saat ini.',
      'PRICING_RULE_NOT_FOUND',
    );
  return rule;
}

async function refreshQuotationTotals(tx: Prisma.TransactionClient, quotationId: bigint) {
  const quote = await tx.quotations.findUniqueOrThrow({ where: { id: quotationId } });
  const subtotal = (
    await tx.quotation_items.aggregate({
      where: { quotation_id: quotationId },
      _sum: { amount: true },
    })
  )._sum.amount;
  return tx.quotations.update({
    where: { id: quotationId },
    data: {
      subtotal: money(subtotal),
      total_price: documentTotal(subtotal, quote.discount_amount, quote.additional_cost),
    },
  });
}

export async function createQuotationRevision(
  tx: Prisma.TransactionClient,
  quotationId: bigint,
  context: WorkspaceContext,
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM quotations WHERE id = ${quotationId} AND workspace_id = ${context.workspaceId} FOR UPDATE`,
  );
  const source = await tx.quotations.findFirst({
    where: { id: quotationId, workspace_id: context.workspaceId },
    include: { quotation_items: true },
  });
  if (!source) throw new AppError(404, 'Penawaran tidak ditemukan.', 'QUOTATION_NOT_FOUND');
  const maximum = await tx.quotations.aggregate({
    where: { workspace_id: context.workspaceId, custom_request_id: source.custom_request_id },
    _max: { revision_no: true },
  });
  const revisionNo = (maximum._max.revision_no ?? 0) + 1;
  const revision = await tx.quotations.create({
    data: {
      workspace_id: context.workspaceId,
      quotation_number: `QT-${randomUUID().slice(0, 8).toUpperCase()}`,
      revision_no: revisionNo,
      custom_request_id: source.custom_request_id,
      customer_id: source.customer_id,
      subtotal: source.subtotal,
      discount_amount: source.discount_amount,
      additional_cost: source.additional_cost,
      total_price: source.total_price,
      currency_code: source.currency_code,
      status: 'DRAFT',
      valid_until: source.valid_until,
      notes: source.notes,
      quotation_items: {
        create: source.quotation_items.map((item) => ({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
          pricing_rule_id: item.pricing_rule_id,
          material_id: item.material_id,
          billable_weight_gram: item.billable_weight_gram,
          pricing_rule_name_snapshot: item.pricing_rule_name_snapshot,
          pricing_rule_type_snapshot: item.pricing_rule_type_snapshot,
          price_per_gram_snapshot: item.price_per_gram_snapshot,
          minimum_price_snapshot: item.minimum_price_snapshot,
          design_fee_snapshot: item.design_fee_snapshot,
          finishing_fee_snapshot: item.finishing_fee_snapshot,
          pricing_breakdown_json:
            item.pricing_breakdown_json === null
              ? Prisma.JsonNull
              : (item.pricing_breakdown_json as Prisma.InputJsonValue),
          pricing_calculated_at: item.pricing_calculated_at,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        })),
      },
    },
  });
  await audit(
    tx,
    context,
    'QUOTATION_REVISED',
    'quotations',
    revision.id,
    { source_quotation_id: source.id, source_revision_no: source.revision_no },
    revision,
  );
  return revision;
}

type PricedQuotationItemInput = {
  description: string;
  quantity: string;
  pricingRuleId: string;
  materialId?: string;
  billableWeightGram?: string;
  manualUnitPrice?: string;
  productId?: string;
  productVariantId?: string;
};

export async function createPricedQuotationItem(
  tx: Prisma.TransactionClient,
  quotationId: bigint,
  input: PricedQuotationItemInput,
  context: WorkspaceContext,
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM quotations WHERE id = ${quotationId} AND workspace_id = ${context.workspaceId} FOR UPDATE`,
  );
  const quote = await tx.quotations.findFirst({
    where: { id: quotationId, workspace_id: context.workspaceId },
  });
  if (!quote) throw new AppError(404, 'Penawaran tidak ditemukan.', 'QUOTATION_NOT_FOUND');
  if (quote.status !== 'DRAFT')
    throw new AppError(
      409,
      'Item hanya dapat ditambahkan pada penawaran draf.',
      'QUOTATION_LOCKED',
    );
  const pricingRuleId = BigInt(input.pricingRuleId);
  const materialId = input.materialId ? BigInt(input.materialId) : null;
  if (
    materialId &&
    !(await tx.materials.findFirst({
      where: { id: materialId, workspace_id: context.workspaceId },
      select: { id: true },
    }))
  )
    throw new AppError(404, 'Material tidak ditemukan di workspace ini.', 'MATERIAL_NOT_FOUND');
  if (
    input.productId &&
    !(await tx.products.findFirst({
      where: { id: BigInt(input.productId), workspace_id: context.workspaceId },
      select: { id: true },
    }))
  )
    throw new AppError(404, 'Produk tidak ditemukan di workspace ini.', 'PRODUCT_NOT_FOUND');
  if (
    input.productVariantId &&
    !(await tx.product_variants.findFirst({
      where: {
        id: BigInt(input.productVariantId),
        products: { workspace_id: context.workspaceId },
      },
      select: { id: true },
    }))
  )
    throw new AppError(404, 'Varian produk tidak ditemukan di workspace ini.', 'VARIANT_NOT_FOUND');
  const rule = await currentPricingRule(tx, pricingRuleId, context.workspaceId);
  const priced = calculateQuotationItemPricing(rule, {
    materialId,
    billableWeightGram: input.billableWeightGram,
    manualUnitPrice: input.manualUnitPrice,
  });
  const item = await tx.quotation_items.create({
    data: {
      quotation_id: quotationId,
      product_id: input.productId ? BigInt(input.productId) : null,
      product_variant_id: input.productVariantId ? BigInt(input.productVariantId) : null,
      description: input.description,
      quantity: input.quantity,
      ...priced,
      pricing_rule_id: pricingRuleId,
      material_id: materialId,
      amount: decimal(input.quantity).mul(decimal(priced.unit_price)).toFixed(2),
    },
  });
  const updatedQuote = await refreshQuotationTotals(tx, quotationId);
  await audit(
    tx,
    context,
    'PRICED_QUOTATION_ITEM_CREATED',
    'quotation_items',
    item.id,
    undefined,
    item,
  );
  await audit(tx, context, 'RECALCULATED', 'quotations', quotationId, quote, updatedQuote);
  return item;
}

const pricedItemInput = z
  .object({
    description: z.string().trim().min(1).max(255),
    quantity: decimalInput.default('1.000'),
    pricingRuleId: z.string().regex(/^\d+$/),
    materialId: optionalId,
    billableWeightGram: decimalInput.optional(),
    manualUnitPrice: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    productId: optionalId,
    productVariantId: optionalId,
  })
  .strict();

workflowsRouter.get('/workflows/orders', authorize('read'), async (req, res) => {
  const input = workflowListInput.parse(req.query) as SalesWorkflowFilters;
  res.json(await listSalesWorkflows(prisma, req.workspace!.id, input));
});

workflowsRouter.get('/workflows/orders/:workflowKey', authorize('read'), async (req, res) => {
  res.json(
    await salesWorkflowDetail(
      prisma,
      req.workspace!.id,
      typeof req.params.workflowKey === 'string' ? req.params.workflowKey : '',
    ),
  );
});

workflowsRouter.get('/workflows/production', authorize('read'), async (req, res) => {
  const input = workflowListInput.parse(req.query) as ProductionWorkflowFilters;
  res.json(await listProductionWorkflows(prisma, req.workspace!.id, input));
});

workflowsRouter.post('/workflows/pricing/estimate', authorize('sales'), async (req, res) => {
  const input = z
    .object({
      pricingRuleId: z.string().regex(/^\d+$/),
      materialId: optionalId,
      billableWeightGram: decimalInput.optional(),
      manualUnitPrice: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/)
        .optional(),
    })
    .strict()
    .parse(req.body);
  const data = await prisma.$transaction(async (tx) => {
    const materialId = input.materialId ? BigInt(input.materialId) : null;
    if (
      materialId &&
      !(await tx.materials.findFirst({
        where: { id: materialId, workspace_id: req.workspace!.id },
        select: { id: true },
      }))
    )
      throw new AppError(404, 'Material tidak ditemukan di workspace ini.', 'MATERIAL_NOT_FOUND');
    const rule = await currentPricingRule(tx, BigInt(input.pricingRuleId), req.workspace!.id);
    return calculateQuotationItemPricing(rule, {
      materialId,
      billableWeightGram: input.billableWeightGram,
      manualUnitPrice: input.manualUnitPrice,
    });
  });
  res.json({ data });
});

workflowsRouter.post('/workflows/quotations/:id/revision', authorize('sales'), async (req, res) => {
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  const data = await prisma.$transaction(
    (tx) => createQuotationRevision(tx, parseId(req.params.id), context),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
  );
  res.status(201).json({ data });
});

workflowsRouter.post('/workflows/quotations/:id/items', authorize('sales'), async (req, res) => {
  const input = pricedItemInput.parse(req.body);
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  const data = await prisma.$transaction(
    (tx) => createPricedQuotationItem(tx, parseId(req.params.id), input, context),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
  );
  res.status(201).json({ data });
});

export async function convertQuotation(
  tx: Prisma.TransactionClient,
  quotationId: bigint,
  context: WorkspaceContext,
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM quotations WHERE id = ${quotationId} AND workspace_id = ${context.workspaceId} FOR UPDATE`,
  );
  const quote = await tx.quotations.findFirst({
    where: { id: quotationId, workspace_id: context.workspaceId },
    include: { quotation_items: true, custom_requests: true },
  });
  if (!quote) throw new AppError(404, 'Quotation not found.');
  const previous = await tx.orders.findFirst({
    where: { quotation_id: quotationId, workspace_id: context.workspaceId },
  });
  if (previous) return previous;
  if (quote.status !== 'ACCEPTED')
    throw new AppError(409, 'Accept the quotation before converting it to an order.');
  if (!quote.quotation_items.length)
    throw new AppError(422, 'The quotation must contain at least one item.');
  for (const item of quote.quotation_items)
    if (
      !decimal(item.quantity).isInteger() ||
      decimal(item.quantity).lte(0) ||
      decimal(item.quantity).gt(4294967295)
    )
      throw new AppError(
        422,
        'Order quantities must be positive whole numbers. Create a quotation revision with whole quantities.',
      );
  const subtotal = decimal(sumMoney(quote.quotation_items.map((item) => item.amount))).plus(
    decimal(quote.additional_cost),
  );
  const order = await tx.orders.create({
    data: {
      workspace_id: context.workspaceId,
      customer_id: quote.customer_id,
      custom_request_id: quote.custom_request_id,
      quotation_id: quote.id,
      order_source: quote.custom_requests.source,
      status: 'CONFIRMED',
      payment_status: 'UNPAID',
      target_date: quote.custom_requests.target_date,
      subtotal: money(subtotal),
      discount_amount: quote.discount_amount,
      total_price: documentTotal(subtotal, quote.discount_amount),
      currency_code: quote.currency_code,
      created_by_user_id: context.userId,
      internal_notes: `Created from quotation ${quote.quotation_number ?? quote.id.toString()}, revision ${quote.revision_no}.`,
      order_items: {
        create: [
          ...quote.quotation_items.map((item) => ({
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            item_name: item.description.slice(0, 180),
            description: item.description,
            quantity: decimal(item.quantity).toNumber(),
            unit_price: item.unit_price,
            total_price: item.amount,
          })),
          ...(decimal(quote.additional_cost).gt(0)
            ? [
                {
                  item_name: 'Quotation additional cost',
                  description: 'Additional charge carried from the accepted quotation.',
                  quantity: 1,
                  unit_price: quote.additional_cost,
                  total_price: quote.additional_cost,
                },
              ]
            : []),
        ],
      },
    },
  });
  if (quote.custom_requests.status === 'QUOTED') {
    const acceptedRequest = await tx.custom_requests.update({
      where: { id: quote.custom_requests.id },
      data: { status: 'ACCEPTED' },
    });
    await audit(
      tx,
      context,
      'REQUEST_ACCEPTED',
      'custom_requests',
      quote.custom_requests.id,
      quote.custom_requests,
      acceptedRequest,
    );
  }
  await audit(tx, context, 'QUOTATION_CONVERTED', 'orders', order.id, undefined, order);
  await new InAppNotificationProvider(tx).send({
    workspaceId: context.workspaceId,
    recipientUserId: context.userId,
    event: 'order.created',
    title: 'Quotation converted to order',
    entityType: 'orders',
    entityId: order.id,
  });
  return order;
}
workflowsRouter.post(
  ['/quotations/:id/convert', '/quotations/:id/convert-to-order'],
  authorize('sales'),
  async (req, res) => {
    const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
    const data = await prisma.$transaction(
      (tx) => convertQuotation(tx, parseId(req.params.id), context),
      { timeout: 15000 },
    );
    res.json({ data });
  },
);

workflowsRouter.post('/design-assets/:id/create-product', authorize('design'), async (req, res) => {
  const input = z
    .object({ name: z.string().trim().min(1).max(180).optional() })
    .parse(req.body ?? {});
  const context = { workspaceId: req.workspace!.id, userId: req.auth!.userId };
  const assetId = parseId(req.params.id);
  const data = await prisma.$transaction(async (tx) => {
    const asset = await tx.design_assets.findFirst({
      where: { id: assetId, workspace_id: context.workspaceId },
    });
    if (!asset) throw new AppError(404, 'Design asset not found.');
    if (!asset.object_key && !asset.external_url)
      throw new AppError(422, 'Upload a design file or add an external URL first.');
    const product = await tx.products.create({
      data: {
        workspace_id: context.workspaceId,
        name: input.name ?? asset.file_name.replace(/\.[^.]+$/, '').slice(0, 180),
        product_type: 'READY_MODEL',
        status: 'DRAFT',
        catalog_visibility: 'INTERNAL',
        created_by_user_id: context.userId,
        product_assets: {
          create: {
            source_design_asset_id: asset.id,
            asset_type: asset.asset_type,
            file_name: asset.file_name,
            storage_provider: asset.storage_provider,
            bucket_name: asset.bucket_name,
            object_key: asset.object_key,
            external_url: asset.external_url,
            version_label: asset.version_label,
            is_primary: true,
            is_internal_only: true,
            uploaded_by_user_id: context.userId,
            notes: asset.notes,
          },
        },
      },
    });
    await audit(
      tx,
      context,
      'CREATED_FROM_DESIGN',
      'products',
      product.id,
      { design_asset_id: asset.id },
      product,
    );
    return product;
  });
  res.status(201).json({ data });
});
