import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { decimal, documentTotal, lineTotal, money, nonnegative, type DecimalInput } from './money.js';
import { audit, type WorkspaceContext } from './audit.js';
import { InAppNotificationProvider } from './notifications.js';
import { validateTransition } from './status.js';
import { calculateQuotationItemPricing } from '../modules/workflows/pricing.js';

type Row = Record<string, unknown>;
const value = (record: Row, key: string): DecimalInput => record[key] as DecimalInput;
const id = (value: unknown): bigint => BigInt(String(value));
const immutableFields: Record<string, string[]> = {
  quotation_items: ['quotation_id'], order_items: ['order_id'], production_jobs: ['order_item_id'], print_jobs: ['production_job_id'],
  material_usages: ['print_job_id', 'filament_spool_id'], design_tasks: ['custom_request_id'], order_packaging: ['order_id'],
};

export async function beforeWrite(tx: Prisma.TransactionClient, table: string, data: Row, existing: Row | null, context: WorkspaceContext): Promise<Row> {
  const next = { ...data };
  const merged = { ...existing, ...next };
  for (const field of immutableFields[table] ?? []) {
    if (existing && field in next && String(next[field]) !== String(existing[field])) throw new AppError(409, `${field} cannot be reassigned after creation.`);
  }
  validateTransition(table, existing?.status, next.status);
  if (table === 'material_usages' && existing) throw new AppError(409, 'Recorded material consumption is immutable. Record a separate audited stock adjustment on the spool.');
  if (!existing && table === 'quotations' && next.status && next.status !== 'DRAFT') throw new AppError(422, 'A new quotation must start as a draft.');
  if (table === 'quotations' && existing && existing.status !== 'DRAFT') {
    const editable = new Set(['status', 'notes', 'workspace_id', 'updated_at']);
    if (Object.keys(next).some((key) => !editable.has(key) && String(next[key]) !== String(existing[key]))) throw new AppError(409, 'Only draft quotations can be edited. Create a new revision.');
  }
  if (table === 'orders' && existing && ['COMPLETED', 'CANCELLED'].includes(String(existing.status))) throw new AppError(409, 'A closed order cannot be modified.');
  if (table === 'quotation_items') {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM quotations WHERE id = ${id(merged.quotation_id)} AND workspace_id = ${context.workspaceId} FOR UPDATE`);
    const quote = await tx.quotations.findFirst({ where: { id: id(merged.quotation_id), workspace_id: context.workspaceId } });
    if (!quote) throw new AppError(404, 'Quotation not found.');
    if (quote.status !== 'DRAFT') throw new AppError(409, 'Only draft quotation items can be edited.');
    if (decimal(value(merged, 'quantity') ?? '1').lte(0)) throw new AppError(422, 'Quantity must be greater than zero.');
    const pricingInputsChanged = !existing || ['pricing_rule_id', 'material_id', 'billable_weight_gram', 'unit_price'].some((field) => field in next);
    if (merged.pricing_rule_id != null && pricingInputsChanged) {
      const now = new Date();
      const rule = await tx.pricing_rules.findFirst({
        where: {
          id: id(merged.pricing_rule_id), workspace_id: context.workspaceId, is_active: true,
          AND: [{ OR: [{ effective_from: null }, { effective_from: { lte: now } }] }, { OR: [{ effective_until: null }, { effective_until: { gte: now } }] }],
        },
      });
      if (!rule) throw new AppError(404, 'Aturan harga aktif tidak ditemukan untuk tanggal saat ini.', 'PRICING_RULE_NOT_FOUND');
      Object.assign(next, calculateQuotationItemPricing(rule, {
        materialId: merged.material_id == null ? null : id(merged.material_id),
        billableWeightGram: value(merged, 'billable_weight_gram'),
        manualUnitPrice: value(merged, 'unit_price'),
      }));
    } else if (existing && 'pricing_rule_id' in next && merged.pricing_rule_id == null) {
      Object.assign(next, {
        material_id: null, billable_weight_gram: null, pricing_rule_name_snapshot: null, pricing_rule_type_snapshot: null,
        price_per_gram_snapshot: null, minimum_price_snapshot: null, design_fee_snapshot: null, finishing_fee_snapshot: null,
        pricing_breakdown_json: null, pricing_calculated_at: null,
      });
    }
    next.amount = lineTotal(value(merged, 'quantity') ?? '1', value(merged, 'unit_price'));
    if (next.unit_price != null) next.amount = lineTotal(value(merged, 'quantity') ?? '1', value(next, 'unit_price'));
  }
  if (table === 'order_items') {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${id(merged.order_id)} AND workspace_id = ${context.workspaceId} FOR UPDATE`);
    const order = await tx.orders.findFirst({ where: { id: id(merged.order_id), workspace_id: context.workspaceId } });
    if (!order) throw new AppError(404, 'Order not found.');
    if (order.status !== 'CONFIRMED') throw new AppError(409, 'Order items can only be edited before production starts.');
    if (Number(merged.quantity ?? 1) <= 0) throw new AppError(422, 'Quantity must be greater than zero.');
    next.total_price = lineTotal(value(merged, 'quantity') ?? '1', value(merged, 'unit_price'));
  }
  if (table === 'production_costs') {
    next.total_cost = lineTotal(value(merged, 'quantity') ?? '1', value(merged, 'unit_cost'));
    next.recorded_by_user_id = context.userId;
    if (!['ACTUAL', 'ESTIMATED'].includes(String(merged.cost_type ?? 'ACTUAL'))) throw new AppError(422, 'Cost type must be ESTIMATED or ACTUAL.');
    if (!merged.order_id && !merged.production_job_id && !merged.print_job_id) throw new AppError(422, 'Associate a production cost with an order, production job, or print job.');
    if (merged.print_job_id) {
      const print = await tx.print_jobs.findFirst({ where: { id: id(merged.print_job_id), workspace_id: context.workspaceId }, include: { production_jobs: { include: { order_items: true } } } });
      if (!print) throw new AppError(404, 'Print job not found.');
      if (merged.production_job_id && id(merged.production_job_id) !== print.production_job_id) throw new AppError(422, 'Print job does not belong to this production job.');
      if (merged.order_id && id(merged.order_id) !== print.production_jobs.order_items.order_id) throw new AppError(422, 'Print job does not belong to this order.');
    } else if (merged.production_job_id && merged.order_id) {
      const production = await tx.production_jobs.findFirst({ where: { id: id(merged.production_job_id), workspace_id: context.workspaceId }, include: { order_items: true } });
      if (!production || production.order_items.order_id !== id(merged.order_id)) throw new AppError(422, 'Production job does not belong to this order.');
    }
  }
  if (table === 'filament_spools') {
    if ('color_hex' in next && next.color_hex != null) {
      const color = String(next.color_hex).trim().toUpperCase();
      if (!/^#[0-9A-F]{6}$/.test(color))
        throw new AppError(422, 'Gunakan kode warna HEX dengan format #RRGGBB.', 'INVALID_FILAMENT_COLOR');
      next.color_hex = color;
    }
    const initial = nonnegative(value(merged, 'initial_weight_gram'), 'Initial weight');
    const remaining = nonnegative(value(merged, 'remaining_weight_gram') ?? initial, 'Remaining weight');
    if (remaining.gt(initial)) throw new AppError(422, 'Remaining weight cannot exceed initial weight.');
    if (!existing && !('remaining_weight_gram' in next)) next.remaining_weight_gram = initial.toFixed(3);
    next.cost_per_gram = initial.isZero() ? '0.0000' : nonnegative(value(merged, 'purchase_price'), 'Purchase price').div(initial).toFixed(4);
  }
  if (table === 'material_usages') {
    const weight = nonnegative(value(merged, 'weight_gram'), 'Consumed weight');
    if (weight.lte(0)) throw new AppError(422, 'Consumed weight must be greater than zero.');
    const spool = await tx.filament_spools.findFirst({ where: { id: id(merged.filament_spool_id), workspace_id: context.workspaceId } });
    if (!spool) throw new AppError(404, 'Filament spool not found.');
    const changed = await tx.filament_spools.updateMany({ where: { id: spool.id, workspace_id: context.workspaceId, remaining_weight_gram: { gte: weight.toFixed(3) } }, data: { remaining_weight_gram: { decrement: weight.toFixed(3) } } });
    if (changed.count !== 1) throw new AppError(409, 'Insufficient remaining filament. No consumption was recorded.');
    next.cost_per_gram = spool.cost_per_gram.toString();
    next.total_cost = lineTotal(weight, spool.cost_per_gram);
    next.recorded_by_user_id = context.userId;
    await audit(tx, context, 'STOCK_CONSUMED', 'filament_spools', spool.id, { remaining_weight_gram: spool.remaining_weight_gram }, { consumed_weight_gram: weight.toFixed(3), print_job_id: merged.print_job_id });
  }
  if (table === 'slicing_results' && ('model_weight_gram' in next || 'support_weight_gram' in next || !existing)) next.total_weight_gram = nonnegative(value(merged, 'model_weight_gram')).plus(nonnegative(value(merged, 'support_weight_gram'))).toFixed(3);
  if (table === 'quotations' || table === 'orders') {
    const total = existing ? table === 'quotations'
      ? (await tx.quotation_items.aggregate({ where: { quotation_id: id(existing.id) }, _sum: { amount: true } }))._sum.amount
      : (await tx.order_items.aggregate({ where: { order_id: id(existing.id) }, _sum: { total_price: true } }))._sum.total_price : '0';
    next.subtotal = money(total);
    next.total_price = documentTotal(total, value(merged, 'discount_amount'), table === 'quotations' ? value(merged, 'additional_cost') : '0');
  }
  if (table === 'order_packaging' && !('actual_cost' in next) && !existing) {
    const packaging = await tx.packaging_types.findFirst({ where: { id: id(merged.packaging_type_id), workspace_id: context.workspaceId } });
    if (!packaging) throw new AppError(404, 'Packaging type not found.');
    next.actual_cost = lineTotal(value(merged, 'quantity') ?? '1', packaging.default_cost);
  }
  if (table === 'pricing_rules' && merged.effective_from && merged.effective_until && new Date(String(merged.effective_from)) > new Date(String(merged.effective_until))) throw new AppError(422, 'Effective end must be after the start.');
  if (table === 'product_assets') next.is_internal_only = true;
  if (table === 'print_jobs' && !existing) next.queued_at ??= new Date();
  if (table === 'print_failures') next.reported_by_user_id = context.userId;
  if (table === 'qc_inspections') { next.inspected_by_user_id = context.userId; next.inspected_at ??= new Date(); }
  if (next.status && next.status !== existing?.status) {
    const now = new Date();
    if (table === 'quotations') {
      if (next.status === 'APPROVED') { if (decimal(value(next, 'subtotal')).lte(0)) throw new AppError(422, 'Add priced items before approving a quotation.'); next.approved_by_user_id = context.userId; }
      if (next.status === 'SENT') next.sent_at = now;
      if (next.status === 'ACCEPTED') { if (merged.valid_until && new Date(String(merged.valid_until)) < now) throw new AppError(409, 'This quotation has expired.'); next.accepted_at = now; }
      if (next.status === 'DECLINED') next.declined_at = now;
    }
    if (table === 'print_jobs') { if (next.status === 'PRINTING' && !merged.started_at) next.started_at = now; if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(String(next.status))) next.completed_at = now; if (next.status === 'QUEUED') next.queued_at ??= now; }
    if (table === 'production_jobs') { if (['IN_PROGRESS', 'PRINTING'].includes(String(next.status)) && !merged.actual_start) next.actual_start = now; if (next.status === 'COMPLETED') next.actual_end = now; }
    if (table === 'design_tasks') { if (next.status === 'IN_PROGRESS' && !merged.started_at) next.started_at = now; if (next.status === 'COMPLETED') next.completed_at = now; }
    if (table === 'orders' && next.status === 'COMPLETED') next.completed_at = now;
    if (table === 'order_packaging' && next.status === 'PACKED') { next.packed_at = now; next.packed_by_user_id = context.userId; }
    if (table === 'ip_reviews' && ['CLEAR', 'RESTRICTED'].includes(String(next.status))) { next.reviewed_at = now; next.reviewed_by_user_id = context.userId; }
  }
  return next;
}

export async function afterWrite(tx: Prisma.TransactionClient, table: string, record: Row, existing: Row | null, context: WorkspaceContext): Promise<void> {
  if (table === 'quotation_items') {
    const quoteId = id(record.quotation_id);
    const quote = await tx.quotations.findUniqueOrThrow({ where: { id: quoteId } });
    const total = (await tx.quotation_items.aggregate({ where: { quotation_id: quoteId }, _sum: { amount: true } }))._sum.amount;
    const updated = await tx.quotations.update({ where: { id: quoteId }, data: { subtotal: money(total), total_price: documentTotal(total, quote.discount_amount, quote.additional_cost) } });
    await audit(tx, context, 'RECALCULATED', 'quotations', quoteId, quote, updated);
  }
  if (table === 'order_items') {
    const orderId = id(record.order_id);
    const order = await tx.orders.findUniqueOrThrow({ where: { id: orderId } });
    const total = (await tx.order_items.aggregate({ where: { order_id: orderId }, _sum: { total_price: true } }))._sum.total_price;
    const updated = await tx.orders.update({ where: { id: orderId }, data: { subtotal: money(total), total_price: documentTotal(total, order.discount_amount) } });
    await audit(tx, context, 'RECALCULATED', 'orders', orderId, order, updated);
  }
  const eventTables = new Set(['custom_requests', 'design_tasks', 'quotations', 'orders', 'production_jobs', 'print_jobs', 'print_failures', 'qc_inspections']);
  if (eventTables.has(table) && (!existing || record.status !== existing.status)) {
    const recipient = record.assigned_to_user_id ?? record.assigned_designer_id ?? record.assigned_operator_id ?? record.operator_id ?? context.userId;
    await new InAppNotificationProvider(tx).send({ workspaceId: context.workspaceId, recipientUserId: id(recipient), event: `${table}.${existing ? 'status_changed' : 'created'}`, title: `${table.replaceAll('_', ' ')} ${existing ? 'updated' : 'created'}`, message: record.status ? `Status: ${String(record.status)}` : undefined, entityType: table, entityId: id(record.id) });
  }
}
