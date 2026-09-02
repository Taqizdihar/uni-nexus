import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';
import { AuditService } from '../audit/audit.service';
import { jakartaBusinessDate } from '../time/jakarta-time';

type Connection = { execute: (...args: any[]) => Promise<any> };

export interface PostingContext { organizationId: number; businessUnitId: number; userId: number; businessUnitCode?: string; }
export interface PostingOptions { categoryCode?: string; auditModule?: string; auditAction?: string; sourceType?: string; sourceId?: number | null; sourceCode?: string | null; description?: string; entityType?: string; entityId?: number; entityCode?: string; enforceSourceIdempotency?: boolean; idempotencyKey?: string | null; }
export interface PaymentInput { invoiceId?: number; supplierInvoiceId?: number; partyId: number; paymentMethodId: number; treasuryAccountId: number; amount: number; paymentDate: string; paymentScheduleId?: number | null; categoryCode?: string; referenceNumber?: string | null; notes?: string | null; }
export interface CashMovementInput { direction: 'in' | 'out'; amount: number; transactionDate: string; treasuryAccountId: number; categoryCode: string; description: string; partyId?: number | null; sourceType?: string | null; sourceId?: number | null; sourceCode?: string | null; idempotencyKey?: string | null; auditAction?: string; auditEntityType?: string; auditEntityId?: number; auditEntityCode?: string; enforceSourceIdempotency?: boolean; }

const money = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const code = (prefix: string, id: number) => `${prefix}-${String(id).padStart(6, '0')}`;

/** Canonical, transaction-bound monetary posting engine shared by Craft and Studio. */
export class FinancePostingService {
  private async category(connection: Connection, context: PostingContext, categoryCode: string, type: 'income' | 'expense') {
    const [rows]: any = await connection.execute(
      `SELECT id, default_coa_account_id FROM transaction_categories
       WHERE organization_id=? AND business_unit_id=? AND code=? AND transaction_type=? AND is_active=1 LIMIT 1`,
      [context.organizationId, context.businessUnitId, categoryCode, type],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_TRANSACTION_CATEGORY', 'Kategori transaksi tidak valid untuk unit bisnis ini.');
    return rows[0];
  }

  private async treasury(connection: Connection, context: PostingContext, treasuryAccountId: number) {
    const [rows]: any = await connection.execute(
      `SELECT id, coa_account_id, current_balance, currency_code FROM treasury_accounts
       WHERE id=? AND organization_id=? AND business_unit_id=? AND is_active=1 FOR UPDATE`,
      [treasuryAccountId, context.organizationId, context.businessUnitId],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_TREASURY_ACCOUNT', 'Akun kas tidak valid atau tidak aktif.');
    return rows[0];
  }

  /** Financial periods are global. Missing configuration does not block normal operations. */
  private async financialPeriod(connection: Connection, context: PostingContext, date: string) {
    const [rows]: any = await connection.execute(
      `SELECT id,status_code FROM financial_periods WHERE organization_id=? AND ? BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1 FOR UPDATE`,
      [context.organizationId, jakartaBusinessDate(date)],
    );
    if (!rows.length) return null;
    if (rows[0].status_code === 'closed') throw new AppError(409, 'FINANCIAL_PERIOD_CLOSED', 'Tanggal transaksi berada pada periode keuangan yang telah ditutup.');
    if (rows[0].status_code === 'locked') throw new AppError(409, 'FINANCIAL_PERIOD_LOCKED', 'Tanggal transaksi berada pada periode keuangan yang dikunci.');
    return Number(rows[0].id);
  }

  private async journal(connection: Connection, context: PostingContext, input: { transactionId?: number | null; date: string; description: string; treasuryCoa: number | null; counterpartyCoa: number | null; direction: 'in' | 'out'; amount: number; partyId: number | null; sourceType?: string; sourceId?: number | null; periodId?: number | null; }) {
    if (!input.treasuryCoa || !input.counterpartyCoa) return null;
    const [entry]: any = await connection.execute(
      `INSERT INTO journal_entries (organization_id,business_unit_id,financial_period_id,journal_number,entry_date,description,source_transaction_id,source_type,source_id,status_code,created_by,posted_by,posted_at)
       VALUES (?,?,?, ?,?,?,?,?,?,'posted',?,?,UTC_TIMESTAMP())`,
      [context.organizationId, context.businessUnitId, input.periodId || null, `TMP-${randomUUID()}`, input.date, input.description, input.transactionId || null, input.sourceType || 'financial_transaction', input.sourceId || input.transactionId || null, context.userId, context.userId],
    );
    const journalId = Number(entry.insertId);
    await connection.execute('UPDATE journal_entries SET journal_number=? WHERE id=?', [code('JRN', journalId), journalId]);
    const debitTreasury = input.direction === 'in' ? input.amount : 0;
    const creditTreasury = input.direction === 'out' ? input.amount : 0;
    const debitCounterparty = input.direction === 'out' ? input.amount : 0;
    const creditCounterparty = input.direction === 'in' ? input.amount : 0;
    await connection.execute(
      `INSERT INTO journal_lines (journal_entry_id,coa_account_id,party_id,description,debit_amount,credit_amount,sort_order) VALUES
       (?,?,?,?,?,?,0),(?,?,?,?,?,?,1)`,
      [journalId,input.treasuryCoa,input.partyId,input.description,debitTreasury,creditTreasury,journalId,input.counterpartyCoa,input.partyId,input.description,debitCounterparty,creditCounterparty],
    );
    return journalId;
  }

  private async audit(connection: Connection, context: PostingContext, input: { module?: string; action: string; entityType: string; entityId: number; entityCode: string; description: string; }) {
    await AuditService.write({ organizationId: context.organizationId, businessUnitId: context.businessUnitId, userId: context.userId, moduleCode: input.module || 'craft_finance', actionCode: input.action, entityType: input.entityType, entityId: input.entityId, entityCode: input.entityCode, description: input.description }, connection);
  }

  /** The only general path for an income or expense to mutate cash. */
  async postCashMovement(connection: Connection, context: PostingContext, input: CashMovementInput, options: PostingOptions = {}) {
    const amount = money(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'Nilai transaksi harus lebih dari nol.');
    const sourceType = input.sourceType ?? options.sourceType ?? null;
    const sourceId = input.sourceId ?? options.sourceId ?? null;
    const sourceCode = input.sourceCode ?? options.sourceCode ?? null;
    const idempotencyKey = input.idempotencyKey ?? options.idempotencyKey ?? null;
    if (idempotencyKey) {
      const [existingRows]: any = await connection.execute(
        `SELECT id,transaction_code,business_unit_id,transaction_type,treasury_account_id,amount,currency_code,category_id
         FROM financial_transactions WHERE organization_id=? AND idempotency_key=? LIMIT 1 FOR UPDATE`,
        [context.organizationId, idempotencyKey],
      );
      if (existingRows.length) {
        const existing = existingRows[0];
        const requestedType = input.direction === 'in' ? 'income' : 'expense';
        if (Number(existing.business_unit_id) !== context.businessUnitId || existing.transaction_type !== requestedType || Number(existing.treasury_account_id) !== Number(input.treasuryAccountId) || money(existing.amount) !== amount) {
          throw new AppError(409, 'IDEMPOTENCY_KEY_CONFLICT', 'Kunci idempotensi sudah digunakan untuk transaksi yang berbeda.');
        }
        return { transactionId: Number(existing.id), transactionCode: String(existing.transaction_code), amount: money(existing.amount), treasuryAccountId: Number(existing.treasury_account_id), idempotent: true };
      }
    }
    const mustBeUnique = input.enforceSourceIdempotency ?? options.enforceSourceIdempotency ?? true;
    if (mustBeUnique && sourceType && sourceId) {
      const [existing]: any = await connection.execute(
        `SELECT id FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type=? AND source_id=? AND status_code='posted' LIMIT 1 FOR UPDATE`,
        [context.organizationId, context.businessUnitId, sourceType, sourceId],
      );
      if (existing.length) throw new AppError(409, 'SOURCE_ALREADY_POSTED', 'Sumber transaksi ini sudah pernah diposting.');
    }
    const type = input.direction === 'in' ? 'income' : 'expense';
    const periodId = await this.financialPeriod(connection, context, input.transactionDate);
    const category = await this.category(connection, context, input.categoryCode || options.categoryCode || '', type);
    const treasury = await this.treasury(connection, context, input.treasuryAccountId);
    if (input.direction === 'out' && amount > money(treasury.current_balance) + 0.01) throw new AppError(409, 'INSUFFICIENT_TREASURY_BALANCE', 'Saldo akun kas tidak mencukupi.');
    const [result]: any = await connection.execute(
      `INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,idempotency_key,status_code,created_by,posted_by,posted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, UTC_TIMESTAMP())`,
      [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.transactionDate,type,category.id,treasury.id,input.partyId || null,amount,treasury.currency_code,input.description,sourceType,sourceId,sourceCode,idempotencyKey,context.userId,context.userId],
    );
    const transactionId = Number(result.insertId), transactionCode = code('FTX', transactionId);
    await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?', [transactionCode, transactionId]);
    await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?', [input.direction === 'in' ? amount : -amount, treasury.id]);
    await this.journal(connection, context, { transactionId,date:input.transactionDate,description:input.description,treasuryCoa:treasury.coa_account_id,counterpartyCoa:category.default_coa_account_id,direction:input.direction,amount,partyId:input.partyId || null,sourceType:sourceType || 'financial_transaction',sourceId:sourceId || transactionId,periodId });
    await this.audit(connection, context, { module:options.auditModule || 'craft_finance', action:input.auditAction || options.auditAction || 'finance.cash_post', entityType:input.auditEntityType || options.entityType || 'financial_transaction', entityId:input.auditEntityId || options.entityId || transactionId, entityCode:input.auditEntityCode || options.entityCode || transactionCode, description:input.description });
    return { transactionId, transactionCode, amount, treasuryAccountId: Number(treasury.id), idempotent: false };
  }

  /** Offsets a paid expense without deleting either the original expense or its cash posting. */
  async postExpenseReversal(connection: Connection, context: PostingContext, input: { amount: number; reversalDate: string; treasuryAccountId: number; categoryCode: string; description: string; partyId?: number | null; sourceId: number; sourceCode: string; }, options: PostingOptions = {}) {
    const amount = money(input.amount);
    if (amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'Nilai pembalikan harus lebih dari nol.');
    const sourceType = options.sourceType || 'expense_reversal';
    const [existing]: any = await connection.execute(`SELECT id FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type=? AND source_id=? AND status_code='posted' LIMIT 1 FOR UPDATE`, [context.organizationId, context.businessUnitId, sourceType, input.sourceId]);
    if (existing.length) throw new AppError(409, 'EXPENSE_ALREADY_REVERSED', 'Pengeluaran ini sudah dibalik.');
    const periodId = await this.financialPeriod(connection, context, input.reversalDate);
    const category = await this.category(connection, context, input.categoryCode, 'expense');
    const treasury = await this.treasury(connection, context, input.treasuryAccountId);
    const [result]: any = await connection.execute(
      `INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,status_code,created_by,posted_by,posted_at)
       VALUES (?, ?, ?, ?, 'adjustment', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, UTC_TIMESTAMP())`,
      [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.reversalDate,category.id,treasury.id,input.partyId || null,amount,treasury.currency_code,input.description,sourceType,input.sourceId,input.sourceCode,context.userId,context.userId],
    );
    const transactionId=Number(result.insertId),transactionCode=code('FTX',transactionId);
    await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?',[transactionCode,transactionId]);
    await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?',[amount,treasury.id]);
    await this.journal(connection,context,{transactionId,date:input.reversalDate,description:input.description,treasuryCoa:treasury.coa_account_id,counterpartyCoa:category.default_coa_account_id,direction:'in',amount,partyId:input.partyId || null,sourceType,sourceId:input.sourceId,periodId});
    await this.audit(connection,context,{module:options.auditModule || 'craft_finance',action:options.auditAction || 'finance.expense_reversal',entityType:options.entityType || 'financial_transaction',entityId:options.entityId || transactionId,entityCode:options.entityCode || transactionCode,description:input.description});
    return {transactionId,transactionCode};
  }

  /** Creates an immutable compensating entry for a posted cash transaction. */
  async postCashMovementReversal(connection: Connection, context: PostingContext, input: { originalTransactionId: number; reversalDate: string; description: string; idempotencyKey?: string | null; }, options: PostingOptions = {}) {
    const key = input.idempotencyKey ?? options.idempotencyKey ?? null;
    if (key) {
      const [previous]: any = await connection.execute(
        `SELECT id,transaction_code,source_id,description,DATE_FORMAT(CONVERT_TZ(transaction_date,'+00:00','+07:00'),'%Y-%m-%d') transaction_business_date FROM financial_transactions WHERE organization_id=? AND idempotency_key=? LIMIT 1 FOR UPDATE`,
        [context.organizationId, key],
      );
      if (previous.length) {
        if (Number(previous[0].source_id) !== Number(input.originalTransactionId) || previous[0].transaction_business_date !== jakartaBusinessDate(input.reversalDate) || String(previous[0].description || '').trim() !== String(input.description).trim()) throw new AppError(409, 'IDEMPOTENCY_KEY_CONFLICT', 'Kunci idempotensi sudah digunakan untuk pembalikan berbeda.');
        return { transactionId: Number(previous[0].id), transactionCode: String(previous[0].transaction_code), idempotent: true };
      }
    }
    const [originalRows]: any = await connection.execute(
      `SELECT ft.*, ta.coa_account_id AS treasury_coa, tc.default_coa_account_id AS category_coa
       FROM financial_transactions ft
       JOIN treasury_accounts ta ON ta.id=ft.treasury_account_id
       LEFT JOIN transaction_categories tc ON tc.id=ft.category_id
       WHERE ft.id=? AND ft.organization_id=? AND ft.business_unit_id=? AND ft.status_code='posted' FOR UPDATE`,
      [input.originalTransactionId, context.organizationId, context.businessUnitId],
    );
    if (!originalRows.length) throw new AppError(404, 'FINANCIAL_TRANSACTION_NOT_FOUND', 'Transaksi keuangan tidak ditemukan.');
    const original = originalRows[0];
    if (original.transaction_type !== 'income' && original.transaction_type !== 'expense') throw new AppError(409, 'TRANSACTION_NOT_REVERSIBLE', 'Hanya pendapatan atau pengeluaran kas yang dapat dibalikkan.');
    const [alreadyReversed]: any = await connection.execute(
      `SELECT id FROM financial_transactions WHERE organization_id=? AND business_unit_id=? AND source_type='finance_cash_reversal' AND source_id=? AND status_code='posted' LIMIT 1 FOR UPDATE`,
      [context.organizationId, context.businessUnitId, input.originalTransactionId],
    );
    if (alreadyReversed.length) throw new AppError(409, 'TRANSACTION_ALREADY_REVERSED', 'Transaksi ini sudah memiliki pembalikan.');
    const periodId = await this.financialPeriod(connection, context, input.reversalDate);
    const reversalDirection: 'in' | 'out' = original.transaction_type === 'expense' ? 'in' : 'out';
    const amount = money(original.amount);
    const [treasuryRows]: any = await connection.execute(
      `SELECT id,current_balance,coa_account_id,currency_code FROM treasury_accounts WHERE id=? AND organization_id=? AND business_unit_id=? AND is_active=1 FOR UPDATE`,
      [original.treasury_account_id, context.organizationId, context.businessUnitId],
    );
    if (!treasuryRows.length) throw new AppError(409, 'INVALID_TREASURY_ACCOUNT', 'Akun kas sumber pembalikan tidak lagi aktif.');
    const treasury = treasuryRows[0];
    if (reversalDirection === 'out' && amount > money(treasury.current_balance) + .01) throw new AppError(409, 'INSUFFICIENT_TREASURY_BALANCE', 'Saldo akun kas tidak mencukupi untuk pembalikan.');
    const [result]: any = await connection.execute(
      `INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,idempotency_key,status_code,created_by,posted_by,posted_at)
       VALUES (?,?,?,?,'adjustment',?,?,?,?,?,?, 'finance_cash_reversal',?,?,?,'posted',?,?,UTC_TIMESTAMP())`,
      [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.reversalDate,original.category_id,treasury.id,original.party_id,amount,treasury.currency_code,input.description,input.originalTransactionId,original.transaction_code,key,context.userId,context.userId],
    );
    const transactionId = Number(result.insertId); const transactionCode = code('FTX', transactionId);
    await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?', [transactionCode, transactionId]);
    await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?', [reversalDirection === 'in' ? amount : -amount, treasury.id]);
    await this.journal(connection, context, { transactionId, date: input.reversalDate, description: input.description, treasuryCoa: treasury.coa_account_id, counterpartyCoa: original.category_coa, direction: reversalDirection, amount, partyId: original.party_id || null, sourceType: 'finance_cash_reversal', sourceId: input.originalTransactionId, periodId });
    await this.audit(connection, context, { module: options.auditModule || 'finance', action: options.auditAction || 'finance.shared_transaction_reverse', entityType: 'financial_transaction', entityId: transactionId, entityCode: transactionCode, description: input.description });
    return { transactionId, transactionCode, idempotent: false };
  }

  /** Creates a non-revenue opening adjustment with a cash/equity journal. */
  async postTreasuryOpening(connection: Connection, context: PostingContext, input: { treasuryAccountId: number; amount: number; date: string; description?: string; }, options: PostingOptions = {}) {
    const amount = money(input.amount);
    if (amount <= 0) return null;
    const periodId = await this.financialPeriod(connection, context, input.date);
    const [treasuries]: any = await connection.execute(`SELECT id,coa_account_id,currency_code FROM treasury_accounts WHERE id=? AND organization_id=? AND business_unit_id=? FOR UPDATE`, [input.treasuryAccountId,context.organizationId,context.businessUnitId]);
    if (!treasuries.length) throw new AppError(400,'INVALID_TREASURY_ACCOUNT','Akun kas tidak valid.');
    const treasury=treasuries[0];
    const [equity]: any = await connection.execute(`SELECT id FROM chart_of_accounts WHERE organization_id=? AND account_code='3000' AND is_active=1 ORDER BY business_unit_id IS NULL DESC LIMIT 1`, [context.organizationId]);
    const [result]: any = await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,treasury_account_id,amount,currency_code,description,source_type,source_id,status_code,created_by,posted_by,posted_at) VALUES (?,?,?,?,'adjustment',?,?,?,?, 'treasury_opening',?,'posted',?,?,UTC_TIMESTAMP())`, [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.date,treasury.id,amount,treasury.currency_code,input.description || 'Saldo awal akun kas',treasury.id,context.userId,context.userId]);
    const transactionId=Number(result.insertId), transactionCode=code('FTX',transactionId);
    await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?',[transactionCode,transactionId]);
    await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?',[amount,treasury.id]);
    await this.journal(connection,context,{transactionId,date:input.date,description:input.description || 'Saldo awal akun kas',treasuryCoa:treasury.coa_account_id,counterpartyCoa:equity[0]?.id || null,direction:'in',amount,partyId:null,sourceType:'treasury_opening',sourceId:treasury.id,periodId});
    await this.audit(connection,context,{module:options.auditModule || 'craft_finance',action:options.auditAction || 'finance.treasury_opening',entityType:'treasury_account',entityId:Number(treasury.id),entityCode:options.entityCode || code('TRS',Number(treasury.id)),description:input.description || 'Mencatat saldo awal akun kas sebagai penyesuaian.'});
    return { transactionId, transactionCode };
  }

  async postCustomerPayment(connection: Connection, context: PostingContext, input: PaymentInput, orderId?: number, options: PostingOptions = {}) {
    if (!input.invoiceId) throw new AppError(400,'INVOICE_REQUIRED','Invoice wajib dipilih.');
    const amount=money(input.amount); if(amount<=0)throw new AppError(400,'INVALID_AMOUNT','Jumlah pembayaran harus lebih dari nol.');
    const [invoices]: any = await connection.execute(`SELECT i.*,o.id AS order_id FROM invoices i LEFT JOIN craft_orders o ON i.source_type='craft_order' AND i.source_id=o.id WHERE i.id=? AND i.organization_id=? AND i.business_unit_id=? AND i.status_code NOT IN ('void','refunded') FOR UPDATE`,[input.invoiceId,context.organizationId,context.businessUnitId]);
    if(!invoices.length)throw new AppError(404,'INVOICE_NOT_FOUND','Invoice tidak ditemukan.'); const invoice=invoices[0];
    if(amount>money(invoice.balance_due)+.01)throw new AppError(409,'PAYMENT_EXCEEDS_BALANCE','Jumlah pembayaran melebihi sisa tagihan.');
    const periodId=await this.financialPeriod(connection,context,input.paymentDate); const treasury=await this.treasury(connection,context,input.treasuryAccountId); const category=await this.category(connection,context,input.categoryCode || options.categoryCode || 'CRAFT_SALES','income');
    const [methods]:any=await connection.execute('SELECT id FROM payment_methods WHERE id=? AND is_active=1',[input.paymentMethodId]);if(!methods.length)throw new AppError(400,'INVALID_PAYMENT_METHOD','Metode pembayaran tidak valid.');
    const [payment]:any=await connection.execute(`INSERT INTO payments (organization_id,business_unit_id,payment_code,invoice_id,payment_schedule_id,party_id,payment_method_id,treasury_account_id,payment_direction,payment_date,amount,currency_code,reference_number,status_code,notes,received_by) VALUES (?,?,?,?,?,?,?,?, 'in',?,?,?,?,'confirmed',?,?)`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,invoice.id,input.paymentScheduleId || null,input.partyId,input.paymentMethodId,treasury.id,input.paymentDate,amount,treasury.currency_code,input.referenceNumber || null,input.notes || null,context.userId]);
    const paymentId=Number(payment.insertId),paymentCode=code('PAY',paymentId);await connection.execute('UPDATE payments SET payment_code=? WHERE id=?',[paymentCode,paymentId]);
    const sourceType=options.sourceType || 'customer_payment'; const [transaction]:any=await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,status_code,created_by,posted_by,posted_at) VALUES (?,?,?,?,'income',?,?,?,?,?,?,?,?,?,'posted',?,?,UTC_TIMESTAMP())`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.paymentDate,category.id,treasury.id,input.partyId,amount,treasury.currency_code,options.description || `Pembayaran pelanggan ${paymentCode}`,sourceType,options.sourceId || paymentId,options.sourceCode || paymentCode,context.userId,context.userId]);
    const transactionId=Number(transaction.insertId),transactionCode=code('FTX',transactionId);await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?',[transactionCode,transactionId]);await connection.execute('UPDATE payments SET financial_transaction_id=? WHERE id=?',[transactionId,paymentId]);await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?',[amount,treasury.id]);
    const paid=money(invoice.paid_amount)+amount,balance=Math.max(0,money(invoice.balance_due)-amount),status=balance<=.01?'paid':'partial';await connection.execute(`UPDATE invoices SET paid_amount=?,balance_due=?,status_code=?,paid_at=IF(?='paid',UTC_TIMESTAMP(),paid_at) WHERE id=?`,[paid,balance,status,status,invoice.id]);
    if(orderId || invoice.order_id)await connection.execute('UPDATE craft_orders SET paid_amount=?,payment_status_code=? WHERE id=?',[paid,status,orderId || invoice.order_id]);
    await this.journal(connection,context,{transactionId,date:input.paymentDate,description:options.description || `Pembayaran pelanggan ${paymentCode}`,treasuryCoa:treasury.coa_account_id,counterpartyCoa:category.default_coa_account_id,direction:'in',amount,partyId:input.partyId,sourceType,sourceId:options.sourceId || paymentId,periodId});
    await this.audit(connection,context,{module:options.auditModule || 'craft_finance',action:options.auditAction || 'finance.customer_payment',entityType:options.entityType || 'payment',entityId:options.entityId || paymentId,entityCode:options.entityCode || paymentCode,description:options.description || `Mencatat pembayaran pelanggan ${paymentCode}.`});
    return { paymentId,paymentCode,transactionId,transactionCode,amount };
  }

  async postSupplierPayment(connection: Connection, context: PostingContext, input: PaymentInput) {
    if(!input.supplierInvoiceId)throw new AppError(400,'SUPPLIER_INVOICE_REQUIRED','Tagihan pemasok wajib dipilih.'); const amount=money(input.amount);if(amount<=0)throw new AppError(400,'INVALID_AMOUNT','Jumlah pembayaran harus lebih dari nol.');
    const [invoices]:any=await connection.execute(`SELECT * FROM supplier_invoices WHERE id=? AND business_unit_id=? AND status_code!='void' FOR UPDATE`,[input.supplierInvoiceId,context.businessUnitId]);if(!invoices.length)throw new AppError(404,'SUPPLIER_INVOICE_NOT_FOUND','Tagihan pemasok tidak ditemukan.');const invoice=invoices[0];if(amount>money(invoice.balance_due)+.01)throw new AppError(409,'PAYMENT_EXCEEDS_BALANCE','Jumlah pembayaran melebihi sisa tagihan.');
    const treasury=await this.treasury(connection,context,input.treasuryAccountId);if(amount>money(treasury.current_balance)+.01)throw new AppError(409,'INSUFFICIENT_TREASURY_BALANCE','Saldo akun kas tidak mencukupi.');const category=await this.category(connection,context,input.categoryCode || 'CRAFT_MATERIAL','expense');const periodId=await this.financialPeriod(connection,context,input.paymentDate);const [methods]:any=await connection.execute('SELECT id FROM payment_methods WHERE id=? AND is_active=1',[input.paymentMethodId]);if(!methods.length)throw new AppError(400,'INVALID_PAYMENT_METHOD','Metode pembayaran tidak valid.');
    const [payment]:any=await connection.execute(`INSERT INTO payments (organization_id,business_unit_id,payment_code,supplier_invoice_id,party_id,payment_method_id,treasury_account_id,payment_direction,payment_date,amount,currency_code,reference_number,status_code,notes,received_by) VALUES (?,?,?,?,?,?,?,'out',?,?,?,?,'confirmed',?,?)`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,invoice.id,input.partyId,input.paymentMethodId,treasury.id,input.paymentDate,amount,treasury.currency_code,input.referenceNumber || null,input.notes || null,context.userId]);
    const paymentId=Number(payment.insertId),paymentCode=code('PAY',paymentId);await connection.execute('UPDATE payments SET payment_code=? WHERE id=?',[paymentCode,paymentId]);const [transaction]:any=await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,status_code,created_by,posted_by,posted_at) VALUES (?,?,?,?,'expense',?,?,?,?,?,?,'supplier_payment',?,?,'posted',?,?,UTC_TIMESTAMP())`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.paymentDate,category.id,treasury.id,input.partyId,amount,treasury.currency_code,`Pembayaran pemasok ${paymentCode}`,paymentId,paymentCode,context.userId,context.userId]);
    const transactionId=Number(transaction.insertId);await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?',[code('FTX',transactionId),transactionId]);await connection.execute('UPDATE payments SET financial_transaction_id=? WHERE id=?',[transactionId,paymentId]);await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance-? WHERE id=?',[amount,treasury.id]);const paid=money(invoice.paid_amount)+amount,balance=Math.max(0,money(invoice.balance_due)-amount),status=balance<=.01?'paid':'partial';await connection.execute('UPDATE supplier_invoices SET paid_amount=?,balance_due=?,status_code=? WHERE id=?',[paid,balance,status,invoice.id]);await this.journal(connection,context,{transactionId,date:input.paymentDate,description:`Pembayaran pemasok ${paymentCode}`,treasuryCoa:treasury.coa_account_id,counterpartyCoa:category.default_coa_account_id,direction:'out',amount,partyId:input.partyId,sourceType:'supplier_payment',sourceId:paymentId,periodId});await this.audit(connection,context,{action:'finance.supplier_payment',entityType:'payment',entityId:paymentId,entityCode:paymentCode,description:`Membayar tagihan pemasok ${paymentCode}.`});return paymentId;
  }

  async postMarketplaceSettlement(connection: Connection, context: PostingContext, input: { settlementId: number; settlementCode: string; treasuryAccountId: number; amount: number; receivedAt: string; }) {
    return this.postCashMovement(connection, context, { direction:'in',amount:input.amount,transactionDate:input.receivedAt,treasuryAccountId:input.treasuryAccountId,categoryCode:'CRAFT_SALES',description:`Payout marketplace ${input.settlementCode}`,sourceType:'marketplace_settlement',sourceId:input.settlementId,sourceCode:input.settlementCode,auditAction:'finance.marketplace_settlement' });
  }
}
