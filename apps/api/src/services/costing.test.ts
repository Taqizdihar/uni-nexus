import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { costSummary, isHppFilamentUsage, isWasteUsage } from './costing.js';

describe('HPP v1 calculation', () => {
  it('uses actual filament usage plus only HPP design and paint components', async () => {
    const tx = {
      production_costs: {
        findMany: vi.fn().mockResolvedValue([
          { id: 1n, cost_type: 'ESTIMATED', total_cost: '90.10', quantity: '1', unit_cost: '90.10', cost_components: { id: 1n, code: 'HPP_DESIGN', name: 'Biaya Desain', category: 'DESIGN' } },
          { id: 2n, cost_type: 'ACTUAL', total_cost: '20000.00', quantity: '1', unit_cost: '20000.00', cost_components: { id: 2n, code: 'HPP_DESIGN', name: 'Biaya Desain', category: 'DESIGN' } },
          { id: 3n, cost_type: 'ACTUAL', total_cost: '12000.00', quantity: '1', unit_cost: '12000.00', cost_components: { id: 3n, code: 'HPP_PAINT', name: 'Biaya Cat', category: 'PAINT' } },
          { id: 4n, cost_type: 'ACTUAL', total_cost: '99999.00', quantity: '1', unit_cost: '99999.00', cost_components: { id: 4n, code: 'MACHINE', name: 'Mesin', category: 'MACHINE' } },
        ]),
      },
      orders: { aggregate: vi.fn().mockResolvedValue({ _sum: { total_price: '66000.00' } }) },
      material_usages: { findMany: vi.fn().mockResolvedValue([
        { id: 1n, usage_type: 'MODEL', weight_gram: '42', total_cost: '6490.68' },
        { id: 2n, usage_type: 'WASTE', weight_gram: '3', total_cost: '463.62' },
        { id: 3n, usage_type: 'PURGE', weight_gram: '1', total_cost: '154.54' },
      ]) },
      order_packaging: { aggregate: vi.fn().mockResolvedValue({ _sum: { actual_cost: '1000.00' } }) },
    } as unknown as Prisma.TransactionClient;

    const summary = await costSummary(tx, 4n, 5n);
    expect(summary).toMatchObject({
      estimatedHpp: '90.10',
      actualHpp: '38490.68',
      sellingPrice: '66000.00',
      margin: '27509.32',
      marginPercent: '41.68',
      filamentCost: '6490.68',
      designCost: '20000.00',
      paintCost: '12000.00',
      wasteCost: '618.16',
      filamentUsageGram: '42.000',
    });
    expect(summary.actualHpp).not.toContain('99999');
    expect(tx.production_costs.findMany).toHaveBeenCalledWith(expect.objectContaining({ distinct: ['id'] }));
  });

  it('centralizes normal, waste, and HPP component rules', () => {
    expect(isHppFilamentUsage('MODEL')).toBe(true);
    expect(isHppFilamentUsage('SUPPORT')).toBe(true);
    expect(isWasteUsage('WASTE')).toBe(true);
    expect(isWasteUsage('PURGE')).toBe(true);
    expect(isHppFilamentUsage('PURGE')).toBe(false);
  });
});
