import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  filterSalesWorkflows,
  listSalesWorkflows,
  salesWorkflowDetail,
  redactWorkflowFinancials,
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

describe('workflow financial redaction', () => {
  const detail = {
    workflow: { value: '66000.00', payment_status: 'PAID' },
    request: {
      quotations: [{ total_price: '66000.00', quotation_items: [{ unit_price: '500.00', amount: '20000.00', description: 'Model' }] }],
      orders: [{ total_price: '66000.00', order_items: [{ unit_price: '66000.00', total_price: '66000.00', item_name: 'Model', production_jobs: [{ print_jobs: [{ material_usages: [{ cost_per_gram: '154.5400', total_cost: '6490.68' }] }] }] }], order_packaging: [{ actual_cost: '5000.00' }] }],
    },
    order: { total_price: '66000.00', order_items: [{ unit_price: '66000.00', total_price: '66000.00', production_jobs: [{ print_jobs: [{ material_usages: [{ cost_per_gram: '154.5400', total_cost: '6490.68' }] }] }] }], order_packaging: [{ actual_cost: '5000.00' }] },
    quotations: [{ total_price: '66000.00', quotation_items: [{ unit_price: '500.00', amount: '20000.00' }] }],
    hpp: { actualHpp: '38490.68', margin: '27509.32' },
  };
  it('redacts HPP and commercial values for read-only workflow access', () => {
    const safe = redactWorkflowFinancials(detail, { canSeeSales: false, canSeeFinance: false });
    expect(safe.workflow.value).toBeNull();
    expect(safe.hpp).toBeNull();
    expect(safe.order.total_price).toBeUndefined();
    expect(safe.quotations[0].total_price).toBeUndefined();
    expect(safe.quotations[0].quotation_items[0].unit_price).toBeUndefined();
    expect(safe.order.order_items[0].production_jobs[0].print_jobs[0].material_usages[0].total_cost).toBeUndefined();
    expect(safe.order.order_packaging[0].actual_cost).toBeUndefined();
  });
  it('keeps HPP for finance and commercial values for sales', () => {
    const visible = redactWorkflowFinancials(detail, { canSeeSales: true, canSeeFinance: true });
    expect(visible.workflow.value).toBe('66000.00');
    expect(visible.hpp.actualHpp).toBe('38490.68');
    expect(visible.order.total_price).toBe('66000.00');
  });
  it('returns one redacted detail envelope without an inner data object', async () => {
    const quote = {
      id: 20n,
      status: 'SENT',
      revision_no: 1,
      total_price: '66000.00',
      subtotal: '66000.00',
      discount_amount: '0.00',
      additional_cost: '0.00',
      quotation_items: [],
    };
    const order = {
      id: 30n,
      status: 'CONFIRMED',
      order_number: 'ORD-001',
      customer_id: 9n,
      payment_status: 'PAID',
      total_price: '66000.00',
      subtotal: '66000.00',
      discount_amount: '0.00',
      customers: { id: 9n, full_name: 'Wiharjo Terhormat' },
      quotations: quote,
      order_items: [],
      order_packaging: [],
    };
    const request = {
      id: 1n,
      status: 'FEASIBLE',
      request_number: 'RN-001',
      title: 'Gantungan Kunci',
      customers: { id: 9n, full_name: 'Wiharjo Terhormat' },
      design_tasks: [],
      quotations: [quote],
      orders: [order],
    };
    const db = {
      custom_requests: { findFirst: vi.fn().mockResolvedValue(request) },
      orders: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { total_price: '66000.00' } }),
      },
      production_costs: {
        findMany: vi.fn().mockResolvedValue([
          { id: 40n, cost_type: 'ACTUAL', quantity: '1.0000', unit_cost: '20000.0000', total_cost: '20000.00', cost_components: { code: 'HPP_DESIGN', name: 'Desain', category: 'HPP' } },
          { id: 41n, cost_type: 'ACTUAL', quantity: '1.0000', unit_cost: '12000.0000', total_cost: '12000.00', cost_components: { code: 'HPP_PAINT', name: 'Cat', category: 'HPP' } },
        ]),
      },
      material_usages: { findMany: vi.fn().mockResolvedValue([]) },
      order_packaging: { aggregate: vi.fn().mockResolvedValue({ _sum: { actual_cost: '0.00' } }) },
      audit_logs: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const readonlyResponse = await salesWorkflowDetail(db, 4n, 'request:1');
    expect(readonlyResponse.data.workflow).toBeDefined();
    expect(readonlyResponse.data.order).toBeDefined();
    expect(readonlyResponse.data.hpp).toBeNull();
    expect(readonlyResponse.data.data).toBeUndefined();

    const financeResponse = await salesWorkflowDetail(db, 4n, 'request:1', {
      canSeeSales: true,
      canSeeFinance: true,
    });
    expect(financeResponse.data.workflow).toBeDefined();
    expect(financeResponse.data.hpp?.actualHpp).toBe('32000.00');
    expect(financeResponse.data.data).toBeUndefined();
  });
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
    expect(
      filterSalesWorkflows(
        [{ ...base('4', 'PRODUCTION'), status: 'PRINTING' }],
        { page: 1, pageSize: 20, status: 'Sedang Dicetak' },
      ),
    ).toHaveLength(1);
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

  it('calculates filtered totals before pagination', async () => {
    const requests = Array.from({ length: 25 }, (_, index) => {
      const id = BigInt(index + 1);
      const customer = index < 3 ? { id: 9n, full_name: 'Wiharjo' } : { id: 10n, full_name: 'Sari' };
      const orderStatus = index < 10 ? null : index < 18 ? 'IN_PRODUCTION' : 'COMPLETED';
      return {
        id,
        status: 'FEASIBLE',
        request_number: `RN-${String(index + 1).padStart(3, '0')}`,
        title: `Model ${index + 1}`,
        customers: customer,
        design_tasks: orderStatus ? [] : [{ status: 'COMPLETED', updated_at: new Date('2026-09-20') }],
        quotations: [],
        orders: orderStatus
          ? [{
              id: 100n + id,
              status: orderStatus,
              order_number: `ORD-${String(index + 1).padStart(3, '0')}`,
              customer_id: customer.id,
              custom_request_id: id,
              customers: customer,
              order_items: [],
              order_packaging: [],
              updated_at: new Date('2026-09-20'),
            }]
          : [],
        updated_at: new Date('2026-09-20'),
      };
    });
    const db = {
      custom_requests: { findMany: vi.fn().mockResolvedValue(requests) },
      orders: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const designPage = await listSalesWorkflows(db, 4n, {
      page: 1,
      pageSize: 10,
      stage: 'DESIGN',
    });
    expect(designPage.meta).toMatchObject({ total: 10, totalPages: 1 });
    expect(designPage.data).toHaveLength(10);
    expect(designPage.data[0]?.next_action).toBe('Buat Penawaran');

    const customerPage = await listSalesWorkflows(db, 4n, {
      page: 1,
      pageSize: 10,
      stage: 'DESIGN',
      customer: 'Wiharjo',
    });
    expect(customerPage.meta).toMatchObject({ total: 3, totalPages: 1 });
    expect(customerPage.data).toHaveLength(3);
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
