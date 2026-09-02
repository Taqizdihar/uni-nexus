import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import { documentRegistryService } from '../../shared/documents/document-registry.service';
import { FinancePostingService } from '../../shared/finance/finance-posting.service';
import { jakartaBusinessDate } from '../../shared/time/jakarta-time';
import type { StudioExpenseInput, StudioFinanceListFilters } from './studio-finance.types';
import { financeCode, getStudioFinanceBusinessUnit, money, STUDIO_FINANCE_MODULE, toSqlDateTime, withStudioFinanceTransaction, writeStudioFinanceAudit, publishStudioFinanceEvent } from './studio-finance.shared';
import type { StudioFinanceContext } from './studio-finance.shared';

const PAGE_LIMIT = 100;
const asNumber = (value: unknown) => money(value);
const pageResult = (rows: any[], page: number, limit: number, total: number) => ({ items: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });

export class StudioFinanceService {
  private posting = new FinancePostingService();

  async context(userId: number): Promise<StudioFinanceContext> {
    const studio = await getStudioFinanceBusinessUnit();
    return { ...studio, userId, businessUnitId: studio.id };
  }

  private async assertProject(connection: PoolConnection, projectId: number | null | undefined, ctx: StudioFinanceContext) {
    if (!projectId) return null;
    const [rows]: any = await connection.execute('SELECT id,project_code FROM studio_projects WHERE id=? AND business_unit_id=? AND deleted_at IS NULL LIMIT 1 FOR UPDATE', [projectId, ctx.id]);
    if (!rows.length) throw new AppError(400, 'INVALID_STUDIO_PROJECT', 'Proyek Studio tidak ditemukan.');
    return rows[0];
  }

  private async category(connection: PoolConnection, ctx: StudioFinanceContext, code: string, type: 'income' | 'expense') {
    const [rows]: any = await connection.execute('SELECT id,code,name FROM transaction_categories WHERE organization_id=? AND business_unit_id=? AND code=? AND transaction_type=? AND is_active=1 LIMIT 1', [ctx.organizationId, ctx.id, code, type]);
    if (!rows.length) throw new AppError(400, 'INVALID_TRANSACTION_CATEGORY', 'Kategori keuangan Studio tidak valid atau tidak aktif.');
    return rows[0];
  }

  private async syncProjectCost(connection: PoolConnection, ctx: StudioFinanceContext, projectId: number | null | undefined) {
    if (!projectId) return;
    const [totalRows]: any = await connection.execute(
      `SELECT COALESCE(SUM(amount + tax_amount),0) AS actual_cost
       FROM expenses WHERE organization_id=? AND business_unit_id=? AND studio_project_id=? AND status_code='paid'`,
      [ctx.organizationId, ctx.id, projectId],
    );
    await connection.execute('UPDATE studio_projects SET actual_cost=? WHERE id=? AND business_unit_id=?', [asNumber(totalRows[0]?.actual_cost), projectId, ctx.id]);
  }

  private async syncProjectPaidAmount(connection: PoolConnection, ctx: StudioFinanceContext, projectId: number) {
    const [projectRows]: any = await connection.execute('SELECT id,contract_value FROM studio_projects WHERE id=? AND business_unit_id=? AND deleted_at IS NULL FOR UPDATE', [projectId, ctx.id]);
    if (!projectRows.length) return;
    const [paidRows]: any = await connection.execute(
      `SELECT COALESCE(SUM(paid_amount),0) AS paid_amount
       FROM invoices WHERE organization_id=? AND business_unit_id=? AND source_type='studio_project' AND source_id=? AND status_code NOT IN ('void','refunded')`,
      [ctx.organizationId, ctx.id, projectId],
    );
    const paid = asNumber(paidRows[0]?.paid_amount);
    const contract = asNumber(projectRows[0].contract_value);
    const status = paid <= 0.01 ? 'unpaid' : contract > 0 && paid + 0.01 >= contract ? 'paid' : 'partial';
    await connection.execute('UPDATE studio_projects SET paid_amount=?,payment_status_code=? WHERE id=? AND business_unit_id=?', [paid, status, projectId, ctx.id]);
  }

  async overview(ctx: StudioFinanceContext) {
    const [summaryRows]: any = await pool.execute(
      `SELECT
        (SELECT COALESCE(SUM(current_balance),0) FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1) AS total_cash,
        (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND transaction_type='income' AND status_code='posted' AND DATE_FORMAT(transaction_date,'%Y-%m')=DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00'),'%Y-%m')) AS cash_in_month,
        (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND transaction_type='expense' AND status_code='posted' AND DATE_FORMAT(transaction_date,'%Y-%m')=DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00'),'%Y-%m')) AS cash_out_month,
        (SELECT COALESCE(SUM(balance_due),0) FROM invoices WHERE organization_id=? AND business_unit_id=? AND balance_due>0.005 AND status_code NOT IN ('void','refunded')) AS receivables,
        (SELECT COALESCE(SUM(amount + tax_amount),0) FROM expenses WHERE organization_id=? AND business_unit_id=? AND status_code IN ('draft','approved')) AS unpaid_expenses,
        (SELECT COALESCE(SUM(contract_value-actual_cost),0) FROM studio_projects WHERE business_unit_id=? AND deleted_at IS NULL) AS recorded_project_profit`,
      [ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.id],
    );
    const summary = summaryRows[0] || {};
    const [attentionRows]: any = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM invoices WHERE organization_id=? AND business_unit_id=? AND balance_due>0.005 AND due_date < DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) AND status_code NOT IN ('void','paid','refunded')) AS overdue_invoices,
        (SELECT COUNT(*) FROM invoice_payment_schedules s JOIN invoices i ON i.id=s.invoice_id WHERE i.organization_id=? AND i.business_unit_id=? AND s.amount-s.paid_amount>0.005 AND s.due_date BETWEEN DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')) AND DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')),INTERVAL 7 DAY) AND s.status_code NOT IN ('paid','cancelled')) AS schedules_due_soon,
        (SELECT COUNT(*) FROM expenses WHERE organization_id=? AND business_unit_id=? AND status_code='approved') AS approved_unpaid_expenses,
        (SELECT COALESCE(SUM(pea.agreed_fee)-SUM(COALESCE(paid.paid_amount,0)),0) FROM project_external_assignments pea JOIN studio_projects sp ON sp.id=pea.project_id LEFT JOIN (SELECT ft.source_code,SUM(ft.amount) paid_amount FROM financial_transactions ft WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.source_type='studio_external_payout' AND ft.status_code='posted' GROUP BY ft.source_code) paid ON paid.source_code=CONCAT('ASSIGN-',pea.id) WHERE sp.business_unit_id=? AND sp.deleted_at IS NULL) AS external_fee_remaining`,
      [ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.organizationId,ctx.id,ctx.id],
    );
    const [transactions]: any = await pool.execute(
      `SELECT ft.id,ft.transaction_code,ft.transaction_date,ft.transaction_type,ft.amount,ft.description,tc.name category_name,ta.name treasury_name,p.display_name party_name
       FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id LEFT JOIN parties p ON p.id=ft.party_id
       WHERE ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' ORDER BY ft.transaction_date DESC,ft.id DESC LIMIT 8`, [ctx.organizationId,ctx.id],
    );
    return {
      total_cash: asNumber(summary.total_cash), cash_in_month: asNumber(summary.cash_in_month), cash_out_month: asNumber(summary.cash_out_month),
      net_cash_flow: asNumber(summary.cash_in_month) - asNumber(summary.cash_out_month), receivables: asNumber(summary.receivables),
      unpaid_expenses: asNumber(summary.unpaid_expenses), recorded_project_profit: asNumber(summary.recorded_project_profit),
      attention: { overdue_invoices: Number(attentionRows[0]?.overdue_invoices || 0), schedules_due_soon: Number(attentionRows[0]?.schedules_due_soon || 0), approved_unpaid_expenses: Number(attentionRows[0]?.approved_unpaid_expenses || 0), external_fee_remaining: asNumber(attentionRows[0]?.external_fee_remaining) },
      transactions: transactions.map((row: any) => ({ ...row, amount: asNumber(row.amount) })),
    };
  }

  async references(ctx: StudioFinanceContext) {
    const [categories, methods, treasuries, projects, parties, periods]: any = await Promise.all([
      pool.execute('SELECT id,code,name,transaction_type FROM transaction_categories WHERE organization_id=? AND business_unit_id=? AND is_active=1 ORDER BY transaction_type,name', [ctx.organizationId,ctx.id]),
      pool.execute('SELECT id,code,name,method_type FROM payment_methods WHERE is_active=1 ORDER BY name'),
      pool.execute('SELECT id,account_code,name,account_type,current_balance,currency_code FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1 ORDER BY name', [ctx.organizationId,ctx.id]),
      pool.execute('SELECT id,project_code,project_name,client_party_id,contract_value,currency_code FROM studio_projects WHERE business_unit_id=? AND deleted_at IS NULL ORDER BY project_name LIMIT 300', [ctx.id]),
      pool.execute(`SELECT p.id,p.code,p.display_name FROM parties p WHERE p.organization_id=? AND p.deleted_at IS NULL AND EXISTS (SELECT 1 FROM party_roles pr WHERE pr.party_id=p.id AND pr.business_unit_id=? AND pr.role_code IN ('vendor','freelancer','studio_partner') AND pr.is_active=1) ORDER BY p.display_name LIMIT 300`, [ctx.organizationId,ctx.id]),
      pool.execute('SELECT id,period_code,start_date,end_date,status_code FROM financial_periods WHERE organization_id=? ORDER BY start_date DESC LIMIT 60', [ctx.organizationId]),
    ]);
    return { categories: categories[0], payment_methods: methods[0], treasuries: treasuries[0].map((row: any) => ({ ...row, current_balance: asNumber(row.current_balance) })), projects: projects[0].map((row: any) => ({ ...row, contract_value: asNumber(row.contract_value) })), external_parties: parties[0], periods: periods[0] };
  }

  async listTransactions(ctx: StudioFinanceContext, filters: StudioFinanceListFilters) {
    const page = Math.max(1, filters.page), limit = Math.min(PAGE_LIMIT, Math.max(1, filters.limit)), offset = (page - 1) * limit;
    let where = ' WHERE ft.organization_id=? AND ft.business_unit_id=?'; const params: any[] = [ctx.organizationId,ctx.id];
    const add = (clause: string, ...values: unknown[]) => { where += ` AND ${clause}`; params.push(...values); };
    if (filters.search) { const term = `%${filters.search}%`; add('(ft.transaction_code LIKE ? OR ft.description LIKE ? OR p.display_name LIKE ?)', term,term,term); }
    if (filters.transactionType) add('ft.transaction_type=?', filters.transactionType);
    if (filters.categoryId) add('ft.category_id=?', filters.categoryId);
    if (filters.treasuryId) add('ft.treasury_account_id=?', filters.treasuryId);
    if (filters.status) add('ft.status_code=?', filters.status);
    if (filters.from) add('DATE(ft.transaction_date)>=?', filters.from);
    if (filters.to) add('DATE(ft.transaction_date)<=?', filters.to);
    const joins = ' FROM financial_transactions ft LEFT JOIN transaction_categories tc ON tc.id=ft.category_id LEFT JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id LEFT JOIN parties p ON p.id=ft.party_id';
    const [rows, counts]: any = await Promise.all([
      pool.execute(`SELECT ft.*,tc.code category_code,tc.name category_name,ta.name treasury_name,p.display_name party_name ${joins}${where} ORDER BY ft.transaction_date DESC,ft.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
      pool.execute(`SELECT COUNT(*) total ${joins}${where}`, params),
    ]);
    return pageResult(rows[0].map((row: any) => ({ ...row, amount: asNumber(row.amount) })), page, limit, Number(counts[0][0].total));
  }

  async treasury(ctx: StudioFinanceContext) {
    const [rows]: any = await pool.execute(
      `SELECT t.*,MAX(ft.transaction_date) last_transaction_at
       FROM treasury_accounts t LEFT JOIN financial_transactions ft ON ft.treasury_account_id=t.id AND ft.organization_id=t.organization_id AND ft.business_unit_id=t.business_unit_id AND ft.status_code='posted'
       WHERE t.organization_id=? AND t.business_unit_id=? GROUP BY t.id ORDER BY t.is_active DESC,t.name`, [ctx.organizationId,ctx.id],
    );
    return rows.map((row: any) => ({ ...row, opening_balance: asNumber(row.opening_balance), current_balance: asNumber(row.current_balance), is_active: Boolean(Number(row.is_active)) }));
  }

  async createTreasury(ctx: StudioFinanceContext, data: any) {
    return withStudioFinanceTransaction(async connection => {
      let coa = data.coa_account_id || null;
      if (coa) {
        const [accounts]: any = await connection.execute(`SELECT id FROM chart_of_accounts WHERE id=? AND organization_id=? AND is_active=1 LIMIT 1`, [coa,ctx.organizationId]);
        if (!accounts.length) throw new AppError(400,'INVALID_COA_ACCOUNT','Akun COA kas tidak valid.');
      } else {
        const [accounts]: any = await connection.execute(`SELECT id FROM chart_of_accounts WHERE organization_id=? AND account_code='1000' AND is_active=1 ORDER BY business_unit_id IS NULL DESC LIMIT 1`, [ctx.organizationId]);
        coa = accounts[0]?.id || null;
      }
      const [result]: any = await connection.execute(
        `INSERT INTO treasury_accounts (organization_id,business_unit_id,coa_account_id,account_code,name,account_type,provider_name,account_number_masked,currency_code,opening_balance,current_balance)
         VALUES (?,?,?, ?,?,?,?,?,?,?,?)`,
        [ctx.organizationId,ctx.id,coa,`TMP-${Date.now()}`,data.name,data.account_type,data.provider_name || null,data.account_number_masked || null,data.currency_code.toUpperCase(),data.opening_balance,0],
      );
      const id=Number(result.insertId), accountCode=financeCode('TRS',id); await connection.execute('UPDATE treasury_accounts SET account_code=? WHERE id=?',[accountCode,id]);
      await this.posting.postTreasuryOpening(connection,ctx,{treasuryAccountId:id,amount:data.opening_balance,date:new Date().toISOString().slice(0,19).replace('T',' '),description:`Saldo awal ${data.name}`},{auditModule:STUDIO_FINANCE_MODULE,auditAction:'studio.finance.treasury_opening',entityCode:accountCode});
      await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.treasury_create','treasury_account',id,accountCode,`Membuat akun kas Studio ${accountCode}.`,undefined,{name:data.name,opening_balance:data.opening_balance});
      return { id, account_code: accountCode };
    });
  }

  async setTreasuryStatus(ctx: StudioFinanceContext, treasuryId: number, active: boolean) {
    return withStudioFinanceTransaction(async connection => {
      const [rows]: any = await connection.execute('SELECT id,account_code,current_balance,is_active FROM treasury_accounts WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE',[treasuryId,ctx.organizationId,ctx.id]);
      if (!rows.length) throw new AppError(404,'TREASURY_NOT_FOUND','Akun kas tidak ditemukan.'); const treasury=rows[0];
      if (!active && Math.abs(asNumber(treasury.current_balance)) > 0.01) throw new AppError(409,'TREASURY_NON_ZERO_BALANCE','Akun kas bersaldo tidak dapat dinonaktifkan tanpa penyelesaian saldo.');
      await connection.execute('UPDATE treasury_accounts SET is_active=? WHERE id=?',[active ? 1 : 0,treasuryId]);
      await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.treasury_status','treasury_account',treasuryId,treasury.account_code,`${active ? 'Mengaktifkan' : 'Menonaktifkan'} akun kas ${treasury.account_code}.`,{is_active:Boolean(treasury.is_active)},{is_active:active});
      return { id: treasuryId, is_active: active };
    });
  }

  private async journalTransfer(connection: PoolConnection, ctx: StudioFinanceContext, data: { date: string; description: string; amount: number; from: any; to: any; transferId: number; }) {
    const [periods]: any = await connection.execute(`SELECT id,status_code FROM financial_periods WHERE organization_id=? AND ? BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1 FOR UPDATE`,[ctx.organizationId,jakartaBusinessDate(data.date)]);
    if (periods.length && periods[0].status_code === 'closed') throw new AppError(409,'FINANCIAL_PERIOD_CLOSED','Tanggal transfer berada pada periode yang telah ditutup.');
    if (periods.length && periods[0].status_code === 'locked') throw new AppError(409,'FINANCIAL_PERIOD_LOCKED','Tanggal transfer berada pada periode yang dikunci.');
    if (!data.from.coa_account_id || !data.to.coa_account_id) return null;
    const [entry]: any = await connection.execute(`INSERT INTO journal_entries (organization_id,business_unit_id,financial_period_id,journal_number,entry_date,description,source_type,source_id,status_code,created_by,posted_by,posted_at) VALUES (?,?,?, ?,?,?,'internal_transfer',?,'posted',?,?,UTC_TIMESTAMP())`,[ctx.organizationId,ctx.id,periods[0]?.id || null,`TMP-${Date.now()}`,data.date,data.description,data.transferId,ctx.userId,ctx.userId]);
    const journalId=Number(entry.insertId); await connection.execute('UPDATE journal_entries SET journal_number=? WHERE id=?',[financeCode('JRN',journalId),journalId]);
    await connection.execute(`INSERT INTO journal_lines (journal_entry_id,coa_account_id,description,debit_amount,credit_amount,sort_order) VALUES (?,?,?,?,?,0),(?,?,?,?,?,1)`,[journalId,data.to.coa_account_id,data.description,data.amount,0,journalId,data.from.coa_account_id,data.description,0,data.amount]);
    return journalId;
  }

  async transfer(ctx: StudioFinanceContext, data: any) {
    if (data.from_treasury_account_id === data.to_treasury_account_id) throw new AppError(400,'SAME_TREASURY_TRANSFER','Akun asal dan tujuan transfer harus berbeda.');
    return withStudioFinanceTransaction(async connection => {
      const ids=[data.from_treasury_account_id,data.to_treasury_account_id].sort((a:number,b:number)=>a-b);
      const [rows]: any = await connection.execute(`SELECT * FROM treasury_accounts WHERE id IN (?,?) AND organization_id=? AND business_unit_id=? AND is_active=1 ORDER BY id FOR UPDATE`,[ids[0],ids[1],ctx.organizationId,ctx.id]);
      if(rows.length!==2)throw new AppError(400,'INVALID_TRANSFER_TREASURY','Akun transfer harus aktif dan milik Studio.');
      const from=rows.find((row:any)=>Number(row.id)===data.from_treasury_account_id),to=rows.find((row:any)=>Number(row.id)===data.to_treasury_account_id);
      if(from.currency_code!==to.currency_code)throw new AppError(400,'TRANSFER_CURRENCY_MISMATCH','Transfer V1 hanya mendukung mata uang yang sama.'); if(asNumber(from.current_balance)+.01<data.amount)throw new AppError(409,'INSUFFICIENT_TREASURY_BALANCE','Saldo akun asal tidak mencukupi.');
      const [result]: any=await connection.execute(`INSERT INTO internal_transfers (organization_id,transfer_code,from_business_unit_id,to_business_unit_id,from_treasury_account_id,to_treasury_account_id,amount,currency_code,transfer_date,description,status_code,created_by) VALUES (?,?, ?,?,?,?,?,?,?,?,'completed',?)`,[ctx.organizationId,`TMP-${Date.now()}`,ctx.id,ctx.id,from.id,to.id,data.amount,from.currency_code,toSqlDateTime(data.transfer_date),data.description || null,ctx.userId]);
      const id=Number(result.insertId),transferCode=financeCode('TRF',id);await connection.execute('UPDATE internal_transfers SET transfer_code=? WHERE id=?',[transferCode,id]);await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance-? WHERE id=?',[data.amount,from.id]);await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?',[data.amount,to.id]);
      const journalId=await this.journalTransfer(connection,ctx,{date:data.transfer_date,description:data.description || `Transfer ${transferCode}`,amount:data.amount,from,to,transferId:id});if(journalId)await connection.execute('UPDATE internal_transfers SET journal_entry_id=? WHERE id=?',[journalId,id]);
      await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.transfer','internal_transfer',id,transferCode,`Transfer ${transferCode} antar kas Studio.`,undefined,{from:from.id,to:to.id,amount:data.amount}); await publishStudioFinanceEvent(connection,ctx,'studio.finance.treasury_transfer_completed','internal_transfer',id,transferCode,ctx.userId,{ transfer: { id, transfer_code: transferCode, amount: data.amount, currency_code: from.currency_code } }); return { id, transfer_code:transferCode };
    });
  }

  async recordIncome(ctx: StudioFinanceContext, data: any) {
    return withStudioFinanceTransaction(async connection => {
      await this.category(connection,ctx,data.category_code,'income');
      const result=await this.posting.postCashMovement(connection,ctx,{direction:'in',amount:data.amount,transactionDate:toSqlDateTime(data.transaction_date),treasuryAccountId:data.treasury_account_id,categoryCode:data.category_code,description:data.description,partyId:data.party_id || null,sourceType:'studio_manual_income',sourceCode:data.reference_number || null,auditAction:'studio.finance.manual_income',auditEntityType:'financial_transaction'},{auditModule:STUDIO_FINANCE_MODULE});
      return result;
    });
  }

  async payInvoice(ctx: StudioFinanceContext, invoiceId: number, data: any) {
    return withStudioFinanceTransaction(async connection => {
      const [invoices]: any = await connection.execute(`SELECT id,party_id,source_type,source_id,balance_due FROM invoices WHERE id=? AND organization_id=? AND business_unit_id=? AND status_code NOT IN ('void','refunded') FOR UPDATE`,[invoiceId,ctx.organizationId,ctx.id]);
      if(!invoices.length)throw new AppError(404,'INVOICE_NOT_FOUND','Invoice Studio tidak ditemukan.');const invoice=invoices[0];
      if(data.amount>asNumber(invoice.balance_due)+.01)throw new AppError(409,'PAYMENT_EXCEEDS_BALANCE','Jumlah pembayaran melebihi sisa invoice.');
      if(data.payment_schedule_id){const [schedules]:any=await connection.execute('SELECT * FROM invoice_payment_schedules WHERE id=? AND invoice_id=? FOR UPDATE',[data.payment_schedule_id,invoiceId]);if(!schedules.length)throw new AppError(400,'INVALID_PAYMENT_SCHEDULE','Jadwal pembayaran tidak ditemukan untuk invoice ini.');if(data.amount>asNumber(schedules[0].amount)-asNumber(schedules[0].paid_amount)+.01)throw new AppError(409,'PAYMENT_EXCEEDS_SCHEDULE_BALANCE','Jumlah pembayaran melebihi sisa jadwal.');}
      else {const [schedules]:any=await connection.execute(`SELECT id FROM invoice_payment_schedules WHERE invoice_id=? AND amount-paid_amount>0.005 AND status_code NOT IN ('paid','cancelled') LIMIT 1 FOR UPDATE`,[invoiceId]);if(schedules.length)throw new AppError(409,'PAYMENT_SCHEDULE_REQUIRED','Pilih jadwal pembayaran yang ingin dialokasikan.');}
      const posted=await this.posting.postCustomerPayment(connection,ctx,{invoiceId,partyId:Number(invoice.party_id),paymentMethodId:data.payment_method_id,treasuryAccountId:data.treasury_account_id,amount:data.amount,paymentDate:toSqlDateTime(data.payment_date),paymentScheduleId:data.payment_schedule_id || null,categoryCode:'STUDIO_PROJECT',referenceNumber:data.reference_number,notes:data.notes},undefined,{categoryCode:'STUDIO_PROJECT',auditModule:STUDIO_FINANCE_MODULE,auditAction:'studio.finance.customer_payment',sourceType:'studio_customer_payment'});
      if(data.payment_schedule_id){const [schedules]:any=await connection.execute('SELECT amount,paid_amount FROM invoice_payment_schedules WHERE id=? FOR UPDATE',[data.payment_schedule_id]);const paid=asNumber(schedules[0].paid_amount)+asNumber(data.amount),balance=asNumber(schedules[0].amount)-paid,status=balance<=.01?'paid':'partial';await connection.execute(`UPDATE invoice_payment_schedules SET paid_amount=?,status_code=?,paid_at=IF(?='paid',UTC_TIMESTAMP(),paid_at) WHERE id=?`,[paid,status,status,data.payment_schedule_id]);}
      if(invoice.source_type==='studio_project' && invoice.source_id)await this.syncProjectPaidAmount(connection,ctx,Number(invoice.source_id)); await publishStudioFinanceEvent(connection,ctx,'studio.finance.payment_received','payment',Number(posted.paymentId),`PAY-${posted.paymentId}`,ctx.userId,{ payment: { id: Number(posted.paymentId), invoice_id: invoiceId, amount: data.amount, project_id: invoice.source_id ? Number(invoice.source_id) : null } });
      return { payment_id:posted.paymentId,transaction_id:posted.transactionId };
    });
  }

  async receivables(ctx: StudioFinanceContext, filters: StudioFinanceListFilters) {
    const [rows]: any = await pool.execute(
      `SELECT i.id,i.invoice_number,i.issue_date,i.due_date,i.status_code,i.total_amount,i.paid_amount,i.balance_due,i.currency_code,p.display_name client_name,p.code client_code,sp.id project_id,sp.project_code,sp.project_name,
       (SELECT MIN(s.due_date) FROM invoice_payment_schedules s WHERE s.invoice_id=i.id AND s.amount-s.paid_amount>0.005 AND s.status_code NOT IN ('paid','cancelled')) next_schedule_due_date,
       (SELECT s.label FROM invoice_payment_schedules s WHERE s.invoice_id=i.id AND s.amount-s.paid_amount>0.005 AND s.status_code NOT IN ('paid','cancelled') ORDER BY s.due_date,s.id LIMIT 1) next_schedule_label,
       DATEDIFF(DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+07:00')),i.due_date) days_overdue
       FROM invoices i JOIN parties p ON p.id=i.party_id LEFT JOIN studio_projects sp ON i.source_type='studio_project' AND i.source_id=sp.id
       WHERE i.organization_id=? AND i.business_unit_id=? AND i.balance_due>0.005 AND i.status_code NOT IN ('void','refunded') ORDER BY i.due_date IS NULL,i.due_date,i.id`, [ctx.organizationId,ctx.id],
    );
    return rows.map((row:any)=>({...row,total_amount:asNumber(row.total_amount),paid_amount:asNumber(row.paid_amount),balance_due:asNumber(row.balance_due),days_overdue:Math.max(0,Number(row.days_overdue || 0))}));
  }

  async listExpenses(ctx: StudioFinanceContext, filters: StudioFinanceListFilters) {
    const page=Math.max(1,filters.page),limit=Math.min(PAGE_LIMIT,Math.max(1,filters.limit)),offset=(page-1)*limit;let where=' WHERE e.organization_id=? AND e.business_unit_id=?';const params:any[]=[ctx.organizationId,ctx.id];const add=(sql:string,...values:unknown[])=>{where+=` AND ${sql}`;params.push(...values);};
    if(filters.status)add('e.status_code=?',filters.status);if(filters.projectId)add('e.studio_project_id=?',filters.projectId);if(filters.from)add('DATE(e.expense_date)>=?',filters.from);if(filters.to)add('DATE(e.expense_date)<=?',filters.to);if(filters.search){const term=`%${filters.search}%`;add('(e.expense_code LIKE ? OR e.description LIKE ? OR p.display_name LIKE ?)',term,term,term);}
    const joins=' FROM expenses e LEFT JOIN transaction_categories c ON c.id=e.category_id LEFT JOIN parties p ON p.id=e.party_id LEFT JOIN studio_projects sp ON sp.id=e.studio_project_id LEFT JOIN treasury_accounts t ON t.id=e.treasury_account_id';
    const [rows,counts]:any=await Promise.all([pool.execute(`SELECT e.*,c.code category_code,c.name category_name,p.display_name party_name,sp.project_code,sp.project_name,t.name treasury_name ${joins}${where} ORDER BY e.expense_date DESC,e.id DESC LIMIT ${limit} OFFSET ${offset}`,params),pool.execute(`SELECT COUNT(*) total ${joins}${where}`,params)]);
    return pageResult(rows[0].map((row:any)=>({...row,amount:asNumber(row.amount),tax_amount:asNumber(row.tax_amount),total_amount:asNumber(row.amount)+asNumber(row.tax_amount)})),page,limit,Number(counts[0][0].total));
  }

  private async insertExpense(connection: PoolConnection, ctx: StudioFinanceContext, data: StudioExpenseInput, status: 'draft' | 'approved') {
    const category=await this.category(connection,ctx,data.category_code,'expense');await this.assertProject(connection,data.studio_project_id || null,ctx);
    const [result]:any=await connection.execute(`INSERT INTO expenses (organization_id,business_unit_id,expense_code,category_id,party_id,studio_project_id,expense_date,description,amount,tax_amount,currency_code,status_code,receipt_path,created_by,approved_by) VALUES (?,?,?, ?,?,?,?,?,?,?,?,?,?,?,?)`,[ctx.organizationId,ctx.id,`TMP-${Date.now()}`,category.id,data.party_id || null,data.studio_project_id || null,toSqlDateTime(data.expense_date),data.description,data.amount,data.tax_amount || 0,'IDR',status,null,ctx.userId,status==='approved'?ctx.userId:null]);
    const id=Number(result.insertId),expenseCode=financeCode('EXP',id);await connection.execute('UPDATE expenses SET expense_code=? WHERE id=?',[expenseCode,id]);return { id,expense_code:expenseCode,category_id:Number(category.id) };
  }

  private async payExpenseRow(connection: PoolConnection,ctx:StudioFinanceContext,expense:any,input:{treasury_account_id:number;payment_date:string;reference_number?:string | null;direct_payment_confirmed?:boolean;},source:{type:string;code:string;action:string}) {
    if(expense.financial_transaction_id || expense.status_code==='paid')throw new AppError(409,'EXPENSE_ALREADY_PAID','Pengeluaran ini sudah dibayar.');if(expense.status_code!=='approved' && !input.direct_payment_confirmed)throw new AppError(409,'EXPENSE_APPROVAL_REQUIRED','Pengeluaran harus disetujui sebelum dibayar.');
    const total=asNumber(expense.amount)+asNumber(expense.tax_amount);const posted=await this.posting.postCashMovement(connection,ctx,{direction:'out',amount:total,transactionDate:toSqlDateTime(input.payment_date),treasuryAccountId:input.treasury_account_id,categoryCode:expense.category_code,description:expense.description,partyId:expense.party_id || null,sourceType:source.type,sourceId:Number(expense.id),sourceCode:source.code,auditAction:source.action,auditEntityType:'expense',auditEntityId:Number(expense.id),auditEntityCode:expense.expense_code},{auditModule:STUDIO_FINANCE_MODULE});
    await connection.execute(`UPDATE expenses SET status_code='paid',treasury_account_id=?,financial_transaction_id=?,approved_by=COALESCE(approved_by,?),expense_date=? WHERE id=?`,[input.treasury_account_id,posted.transactionId,ctx.userId,toSqlDateTime(input.payment_date),expense.id]);await this.syncProjectCost(connection,ctx,expense.studio_project_id ? Number(expense.studio_project_id):null);
    await writeStudioFinanceAudit(connection,ctx,ctx.userId,source.action,'expense',Number(expense.id),expense.expense_code,`Membayar pengeluaran ${expense.expense_code}.`,undefined,{transaction_id:posted.transactionId,total});return posted;
  }

  async createExpense(ctx: StudioFinanceContext, data: StudioExpenseInput) {
    return withStudioFinanceTransaction(async connection => { const direct=data.status_code==='paid'; const initialStatus: 'draft' | 'approved' = direct || data.status_code==='approved' ? 'approved' : 'draft'; if(direct && (!data.treasury_account_id || !data.direct_payment_confirmed))throw new AppError(400,'DIRECT_PAYMENT_CONFIRMATION_REQUIRED','Pembayaran langsung memerlukan akun kas dan konfirmasi.');const expense=await this.insertExpense(connection,ctx,data,initialStatus);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.expense_create','expense',expense.id,expense.expense_code,`Membuat pengeluaran ${expense.expense_code}.`,undefined,{status:data.status_code,amount:data.amount,tax_amount:data.tax_amount});if(!direct)return expense;const [rows]:any=await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? FOR UPDATE`,[expense.id]);const posted=await this.payExpenseRow(connection,ctx,rows[0],{treasury_account_id:Number(data.treasury_account_id),payment_date:data.expense_date,direct_payment_confirmed:true},{type:'studio_expense',code:expense.expense_code,action:'studio.finance.expense_pay'});return {...expense,transaction_id:posted.transactionId}; });
  }

  async approveExpense(ctx: StudioFinanceContext, expenseId: number) {
    return withStudioFinanceTransaction(async connection=>{const [rows]:any=await connection.execute('SELECT id,expense_code,status_code FROM expenses WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE',[expenseId,ctx.organizationId,ctx.id]);if(!rows.length)throw new AppError(404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan.');if(rows[0].status_code!=='draft')throw new AppError(409,'EXPENSE_NOT_DRAFT','Hanya pengeluaran draf yang dapat disetujui.');await connection.execute(`UPDATE expenses SET status_code='approved',approved_by=? WHERE id=?`,[ctx.userId,expenseId]);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.expense_approve','expense',expenseId,rows[0].expense_code,`Menyetujui pengeluaran ${rows[0].expense_code}.`);return{id:expenseId,status_code:'approved'};});
  }

  async payExpense(ctx:StudioFinanceContext,expenseId:number,data:any){return withStudioFinanceTransaction(async connection=>{const [rows]:any=await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? AND e.organization_id=? AND e.business_unit_id=? FOR UPDATE`,[expenseId,ctx.organizationId,ctx.id]);if(!rows.length)throw new AppError(404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan.');const posted=await this.payExpenseRow(connection,ctx,rows[0],data,{type:'studio_expense',code:rows[0].expense_code,action:'studio.finance.expense_pay'});return {id:expenseId,transaction_id:posted.transactionId};});}

  async reverseExpense(ctx:StudioFinanceContext,expenseId:number,data:{reversal_date:string;reason:string}){return withStudioFinanceTransaction(async connection=>{const [rows]:any=await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? AND e.organization_id=? AND e.business_unit_id=? FOR UPDATE`,[expenseId,ctx.organizationId,ctx.id]);if(!rows.length)throw new AppError(404,'EXPENSE_NOT_FOUND','Pengeluaran tidak ditemukan.');const expense=rows[0];if(expense.status_code!=='paid'||!expense.financial_transaction_id)throw new AppError(409,'EXPENSE_NOT_PAID','Hanya pengeluaran yang sudah dibayar dapat dibalik.');const reversal=await this.posting.postExpenseReversal(connection,ctx,{amount:asNumber(expense.amount)+asNumber(expense.tax_amount),reversalDate:toSqlDateTime(data.reversal_date),treasuryAccountId:Number(expense.treasury_account_id),categoryCode:expense.category_code,description:`Pembalikan ${expense.expense_code}: ${data.reason}`,partyId:expense.party_id || null,sourceId:expenseId,sourceCode:expense.expense_code},{auditModule:STUDIO_FINANCE_MODULE,auditAction:'studio.finance.expense_reversal',entityType:'expense',entityId:expenseId,entityCode:expense.expense_code,sourceType:'studio_expense_reversal'});await connection.execute(`UPDATE expenses SET status_code='void' WHERE id=?`,[expenseId]);await this.syncProjectCost(connection,ctx,expense.studio_project_id ? Number(expense.studio_project_id) : null);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.expense_void','expense',expenseId,expense.expense_code,`Membalik pengeluaran ${expense.expense_code}.`,{status_code:'paid'},{status_code:'void',reversal_transaction_id:reversal.transactionId,reason:data.reason});return{id:expenseId,status_code:'void',reversal_transaction_id:reversal.transactionId};});}

  async payExternalAssignment(ctx:StudioFinanceContext,assignmentId:number,data:any){return withStudioFinanceTransaction(async connection=>{const [assignments]:any=await connection.execute(`SELECT pea.*,sp.business_unit_id,sp.project_code FROM project_external_assignments pea JOIN studio_projects sp ON sp.id=pea.project_id WHERE pea.id=? AND sp.business_unit_id=? AND sp.deleted_at IS NULL FOR UPDATE`,[assignmentId,ctx.id]);if(!assignments.length)throw new AppError(404,'EXTERNAL_ASSIGNMENT_NOT_FOUND','Penugasan eksternal Studio tidak ditemukan.');const assignment=assignments[0],sourceCode=`ASSIGN-${assignmentId}`;const [paidRows]:any=await connection.execute(`SELECT COALESCE(SUM(amount),0) paid_amount FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type='studio_external_payout' AND source_code=? AND status_code='posted' FOR UPDATE`,[ctx.organizationId,ctx.id,sourceCode]);if(data.amount>asNumber(assignment.agreed_fee)-asNumber(paidRows[0].paid_amount)+.01)throw new AppError(409,'EXTERNAL_FEE_OVERPAYMENT','Pembayaran melebihi fee penugasan yang disepakati.');const expense=await this.insertExpense(connection,ctx,{expense_date:data.payment_date,description:data.description || `Payout ${assignment.assignment_role} ${assignment.project_code}`,amount:data.amount,tax_amount:0,category_code:data.category_code,party_id:Number(assignment.party_id),studio_project_id:Number(assignment.project_id),status_code:'approved'},'approved');const [expenses]:any=await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? FOR UPDATE`,[expense.id]);const posted=await this.payExpenseRow(connection,ctx,expenses[0],{treasury_account_id:data.treasury_account_id,payment_date:data.payment_date,direct_payment_confirmed:true},{type:'studio_external_payout',code:sourceCode,action:'studio.finance.external_payout'});const paid=asNumber(paidRows[0].paid_amount)+asNumber(data.amount),remaining=Math.max(0,asNumber(assignment.agreed_fee)-paid),status=remaining<=.01?'paid':paid>.01?'partial':'unpaid';await connection.execute('UPDATE project_external_assignments SET payment_status_code=? WHERE id=?',[status,assignmentId]);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.external_assignment_sync','project_external_assignment',assignmentId,sourceCode,'Menyelaraskan status pembayaran penugasan eksternal.',undefined,{paid,remaining,status});return {expense_id:expense.id,transaction_id:posted.transactionId,payment_status_code:status,remaining};});}

  async payMaintenance(ctx:StudioFinanceContext,maintenanceId:number,data:any){return withStudioFinanceTransaction(async connection=>{const [rows]:any=await connection.execute(`SELECT mr.*,a.name asset_name FROM asset_maintenance_records mr JOIN assets a ON a.id=mr.asset_id WHERE mr.id=? AND a.business_unit_id=? AND a.deleted_at IS NULL FOR UPDATE`,[maintenanceId,ctx.id]);if(!rows.length)throw new AppError(404,'MAINTENANCE_NOT_FOUND','Catatan pemeliharaan aset Studio tidak ditemukan.');const m=rows[0];if(asNumber(m.cost)<=0)throw new AppError(409,'MAINTENANCE_HAS_NO_COST','Catatan pemeliharaan ini tidak memiliki biaya untuk diposting.');const existing:any=await connection.execute(`SELECT id FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type='studio_maintenance' AND source_id=? AND status_code='posted' LIMIT 1 FOR UPDATE`,[ctx.organizationId,ctx.id,maintenanceId]);if(existing[0].length)throw new AppError(409,'MAINTENANCE_ALREADY_POSTED','Biaya pemeliharaan sudah pernah diposting.');const expense=await this.insertExpense(connection,ctx,{expense_date:data.payment_date,description:`Pemeliharaan ${m.asset_name}: ${m.maintenance_type}`,amount:asNumber(m.cost),tax_amount:0,category_code:data.category_code,party_id:m.performed_by_party_id || null,studio_project_id:data.studio_project_id || null,status_code:'approved'},'approved');const [expenses]:any=await connection.execute(`SELECT e.*,c.code category_code FROM expenses e JOIN transaction_categories c ON c.id=e.category_id WHERE e.id=? FOR UPDATE`,[expense.id]);const posted=await this.payExpenseRow(connection,ctx,expenses[0],{treasury_account_id:data.treasury_account_id,payment_date:data.payment_date,direct_payment_confirmed:true},{type:'studio_maintenance',code:`MAINT-${maintenanceId}`,action:'studio.finance.maintenance_pay'});return{expense_id:expense.id,transaction_id:posted.transactionId};});}

  async payables(ctx:StudioFinanceContext){const [rows]:any=await pool.execute(`SELECT pea.id,pea.assignment_role,pea.agreed_fee,pea.payment_status_code,pea.start_date,pea.end_date,p.display_name party_name,p.code party_code,sp.id project_id,sp.project_code,sp.project_name,COALESCE(payout.paid_amount,0) paid_amount FROM project_external_assignments pea JOIN studio_projects sp ON sp.id=pea.project_id JOIN parties p ON p.id=pea.party_id LEFT JOIN (SELECT source_code,SUM(amount) paid_amount FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type='studio_external_payout' AND status_code='posted' GROUP BY source_code) payout ON payout.source_code=CONCAT('ASSIGN-',pea.id) WHERE sp.business_unit_id=? AND sp.deleted_at IS NULL ORDER BY sp.project_name,p.display_name`,[ctx.organizationId,ctx.id,ctx.id]);return rows.map((row:any)=>({...row,agreed_fee:asNumber(row.agreed_fee),paid_amount:asNumber(row.paid_amount),remaining:Math.max(0,asNumber(row.agreed_fee)-asNumber(row.paid_amount))}));}

  async profitability(ctx:StudioFinanceContext){const [rows]:any=await pool.execute(`SELECT sp.id,sp.project_code,sp.project_name,sp.status_code,sp.contract_value,sp.actual_cost,sp.paid_amount,sp.payment_status_code,COALESCE(invoice.invoiced_amount,0) invoiced_amount,COALESCE(invoice.outstanding_amount,0) outstanding_amount,COALESCE(fees.agreed_external_fees,0) agreed_external_fees FROM studio_projects sp LEFT JOIN (SELECT source_id,SUM(total_amount) invoiced_amount,SUM(balance_due) outstanding_amount FROM invoices WHERE organization_id=? AND business_unit_id=? AND source_type='studio_project' AND status_code NOT IN ('void','refunded') GROUP BY source_id) invoice ON invoice.source_id=sp.id LEFT JOIN (SELECT project_id,SUM(agreed_fee) agreed_external_fees FROM project_external_assignments GROUP BY project_id) fees ON fees.project_id=sp.id WHERE sp.business_unit_id=? AND sp.deleted_at IS NULL ORDER BY sp.updated_at DESC`,[ctx.organizationId,ctx.id,ctx.id]);return rows.map((row:any)=>{const contract=asNumber(row.contract_value),collected=asNumber(row.paid_amount),cost=asNumber(row.actual_cost);return{...row,contract_value:contract,actual_cost:cost,collected,invoiced_amount:asNumber(row.invoiced_amount),outstanding_amount:asNumber(row.outstanding_amount),agreed_external_fees:asNumber(row.agreed_external_fees),cash_margin:collected-cost,recorded_contract_margin:contract-cost,margin_percent:contract?((contract-cost)/contract)*100:0};});}

  async cashFlow(ctx:StudioFinanceContext,from?:string,to?:string){const params:any[]=[ctx.organizationId,ctx.id];let where=` WHERE organization_id=? AND business_unit_id=? AND status_code='posted' AND transaction_type IN ('income','expense')`;if(from){where+=' AND DATE(transaction_date)>=?';params.push(from);}if(to){where+=' AND DATE(transaction_date)<=?';params.push(to);}const [rows]:any=await pool.execute(`SELECT DATE(transaction_date) day,COALESCE(SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END),0) cash_in,COALESCE(SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END),0) cash_out FROM financial_transactions${where} GROUP BY DATE(transaction_date) ORDER BY day`,params);return rows.map((row:any)=>({...row,cash_in:asNumber(row.cash_in),cash_out:asNumber(row.cash_out),net_cash_flow:asNumber(row.cash_in)-asNumber(row.cash_out)}));}

  async budgets(ctx:StudioFinanceContext){const [rows]:any=await pool.execute(`SELECT b.*,COALESCE(items.allocated_amount,0) allocated_amount,COALESCE(items.actual_amount,0) actual_amount FROM budgets b LEFT JOIN (SELECT bi.budget_id,SUM(bi.allocated_amount) allocated_amount,SUM(COALESCE(actuals.actual_amount,0)) actual_amount FROM budget_items bi JOIN budgets scope ON scope.id=bi.budget_id LEFT JOIN (SELECT e.category_id,DATE(e.expense_date) expense_day,SUM(e.amount+e.tax_amount) actual_amount FROM expenses e WHERE e.organization_id=? AND e.business_unit_id=? AND e.status_code='paid' GROUP BY e.category_id,DATE(e.expense_date)) actuals ON actuals.category_id=bi.category_id AND actuals.expense_day BETWEEN scope.period_start AND scope.period_end GROUP BY bi.budget_id) items ON items.budget_id=b.id WHERE b.organization_id=? AND b.business_unit_id=? ORDER BY b.period_start DESC,b.id DESC`,[ctx.organizationId,ctx.id,ctx.organizationId,ctx.id]);return rows.map((row:any)=>({...row,total_amount:asNumber(row.total_amount),allocated_amount:asNumber(row.allocated_amount),actual_amount:asNumber(row.actual_amount),utilization_percent:asNumber(row.allocated_amount)?asNumber(row.actual_amount)/asNumber(row.allocated_amount)*100:0}));}

  async createBudget(ctx:StudioFinanceContext,data:any){if(data.period_end<data.period_start)throw new AppError(400,'INVALID_BUDGET_PERIOD','Akhir periode anggaran tidak boleh mendahului awalnya.');return withStudioFinanceTransaction(async connection=>{const total=data.items.reduce((sum:number,item:any)=>sum+asNumber(item.allocated_amount),0);const [result]:any=await connection.execute(`INSERT INTO budgets (organization_id,business_unit_id,budget_code,name,period_start,period_end,status_code,total_amount,created_by) VALUES (?,?,?, ?,?,?, 'draft',?,?)`,[ctx.organizationId,ctx.id,`TMP-${Date.now()}`,data.name,data.period_start,data.period_end,total,ctx.userId]);const id=Number(result.insertId),budgetCode=financeCode('BDG',id);await connection.execute('UPDATE budgets SET budget_code=? WHERE id=?',[budgetCode,id]);for(const item of data.items)await connection.execute('INSERT INTO budget_items (budget_id,category_id,name,allocated_amount,notes) VALUES (?,?,?,?,?)',[id,item.category_id || null,item.name,item.allocated_amount,item.notes || null]);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.budget_create','budget',id,budgetCode,`Membuat anggaran ${budgetCode}.`,undefined,{total,item_count:data.items.length});return{id,budget_code:budgetCode};});}

  async approveBudget(ctx:StudioFinanceContext,budgetId:number){return withStudioFinanceTransaction(async connection=>{const [rows]:any=await connection.execute('SELECT budget_code,status_code FROM budgets WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE',[budgetId,ctx.organizationId,ctx.id]);if(!rows.length)throw new AppError(404,'BUDGET_NOT_FOUND','Anggaran tidak ditemukan.');if(rows[0].status_code!=='draft')throw new AppError(409,'BUDGET_NOT_DRAFT','Hanya anggaran draf yang dapat disetujui.');await connection.execute(`UPDATE budgets SET status_code='approved',approved_by=? WHERE id=?`,[ctx.userId,budgetId]);await writeStudioFinanceAudit(connection,ctx,ctx.userId,'studio.finance.budget_approve','budget',budgetId,rows[0].budget_code,`Menyetujui anggaran ${rows[0].budget_code}.`);return{id:budgetId,status_code:'approved'};});}

  async replaceExpenseReceipt(ctx: StudioFinanceContext, expenseId: number, file: Express.Multer.File) {
    const [available]: any = await pool.execute('SELECT id FROM expenses WHERE id = ? AND organization_id = ? AND business_unit_id = ?', [expenseId, ctx.organizationId, ctx.id]);
    if (!available.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
    const saved = await storageService.saveUploadedFile('expense_receipt', file, { expenseId });
    let previous: string | null = null;
    try {
      await withStudioFinanceTransaction(async connection => {
        const [rows]: any = await connection.execute('SELECT expense_code,receipt_path FROM expenses WHERE id = ? AND organization_id = ? AND business_unit_id = ? FOR UPDATE', [expenseId, ctx.organizationId, ctx.id]);
        if (!rows.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
        previous = rows[0].receipt_path || null;
        await connection.execute('UPDATE expenses SET receipt_path = ? WHERE id = ?', [saved.key, expenseId]);
        await documentRegistryService.updateSourceDocument({
          organizationId: ctx.organizationId, businessUnitId: ctx.id, sourceModuleCode: 'studio_finance', documentType: 'receipt',
          title: `Bukti pengeluaran ${rows[0].expense_code}`, fileName: saved.original_name, storagePath: saved.key, mimeType: saved.mime_type,
          fileSizeBytes: saved.size_bytes, checksumSha256: saved.checksum_sha256, entityType: 'expense', entityId: expenseId,
          entityCode: rows[0].expense_code, uploadedBy: ctx.userId,
        }, connection);
        await writeStudioFinanceAudit(connection, ctx, ctx.userId, 'studio.finance.expense_receipt_upload', 'expense', expenseId, rows[0].expense_code, `Mengunggah bukti pengeluaran ${rows[0].expense_code}.`, { receipt_path: previous }, { receipt_path: saved.key });
      });
    } catch (error) { await storageService.delete(saved.key); throw error; }
    await storageService.delete(previous);
    return { id: expenseId, receipt_path: saved.key, file_name: saved.original_name };
  }

  async removeExpenseReceipt(ctx: StudioFinanceContext, expenseId: number) {
    let previous: string | null = null;
    await withStudioFinanceTransaction(async connection => {
      const [rows]: any = await connection.execute('SELECT expense_code,receipt_path FROM expenses WHERE id = ? AND organization_id = ? AND business_unit_id = ? FOR UPDATE', [expenseId, ctx.organizationId, ctx.id]);
      if (!rows.length) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
      previous = rows[0].receipt_path || null;
      await connection.execute('UPDATE expenses SET receipt_path = NULL WHERE id = ?', [expenseId]);
      await documentRegistryService.removeSourceDocument(ctx.organizationId, 'studio_finance', 'expense', expenseId, connection);
      await writeStudioFinanceAudit(connection, ctx, ctx.userId, 'studio.finance.expense_receipt_remove', 'expense', expenseId, rows[0].expense_code, `Menghapus bukti pengeluaran ${rows[0].expense_code}.`, { receipt_path: previous }, { receipt_path: null });
    });
    await storageService.delete(previous);
    return { id: expenseId, receipt_path: null };
  }

  async accounting(ctx:StudioFinanceContext){const [journals,periods]:any=await Promise.all([pool.execute(`SELECT j.id,j.journal_number,j.entry_date,j.description,j.source_type,j.source_id,j.status_code,COALESCE(SUM(l.debit_amount),0) debit_amount,COALESCE(SUM(l.credit_amount),0) credit_amount FROM journal_entries j LEFT JOIN journal_lines l ON l.journal_entry_id=j.id WHERE j.organization_id=? AND j.business_unit_id=? GROUP BY j.id ORDER BY j.entry_date DESC,j.id DESC LIMIT 300`,[ctx.organizationId,ctx.id]),pool.execute(`SELECT id,period_code,start_date,end_date,status_code FROM financial_periods WHERE organization_id=? ORDER BY start_date DESC LIMIT 100`,[ctx.organizationId])]);return{journals:journals[0].map((row:any)=>({...row,debit_amount:asNumber(row.debit_amount),credit_amount:asNumber(row.credit_amount),is_balanced:Math.abs(asNumber(row.debit_amount)-asNumber(row.credit_amount))<=.01})),periods:periods[0]};}
}

export const studioFinanceService = new StudioFinanceService();
