import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { studioFinanceService } from '../src/modules/studio-finance/studio-finance.service';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const token = randomBytes(4).toString('hex').toUpperCase();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

async function financeActor() {
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT u.id
     FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
     WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='studio.finance.write' LIMIT 1`,
  );
  assert(rows.length, 'No active user has studio.finance.write.');
  return Number(rows[0].id);
}

async function run() {
  const actor = await financeActor(); const ctx = await studioFinanceService.context(actor);
  let partyId = 0; let projectId = 0; let invoiceId = 0; let scheduleId = 0; let assignmentId = 0; let bankId = 0; let cashId = 0; let expenseId = 0; let payoutExpenseId = 0; let transferId = 0; let budgetId = 0;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [party]: any = await connection.execute(`INSERT INTO parties (organization_id,code,party_kind,display_name,status_code) VALUES (?,?, 'company', ?, 'active')`, [ctx.organizationId, `FIN-SMK-${token}`, `Pihak Finance Smoke ${token}`]);
      partyId = Number(party.insertId);
      await connection.execute(`INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'vendor',1)`, [partyId,ctx.id]);
      const [project]: any = await connection.execute(`INSERT INTO studio_projects (business_unit_id,project_code,client_party_id,project_name,status_code,priority_code,currency_code,contract_value) VALUES (?,?,?,?,'approved','normal','IDR',10000000)`, [ctx.id,`FIN-SMK-${token}`,partyId,`Proyek Finance Smoke ${token}`]);
      projectId = Number(project.insertId);
      const [invoice]: any = await connection.execute(`INSERT INTO invoices (organization_id,business_unit_id,invoice_number,party_id,source_type,source_id,issue_date,due_date,status_code,currency_code,total_amount,paid_amount,balance_due,created_by) VALUES (?,?,?,?,'studio_project',?,?,?,'issued','IDR',5000000,0,5000000,?)`, [ctx.organizationId,ctx.id,`INV-FIN-${token}`,partyId,projectId,today,today,actor]);
      invoiceId = Number(invoice.insertId);
      const [schedule]: any = await connection.execute(`INSERT INTO invoice_payment_schedules (invoice_id,installment_no,label,due_date,amount,paid_amount,status_code) VALUES (?,1,'DP',?,3000000,0,'pending')`, [invoiceId,today]);
      scheduleId = Number(schedule.insertId);
      const [assignment]: any = await connection.execute(`INSERT INTO project_external_assignments (project_id,party_id,assignment_role,agreed_fee,payment_status_code) VALUES (?,?,'Editor',2000000,'unpaid')`, [projectId,partyId]);
      assignmentId = Number(assignment.insertId);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const bank = await studioFinanceService.createTreasury(ctx, { name: `Bank Finance ${token}`, account_type: 'bank', provider_name: 'Smoke', account_number_masked: '****-0001', currency_code: 'IDR', opening_balance: 10000000 });
    bankId = bank.id;
    const cash = await studioFinanceService.createTreasury(ctx, { name: `Kas Finance ${token}`, account_type: 'cash', currency_code: 'IDR', opening_balance: 1000000 });
    cashId = cash.id;
    const beforeTransfer = (await studioFinanceService.treasury(ctx)).filter(account => account.id === bankId || account.id === cashId).reduce((sum, account) => sum + account.current_balance, 0);
    const transfer = await studioFinanceService.transfer(ctx, { from_treasury_account_id: bankId, to_treasury_account_id: cashId, amount: 1000000, transfer_date: today, description: 'Smoke transfer' });
    transferId = transfer.id;
    const afterTransfer = (await studioFinanceService.treasury(ctx)).filter(account => account.id === bankId || account.id === cashId).reduce((sum, account) => sum + account.current_balance, 0);
    assert(beforeTransfer === afterTransfer, 'Treasury transfer changed total Studio cash.');

    const references = await studioFinanceService.references(ctx);
    const method = references.payment_methods[0]; assert(method, 'No active payment method is available.');
    await studioFinanceService.payInvoice(ctx, invoiceId, { amount: 2000000, payment_date: today, payment_method_id: method.id, treasury_account_id: bankId, payment_schedule_id: scheduleId });
    let invoice = (await pool.execute('SELECT paid_amount,balance_due,status_code FROM invoices WHERE id=?', [invoiceId]) as any)[0][0];
    let schedule = (await pool.execute('SELECT paid_amount,status_code FROM invoice_payment_schedules WHERE id=?', [scheduleId]) as any)[0][0];
    let project = (await pool.execute('SELECT paid_amount,payment_status_code FROM studio_projects WHERE id=?', [projectId]) as any)[0][0];
    assert(Number(invoice.paid_amount) === 2000000 && Number(invoice.balance_due) === 3000000 && invoice.status_code === 'partial', 'Partial customer payment did not synchronize invoice.');
    assert(Number(schedule.paid_amount) === 2000000 && schedule.status_code === 'partial', 'Payment schedule was not safely synchronized.');
    assert(Number(project.paid_amount) === 2000000 && project.payment_status_code === 'partial', 'A fully paid DP incorrectly marked the project paid.');
    let overpayBlocked = false;
    try { await studioFinanceService.payInvoice(ctx, invoiceId, { amount: 2000000, payment_date: today, payment_method_id: method.id, treasury_account_id: bankId, payment_schedule_id: scheduleId }); } catch (error: any) { overpayBlocked = error.code === 'PAYMENT_EXCEEDS_SCHEDULE_BALANCE'; }
    assert(overpayBlocked, 'Payment schedule overpayment was not rejected.');

    const expense = await studioFinanceService.createExpense(ctx, { expense_date: today, description: 'Transport Proyek Smoke', amount: 300000, tax_amount: 0, category_code: 'STUDIO_PROJECT_COST', party_id: partyId, studio_project_id: projectId, status_code: 'draft' });
    expenseId = expense.id;
    let expenseRow = (await pool.execute('SELECT status_code,financial_transaction_id FROM expenses WHERE id=?', [expenseId]) as any)[0][0];
    assert(expenseRow.status_code === 'draft' && !expenseRow.financial_transaction_id, 'Expense draft moved cash.');
    await studioFinanceService.approveExpense(ctx, expenseId);
    await studioFinanceService.payExpense(ctx, expenseId, { treasury_account_id: bankId, payment_date: today });
    expenseRow = (await pool.execute('SELECT status_code,financial_transaction_id FROM expenses WHERE id=?', [expenseId]) as any)[0][0];
    project = (await pool.execute('SELECT actual_cost FROM studio_projects WHERE id=?', [projectId]) as any)[0][0];
    assert(expenseRow.status_code === 'paid' && expenseRow.financial_transaction_id && Number(project.actual_cost) === 300000, 'Paying expense did not post or synchronize project actual cost.');
    let doublePayBlocked = false;
    try { await studioFinanceService.payExpense(ctx, expenseId, { treasury_account_id: bankId, payment_date: today }); } catch (error: any) { doublePayBlocked = error.code === 'EXPENSE_ALREADY_PAID'; }
    assert(doublePayBlocked, 'The same expense could be paid twice.');
    await studioFinanceService.reverseExpense(ctx, expenseId, { reversal_date: today, reason: 'Pembalikan fixture smoke.' });
    expenseRow = (await pool.execute('SELECT status_code FROM expenses WHERE id=?', [expenseId]) as any)[0][0];
    project = (await pool.execute('SELECT actual_cost FROM studio_projects WHERE id=?', [projectId]) as any)[0][0];
    assert(expenseRow.status_code === 'void' && Number(project.actual_cost) === 0, 'Expense reversal did not preserve history and reverse project cost.');

    const payout = await studioFinanceService.payExternalAssignment(ctx, assignmentId, { amount: 1000000, payment_date: today, treasury_account_id: bankId, category_code: 'STUDIO_PROJECT_COST' });
    payoutExpenseId = payout.expense_id;
    assert(payout.payment_status_code === 'partial' && payout.remaining === 1000000, 'Partial external payout was not synchronized.');
    let externalOverpayBlocked = false;
    try { await studioFinanceService.payExternalAssignment(ctx, assignmentId, { amount: 1500000, payment_date: today, treasury_account_id: bankId, category_code: 'STUDIO_PROJECT_COST' }); } catch (error: any) { externalOverpayBlocked = error.code === 'EXTERNAL_FEE_OVERPAYMENT'; }
    assert(externalOverpayBlocked, 'External fee overpayment was not rejected.');
    project = (await pool.execute('SELECT actual_cost FROM studio_projects WHERE id=?', [projectId]) as any)[0][0];
    assert(Number(project.actual_cost) === 1000000, 'External agreed fee was double counted in actual cost.');

    const costCategory = references.categories.find(category => category.code === 'STUDIO_PROJECT_COST');
    assert(costCategory, 'STUDIO_PROJECT_COST category is unavailable.');
    const budget = await studioFinanceService.createBudget(ctx, { name: `Budget Finance ${token}`, period_start: today, period_end: today, items: [{ name: 'Biaya Proyek', category_id: costCategory.id, allocated_amount: 5000000 }] });
    budgetId = budget.id;
    const budgets = await studioFinanceService.budgets(ctx); const budgetRow = budgets.find(row => row.id === budgetId);
    assert(budgetRow && budgetRow.actual_amount >= 300000, 'Budget actuals did not use paid Studio expenses.');
    const accounting = await studioFinanceService.accounting(ctx);
    assert(accounting.journals.every(journal => journal.is_balanced), 'At least one Studio Finance journal is unbalanced.');
    console.log('Studio Finance smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const expenseIds = [expenseId, payoutExpenseId].filter(Boolean); const treasuryIds = [bankId,cashId].filter(Boolean); const transactionIds: number[] = [];
      if (expenseIds.length) { const [transactions]: any = await connection.execute(`SELECT financial_transaction_id FROM expenses WHERE id IN (${expenseIds.map(() => '?').join(',')})`, expenseIds); transactionIds.push(...transactions.map((row: any) => Number(row.financial_transaction_id)).filter(Boolean)); const [reversals]: any = await connection.execute(`SELECT id FROM financial_transactions WHERE source_type='studio_expense_reversal' AND source_id IN (${expenseIds.map(() => '?').join(',')})`, expenseIds); transactionIds.push(...reversals.map((row: any) => Number(row.id))); }
      if (invoiceId) { const [payments]: any = await connection.execute('SELECT financial_transaction_id FROM payments WHERE invoice_id=?', [invoiceId]); transactionIds.push(...payments.map((row: any) => Number(row.financial_transaction_id)).filter(Boolean)); }
      if (treasuryIds.length) { const [openings]: any = await connection.execute(`SELECT id FROM financial_transactions WHERE source_type='treasury_opening' AND source_id IN (${treasuryIds.map(() => '?').join(',')})`, treasuryIds); transactionIds.push(...openings.map((row: any) => Number(row.id))); }
      const journalIds: number[] = [];
      if (transactionIds.length) { const marks=transactionIds.map(() => '?').join(','); const [journals]: any = await connection.execute(`SELECT id FROM journal_entries WHERE source_transaction_id IN (${marks})`, transactionIds); journalIds.push(...journals.map((row: any)=>Number(row.id))); }
      if (transferId) { const [journals]: any=await connection.execute('SELECT journal_entry_id id FROM internal_transfers WHERE id=?',[transferId]);journalIds.push(...journals.map((row:any)=>Number(row.id)).filter(Boolean)); }
      if (journalIds.length) { const marks=journalIds.map(()=>'?').join(','); await connection.execute(`DELETE FROM journal_lines WHERE journal_entry_id IN (${marks})`,journalIds);await connection.execute(`DELETE FROM journal_entries WHERE id IN (${marks})`,journalIds); }
      if (invoiceId) { await connection.execute('DELETE FROM payments WHERE invoice_id=?',[invoiceId]);await connection.execute('DELETE FROM invoice_payment_schedules WHERE invoice_id=?',[invoiceId]);await connection.execute('DELETE FROM invoices WHERE id=?',[invoiceId]); }
      if(expenseIds.length)await connection.execute(`DELETE FROM expenses WHERE id IN (${expenseIds.map(()=>'?').join(',')})`,expenseIds);
      if(transactionIds.length)await connection.execute(`DELETE FROM financial_transactions WHERE id IN (${transactionIds.map(()=>'?').join(',')})`,transactionIds);
      if(transferId)await connection.execute('DELETE FROM internal_transfers WHERE id=?',[transferId]);
      if(treasuryIds.length)await connection.execute(`DELETE FROM treasury_accounts WHERE id IN (${treasuryIds.map(()=>'?').join(',')})`,treasuryIds);
      if(budgetId){await connection.execute('DELETE FROM budget_items WHERE budget_id=?',[budgetId]);await connection.execute('DELETE FROM budgets WHERE id=?',[budgetId]);}
      if(assignmentId)await connection.execute('DELETE FROM project_external_assignments WHERE id=?',[assignmentId]);
      if(projectId)await connection.execute('DELETE FROM studio_projects WHERE id=?',[projectId]);
      if(partyId){await connection.execute('DELETE FROM party_roles WHERE party_id=?',[partyId]);await connection.execute('DELETE FROM parties WHERE id=?',[partyId]);}
      await connection.execute(`DELETE FROM audit_logs WHERE module_code='studio_finance' AND entity_code LIKE ?`,[`%${token}%`]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
