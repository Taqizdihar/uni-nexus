import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { FinancePostingService } from '../../shared/finance/finance-posting.service';
import { AuditService } from '../../shared/audit/audit.service';
import type { PostingContext } from '../../shared/finance/finance-posting.service';
import { financeCode, money, toSqlDateTime, withCraftFinanceTransaction, writeCraftFinanceAudit, publishCraftFinanceEvent } from './craft-finance.shared';
import type { CraftExpenseInput, CraftFinanceListFilters } from './craft-finance.types';

const number = (v: unknown) => Number(v || 0); const code=(p:string,id:number)=>`${p}-${String(id).padStart(6,'0')}`;
const PAGE_LIMIT = 100;
const pageResult = (rows: any[], page: number, limit: number, total: number) => ({ items: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });

export class CraftFinanceService {
  private posting = new FinancePostingService();
  async overview(context: PostingContext) { const [rows]:any=await pool.execute(`SELECT
    (SELECT COALESCE(SUM(current_balance),0) FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1) cash,
    (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND transaction_type='income' AND status_code='posted' AND DATE_FORMAT(transaction_date,'%Y-%m')=DATE_FORMAT(UTC_DATE(),'%Y-%m')) income,
    (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND transaction_type='expense' AND status_code='posted' AND DATE_FORMAT(transaction_date,'%Y-%m')=DATE_FORMAT(UTC_DATE(),'%Y-%m')) expense,
    (SELECT COALESCE(SUM(balance_due),0) FROM invoices WHERE organization_id=? AND business_unit_id=? AND status_code NOT IN ('paid','void')) receivables,
    (SELECT COALESCE(SUM(balance_due),0) FROM supplier_invoices WHERE business_unit_id=? AND status_code NOT IN ('paid','void')) payables`,[context.organizationId,context.businessUnitId,context.organizationId,context.businessUnitId,context.organizationId,context.businessUnitId,context.organizationId,context.businessUnitId,context.businessUnitId]);
    const [transactions]:any=await pool.execute(`SELECT ft.*,tc.name category_name,ta.name treasury_name FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id WHERE ft.organization_id=? AND ft.business_unit_id=? ORDER BY ft.transaction_date DESC LIMIT 8`,[context.organizationId,context.businessUnitId]); const [treasuries]:any=await pool.execute('SELECT * FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? ORDER BY is_active DESC,name',[context.organizationId,context.businessUnitId]); return {...rows[0],net_cash_flow:number(rows[0].income)-number(rows[0].expense),transactions,treasuries}; }
  async references(context:PostingContext){const [categories]:any=await pool.execute('SELECT id,code,name,transaction_type FROM transaction_categories WHERE organization_id=? AND business_unit_id=? AND is_active=1 ORDER BY name',[context.organizationId,context.businessUnitId]); const [methods]:any=await pool.execute('SELECT id,code,name,method_type FROM payment_methods WHERE is_active=1 ORDER BY name'); const [treasuries]:any=await pool.execute('SELECT id,name,account_type,current_balance,currency_code FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1 ORDER BY name',[context.organizationId,context.businessUnitId]); const [orders]:any=await pool.execute(`SELECT id,order_code FROM craft_orders WHERE business_unit_id=? AND deleted_at IS NULL ORDER BY order_date DESC LIMIT 300`,[context.businessUnitId]); return {categories,methods,treasuries,orders};}
  async createTreasury(context: PostingContext, data: any) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      let coa = data.coa_account_id;
      if (!coa) { const [rows]: any = await connection.execute("SELECT id FROM chart_of_accounts WHERE organization_id=? AND account_code='1000' AND is_active=1 LIMIT 1", [context.organizationId]); coa = rows[0]?.id || null; }
      const [result]: any = await connection.execute(`INSERT INTO treasury_accounts (organization_id,business_unit_id,coa_account_id,account_code,name,account_type,provider_name,account_number_masked,currency_code,opening_balance,current_balance) VALUES (?,?,?, ?,?,?,?,?,?,?,?)`, [context.organizationId, context.businessUnitId, coa, `TMP-${randomUUID()}`, data.name, data.account_type, data.provider_name || null, data.account_number_masked || null, data.currency_code, data.opening_balance, 0]);
      const id = Number(result.insertId); const accountCode = code('TRS', id);
      await connection.execute('UPDATE treasury_accounts SET account_code=? WHERE id=?', [accountCode, id]);
      if (number(data.opening_balance) > 0) await this.posting.postTreasuryOpening(connection, context, { treasuryAccountId: id, amount: data.opening_balance, date: new Date().toISOString().slice(0, 23).replace('T', ' '), description: 'Saldo awal akun kas' }, { auditModule: 'craft_finance', auditAction: 'finance.treasury_opening', entityCode: accountCode });
      await AuditService.write({ organizationId: context.organizationId, businessUnitId: context.businessUnitId, userId: context.userId, moduleCode: 'craft_finance', actionCode: 'finance.treasury_create', entityType: 'treasury_account', entityId: id, entityCode: accountCode, description: 'Membuat akun kas.', newValues: { name: data.name, account_type: data.account_type, currency_code: data.currency_code, opening_balance: data.opening_balance } }, connection);
      await connection.commit(); return { id };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  async setTreasuryStatus(context:PostingContext,id:number,active:boolean){const [r]:any=await pool.execute('UPDATE treasury_accounts SET is_active=? WHERE id=? AND organization_id=? AND business_unit_id=?',[active?1:0,id,context.organizationId,context.businessUnitId]);if(!r.affectedRows)throw new AppError(404,'TREASURY_NOT_FOUND','Akun kas tidak ditemukan.');}
  async supplierPayment(context:PostingContext,id:number,data:any){const c=await pool.getConnection();await c.beginTransaction();try{const [invoices]:any=await c.execute('SELECT supplier_party_id FROM supplier_invoices WHERE id=? AND business_unit_id=?',[id,context.businessUnitId]);if(!invoices.length)throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Tagihan pemasok tidak ditemukan.');const result=await this.posting.postSupplierPayment(c,context,{supplierInvoiceId:id,partyId:invoices[0].supplier_party_id,paymentMethodId:data.payment_method_id,treasuryAccountId:data.treasury_account_id,amount:data.amount,paymentDate:data.payment_date,categoryCode:data.category_code,referenceNumber:data.reference_number,notes:data.notes});await c.commit();return{payment_id:result};}catch(e){await c.rollback();throw e;}finally{c.release();}}
  async customerPayment(context:PostingContext,id:number,data:any){const c=await pool.getConnection();await c.beginTransaction();try{const [invoices]:any=await c.execute('SELECT party_id FROM invoices WHERE id=? AND organization_id=? AND business_unit_id=?',[id,context.organizationId,context.businessUnitId]);if(!invoices.length)throw new AppError(404,'INVOICE_NOT_FOUND','Invoice tidak ditemukan.');const result=await this.posting.postCustomerPayment(c,context,{invoiceId:id,partyId:invoices[0].party_id,paymentMethodId:data.payment_method_id,treasuryAccountId:data.treasury_account_id,amount:data.amount,paymentDate:data.payment_date,referenceNumber:data.reference_number,notes:data.notes});await c.commit();return{payment_id:result};}catch(e){await c.rollback();throw e;}finally{c.release();}}
  async income(context:PostingContext,data:any){const c=await pool.getConnection();await c.beginTransaction();try{const result=await this.posting.postCashMovement(c,context,{direction:'in',amount:data.amount,transactionDate:data.transaction_date,treasuryAccountId:data.treasury_account_id,categoryCode:data.category_code,description:data.description,partyId:data.party_id||null,sourceType:'craft_manual_income',enforceSourceIdempotency:false},{auditModule:'craft_finance',auditAction:'craft.finance.manual_income'});await c.commit();return{id:result.transactionId,transaction_code:result.transactionCode};}catch(e){await c.rollback();throw e;}finally{c.release();}}

  // ---------------------------------------------------------------------
  // Income & Expense ledgers
  // ---------------------------------------------------------------------

  async listIncome(context: PostingContext, filters: CraftFinanceListFilters) {
    const page = Math.max(1, filters.page), limit = Math.min(PAGE_LIMIT, Math.max(1, filters.limit)), offset = (page - 1) * limit;
    let where = ' WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.transaction_type=\'income\''; const params: any[] = [context.organizationId, context.businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search) { const term = `%${filters.search}%`; add('(ft.transaction_code LIKE ? OR ft.description LIKE ? OR p.display_name LIKE ?)', term, term, term); }
    if (filters.categoryId) add('ft.category_id=?', filters.categoryId);
    if (filters.treasuryId) add('ft.treasury_account_id=?', filters.treasuryId);
    if (filters.source) add('ft.source_type=?', filters.source);
    if (filters.status) add('ft.status_code=?', filters.status);
    if (filters.from) add('DATE(ft.transaction_date)>=?', filters.from);
    if (filters.to) add('DATE(ft.transaction_date)<=?', filters.to);
    const joins = ' FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id LEFT JOIN parties p ON p.id=ft.party_id';
    const [[rows], [counts]]: any = await Promise.all([
      pool.execute(`SELECT ft.*,tc.code category_code,tc.name category_name,ta.name treasury_name,p.display_name party_name ${joins}${where} ORDER BY ft.transaction_date DESC,ft.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
      pool.execute(`SELECT COUNT(*) total ${joins}${where}`, params),
    ]);
    const [summaryRows]: any = await pool.execute(`SELECT COALESCE(SUM(ft.amount),0) total_amount, COUNT(*) total_count ${joins}${where}`, params);
    return { ...pageResult(rows.map((row: any) => ({ ...row, amount: money(row.amount) })), page, limit, Number(counts[0].total)), summary: { total_amount: money(summaryRows[0]?.total_amount), total_count: Number(summaryRows[0]?.total_count || 0) } };
  }

  async listExpenses(context: PostingContext, filters: CraftFinanceListFilters) {
    const page = Math.max(1, filters.page), limit = Math.min(PAGE_LIMIT, Math.max(1, filters.limit)), offset = (page - 1) * limit;
    let where = ' WHERE e.organization_id=? AND e.business_unit_id=?'; const params: any[] = [context.organizationId, context.businessUnitId];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.status) add('e.status_code=?', filters.status);
    if (filters.categoryId) add('e.category_id=?', filters.categoryId);
    if (filters.treasuryId) add('e.treasury_account_id=?', filters.treasuryId);
    if (filters.from) add('DATE(e.expense_date)>=?', filters.from);
    if (filters.to) add('DATE(e.expense_date)<=?', filters.to);
    if (filters.search) { const term = `%${filters.search}%`; add('(e.expense_code LIKE ? OR e.description LIKE ? OR p.display_name LIKE ?)', term, term, term); }
    const joins = ' FROM expenses e LEFT JOIN transaction_categories c ON c.id=e.category_id LEFT JOIN parties p ON p.id=e.party_id LEFT JOIN craft_orders o ON o.id=e.craft_order_id LEFT JOIN treasury_accounts t ON t.id=e.treasury_account_id';
    const [[rows], [counts]]: any = await Promise.all([
      pool.execute(`SELECT e.*,c.code category_code,c.name category_name,p.display_name party_name,o.order_code,t.name treasury_name ${joins}${where} ORDER BY e.expense_date DESC,e.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
      pool.execute(`SELECT COUNT(*) total ${joins}${where}`, params),
    ]);
    const [summaryRows]: any = await pool.execute(`SELECT COALESCE(SUM(e.amount+e.tax_amount),0) total_amount, COUNT(*) total_count ${joins}${where}`, params);
    return { ...pageResult(rows.map((row: any) => ({ ...row, amount: money(row.amount), tax_amount: money(row.tax_amount), total_amount: money(row.amount) + money(row.tax_amount) })), page, limit, Number(counts[0].total)), summary: { total_amount: money(summaryRows[0]?.total_amount), total_count: Number(summaryRows[0]?.total_count || 0) } };
  }

  private async category(connection: PoolConnection, context: PostingContext, categoryCode: string, type: 'income' | 'expense') {
    const [rows]: any = await connection.execute('SELECT id,code,name FROM transaction_categories WHERE organization_id=? AND business_unit_id=? AND code=? AND transaction_type=? AND is_active=1 LIMIT 1', [context.organizationId, context.businessUnitId, categoryCode, type]);
    if (!rows.length) throw new AppError(400, 'INVALID_TRANSACTION_CATEGORY', 'Kategori keuangan Craft tidak valid atau tidak aktif.');
    return rows[0];
  }

  private async assertOrder(connection: PoolConnection, orderId: number | null | undefined, context: PostingContext) {
    if (!orderId) return null;
    const [rows]: any = await connection.execute('SELECT id,order_code FROM craft_orders WHERE id=? AND business_unit_id=? AND deleted_at IS NULL LIMIT 1', [orderId, context.businessUnitId]);
    if (!rows.length) throw new AppError(400, 'INVALID_CRAFT_ORDER', 'Pesanan Craft tidak ditemukan.');
    return rows[0];
  }

  private async insertExpense(connection: PoolConnection, context: PostingContext, data: CraftExpenseInput, status: 'draft' | 'approved') {
    const category = await this.category(connection, context, data.category_code, 'expense');
    await this.assertOrder(connection, data.craft_order_id || null, context);
    const [result]: any = await connection.execute(`INSERT INTO expenses (organization_id,business_unit_id,expense_code,category_id,party_id,craft_order_id,expense_date,description,amount,tax_amount,currency_code,status_code,receipt_path,created_by,approved_by) VALUES (?,?,?, ?,?,?,?,?,?,?,?,?,?,?,?)`, [context.organizationId, context.businessUnitId, `TMP-${randomUUID()}`, category.id, data.party_id || null, data.craft_order_id || null, toSqlDateTime(data.expense_date), data.description, data.amount, data.tax_amount || 0, 'IDR', status, null, context.userId, status === 'approved' ? context.userId : null]);
    const id = Number(result.insertId), expenseCode = financeCode('EXP', id); await connection.execute('UPDATE expenses SET expense_code=? WHERE id=?', [expenseCode, id]);
    return { id, expense_code: expenseCode, category_id: Number(category.id) };
  }

  private async payExpenseRow(connection: PoolConnection, context: PostingContext, expense: any, input: { treasury_account_id: number; payment_date: string; direct_payment_confirmed?: boolean }) {
    if (expense.financial_transaction_id || expense.status_code === 'paid') throw new AppError(409, 'EXPENSE_ALREADY_PAID', 'Pengeluaran ini sudah dibayar.');
    if (expense.status_code !== 'approved' && !input.direct_payment_confirmed) throw new AppError(409, 'EXPENSE_APPROVAL_REQUIRED', 'Pengeluaran harus disetujui sebelum dibayar.');
    const total = money(expense.amount) + money(expense.tax_amount);
    const posted = await this.posting.postCashMovement(connection, context, { direction: 'out', amount: total, transactionDate: toSqlDateTime(input.payment_date), treasuryAccountId: input.treasury_account_id, categoryCode: expense.category_code, description: expense.description, partyId: expense.party_id || null, sourceType: 'craft_expense', sourceId: Number(expense.id), sourceCode: expense.expense_code, auditAction: 'craft.finance.expense_pay', auditEntityType: 'expense', auditEntityId: Number(expense.id), auditEntityCode: expense.expense_code }, { auditModule: 'craft_finance' });
    await connection.execute(`UPDATE expenses SET status_code='paid',treasury_account_id=?,financial_transaction_id=?,approved_by=COALESCE(approved_by,?),expense_date=? WHERE id=?`, [input.treasury_account_id, posted.transactionId, context.userId, toSqlDateTime(input.payment_date), expense.id]);
    await writeCraftFinanceAudit(connection, context, 'craft.finance.expense_pay', 'expense', Number(expense.id), expense.expense_code, `Membayar pengeluaran ${expense.expense_code}.`, undefined, { transaction_id: posted.transactionId, total });
    return posted;
  }

  async createExpense(context: PostingContext, data: CraftExpenseInput) {
    return withCraftFinanceTransaction(async (connection) => {
      const direct = data.status_code === 'paid';
      const initialStatus: 'draft' | 'approved' = direct || data.status_code === 'approved' ? 'approved' : 'draft';
      if (direct && (!data.treasury_account_id || !data.direct_payment_confirmed)) throw new AppError(400, 'DIRECT_PAYMENT_CONFIRMATION_REQUIRED', 'Pembayaran langsung memerlukan akun kas dan konfirmasi.');
      const expense = await this.insertExpense(connection, context, data, initialStatus);
      await writeCraftFinanceAudit(connection, context, 'craft.finance.expense_create', 'expense', expense.id, expense.expense_code, `Membuat pengeluaran ${expense.expense_code}.`, undefined, { status: data.status_code, amount: data.amount, tax_amount: data.tax_amount });
      if (!direct) return expense;
      const [rows]: any = await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? FOR UPDATE`, [expense.id]);
      const posted = await this.payExpenseRow(connection, context, rows[0], { treasury_account_id: Number(data.treasury_account_id), payment_date: data.expense_date, direct_payment_confirmed: true });
      return { ...expense, transaction_id: posted.transactionId };
    });
  }

  async approveExpense(context: PostingContext, expenseId: number) {
    return withCraftFinanceTransaction(async (connection) => {
      const [rows]: any = await connection.execute('SELECT id,expense_code,status_code FROM expenses WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE', [expenseId, context.organizationId, context.businessUnitId]);
      if (!rows.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
      if (rows[0].status_code !== 'draft') throw new AppError(409, 'EXPENSE_NOT_DRAFT', 'Hanya pengeluaran draf yang dapat disetujui.');
      await connection.execute(`UPDATE expenses SET status_code='approved',approved_by=? WHERE id=?`, [context.userId, expenseId]);
      await writeCraftFinanceAudit(connection, context, 'craft.finance.expense_approve', 'expense', expenseId, rows[0].expense_code, `Menyetujui pengeluaran ${rows[0].expense_code}.`);
      return { id: expenseId, status_code: 'approved' };
    });
  }

  async payExpense(context: PostingContext, expenseId: number, data: any) {
    return withCraftFinanceTransaction(async (connection) => {
      const [rows]: any = await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? AND e.organization_id=? AND e.business_unit_id=? FOR UPDATE`, [expenseId, context.organizationId, context.businessUnitId]);
      if (!rows.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
      const posted = await this.payExpenseRow(connection, context, rows[0], data);
      return { id: expenseId, transaction_id: posted.transactionId };
    });
  }

  async reverseExpense(context: PostingContext, expenseId: number, data: { reversal_date: string; reason: string }) {
    return withCraftFinanceTransaction(async (connection) => {
      const [rows]: any = await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? AND e.organization_id=? AND e.business_unit_id=? FOR UPDATE`, [expenseId, context.organizationId, context.businessUnitId]);
      if (!rows.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
      const expense = rows[0];
      if (expense.status_code !== 'paid' || !expense.financial_transaction_id) throw new AppError(409, 'EXPENSE_NOT_PAID', 'Hanya pengeluaran yang sudah dibayar dapat dibalik.');
      const reversal = await this.posting.postExpenseReversal(connection, context, { amount: money(expense.amount) + money(expense.tax_amount), reversalDate: toSqlDateTime(data.reversal_date), treasuryAccountId: Number(expense.treasury_account_id), categoryCode: expense.category_code, description: `Pembalikan ${expense.expense_code}: ${data.reason}`, partyId: expense.party_id || null, sourceId: expenseId, sourceCode: expense.expense_code }, { auditModule: 'craft_finance', auditAction: 'craft.finance.expense_reversal', entityType: 'expense', entityId: expenseId, entityCode: expense.expense_code });
      await connection.execute(`UPDATE expenses SET status_code='void' WHERE id=?`, [expenseId]);
      await writeCraftFinanceAudit(connection, context, 'craft.finance.expense_void', 'expense', expenseId, expense.expense_code, `Membalik pengeluaran ${expense.expense_code}.`, { status_code: 'paid' }, { status_code: 'void', reversal_transaction_id: reversal.transactionId, reason: data.reason });
      return { id: expenseId, status_code: 'void', reversal_transaction_id: reversal.transactionId };
    });
  }

  // ---------------------------------------------------------------------
  // HPP & Profitability
  // ---------------------------------------------------------------------

  async profitability(context: PostingContext, filters: { from?: string; to?: string }) {
    let where = ' WHERE o.business_unit_id=? AND o.deleted_at IS NULL AND o.status_code NOT IN (\'cancelled\')'; const params: any[] = [context.businessUnitId];
    if (filters.from) { where += ' AND DATE(o.order_date)>=?'; params.push(filters.from); }
    if (filters.to) { where += ' AND DATE(o.order_date)<=?'; params.push(filters.to); }
    const [rows]: any = await pool.execute(
      `SELECT o.id, o.order_code, o.order_date, o.status_code, o.total_amount, o.paid_amount, o.marketplace_fee_amount,
              COALESCE(job.direct_cost, NULL) AS direct_cost, COALESCE(job.job_count, 0) AS job_count, COALESCE(job.estimated_job_count, 0) AS estimated_job_count
       FROM craft_orders o
       LEFT JOIN (
         SELECT order_id,
                SUM(COALESCE(actual_cost, estimated_cost)) AS direct_cost,
                SUM(CASE WHEN actual_cost IS NOT NULL THEN 1 ELSE 0 END) AS job_count,
                SUM(CASE WHEN actual_cost IS NULL AND estimated_cost IS NOT NULL THEN 1 ELSE 0 END) AS estimated_job_count
         FROM print_jobs WHERE order_id IS NOT NULL GROUP BY order_id
       ) job ON job.order_id = o.id
       ${where} ORDER BY o.order_date DESC LIMIT 500`, params,
    );
    const [wasteRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(mw.quantity * m.default_unit_cost), 0) AS waste_cost, COUNT(*) AS waste_events
       FROM material_waste mw JOIN materials m ON m.id = mw.material_id JOIN print_jobs pj ON pj.id = mw.print_job_id
       WHERE pj.business_unit_id = ? ${filters.from ? 'AND DATE(mw.occurred_at)>=?' : ''} ${filters.to ? 'AND DATE(mw.occurred_at)<=?' : ''}`,
      [context.businessUnitId, ...(filters.from ? [filters.from] : []), ...(filters.to ? [filters.to] : [])],
    );
    const orders = rows.map((row: any) => {
      const revenue = money(row.total_amount);
      const marketplaceFee = money(row.marketplace_fee_amount);
      const directCostAvailable = row.direct_cost !== null;
      const directCost = directCostAvailable ? money(row.direct_cost) : null;
      const grossProfit = directCostAvailable ? money(revenue - (directCost || 0) - marketplaceFee) : null;
      return {
        id: Number(row.id), order_code: row.order_code, order_date: row.order_date, status_code: row.status_code,
        revenue, marketplace_fee: marketplaceFee,
        direct_cost: directCost, direct_cost_available: directCostAvailable, direct_cost_is_estimated: Number(row.estimated_job_count) > 0 && Number(row.job_count) === 0,
        gross_profit: grossProfit, margin_percent: grossProfit !== null && revenue > 0 ? money((grossProfit / revenue) * 100) : null,
      };
    });
    const summarized = orders.filter((order: any) => order.direct_cost_available);
    return {
      orders,
      period_summary: {
        total_revenue: money(orders.reduce((sum: number, order: any) => sum + order.revenue, 0)),
        total_marketplace_fee: money(orders.reduce((sum: number, order: any) => sum + order.marketplace_fee, 0)),
        total_direct_cost: money(summarized.reduce((sum: number, order: any) => sum + (order.direct_cost || 0), 0)),
        total_gross_profit: money(summarized.reduce((sum: number, order: any) => sum + (order.gross_profit || 0), 0)),
        orders_with_cost_data: summarized.length,
        orders_missing_cost_data: orders.length - summarized.length,
        waste_cost_informational: money(wasteRows[0]?.waste_cost || 0),
        waste_events_informational: Number(wasteRows[0]?.waste_events || 0),
      },
    };
  }

  // ---------------------------------------------------------------------
  // Cash Flow
  // ---------------------------------------------------------------------

  async cashFlow(context: PostingContext, from?: string, to?: string) {
    const params: any[] = [context.organizationId, context.businessUnitId];
    const dateClauses: ((prefix: string) => string)[] = [];
    if (from) { dateClauses.push((prefix) => `DATE(${prefix}transaction_date)>=?`); params.push(from); }
    if (to) { dateClauses.push((prefix) => `DATE(${prefix}transaction_date)<=?`); params.push(to); }
    const buildWhere = (prefix: string) => ` WHERE ${prefix}organization_id=? AND ${prefix}business_unit_id=? AND ${prefix}status_code='posted' AND ${prefix}transaction_type IN ('income','expense')${dateClauses.map((clause) => ` AND ${clause(prefix)}`).join('')}`;
    const [[daily], [byTreasury], [byCategory]]: any = await Promise.all([
      pool.execute(`SELECT DATE(transaction_date) day, COALESCE(SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END),0) cash_in, COALESCE(SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END),0) cash_out FROM financial_transactions${buildWhere('')} GROUP BY DATE(transaction_date) ORDER BY day`, params),
      pool.execute(`SELECT ft.treasury_account_id, ta.name treasury_name, COALESCE(SUM(CASE WHEN ft.transaction_type='income' THEN ft.amount ELSE 0 END),0) cash_in, COALESCE(SUM(CASE WHEN ft.transaction_type='expense' THEN ft.amount ELSE 0 END),0) cash_out FROM financial_transactions ft LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id${buildWhere('ft.')} GROUP BY ft.treasury_account_id,ta.name ORDER BY ta.name`, params),
      pool.execute(`SELECT ft.category_id, tc.name category_name, ft.transaction_type, COALESCE(SUM(ft.amount),0) amount FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id${buildWhere('ft.')} GROUP BY ft.category_id,tc.name,ft.transaction_type ORDER BY amount DESC`, params),
    ]);
    return {
      daily: daily.map((row: any) => ({ ...row, cash_in: money(row.cash_in), cash_out: money(row.cash_out), net_cash_flow: money(row.cash_in) - money(row.cash_out) })),
      by_treasury: byTreasury.map((row: any) => ({ ...row, cash_in: money(row.cash_in), cash_out: money(row.cash_out), net_cash_flow: money(row.cash_in) - money(row.cash_out) })),
      by_category: byCategory.map((row: any) => ({ ...row, amount: money(row.amount) })),
    };
  }

  // ---------------------------------------------------------------------
  // Budgets
  // ---------------------------------------------------------------------

  async budgets(context: PostingContext) {
    const [rows]: any = await pool.execute(`SELECT b.*,COALESCE(items.allocated_amount,0) allocated_amount,COALESCE(items.actual_amount,0) actual_amount FROM budgets b LEFT JOIN (SELECT bi.budget_id,SUM(bi.allocated_amount) allocated_amount,SUM(COALESCE(actuals.actual_amount,0)) actual_amount FROM budget_items bi JOIN budgets scope ON scope.id=bi.budget_id LEFT JOIN (SELECT e.category_id,DATE(e.expense_date) expense_day,SUM(e.amount+e.tax_amount) actual_amount FROM expenses e WHERE e.organization_id=? AND e.business_unit_id=? AND e.status_code='paid' GROUP BY e.category_id,DATE(e.expense_date)) actuals ON actuals.category_id=bi.category_id AND actuals.expense_day BETWEEN scope.period_start AND scope.period_end GROUP BY bi.budget_id) items ON items.budget_id=b.id WHERE b.organization_id=? AND b.business_unit_id=? ORDER BY b.period_start DESC,b.id DESC`, [context.organizationId, context.businessUnitId, context.organizationId, context.businessUnitId]);
    return rows.map((row: any) => ({ ...row, total_amount: money(row.total_amount), allocated_amount: money(row.allocated_amount), actual_amount: money(row.actual_amount), utilization_percent: money(row.allocated_amount) ? money(row.actual_amount) / money(row.allocated_amount) * 100 : 0 }));
  }

  async createBudget(context: PostingContext, data: any) {
    if (data.period_end < data.period_start) throw new AppError(400, 'INVALID_BUDGET_PERIOD', 'Akhir periode anggaran tidak boleh mendahului awalnya.');
    return withCraftFinanceTransaction(async (connection) => {
      const total = data.items.reduce((sum: number, item: any) => sum + money(item.allocated_amount), 0);
      const [result]: any = await connection.execute(`INSERT INTO budgets (organization_id,business_unit_id,budget_code,name,period_start,period_end,status_code,total_amount,created_by) VALUES (?,?,?, ?,?,?, 'draft',?,?)`, [context.organizationId, context.businessUnitId, `TMP-${randomUUID()}`, data.name, data.period_start, data.period_end, total, context.userId]);
      const id = Number(result.insertId), budgetCode = financeCode('BDG', id);
      await connection.execute('UPDATE budgets SET budget_code=? WHERE id=?', [budgetCode, id]);
      for (const item of data.items) await connection.execute('INSERT INTO budget_items (budget_id,category_id,name,allocated_amount,notes) VALUES (?,?,?,?,?)', [id, item.category_id || null, item.name, item.allocated_amount, item.notes || null]);
      await writeCraftFinanceAudit(connection, context, 'craft.finance.budget_create', 'budget', id, budgetCode, `Membuat anggaran ${budgetCode}.`, undefined, { total, item_count: data.items.length });
      return { id, budget_code: budgetCode };
    });
  }

  async approveBudget(context: PostingContext, budgetId: number) {
    return withCraftFinanceTransaction(async (connection) => {
      const [rows]: any = await connection.execute('SELECT budget_code,status_code FROM budgets WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE', [budgetId, context.organizationId, context.businessUnitId]);
      if (!rows.length) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Anggaran tidak ditemukan.');
      if (rows[0].status_code !== 'draft') throw new AppError(409, 'BUDGET_NOT_DRAFT', 'Hanya anggaran draf yang dapat disetujui.');
      await connection.execute(`UPDATE budgets SET status_code='approved',approved_by=? WHERE id=?`, [context.userId, budgetId]);
      await writeCraftFinanceAudit(connection, context, 'craft.finance.budget_approve', 'budget', budgetId, rows[0].budget_code, `Menyetujui anggaran ${rows[0].budget_code}.`);
      return { id: budgetId, status_code: 'approved' };
    });
  }

  // ---------------------------------------------------------------------
  // Journals & Periods
  // ---------------------------------------------------------------------

  async accounting(context: PostingContext) {
    const [journals, periods]: any = await Promise.all([
      pool.execute(`SELECT j.id,j.journal_number,j.entry_date,j.description,j.source_type,j.source_id,j.status_code,COALESCE(SUM(l.debit_amount),0) debit_amount,COALESCE(SUM(l.credit_amount),0) credit_amount FROM journal_entries j LEFT JOIN journal_lines l ON l.journal_entry_id=j.id WHERE j.organization_id=? AND j.business_unit_id=? GROUP BY j.id ORDER BY j.entry_date DESC,j.id DESC LIMIT 300`, [context.organizationId, context.businessUnitId]),
      pool.execute(`SELECT id,period_code,start_date,end_date,status_code FROM financial_periods WHERE organization_id=? ORDER BY start_date DESC LIMIT 100`, [context.organizationId]),
    ]);
    return { journals: journals[0].map((row: any) => ({ ...row, debit_amount: money(row.debit_amount), credit_amount: money(row.credit_amount), is_balanced: Math.abs(money(row.debit_amount) - money(row.credit_amount)) <= 0.01 })), periods: periods[0] };
  }

  async journalDetail(context: PostingContext, journalId: number) {
    const [journals]: any = await pool.execute(`SELECT * FROM journal_entries WHERE id=? AND organization_id=? AND business_unit_id=?`, [journalId, context.organizationId, context.businessUnitId]);
    if (!journals.length) throw new AppError(404, 'JOURNAL_NOT_FOUND', 'Jurnal tidak ditemukan.');
    const [lines]: any = await pool.execute(`SELECT l.*,coa.account_code,coa.account_name FROM journal_lines l LEFT JOIN chart_of_accounts coa ON coa.id=l.coa_account_id WHERE l.journal_entry_id=? ORDER BY l.sort_order`, [journalId]);
    return { ...journals[0], lines: lines.map((row: any) => ({ ...row, debit_amount: money(row.debit_amount), credit_amount: money(row.credit_amount) })) };
  }
}
