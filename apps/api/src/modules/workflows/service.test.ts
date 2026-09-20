import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  filterSalesWorkflows,
  listSalesWorkflows,
  salesWorkflowDetail,
  type SalesWorkflowRow,
} from './service.js';

const base = (id: string, stage: SalesWorkflowRow['stage'], request = true): SalesWorkflowRow => ({
  workflow_key: request ? `request:${id}` : `order:${id}`,
  custom_request_id: request ? id : null,
  order_id: request ? null : id,
  request_number: request ? `RN-${id}` : null,
  order_number: request ? null : `ORD-${id}`,
  customer: { id: '9', full_name: id === '3' ? 'Sari' : 'Wiharjo Terhormat' },
  title: `Job ${id}`,
  stage,
  stage_label: stage,
  status: stage === 'COMPLETED' ? 'COMPLETED' : 'NEW',
  priority: 'NORMAL',
  assigned: null,
  target_date: new Date(`2026-09-2${id}`),
  value: '20000.00',
  payment_status: 'UNPAID',
  source: 'WHATSAPP',
  updated_at: new Date(`2026-09-2${id}T00:00:00Z`),
  next_action: 'Lanjutkan',
});

describe('unified sales workflow list', () => {
  it('filters one derived row per workflow', () => {
    const rows = [base('1', 'REQUEST'), base('2', 'DESIGN'), base('3', 'COMPLETED', false)];
    expect(
      filterSalesWorkflows(rows, { page: 1, pageSize: 20, stage: 'DESIGN' }).map(
        (row) => row.workflow_key,
      ),
    ).toEqual(['request:2']);
    expect(
      filterSalesWorkflows(rows, { page: 1, pageSize: 20, customer: 'sari' }).map(
        (row) => row.workflow_key,
      ),
    ).toEqual(['order:3']);
  });

  it('keeps request workflows and direct orders distinct, scoped, counted, and paginated', async () => {
    const requests = [
      {
        id: 1n,
        status: 'QUOTED',
        request_number: 'RN-001',
        title: 'Gantungan Kunci',
        customers: { id: 9n, full_name: 'Wiharjo Terhormat' },
        design_tasks: [],
        quotations: [],
        orders: [
          {
            id: 3n,
            status: 'CONFIRMED',
            order_number: 'ORD-001',
            customer_id: 9n,
            custom_request_id: 1n,
            payment_status: 'UNPAID',
            total_price: '20000',
            subtotal: '20000',
            discount_amount: '0',
            order_source: 'WHATSAPP',
            customers: { id: 9n, full_name: 'Wiharjo Terhormat' },
            order_items: [],
            order_packaging: [],
            updated_at: new Date('2026-09-20'),
          },
        ],
        updated_at: new Date('2026-09-20'),
      },
    ];
    const directOrders = [
      {
        id: 2n,
        status: 'CONFIRMED',
        order_number: 'ORD-002',
        order_source: 'OFFLINE',
        payment_status: 'UNPAID',
        total_price: '10000',
        subtotal: '10000',
        discount_amount: '0',
        customers: { id: 10n, full_name: 'Sari' },
        order_items: [],
        order_packaging: [],
        updated_at: new Date('2026-09-21'),
      },
    ];
    const custom_requests = { findMany: vi.fn().mockResolvedValue(requests) };
    const orders = { findMany: vi.fn().mockResolvedValue(directOrders) };
    const db = { custom_requests, orders } as unknown as PrismaClient;
    const result = await listSalesWorkflows(db, 4n, { page: 2, pageSize: 1 });
    expect(result.meta).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect(result.data).toHaveLength(1);
    expect(new Set(result.data.map((row) => row.workflow_key)).size).toBe(1);
    expect(result.counts.ALL).toBe(2);
    expect(result.counts.READY_FOR_PRODUCTION).toBe(2);
    expect(custom_requests.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspace_id: 4n } }),
    );
    expect(orders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspace_id: 4n, custom_request_id: null } }),
    );
  });

  it('does not expose a crafted request workflow key outside the active workspace', async () => {
    const custom_requests = { findFirst: vi.fn().mockResolvedValue(null) };
    const db = { custom_requests } as unknown as PrismaClient;
    await expect(salesWorkflowDetail(db, 4n, 'request:99')).rejects.toThrow(
      'Workflow tidak ditemukan',
    );
    expect(custom_requests.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99n, workspace_id: 4n } }),
    );
  });
});
