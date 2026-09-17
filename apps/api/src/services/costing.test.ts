import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { costSummary } from './costing.js';

describe('HPP ledger summary', () => {
  it('keeps estimated and actual components distinct, avoids duplicate material costs, and derives margin', async () => {
    const tx = {
      production_costs: { findMany: vi.fn().mockResolvedValue([
        { id: 1n, cost_type: 'ESTIMATED', total_cost: '90.10', quantity: '1', unit_cost: '90.10', cost_components: { name: 'Material estimate', category: 'MATERIAL' } },
        { id: 2n, cost_type: 'ACTUAL', total_cost: '100.20', quantity: '1', unit_cost: '100.20', cost_components: { name: 'Material', category: 'MATERIAL' } },
        { id: 3n, cost_type: 'ACTUAL', total_cost: '10.05', quantity: '1', unit_cost: '10.05', cost_components: { name: 'Waste', category: 'WASTE' } },
      ]) },
      orders: { aggregate: vi.fn().mockResolvedValue({ _sum: { total_price: '200.50' } }) },
      material_usages: { findMany: vi.fn().mockResolvedValue([{ usage_type: 'MODEL', weight_gram: '10', total_cost: '100.20' }, { usage_type: 'WASTE', weight_gram: '1', total_cost: '10.05' }]) },
      order_packaging: { aggregate: vi.fn().mockResolvedValue({ _sum: { actual_cost: '0' } }) },
    } as unknown as Prisma.TransactionClient;
    const summary = await costSummary(tx, 4n, 5n);
    expect(summary).toMatchObject({ estimatedHpp: '90.10', actualHpp: '110.25', sellingPrice: '200.50', margin: '90.25', materialCost: '100.20', wasteCost: '10.05', materialUsageGram: '11.000' });
    expect(tx.production_costs.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workspace_id: 4n, OR: expect.any(Array) }) }));
  });
});
