import { describe, expect, it, vi } from 'vitest';
import { resources } from '@uni-nexus/shared';
import { AppError } from '../../lib/errors.js';
import { assertPrinterPolicy, normalizePrinterData, resolvePrinterPresentation } from './service.js';

const printer = resources.find((resource) => resource.key === 'printers')!;
const cto = { workspaceId: 7n, userId: 1n, role: 'CTO' };
const operator = { workspaceId: 7n, userId: 2n, role: 'STAFF_OF_SPECIALTY' };

describe('printer-specific write policy', () => {
  const physical = {
    id: 12n,
    printer_catalog_id: 4n,
    name: 'Legacy name',
    brand: 'Legacy brand',
    model: 'Legacy model',
    build_volume_x_mm: '1',
    build_volume_y_mm: '2',
    build_volume_z_mm: '3',
    default_nozzle_size_mm: '0.4',
    photo_storage_provider: 'LOCAL',
    photo_object_key: '7/legacy-photo',
    photo_public_url: null,
    printer_catalogs: {
      id: 4n,
      name: 'Anycubic Kobra X',
      brand: 'Anycubic',
      model: 'Kobra X',
      build_volume_x_mm: '220',
      build_volume_y_mm: '220',
      build_volume_z_mm: '250',
      default_nozzle_size_mm: '0.4',
      photo_storage_provider: null,
      photo_object_key: null,
      photo_public_url: null,
    },
  };

  it('uses catalog fields and placeholder state when a linked catalog has no photo', () => {
    const resolved = resolvePrinterPresentation(physical);
    expect(resolved).toMatchObject({ name: 'Anycubic Kobra X', brand: 'Anycubic', model: 'Kobra X', build_volume_x_mm: '220' });
    expect(resolved.photo_url).toBeUndefined();
  });

  it('resolves the current catalog photo without copying it to the physical unit', () => {
    const withPhoto = { ...physical, printer_catalogs: { ...physical.printer_catalogs, photo_storage_provider: 'LOCAL' } };
    const resolved = resolvePrinterPresentation(withPhoto);
    expect(resolved.photo_url).toBe('/api/v1/printers/catalog/4/photo');
    const replacement = resolvePrinterPresentation({ ...withPhoto, printer_catalogs: { ...withPhoto.printer_catalogs, id: 9n } });
    expect(replacement.photo_url).toBe('/api/v1/printers/catalog/9/photo');
  });

  it('keeps legacy photo fallback for printers without a catalog', () => {
    expect(resolvePrinterPresentation({ ...physical, printer_catalog_id: null, printer_catalogs: undefined }).photo_url).toBe('/api/v1/printers/12/photo');
  });

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
