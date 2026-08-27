import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';

type Connection = { execute: (sql: string, values?: any[]) => Promise<any> };
export interface PostingContext { organizationId: number; businessUnitId: number; userId: number; }
export interface PaymentInput { invoiceId?: number; supplierInvoiceId?: number; partyId: number; paymentMethodId: number; treasuryAccountId: number; amount: number; paymentDate: string; categoryCode?: string; referenceNumber?: string | null; notes?: string | null; }

const money = (value: unknown) => Number(value || 0);
const code = (prefix: string, id: number) => `${prefix}-${String(id).padStart(6, '0')}`;

/** Canonical, transaction-bound posting for all Craft money movement. */
export class FinancePostingService {
  private async category(connection: Connection, context: PostingContext, categoryCode: string, type: 'income' | 'expense') {
    const [rows]: any = await connection.execute(
      `SELECT id, default_coa_account_id FROM transaction_categories
       WHERE organization_id=? AND business_unit_id=? AND code=? AND transaction_type=? AND is_active=1 LIMIT 1`,
      [context.organizationId, context.businessUnitId, categoryCode, type],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_TRANSACTION_CATEGORY', 'Kategori transaksi Craft tidak valid.');
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

  private async journal(connection: Connection, context: PostingContext, transactionId: number, date: string, description: string, treasuryCoa: number | null, categoryCoa: number | null, direction: 'in' | 'out', amount: number, partyId: number) {
    if (!treasuryCoa || !categoryCoa) return;
    const [entry]: any = await connection.execute(
      `INSERT INTO journal_entries (organization_id,business_unit_id,journal_number,entry_date,description,source_transaction_id,source_type,source_id,status_code,created_by,posted_by,posted_at)
       VALUES (?,?,?, ?,?,?,? ,?,'posted',?,?,UTC_TIMESTAMP())`,
      [context.organizationId, context.businessUnitId, `TMP-${randomUUID()}`, date, description, transactionId, 'financial_transaction', transactionId, context.userId, context.userId],
    );
    const id = Number(entry.insertId);
    await connection.execute('UPDATE journal_entries SET journal_number=? WHERE id=?', [code('JRN', id), id]);
    const debitTreasury = direction === 'in' ? amount : 0;
    const creditTreasury = direction === 'out' ? amount : 0;
    const debitCategory = direction === 'out' ? amount : 0;
    const creditCategory = direction === 'in' ? amount : 0;
    await connection.execute(
      `INSERT INTO journal_lines (journal_entry_id,coa_account_id,party_id,description,debit_amount,credit_amount,sort_order) VALUES
       (?,?,?,?,?,?,0),(?,?,?,?,?,?,1)`,
      [id, treasuryCoa, partyId, description, debitTreasury, creditTreasury, id, categoryCoa, partyId, description, debitCategory, creditCategory],
    );
  }

  private async audit(connection: Connection, context: PostingContext, action: string, entityId: number, entityCode: string, description: string) {
    await connection.execute(
      `INSERT INTO audit_logs (organization_id,business_unit_id,user_id,module_code,action_code,entity_type,entity_id,entity_code,description)
       VALUES (?,?,?,'craft_finance',?,'payment',?,?,?)`,
      [context.organizationId, context.businessUnitId, context.userId, action, entityId, entityCode, description],
    );
  }

  async postCustomerPayment(connection: Connection, context: PostingContext, input: PaymentInput, orderId?: number) {
    if (!input.invoiceId) throw new AppError(400, 'INVOICE_REQUIRED', 'Invoice wajib dipilih.');
    const amount = money(input.amount);
    const [invoices]: any = await connection.execute(
      `SELECT i.*, o.id AS order_id FROM invoices i LEFT JOIN craft_orders o ON i.source_type='craft_order' AND i.source_id=o.id
       WHERE i.id=? AND i.organization_id=? AND i.business_unit_id=? AND i.status_code!='void' FOR UPDATE`,
      [input.invoiceId, context.organizationId, context.businessUnitId],
    );
    if (!invoices.length) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice tidak ditemukan.');
    const invoice = invoices[0];
    if (amount > money(invoice.balance_due) + 0.01) throw new AppError(409, 'PAYMENT_EXCEEDS_BALANCE', 'Jumlah pembayaran melebihi sisa tagihan.');
    const treasury = await this.treasury(connection, context, input.treasuryAccountId);
    const category = await this.category(connection, context, 'CRAFT_SALES', 'income');
    const [methods]: any = await connection.execute('SELECT id FROM payment_methods WHERE id=? AND is_active=1', [input.paymentMethodId]);
    if (!methods.length) throw new AppError(400, 'INVALID_PAYMENT_METHOD', 'Metode pembayaran tidak valid.');
    const [payment]: any = await connection.execute(
      `INSERT INTO payments (organization_id,business_unit_id,payment_code,invoice_id,party_id,payment_method_id,treasury_account_id,payment_direction,payment_date,amount,currency_code,reference_number,status_code,notes,received_by)
       VALUES (?,?,?, ?,?,?,?,?, 'in',?,?,?,?,'confirmed',?,?)`,
      [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,invoice.id,input.partyId,input.paymentMethodId,treasury.id,input.paymentDate,amount,treasury.currency_code,input.referenceNumber || null,input.notes || null,context.userId],
    );
    const paymentId = Number(payment.insertId); const paymentCode = code('PAY', paymentId);
    await connection.execute('UPDATE payments SET payment_code=? WHERE id=?', [paymentCode, paymentId]);
    const [transaction]: any = await connection.execute(
      `INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,status_code,created_by,posted_by,posted_at)
       VALUES (?,?,?,?,'income',?,?,?,?,?,?,?,'customer_payment',?,?, 'posted',?,?,UTC_TIMESTAMP())`,
      [context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.paymentDate,category.id,treasury.id,input.partyId,amount,treasury.currency_code,`Pembayaran pelanggan ${paymentCode}`,paymentId,paymentCode,context.userId,context.userId],
    );
    const transactionId = Number(transaction.insertId); await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?', [code('FTX', transactionId),transactionId]);
    await connection.execute('UPDATE payments SET financial_transaction_id=? WHERE id=?', [transactionId,paymentId]);
    await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance+? WHERE id=?', [amount,treasury.id]);
    const paid = money(invoice.paid_amount) + amount; const balance = Math.max(0, money(invoice.balance_due) - amount); const status = balance <= .01 ? 'paid' : 'partial';
    await connection.execute(`UPDATE invoices SET paid_amount=?,balance_due=?,status_code=?,paid_at=IF(?='paid',UTC_TIMESTAMP(),paid_at) WHERE id=?`, [paid,balance,status,status,invoice.id]);
    if (orderId || invoice.order_id) await connection.execute('UPDATE craft_orders SET paid_amount=?,payment_status_code=? WHERE id=?', [paid,status,orderId || invoice.order_id]);
    await this.journal(connection,context,transactionId,input.paymentDate,`Pembayaran pelanggan ${paymentCode}`,treasury.coa_account_id,category.default_coa_account_id,'in',amount,input.partyId);
    await this.audit(connection,context,'finance.customer_payment',paymentId,paymentCode,`Mencatat pembayaran pelanggan ${paymentCode}.`);
    return paymentId;
  }

  async postSupplierPayment(connection: Connection, context: PostingContext, input: PaymentInput) {
    if (!input.supplierInvoiceId) throw new AppError(400, 'SUPPLIER_INVOICE_REQUIRED', 'Tagihan pemasok wajib dipilih.');
    const amount = money(input.amount);
    const [invoices]: any = await connection.execute('SELECT * FROM supplier_invoices WHERE id=? AND business_unit_id=? AND status_code!=\'void\' FOR UPDATE', [input.supplierInvoiceId,context.businessUnitId]);
    if (!invoices.length) throw new AppError(404, 'SUPPLIER_INVOICE_NOT_FOUND', 'Tagihan pemasok tidak ditemukan.');
    const invoice=invoices[0]; if(amount>money(invoice.balance_due)+.01) throw new AppError(409,'PAYMENT_EXCEEDS_BALANCE','Jumlah pembayaran melebihi sisa tagihan.');
    const treasury=await this.treasury(connection,context,input.treasuryAccountId); if(amount>money(treasury.current_balance)+.01) throw new AppError(409,'INSUFFICIENT_TREASURY_BALANCE','Saldo akun kas tidak mencukupi.');
    const category=await this.category(connection,context,input.categoryCode || 'CRAFT_MATERIAL','expense');
    const [methods]:any=await connection.execute('SELECT id FROM payment_methods WHERE id=? AND is_active=1',[input.paymentMethodId]); if(!methods.length) throw new AppError(400,'INVALID_PAYMENT_METHOD','Metode pembayaran tidak valid.');
    const [payment]:any=await connection.execute(`INSERT INTO payments (organization_id,business_unit_id,payment_code,supplier_invoice_id,party_id,payment_method_id,treasury_account_id,payment_direction,payment_date,amount,currency_code,reference_number,status_code,notes,received_by) VALUES (?,?,?, ?,?,?,?,?, 'out',?,?,?,?,'confirmed',?,?)`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,invoice.id,input.partyId,input.paymentMethodId,treasury.id,input.paymentDate,amount,treasury.currency_code,input.referenceNumber || null,input.notes || null,context.userId]);
    const paymentId=Number(payment.insertId), paymentCode=code('PAY',paymentId); await connection.execute('UPDATE payments SET payment_code=? WHERE id=?',[paymentCode,paymentId]);
    const [transaction]:any=await connection.execute(`INSERT INTO financial_transactions (organization_id,business_unit_id,transaction_code,transaction_date,transaction_type,category_id,treasury_account_id,party_id,amount,currency_code,description,source_type,source_id,source_code,status_code,created_by,posted_by,posted_at) VALUES (?,?,?,?,'expense',?,?,?,?,?,?,?,'supplier_payment',?,?,'posted',?,?,UTC_TIMESTAMP())`,[context.organizationId,context.businessUnitId,`TMP-${randomUUID()}`,input.paymentDate,category.id,treasury.id,input.partyId,amount,treasury.currency_code,`Pembayaran pemasok ${paymentCode}`,paymentId,paymentCode,context.userId,context.userId]);
    const transactionId=Number(transaction.insertId); await connection.execute('UPDATE financial_transactions SET transaction_code=? WHERE id=?',[code('FTX',transactionId),transactionId]); await connection.execute('UPDATE payments SET financial_transaction_id=? WHERE id=?',[transactionId,paymentId]); await connection.execute('UPDATE treasury_accounts SET current_balance=current_balance-? WHERE id=?',[amount,treasury.id]);
    const paid=money(invoice.paid_amount)+amount,balance=Math.max(0,money(invoice.balance_due)-amount),status=balance<=.01?'paid':'partial'; await connection.execute('UPDATE supplier_invoices SET paid_amount=?,balance_due=?,status_code=? WHERE id=?',[paid,balance,status,invoice.id]);
    await this.journal(connection,context,transactionId,input.paymentDate,`Pembayaran pemasok ${paymentCode}`,treasury.coa_account_id,category.default_coa_account_id,'out',amount,input.partyId); await this.audit(connection,context,'finance.supplier_payment',paymentId,paymentCode,`Membayar tagihan pemasok ${paymentCode}.`); return paymentId;
  }
}
