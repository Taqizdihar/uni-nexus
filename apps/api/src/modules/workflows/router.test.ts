import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));
import { convertQuotation, createQuotationRevision } from './router.js';

describe('quotation conversion', () => {
  const context = { workspaceId: 4n, userId: 7n };
  function transaction(status = 'ACCEPTED', previous: unknown = null) {
    const quote = {
      id: 10n,
      status,
      customer_id: 12n,
      custom_request_id: 9n,
      revision_no: 2,
      discount_amount: '2.00',
      additional_cost: '3.50',
      currency_code: 'IDR',
      custom_requests: { id: 9n, source: 'WHATSAPP', target_date: null, status: 'QUOTED' },
      quotation_items: [
        { description: 'Model', quantity: '2', unit_price: '10.00', amount: '20.00' },
      ],
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      quotations: { findFirst: vi.fn().mockResolvedValue(quote) },
      orders: {
        findFirst: vi.fn().mockResolvedValue(previous),
        create: vi.fn().mockResolvedValue({ id: 123n }),
      },
      custom_requests: {
        update: vi.fn().mockResolvedValue({ ...quote.custom_requests, status: 'ACCEPTED' }),
      },
      audit_logs: { create: vi.fn() },
      notification_settings: { findFirst: vi.fn().mockResolvedValue(null) },
      workspace_members: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    return { tx: tx as unknown as Prisma.TransactionClient, quote, create: tx.orders.create };
  }
  it('requires acceptance and does not create an order for a draft', async () => {
    const { tx, create } = transaction('DRAFT');
    await expect(convertQuotation(tx, 10n, context)).rejects.toThrow('Accept the quotation');
    expect(create).not.toHaveBeenCalled();
  });
  it('preserves additional charges and exact totals in an accepted conversion', async () => {
    const { tx, create } = transaction();
    await convertQuotation(tx, 10n, context);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspace_id: 4n,
        quotation_id: 10n,
        subtotal: '23.50',
        total_price: '21.50',
        order_items: {
          create: expect.arrayContaining([
            expect.objectContaining({
              item_name: 'Quotation additional cost',
              total_price: '3.50',
            }),
          ]),
        },
      }),
    });
    expect(tx.custom_requests.update).toHaveBeenCalledWith({
      where: { id: 9n },
      data: { status: 'ACCEPTED' },
    });
  });
  it('returns the existing order when repeated and rejects unrepresentable fractional quantities', async () => {
    const repeated = transaction('ACCEPTED', { id: 321n });
    expect(await convertQuotation(repeated.tx, 10n, context)).toEqual({ id: 321n });
    expect(repeated.create).not.toHaveBeenCalled();
    const fractional = transaction();
    fractional.quote.quotation_items[0]!.quantity = '1.5';
    await expect(convertQuotation(fractional.tx, 10n, context)).rejects.toThrow(
      'positive whole numbers',
    );
  });
});

describe('quotation revisions', () => {
  it('locks the source, allocates the next revision, and copies immutable pricing snapshots', async () => {
    const source = {
      id: 10n,
      quotation_number: 'QT-010',
      revision_no: 3,
      custom_request_id: 9n,
      customer_id: 12n,
      subtotal: '25000.00',
      discount_amount: '0.00',
      additional_cost: '0.00',
      total_price: '25000.00',
      currency_code: 'IDR',
      valid_until: null,
      notes: 'Keep the design fee.',
      quotation_items: [
        {
          product_id: 4n,
          product_variant_id: null,
          pricing_rule_id: 3n,
          material_id: 2n,
          billable_weight_gram: '40.000',
          pricing_rule_name_snapshot: 'PLA',
          pricing_rule_type_snapshot: 'PER_GRAM',
          price_per_gram_snapshot: '500.0000',
          minimum_price_snapshot: '10000.00',
          design_fee_snapshot: '5000.00',
          finishing_fee_snapshot: '0.00',
          pricing_breakdown_json: { version: 1 },
          pricing_calculated_at: new Date('2026-09-20T00:00:00Z'),
          description: 'Model',
          quantity: '1.000',
          unit_price: '25000.00',
          amount: '25000.00',
        },
      ],
    };
    const create = vi.fn().mockResolvedValue({ id: 11n, revision_no: 4 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      quotations: {
        findFirst: vi.fn().mockResolvedValue(source),
        aggregate: vi.fn().mockResolvedValue({ _max: { revision_no: 3 } }),
        create,
      },
      audit_logs: { create: vi.fn().mockResolvedValue({}) },
    } as unknown as Prisma.TransactionClient;

    await createQuotationRevision(tx, 10n, { workspaceId: 4n, userId: 7n });

    expect(tx.$queryRaw as ReturnType<typeof vi.fn>).toHaveBeenCalledBefore(
      tx.quotations.findFirst as ReturnType<typeof vi.fn>,
    );
    expect(tx.quotations.aggregate).toHaveBeenCalledWith({
      where: { workspace_id: 4n, custom_request_id: 9n },
      _max: { revision_no: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'DRAFT',
        revision_no: 4,
        quotation_items: {
          create: [
            expect.objectContaining({
              pricing_rule_id: 3n,
              pricing_breakdown_json: { version: 1 },
              price_per_gram_snapshot: '500.0000',
            }),
          ],
        },
      }),
    });
  });
});
