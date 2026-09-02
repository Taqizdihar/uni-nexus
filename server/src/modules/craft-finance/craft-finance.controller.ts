import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database';
import { sendSuccess } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/AppError';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { CraftFinanceService } from './craft-finance.service';
import { budgetSchema, expenseSchema, incomeSchema, payExpenseSchema, paymentSchema, reverseExpenseSchema, treasurySchema } from './craft-finance.schema';

const id=(value:string)=>{const parsed=Number(value);if(!Number.isInteger(parsed)||parsed<1)throw new AppError(400,'INVALID_ID','ID tidak valid.');return parsed;};
const listFilters = (query: Record<string, unknown>) => ({
  search: typeof query.search === 'string' ? query.search : undefined,
  categoryId: query.categoryId ? Number(query.categoryId) : undefined,
  treasuryId: query.treasuryId ? Number(query.treasuryId) : undefined,
  source: typeof query.source === 'string' ? query.source : undefined,
  status: typeof query.status === 'string' ? query.status : undefined,
  from: typeof query.from === 'string' ? query.from : undefined,
  to: typeof query.to === 'string' ? query.to : undefined,
  page: query.page ? Number(query.page) : 1,
  limit: query.limit ? Number(query.limit) : 25,
});

export class CraftFinanceController {
  private service = new CraftFinanceService();
  private async ctx(req: Request) { const c = await getCraftBusinessUnit(); return { organizationId: c.organizationId, businessUnitId: c.id, userId: (req as any).user.id }; }

  overview = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.overview(await this.ctx(req))); } catch (e) { next(e); } };
  references = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.references(await this.ctx(req))); } catch (e) { next(e); } };
  treasury = async (req: Request, res: Response, next: NextFunction) => { try { const c = await this.ctx(req); const [rows]: any = await pool.execute(`SELECT t.*,MAX(ft.transaction_date) last_transaction_at FROM treasury_accounts t LEFT JOIN financial_transactions ft ON ft.treasury_account_id=t.id AND ft.status_code='posted' WHERE t.organization_id=? AND t.business_unit_id=? GROUP BY t.id ORDER BY t.is_active DESC,t.name`, [c.organizationId, c.businessUnitId]); sendSuccess(res, rows); } catch (e) { next(e); } };
  createTreasury = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createTreasury(await this.ctx(req), treasurySchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data akun kas tidak valid.', e.issues) : e); } };
  status = async (req: Request, res: Response, next: NextFunction) => { try { await this.service.setTreasuryStatus(await this.ctx(req), id(String(req.params.id)), Boolean(req.body.is_active)); sendSuccess(res, { message: 'Status akun kas diperbarui.' }); } catch (e) { next(e); } };
  transactions = async (req: Request, res: Response, next: NextFunction) => { try { const c = await this.ctx(req); const [rows]: any = await pool.execute(`SELECT ft.*,tc.name category_name,ta.name treasury_name,p.display_name party_name FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id LEFT JOIN parties p ON p.id=ft.party_id WHERE ft.organization_id=? AND ft.business_unit_id=? ORDER BY ft.transaction_date DESC LIMIT 200`, [c.organizationId, c.businessUnitId]); sendSuccess(res, rows); } catch (e) { next(e); } };
  receivables = async (req: Request, res: Response, next: NextFunction) => { try { const c = await this.ctx(req); const [rows]: any = await pool.execute(`SELECT i.*,p.display_name party_name,DATEDIFF(UTC_DATE(),i.due_date) days_overdue FROM invoices i JOIN parties p ON p.id=i.party_id WHERE i.organization_id=? AND i.business_unit_id=? AND i.balance_due>0 AND i.status_code!='void' ORDER BY i.due_date`, [c.organizationId, c.businessUnitId]); sendSuccess(res, rows); } catch (e) { next(e); } };
  payables = async (req: Request, res: Response, next: NextFunction) => { try { const c = await this.ctx(req); const [rows]: any = await pool.execute(`SELECT si.*,p.display_name party_name,DATEDIFF(UTC_DATE(),si.due_date) days_overdue FROM supplier_invoices si JOIN parties p ON p.id=si.supplier_party_id WHERE si.business_unit_id=? AND si.balance_due>0 AND si.status_code!='void' ORDER BY si.due_date`, [c.businessUnitId]); sendSuccess(res, rows); } catch (e) { next(e); } };
  payCustomer = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.customerPayment(await this.ctx(req), id(String(req.params.id)), paymentSchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pembayaran tidak valid.', e.issues) : e); } };
  paySupplier = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.supplierPayment(await this.ctx(req), id(String(req.params.id)), paymentSchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pembayaran tidak valid.', e.issues) : e); } };
  income = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.income(await this.ctx(req), incomeSchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pendapatan tidak valid.', e.issues) : e); } };

  listIncome = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.listIncome(await this.ctx(req), listFilters(req.query))); } catch (e) { next(e); } };
  listExpenses = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.listExpenses(await this.ctx(req), listFilters(req.query))); } catch (e) { next(e); } };
  createExpense = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createExpense(await this.ctx(req), expenseSchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pengeluaran tidak valid.', e.issues) : e); } };
  approveExpense = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.approveExpense(await this.ctx(req), id(String(req.params.id)))); } catch (e) { next(e); } };
  payExpense = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.payExpense(await this.ctx(req), id(String(req.params.id)), payExpenseSchema.parse(req.body))); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pembayaran tidak valid.', e.issues) : e); } };
  reverseExpense = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.reverseExpense(await this.ctx(req), id(String(req.params.id)), reverseExpenseSchema.parse(req.body))); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data pembalikan tidak valid.', e.issues) : e); } };

  profitability = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.profitability(await this.ctx(req), { from: typeof req.query.from === 'string' ? req.query.from : undefined, to: typeof req.query.to === 'string' ? req.query.to : undefined })); } catch (e) { next(e); } };
  cashFlow = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.cashFlow(await this.ctx(req), typeof req.query.from === 'string' ? req.query.from : undefined, typeof req.query.to === 'string' ? req.query.to : undefined)); } catch (e) { next(e); } };

  budgets = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.budgets(await this.ctx(req))); } catch (e) { next(e); } };
  createBudget = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createBudget(await this.ctx(req), budgetSchema.parse(req.body)), undefined, 201); } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data anggaran tidak valid.', e.issues) : e); } };
  approveBudget = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.approveBudget(await this.ctx(req), id(String(req.params.id)))); } catch (e) { next(e); } };

  accounting = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.accounting(await this.ctx(req))); } catch (e) { next(e); } };
  journalDetail = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.journalDetail(await this.ctx(req), id(String(req.params.id)))); } catch (e) { next(e); } };
}
