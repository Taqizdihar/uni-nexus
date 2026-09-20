import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { beforeWrite, afterWrite } from './domain.js';
import { validateTransition } from './status.js';
import { safeJson } from './audit.js';

const context = { workspaceId: 4n, userId: 7n };
function mockInventory(count: number) {
  const updateMany = vi.fn().mockResolvedValue({ count });
  const auditCreate = vi.fn().mockResolvedValue({});
  const tx = { filament_spools: { findFirst: vi.fn().mockResolvedValue({ id: 12n, remaining_weight_gram: '50', cost_per_gram: '123.4567' }), updateMany }, print_jobs: { findFirst: vi.fn().mockResolvedValue({ id: 99n }) }, audit_logs: { create: auditCreate } };
  return { tx: tx as unknown as Prisma.TransactionClient, updateMany, auditCreate };
}
describe('inventory invariants', () => {
  it('decrements with a workspace-scoped stock condition and snapshots spool cost', async () => {
    const { tx, updateMany, auditCreate } = mockInventory(1);
    const next = await beforeWrite(tx, 'material_usages', { filament_spool_id: 12n, print_job_id: 99n, weight_gram: '12.500', cost_per_gram: '0', total_cost: '0' }, null, context);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 12n, workspace_id: 4n, remaining_weight_gram: { gte: '12.500' } }, data: { remaining_weight_gram: { decrement: '12.500' } } });
    expect(next.total_cost).toBe('1543.21');
    expect(next.cost_per_gram).toBe('123.4567');
    expect(auditCreate).toHaveBeenCalledOnce();
  });
  it('refuses insufficient stock without recording an audit success', async () => {
    const { tx, auditCreate } = mockInventory(0);
    await expect(beforeWrite(tx, 'material_usages', { filament_spool_id: 12n, print_job_id: 99n, weight_gram: '60' }, null, context)).rejects.toThrow('Insufficient remaining filament');
    expect(auditCreate).not.toHaveBeenCalled();
  });
  it('prevents rewriting consumption and stock above original capacity', async () => {
    const { tx, updateMany } = mockInventory(1);
    await expect(beforeWrite(tx, 'material_usages', { weight_gram: '1' }, { id: 1n }, context)).rejects.toThrow('immutable');
    await expect(beforeWrite(tx, 'filament_spools', { initial_weight_gram: '100', remaining_weight_gram: '101' }, null, context)).rejects.toThrow('cannot exceed');
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('initializes new spool stock from the initial weight and protects it on edit', async () => {
    const tx = {
      filament_spools: { findFirst: vi.fn(), updateMany: vi.fn() },
      audit_logs: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;
    const created = await beforeWrite(tx, 'filament_spools', {
      initial_weight_gram: '1000',
      remaining_weight_gram: '0',
      purchase_price: '154540',
    }, null, context);
    expect(created.remaining_weight_gram).toBe('1000.000');
    expect(created.cost_per_gram).toBe('154.5400');
    await expect(beforeWrite(tx, 'filament_spools', {
      remaining_weight_gram: '500',
    }, { id: 1n, initial_weight_gram: '1000', remaining_weight_gram: '958', purchase_price: '154540' }, context)).rejects.toThrow('Sisa berat');
  });
});
describe('workflow and audit integrity', () => {
  it('allows queue progression while preserving failed attempts as terminal history', () => {
    expect(() => validateTransition('print_jobs', 'QUEUED', 'PRINTING')).not.toThrow();
    expect(() => validateTransition('print_jobs', 'PRINTING', 'FAILED')).not.toThrow();
    expect(() => validateTransition('print_jobs', 'FAILED', 'QUEUED')).toThrow('Cannot move');
    expect(() => validateTransition('quotations', 'DRAFT', 'ACCEPTED')).toThrow('Cannot move');
  });
  it('recalculates an order after item writes using decimal totals', async () => {
    const update = vi.fn().mockResolvedValue({ id: 5n });
    const tx = { orders: { findUniqueOrThrow: vi.fn().mockResolvedValue({ discount_amount: '0.10' }), update }, order_items: { aggregate: vi.fn().mockResolvedValue({ _sum: { total_price: '100.20' } }) }, audit_logs: { create: vi.fn() } } as unknown as Prisma.TransactionClient;
    await afterWrite(tx, 'order_items', { order_id: 5n }, null, context);
    expect(update).toHaveBeenCalledWith({ where: { id: 5n }, data: { subtotal: '100.20', total_price: '100.10' } });
  });
  it('strips credentials and private storage identifiers recursively from audit snapshots', () => {
    expect(safeJson({ id: 1n, object_key: 'private', nested: { password_hash: 'private', token_hash: 'private', name: 'visible' } })).toEqual({ id: '1', nested: { name: 'visible' } });
  });
});
