import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export interface PrinterSnapshot { id: string; status: string; source: string }
export interface PrinterProvider { readonly name: string; getStatus(workspaceId: bigint, printerId: bigint): Promise<PrinterSnapshot> }
/** Reads manually maintained status. No device connection or telemetry is implied. */
export class ManualPrinterProvider implements PrinterProvider {
  readonly name = 'MANUAL';
  constructor(private readonly db: Prisma.TransactionClient) {}
  async getStatus(workspaceId: bigint, printerId: bigint): Promise<PrinterSnapshot> {
    const printer = await this.db.printers.findFirst({ where: { id: printerId, workspace_id: workspaceId } });
    if (!printer) throw new AppError(404, 'Printer not found.');
    return { id: printer.id.toString(), status: printer.status, source: this.name };
  }
}
