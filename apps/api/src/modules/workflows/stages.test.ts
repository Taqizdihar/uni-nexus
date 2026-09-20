import { describe, expect, it } from 'vitest';
import { deriveProductionWorkflowTab, deriveSalesWorkflowStage } from './stages.js';

describe('sales workflow stage resolver', () => {
  it('classifies the customer lifecycle from request through completion', () => {
    expect(deriveSalesWorkflowStage({ customRequest: { status: 'NEW' } })).toBe('REQUEST');
    expect(
      deriveSalesWorkflowStage({
        customRequest: { status: 'FEASIBLE' },
        designTasks: [{ status: 'PENDING' }],
      }),
    ).toBe('DESIGN');
    expect(
      deriveSalesWorkflowStage({
        customRequest: { status: 'ESTIMATING' },
        quotations: [{ status: 'SENT' }],
      }),
    ).toBe('QUOTATION');
    expect(deriveSalesWorkflowStage({ customRequest: { status: 'ESTIMATING' } })).toBe('QUOTATION');
    expect(
      deriveSalesWorkflowStage({
        quotations: [{ status: 'ACCEPTED' }],
        orders: [{ status: 'CONFIRMED' }],
      }),
    ).toBe('READY_FOR_PRODUCTION');
    expect(
      deriveSalesWorkflowStage({
        orders: [{ status: 'IN_PRODUCTION' }],
        productionJobs: [{ status: 'QUEUED' }],
        printJobs: [{ status: 'PRINTING' }],
      }),
    ).toBe('PRODUCTION');
    expect(
      deriveSalesWorkflowStage({ orders: [{ status: 'QC' }], printJobs: [{ status: 'SUCCESS' }] }),
    ).toBe('COMPLETION');
  });

  it('uses terminal and reprint precedence safely', () => {
    expect(deriveSalesWorkflowStage({ customRequest: { status: 'NOT_FEASIBLE' } })).toBe(
      'CANCELLED',
    );
    expect(deriveSalesWorkflowStage({ quotations: [{ status: 'DECLINED' }] })).toBe('CANCELLED');
    expect(
      deriveSalesWorkflowStage({
        orders: [{ status: 'CANCELLED' }],
        productionJobs: [{ status: 'PRINTING' }],
      }),
    ).toBe('CANCELLED');
    expect(
      deriveSalesWorkflowStage({
        orders: [{ status: 'COMPLETED', completed_at: new Date() }],
        printJobs: [{ status: 'FAILED' }],
      }),
    ).toBe('COMPLETED');
    expect(
      deriveSalesWorkflowStage({
        orders: [{ status: 'QC' }],
        qcInspections: [{ result: 'REPRINT' }],
      }),
    ).toBe('PRODUCTION');
  });
});

describe('production queue resolver', () => {
  it('maps the actual production records into one operational queue', () => {
    expect(deriveProductionWorkflowTab({ productionJob: { status: 'WAITING' } })).toBe(
      'NEEDS_PROCESSING',
    );
    expect(
      deriveProductionWorkflowTab({
        productionJob: { status: 'QUEUED' },
        printJobs: [{ status: 'QUEUED' }],
      }),
    ).toBe('PRINT_QUEUE');
    expect(
      deriveProductionWorkflowTab({
        productionJob: { status: 'PRINTING' },
        printJobs: [{ status: 'PRINTING' }],
      }),
    ).toBe('PRINTING');
    expect(
      deriveProductionWorkflowTab({
        productionJob: { status: 'QC' },
        printJobs: [{ status: 'SUCCESS' }],
      }),
    ).toBe('QC');
    expect(
      deriveProductionWorkflowTab({
        productionJob: { status: 'PACKAGING' },
        packaging: [{ status: 'PACKING' }],
      }),
    ).toBe('PACKAGING');
    expect(
      deriveProductionWorkflowTab({
        productionJob: { status: 'IN_PROGRESS' },
        printJobs: [{ status: 'FAILED' }],
      }),
    ).toBe('ATTENTION');
    expect(deriveProductionWorkflowTab({ productionJob: { status: 'COMPLETED' } })).toBe(
      'COMPLETED',
    );
  });
});
