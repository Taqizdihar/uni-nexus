import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { CraftFinanceService } from '../src/modules/craft-finance/craft-finance.service';
import type { PostingContext } from '../src/shared/finance/finance-posting.service';

const service = new CraftFinanceService();
const money = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

async function main() {
  const marker = `SMK${randomUUID().slice(0, 6).toUpperCase()}`;
  const cleanup: Array<() => Promise<void>> = [];
  try {
    const [craftRows]: any = await pool.execute(`SELECT id, organization_id FROM business_units WHERE code='CRAFT' AND is_active=1 LIMIT 1`);
    if (!craftRows.length) throw new Error('No active CRAFT business unit is available to run this smoke test.');
    const craft = craftRows[0];
    const organizationId = Number(craft.organization_id);
    const businessUnitId = Number(craft.id);

    const [users]: any = await pool.execute(
      `SELECT u.id FROM users u JOIN user_business_units ubu ON ubu.user_id=u.id AND ubu.business_unit_id=? AND ubu.can_access=1 WHERE u.status_code='active' AND u.approval_status_code='approved' AND u.deleted_at IS NULL LIMIT 1`,
      [businessUnitId],
    );
    if (!users.length) throw new Error('No active Craft-accessible user is available to run this smoke test.');
    const userId = Number(users[0].id);
    const context: PostingContext = { organizationId, businessUnitId, userId };

    // --- Fixtures: chart of accounts, categories, treasury account -------------------------------
    const insertCoa = async (code: string, name: string, type: string, normal: 'debit' | 'credit') => {
      const [result]: any = await pool.execute(`INSERT INTO chart_of_accounts (organization_id,account_code,account_name,account_type,normal_balance) VALUES (?,?,?,?,?)`, [organizationId, code, name, type, normal]);
      const id = Number(result.insertId);
      cleanup.push(async () => { await pool.execute('DELETE FROM chart_of_accounts WHERE id=?', [id]); });
      return id;
    };
    const cashCoaId = await insertCoa(`${marker}-CASH`, `${marker} Kas`, 'asset', 'debit');
    const incomeCoaId = await insertCoa(`${marker}-INC`, `${marker} Pendapatan`, 'revenue', 'credit');
    const expenseCoaId = await insertCoa(`${marker}-EXP`, `${marker} Beban`, 'expense', 'debit');

    const insertCategory = async (code: string, type: 'income' | 'expense', coaId: number) => {
      const [result]: any = await pool.execute(`INSERT INTO transaction_categories (organization_id,business_unit_id,code,name,transaction_type,default_coa_account_id) VALUES (?,?,?,?,?,?)`, [organizationId, businessUnitId, code, `${marker} ${type}`, type, coaId]);
      const id = Number(result.insertId);
      cleanup.push(async () => { await pool.execute('DELETE FROM transaction_categories WHERE id=?', [id]); });
      return id;
    };
    const incomeCategoryCode = `${marker}_INCOME`;
    const expenseCategoryCode = `${marker}_EXPENSE`;
    await insertCategory(incomeCategoryCode, 'income', incomeCoaId);
    await insertCategory(expenseCategoryCode, 'expense', expenseCoaId);

    const [treasuryInsert]: any = await pool.execute(`INSERT INTO treasury_accounts (organization_id,business_unit_id,coa_account_id,account_code,name,account_type,currency_code,opening_balance,current_balance) VALUES (?,?,?,?,?,?,?,?,?)`, [organizationId, businessUnitId, cashCoaId, `${marker}-TRS`, `${marker} Kas Toko`, 'cash', 'IDR', 1000000, 1000000]);
    const treasuryId = Number(treasuryInsert.insertId);
    cleanup.push(async () => { await pool.execute('DELETE FROM treasury_accounts WHERE id=?', [treasuryId]); });
    // Every journal this run posts touches one of our three temp COA accounts on at least one
    // line (they're brand new, so nothing else references them) — clean by that, not by
    // source_type, since FinancePostingService.postExpenseReversal hardcodes a Studio-flavored
    // source_type label even when called from Craft (cosmetic naming quirk, not a bug worth
    // reproducing here).
    cleanup.push(async () => {
      const [entries]: any = await pool.execute('SELECT DISTINCT journal_entry_id FROM journal_lines WHERE coa_account_id IN (?,?,?)', [cashCoaId, incomeCoaId, expenseCoaId]);
      const entryIds = entries.map((row: any) => row.journal_entry_id);
      if (entryIds.length) {
        await pool.query('DELETE FROM journal_lines WHERE journal_entry_id IN (?)', [entryIds]);
        await pool.query('DELETE FROM journal_entries WHERE id IN (?)', [entryIds]);
      }
    });

    // Fixed future business date isolates deterministic arithmetic from ordinary
    // development records while still using only temporary, rolled-back fixtures.
    const today = '2038-01-19 12:00:00';
    const todayDate = '2038-01-19';

    // --- Income ------------------------------------------------------------------------------------
    const incomeResult = await service.income(context, { amount: 250000, transaction_date: today, treasury_account_id: treasuryId, category_code: incomeCategoryCode, description: `${marker} manual income` });
    cleanup.push(async () => { await pool.execute('DELETE FROM financial_transactions WHERE id=?', [incomeResult.id]); });

    const incomeList = await service.listIncome(context, { page: 1, limit: 25, search: marker } as any);
    if (!incomeList.items.some((item: any) => Number(item.id) === incomeResult.id)) throw new Error('Expected the posted income to appear in listIncome().');

    const [treasuryAfterIncome]: any = await pool.execute('SELECT current_balance FROM treasury_accounts WHERE id=?', [treasuryId]);
    if (money(treasuryAfterIncome[0].current_balance) !== 1250000) throw new Error(`Expected treasury balance 1,250,000 after income, got ${treasuryAfterIncome[0].current_balance}`);

    // --- Expense lifecycle: create (draft) -> approve -> pay -> reverse -----------------------------
    const expense = await service.createExpense(context, { expense_date: today, description: `${marker} expense`, amount: 100000, tax_amount: 0, category_code: expenseCategoryCode, status_code: 'draft' } as any);
    cleanup.push(async () => {
      const [tx]: any = await pool.execute('SELECT financial_transaction_id FROM expenses WHERE id=?', [expense.id]).catch(() => [[]]);
      const txId = tx[0]?.financial_transaction_id;
      await pool.execute('DELETE FROM expenses WHERE id=?', [expense.id]);
      if (txId) await pool.execute('DELETE FROM financial_transactions WHERE id=? OR source_id=?', [txId, expense.id]);
    });

    await service.approveExpense(context, expense.id);
    const paid = await service.payExpense(context, expense.id, { treasury_account_id: treasuryId, payment_date: today });
    const expenseList = await service.listExpenses(context, { page: 1, limit: 25, search: marker } as any);
    const paidRow = expenseList.items.find((item: any) => Number(item.id) === expense.id);
    if (!paidRow || paidRow.status_code !== 'paid') throw new Error('Expected the expense to be paid and visible in listExpenses().');

    const [treasuryAfterExpense]: any = await pool.execute('SELECT current_balance FROM treasury_accounts WHERE id=?', [treasuryId]);
    if (money(treasuryAfterExpense[0].current_balance) !== 1150000) throw new Error(`Expected treasury balance 1,150,000 after expense payment, got ${treasuryAfterExpense[0].current_balance}`);

    const reversed = await service.reverseExpense(context, expense.id, { reversal_date: today, reason: 'Smoke test reversal' });
    if (reversed.status_code !== 'void') throw new Error('Expected expense to be void after reversal.');
    const [treasuryAfterReversal]: any = await pool.execute('SELECT current_balance FROM treasury_accounts WHERE id=?', [treasuryId]);
    if (money(treasuryAfterReversal[0].current_balance) !== 1250000) throw new Error(`Expected treasury balance restored to 1,250,000 after reversal, got ${treasuryAfterReversal[0].current_balance}`);
    void paid;

    // --- Cash flow -----------------------------------------------------------------------------------
    const cashFlow = await service.cashFlow(context, todayDate, todayDate);
    if (!cashFlow.daily.length) throw new Error('Expected cashFlow().daily to contain an entry for today given the postings above.');
    if (!cashFlow.by_treasury.some((row: any) => Number(row.treasury_account_id) === treasuryId)) throw new Error('Expected cashFlow().by_treasury to include the fixture treasury account.');
    const day = cashFlow.daily.find((row: any) => String(row.day).slice(0, 10) === todayDate);
    if (!day || money(day.cash_in) !== 350000 || money(day.cash_out) !== 100000 || money(day.net_cash_flow) !== 250000) throw new Error(`Cash Flow reversal reconciliation failed: ${JSON.stringify({ day, daily: cashFlow.daily })}`);

    // --- Profitability (order + print job) ------------------------------------------------------------
    const [channelRows]: any = await pool.execute('SELECT id FROM sales_channels WHERE business_unit_id=? LIMIT 1', [businessUnitId]);
    let channelId = channelRows[0]?.id;
    if (!channelId) {
      const [channelInsert]: any = await pool.execute(`INSERT INTO sales_channels (business_unit_id, code, name, channel_type) VALUES (?, ?, ?, 'direct')`, [businessUnitId, marker, `${marker} Channel`]);
      channelId = channelInsert.insertId;
      cleanup.push(async () => { await pool.execute('DELETE FROM sales_channels WHERE id=?', [channelId]); });
    }
    const [partyInsert]: any = await pool.execute(`INSERT INTO parties (organization_id, code, party_kind, display_name, status_code) VALUES (?, ?, 'individual', ?, 'active')`, [organizationId, marker, `${marker} Customer`]);
    const partyId = Number(partyInsert.insertId);
    cleanup.push(async () => { await pool.execute('DELETE FROM parties WHERE id=?', [partyId]); });

    const [orderInsert]: any = await pool.execute(`INSERT INTO craft_orders (business_unit_id, order_code, customer_party_id, sales_channel_id, order_date, completed_at, status_code, total_amount, marketplace_fee_amount) VALUES (?, ?, ?, ?, ?, ?, 'completed', 500000, 15000)`, [businessUnitId, marker, partyId, channelId, today, today]);
    const orderId = Number(orderInsert.insertId);
    cleanup.push(async () => { await pool.execute('DELETE FROM craft_orders WHERE id=?', [orderId]); });

    const [printerRows]: any = await pool.execute('SELECT id FROM printers WHERE business_unit_id=? LIMIT 1', [businessUnitId]);
    let printerId = printerRows[0]?.id;
    if (!printerId) {
      const [printerInsert]: any = await pool.execute(`INSERT INTO printers (business_unit_id, code, name) VALUES (?, ?, ?)`, [businessUnitId, marker, `${marker} Printer`]);
      printerId = printerInsert.insertId;
      cleanup.push(async () => { await pool.execute('DELETE FROM printers WHERE id=?', [printerId]); });
    }
    const [jobInsert]: any = await pool.execute(`INSERT INTO print_jobs (business_unit_id, job_code, order_id, printer_id, job_name, actual_cost) VALUES (?, ?, ?, ?, ?, 200000)`, [businessUnitId, marker, orderId, printerId, `${marker} Job`]);
    const jobId = Number(jobInsert.insertId);
    cleanup.push(async () => { await pool.execute('DELETE FROM print_jobs WHERE id=?', [jobId]); });

    const profitability = await service.profitability(context, {});
    const orderRow = profitability.orders.find((row: any) => Number(row.id) === orderId);
    if (!orderRow) throw new Error('Expected the fixture order to appear in profitability().orders.');
    if (!orderRow.direct_cost_available || money(orderRow.direct_cost) !== 200000) throw new Error(`Expected direct_cost 200,000 from the print job, got ${JSON.stringify(orderRow)}`);
    if (money(orderRow.gross_profit) !== money(500000 - 200000 - 15000)) throw new Error(`Unexpected gross_profit: ${orderRow.gross_profit}`);

    // --- Budgets --------------------------------------------------------------------------------------
    const [categoryRow]: any = await pool.execute('SELECT id FROM transaction_categories WHERE organization_id=? AND business_unit_id=? AND code=?', [organizationId, businessUnitId, expenseCategoryCode]);
    const budget = await service.createBudget(context, { name: `${marker} Budget`, period_start: todayDate, period_end: todayDate, items: [{ category_id: Number(categoryRow[0].id), name: `${marker} Item`, allocated_amount: 300000 }] });
    cleanup.push(async () => { await pool.execute('DELETE FROM budget_items WHERE budget_id=?', [budget.id]); await pool.execute('DELETE FROM budgets WHERE id=?', [budget.id]); });
    const approvedBudget = await service.approveBudget(context, budget.id);
    if (approvedBudget.status_code !== 'approved') throw new Error('Expected budget to be approved.');
    const budgets = await service.budgets(context);
    if (!budgets.some((row: any) => Number(row.id) === budget.id && row.status_code === 'approved')) throw new Error('Expected budgets() to list the approved fixture budget.');

    // --- Accounting (journals) --------------------------------------------------------------------------
    const accounting = await service.accounting(context);
    const incomeJournal = accounting.journals.find((row: any) => Number(row.source_id) === incomeResult.id);
    if (!incomeJournal) throw new Error('Expected accounting().journals to contain the journal entry posted for the manual income.');
    if (!incomeJournal.is_balanced) throw new Error('Expected the posted journal entry to be balanced (debit == credit).');

    console.log('Craft Finance smoke passed: income posting, full expense lifecycle (draft -> approve -> pay -> reverse) with correct treasury balances, cash flow breakdowns, order/print-job profitability, budget create+approve, and balanced journal posting.');
  } finally {
    for (const step of cleanup.reverse()) await step().catch((error) => console.error('Cleanup step failed:', error));
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
