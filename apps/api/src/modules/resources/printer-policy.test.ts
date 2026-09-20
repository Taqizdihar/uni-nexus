import { describe, expect, it, vi } from 'vitest';
import { resources } from '@uni-nexus/shared';
import { AppError } from '../../lib/errors.js';
import { assertPrinterPolicy, normalizePrinterData } from './service.js';

const printer = resources.find((resource) => resource.key === 'printers')!;
const cto = { workspaceId: 7n, userId: 1n, role: 'CTO' };
const operator = { workspaceId: 7n, userId: 2n, role: 'STAFF_OF_SPECIALTY' };

describe('printer-specific write policy', () => {
  it('requires the dedicated catalog/unit flow and rejects arbitrary printer masters', () => {
    expect(() => assertPrinterPolicy(printer, { name: 'Anycubic Kobra X' }, cto, true)).toThrow(AppError);
    expect(() => assertPrinterPolicy(printer, { name: 'Anycubic Kobra X' }, operator, true)).toThrow(AppError);
    try { assertPrinterPolicy(printer, { brand: 'Anycubic' }, operator, false); } catch (error) {
      expect(error).toMatchObject({ status: 403, code: 'PRINTER_MASTER_FORBIDDEN' });
    }
  });

  it('allows an authorized non-CTO to update operational fields only', () => {
    expect(() => assertPrinterPolicy(printer, { serial_number: 'ABC123', location: 'Lab 2', status: 'IDLE', last_maintenance_at: new Date() }, operator, false)).not.toThrow();
  });

  it('normalizes a blank serial number to null without querying for a duplicate', async () => {
    const findFirst = vi.fn();
    const data: Record<string, unknown> = { serial_number: '   ' };
    await normalizePrinterData({ printers: { findFirst } } as never, data, cto);
    expect(data.serial_number).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('checks a serial number inside the caller workspace and reports duplicates clearly', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 9n });
    await expect(normalizePrinterData({ printers: { findFirst } } as never, { serial_number: 'ABC123' }, cto, 8n)).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_PRINTER_SERIAL' });
    expect(findFirst).toHaveBeenCalledWith({ where: { workspace_id: 7n, serial_number: 'ABC123', id: { not: 8n } }, select: { id: true } });
  });
});
