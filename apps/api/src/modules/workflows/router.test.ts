import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));
import { convertQuotation } from './router.js';

describe('quotation conversion', () => {
  const context = { workspaceId: 4n, userId: 7n };
  function transaction(status = 'ACCEPTED', previous: unknown = null) {
    const quote = { id: 10n, status, customer_id: 12n, custom_request_id: 9n, revision_no: 2, discount_amount: '2.00', additional_cost: '3.50', currency_code: 'IDR', custom_requests: { source: 'WHATSAPP' }, quotation_items: [{ description: 'Model', quantity: '2', unit_price: '10.00', amount: '20.00' }] };
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), quotations: { findFirst: vi.fn().mockResolvedValue(quote) }, orders: { findFirst: vi.fn().mockResolvedValue(previous), create: vi.fn().mockResolvedValue({ id: 123n }) }, audit_logs: { create: vi.fn() }, notification_settings: { findFirst: vi.fn().mockResolvedValue(null) }, workspace_members: { findFirst: vi.fn().mockResolvedValue(null) } };
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
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ workspace_id: 4n, quotation_id: 10n, subtotal: '23.50', total_price: '21.50', order_items: { create: expect.arrayContaining([expect.objectContaining({ item_name: 'Quotation additional cost', total_price: '3.50' })]) } }) });
  });
  it('returns the existing order when repeated and rejects unrepresentable fractional quantities', async () => {
    const repeated = transaction('ACCEPTED', { id: 321n });
    expect(await convertQuotation(repeated.tx, 10n, context)).toEqual({ id: 321n });
    expect(repeated.create).not.toHaveBeenCalled();
    const fractional = transaction();
    fractional.quote.quotation_items[0]!.quantity = '1.5';
    await expect(convertQuotation(fractional.tx, 10n, context)).rejects.toThrow('positive whole numbers');
  });
});
