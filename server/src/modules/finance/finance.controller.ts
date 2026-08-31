import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { AuditService } from '../../shared/audit/audit.service';
import { sendSuccess } from '../../shared/utils/response';
import { exportSchema, filtersSchema, periodCreateSchema, periodReasonSchema, reversalSchema, sharedTransactionSchema, sharedTreasurySchema, statusSchema, transferSchema } from './finance.schema';
import { unifiedFinanceService } from './finance.service';

const parseId = (value: unknown, label = 'ID') => { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, 'INVALID_ID', `${label} tidak valid.`); return parsed; };
const EXPORT_CAP = 20_000;
const actor = (req: AuthRequest) => ({ id: Number(req.user.id), organization_id: Number(req.user.organization_id), permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [] });
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]; const escape = (value: unknown) => { const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
  return [columns.join(','), ...rows.map(row => columns.map(column => escape(row[column])).join(','))].join('\r\n');
};

export class UnifiedFinanceController {
  meta = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await unifiedFinanceService.meta(actor(req))); } catch (error) { next(error); } };
  getOverview = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await unifiedFinanceService.overview(actor(req), filtersSchema.parse(req.query))); } catch (error) { next(error instanceof z.ZodError ? new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues) : error); } };
  transactions = async (req: AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.transactions(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  transaction = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.transaction(actor(req),parseId(req.params.id)));}catch(error){next(error);}};
  treasury = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.treasury(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  transfers = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.transfers(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  transfer = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.transfer(actor(req),parseId(req.params.id)));}catch(error){next(error);}};
  cashFlow = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.cashFlow(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  profitLoss = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.profitLoss(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  receivables = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.receivables(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  payables = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.payables(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  budgets = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.budgets(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  journals = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.journals(actor(req),filtersSchema.parse(req.query)));}catch(error){next(error instanceof z.ZodError?new AppError(400,'FINANCE_INVALID_FILTER','Filter keuangan tidak valid.',error.issues):error);}};
  journal = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.journal(actor(req),parseId(req.params.id)));}catch(error){next(error);}};
  periods = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.periods(actor(req)));}catch(error){next(error);}};
  createTransfer = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.createTransfer(actor(req),transferSchema.parse(req.body)),undefined,201);}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Data transfer tidak valid.',error.issues):error);}};
  createSharedTransaction = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.createSharedTransaction(actor(req),sharedTransactionSchema.parse(req.body)),undefined,201);}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Data transaksi bersama tidak valid.',error.issues):error);}};
  reverseSharedTransaction = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.reverseSharedTransaction(actor(req),parseId(req.params.id),reversalSchema.parse(req.body)),undefined,201);}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Data pembalikan tidak valid.',error.issues):error);}};
  createSharedTreasury = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.createSharedTreasury(actor(req),sharedTreasurySchema.parse(req.body)),undefined,201);}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Data akun kas tidak valid.',error.issues):error);}};
  sharedTreasuryStatus = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.setSharedTreasuryStatus(actor(req),parseId(req.params.id),statusSchema.parse(req.body).is_active));}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Status akun kas tidak valid.',error.issues):error);}};
  createPeriod = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.createPeriod(actor(req),periodCreateSchema.parse(req.body)),undefined,201);}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Data periode tidak valid.',error.issues):error);}};
  closePeriod = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.closePeriod(actor(req),parseId(req.params.id),periodReasonSchema.parse(req.body).reason));}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Alasan penutupan tidak valid.',error.issues):error);}};
  reopenPeriod = async (req:AuthRequest,res:Response,next:NextFunction)=>{try{sendSuccess(res,await unifiedFinanceService.reopenPeriod(actor(req),parseId(req.params.id),periodReasonSchema.parse(req.body).reason));}catch(error){next(error instanceof z.ZodError?new AppError(400,'VALIDATION_ERROR','Alasan pembukaan kembali tidak valid.',error.issues):error);}};

  export = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = exportSchema.parse(req.query); const filters = input; let dataset: any;
      if (input.dataset === 'transactions') dataset = await unifiedFinanceService.transactions(actor(req), { ...filters, page: 1, limit: EXPORT_CAP });
      else if (input.dataset === 'transfers') dataset = await unifiedFinanceService.transfers(actor(req), { ...filters, page: 1, limit: EXPORT_CAP });
      else if (input.dataset === 'cash-flow') dataset = await unifiedFinanceService.cashFlow(actor(req), filters);
      else if (input.dataset === 'profit-loss') dataset = await unifiedFinanceService.profitLoss(actor(req), filters);
      else if (input.dataset === 'receivables') dataset = await unifiedFinanceService.receivables(actor(req), filters);
      else dataset = await unifiedFinanceService.payables(actor(req), filters);
      const rows = Array.isArray(dataset?.items) ? dataset.items : Array.isArray(dataset?.series) ? dataset.series : Array.isArray(dataset?.totals) ? dataset.totals : [dataset];
      if (rows.length > EXPORT_CAP || dataset?.meta?.total > EXPORT_CAP) throw new AppError(413, 'EXPORT_LIMIT_EXCEEDED', 'Hasil ekspor melebihi 20.000 baris. Persempit filter Anda.');
      const filename = `unified-finance-${input.dataset}-${new Date().toISOString().slice(0,10)}.${input.format}`;
      await AuditService.write({ organizationId: Number(req.user.organization_id), businessUnitId: null, userId: Number(req.user.id), moduleCode: 'finance', actionCode: 'finance.export', entityType: 'finance_export', entityCode: input.dataset, description: `Mengekspor ${input.dataset} Unified Finance.`, newValues: { dataset: input.dataset, format: input.format, filters: { period: input.period, from: input.from, to: input.to, workspace: input.workspace, currency: input.currency } } });
      if (input.format === 'xlsx') { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Keuangan Terpadu'); const columns = Array.from(new Set(rows.flatMap((row: any) => Object.keys(row || {})))).map(String); sheet.columns = columns.map(key => ({ header: key, key, width: 22 })); rows.forEach((row: any) => sheet.addRow(row)); const buffer = await workbook.xlsx.writeBuffer(); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename="${filename}"`); res.send(Buffer.from(buffer)); }
      else { res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition',`attachment; filename="${filename}"`); res.send(`\uFEFF${csv(rows)}`); }
    } catch (error) { next(error instanceof z.ZodError ? new AppError(400,'FINANCE_INVALID_EXPORT','Parameter ekspor tidak valid.',error.issues) : error); }
  };
}
