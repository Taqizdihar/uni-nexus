import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { pool } from '../../config/database';
import { budgetSchema, customerPaymentSchema, expenseSchema, externalPayoutSchema, incomeSchema, maintenancePaymentSchema, payExpenseSchema, reverseExpenseSchema, transferSchema, treasurySchema } from './studio-finance.schema';
import { parseFinanceId } from './studio-finance.shared';
import { studioFinanceService } from './studio-finance.service';
import { storageService } from '../../shared/storage';
import type { StudioFinanceListFilters } from './studio-finance.types';

const actor = (req: Request) => Number((req as any).user?.id);
const optionalNumber = (value: unknown) => {
  const number = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(number) && number > 0 ? number : undefined;
};
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const listFilters = (req: Request): StudioFinanceListFilters => ({
  search: text(req.query.search), transactionType: text(req.query.type), categoryId: optionalNumber(req.query.category),
  treasuryId: optionalNumber(req.query.treasury), status: text(req.query.status), projectId: optionalNumber(req.query.project),
  from: text(req.query.from), to: text(req.query.to), page: Math.max(1, optionalNumber(req.query.page) || 1),
  limit: Math.min(100, Math.max(1, optionalNumber(req.query.limit) || 20)),
});
const validation = (error: unknown, message: string) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;

export class StudioFinanceController {
  private async ctx(req: Request) { return studioFinanceService.context(actor(req)); }
  overview = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.overview(await this.ctx(req))); } catch(error) { next(error); } };
  references = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.references(await this.ctx(req))); } catch(error) { next(error); } };
  transactions = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.listTransactions(await this.ctx(req),listFilters(req))); } catch(error) { next(error); } };
  treasury = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.treasury(await this.ctx(req))); } catch(error) { next(error); } };
  createTreasury = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.createTreasury(await this.ctx(req),treasurySchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data akun kas tidak valid.')); } };
  treasuryStatus = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.setTreasuryStatus(await this.ctx(req),parseFinanceId(req.params.id,'ID akun kas'),Boolean(req.body?.is_active))); } catch(error) { next(error); } };
  transfer = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.transfer(await this.ctx(req),transferSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data transfer tidak valid.')); } };
  income = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.recordIncome(await this.ctx(req),incomeSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data pendapatan tidak valid.')); } };
  payInvoice = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.payInvoice(await this.ctx(req),parseFinanceId(req.params.id,'ID invoice'),customerPaymentSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data pembayaran tidak valid.')); } };
  receivables = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.receivables(await this.ctx(req),listFilters(req))); } catch(error) { next(error); } };
  expenses = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.listExpenses(await this.ctx(req),listFilters(req))); } catch(error) { next(error); } };
  createExpense = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.createExpense(await this.ctx(req),expenseSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data pengeluaran tidak valid.')); } };
  uploadExpenseReceipt = async (req: Request,res: Response,next: NextFunction) => { try { if (!req.file) throw new AppError(400,'RECEIPT_REQUIRED','Pilih bukti pengeluaran terlebih dahulu.'); sendSuccess(res,await studioFinanceService.replaceExpenseReceipt(await this.ctx(req),parseFinanceId(req.params.id,'ID pengeluaran'),req.file)); } catch(error) { next(error); } };
  downloadExpenseReceipt = async (req: Request,res: Response,next: NextFunction) => { try { const ctx=await this.ctx(req); const expenseId=parseFinanceId(req.params.id,'ID pengeluaran'); const [rows]:any=await pool.execute('SELECT receipt_path,expense_code FROM expenses WHERE id=? AND organization_id=? AND business_unit_id=?',[expenseId,ctx.organizationId,ctx.id]); if(!rows.length) throw new AppError(404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan.'); if(!rows[0].receipt_path) throw new AppError(404,'RECEIPT_NOT_FOUND','Bukti pengeluaran belum tersedia.'); await storageService.streamToResponse(res,rows[0].receipt_path,{filename:`receipt-${rows[0].expense_code}`}); } catch(error) { next(error); } };
  removeExpenseReceipt = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.removeExpenseReceipt(await this.ctx(req),parseFinanceId(req.params.id,'ID pengeluaran'))); } catch(error) { next(error); } };
  approveExpense = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.approveExpense(await this.ctx(req),parseFinanceId(req.params.id,'ID pengeluaran'))); } catch(error) { next(error); } };
  payExpense = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.payExpense(await this.ctx(req),parseFinanceId(req.params.id,'ID pengeluaran'),payExpenseSchema.parse(req.body))); } catch(error) { next(validation(error,'Data pembayaran pengeluaran tidak valid.')); } };
  reverseExpense = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.reverseExpense(await this.ctx(req),parseFinanceId(req.params.id,'ID pengeluaran'),reverseExpenseSchema.parse(req.body))); } catch(error) { next(validation(error,'Data pembalikan pengeluaran tidak valid.')); } };
  payables = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.payables(await this.ctx(req))); } catch(error) { next(error); } };
  payout = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.payExternalAssignment(await this.ctx(req),parseFinanceId(req.params.id,'ID penugasan'),externalPayoutSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data payout eksternal tidak valid.')); } };
  maintenance = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.payMaintenance(await this.ctx(req),parseFinanceId(req.params.id,'ID pemeliharaan'),maintenancePaymentSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data pembayaran pemeliharaan tidak valid.')); } };
  profitability = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.profitability(await this.ctx(req))); } catch(error) { next(error); } };
  cashFlow = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.cashFlow(await this.ctx(req),text(req.query.from),text(req.query.to))); } catch(error) { next(error); } };
  budgets = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.budgets(await this.ctx(req))); } catch(error) { next(error); } };
  createBudget = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.createBudget(await this.ctx(req),budgetSchema.parse(req.body)),undefined,201); } catch(error) { next(validation(error,'Data anggaran tidak valid.')); } };
  approveBudget = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.approveBudget(await this.ctx(req),parseFinanceId(req.params.id,'ID anggaran'))); } catch(error) { next(error); } };
  accounting = async (req: Request,res: Response,next: NextFunction) => { try { sendSuccess(res,await studioFinanceService.accounting(await this.ctx(req))); } catch(error) { next(error); } };
}
