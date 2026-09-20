import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { upsertOrderHpp } from './hpp.js';

describe('simplified order HPP editor', () => {
  it('creates once and updates the same component row instead of accumulating duplicates', async () => {
    const findCost = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 10n, cost_component_id: 20n, total_cost: '20000.00' });
    const tx = {
      orders: { findFirst: vi.fn().mockResolvedValue({ id: 5n }) },
      cost_components: { findFirst: vi.fn().mockResolvedValue({ id: 20n, code: 'HPP_DESIGN', name: 'Biaya Desain' }) },
      production_costs: {
        findFirst: findCost,
        create: vi.fn().mockResolvedValue({ id: 10n, total_cost: '20000.00' }),
        update: vi.fn().mockResolvedValue({ id: 10n, total_cost: '25000.00' }),
      },
      audit_logs: { create: vi.fn().mockResolvedValue({}) },
    } as unknown as Prisma.TransactionClient;
    const context = { workspaceId: 4n, userId: 7n };
    await upsertOrderHpp(tx, 5n, { componentCode: 'HPP_DESIGN', amount: '20000' }, context);
    await upsertOrderHpp(tx, 5n, { componentCode: 'HPP_DESIGN', amount: '25000' }, context);
    expect(tx.production_costs.create).toHaveBeenCalledOnce();
    expect(tx.production_costs.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10n },
      data: expect.objectContaining({ total_cost: '25000.00', unit_cost: '25000.00' }),
    }));
    expect(findCost).toHaveBeenCalledTimes(2);
  });
});
