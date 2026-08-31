import { randomBytes } from 'node:crypto';
import { pool } from '../src/config/database';
import { unifiedFinanceService } from '../src/modules/finance/finance.service';
import { unifiedFinanceAccess } from '../src/modules/finance/finance-access.service';
import { CraftFinanceService } from '../src/modules/craft-finance/craft-finance.service';
import { studioFinanceService } from '../src/modules/studio-finance/studio-finance.service';
import { getBusinessUnitByCode } from '../src/shared/utils/business-unit';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const token = randomBytes(6).toString('hex').toUpperCase();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

async function actor() {
  const [rows]: any = await pool.execute(`SELECT u.id,u.organization_id,GROUP_CONCAT(DISTINCT p.code) permissions FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code IN ('finance.read','finance.write','finance.transfer','finance.manage','craft.finance.read','craft.finance.write','studio.finance.read','studio.finance.write','reports.export') GROUP BY u.id HAVING COUNT(DISTINCT p.code)>=8 LIMIT 1`);
  assert(rows.length, 'No fully-permitted Unified Finance fixture actor exists.');
  return { id: Number(rows[0].id), organization_id: Number(rows[0].organization_id), permissions: String(rows[0].permissions).split(',') };
}

async function run() {
  const financeActor = await actor(); const craft = await getBusinessUnitByCode('CRAFT'); const studio = await getBusinessUnitByCode('STUDIO');
  let craftTreasury = 0; let studioTreasury = 0; let sharedTreasury = 0; let usdTreasury = 0; let partyId = 0; let invoiceId = 0; let supplierInvoiceId = 0; const transferIds: number[] = []; const transactionIds: number[] = [];
  try {
    const craftFinance = new CraftFinanceService();
    craftTreasury = (await craftFinance.createTreasury({ organizationId: financeActor.organization_id, businessUnitId: craft.id, userId: financeActor.id }, { name: `UF Craft ${token}`, account_type: 'bank', currency_code: 'IDR', opening_balance: 1_000_000 })).id;
    studioTreasury = (await studioFinanceService.createTreasury({ ...(await studioFinanceService.context(financeActor.id)), organizationId: financeActor.organization_id, businessUnitId: studio.id }, { name: `UF Studio ${token}`, account_type: 'bank', currency_code: 'IDR', opening_balance: 100_000 })).id;
    sharedTreasury = (await unifiedFinanceService.createSharedTreasury(financeActor, { name: `UF Shared ${token}`, account_type: 'bank', currency_code: 'IDR', opening_balance: 250_000 })).id;
    usdTreasury = (await unifiedFinanceService.createSharedTreasury(financeActor, { name: `UF USD ${token}`, account_type: 'bank', currency_code: 'USD', opening_balance: 100 })).id;
    const [methods]: any = await pool.execute('SELECT id FROM payment_methods WHERE is_active=1 ORDER BY id LIMIT 1'); assert(methods.length, 'No active payment method is available for Craft posting regression.');
    const fixtureConnection = await pool.getConnection();
    try {
      await fixtureConnection.beginTransaction();
      const [party]: any = await fixtureConnection.execute(`INSERT INTO parties (organization_id,code,party_kind,display_name,status_code) VALUES (?,?,'company',?,'active')`, [financeActor.organization_id, `UF-PARTY-${token}`, `Unified Finance Party ${token}`]); partyId = Number(party.insertId);
      const [invoice]: any = await fixtureConnection.execute(`INSERT INTO invoices (organization_id,business_unit_id,invoice_number,party_id,source_type,issue_date,due_date,status_code,currency_code,total_amount,paid_amount,balance_due,created_by) VALUES (?,?,?,?, 'manual',?,?, 'issued','IDR',20000,0,20000,?)`, [financeActor.organization_id, craft.id, `UF-INV-${token}`, partyId, today, today, financeActor.id]); invoiceId = Number(invoice.insertId);
      const [supplier]: any = await fixtureConnection.execute(`INSERT INTO supplier_invoices (business_unit_id,supplier_party_id,supplier_invoice_number,invoice_date,due_date,status_code,total_amount,paid_amount,balance_due,currency_code) VALUES (?,?,?, ?,?,'unpaid',15000,0,15000,'IDR')`, [craft.id, partyId, `UF-SUP-${token}`, today, today]); supplierInvoiceId = Number(supplier.insertId);
      await fixtureConnection.commit();
    } catch (error) { await fixtureConnection.rollback(); throw error; } finally { fixtureConnection.release(); }
    const craftContext = { organizationId: financeActor.organization_id, businessUnitId: craft.id, userId: financeActor.id };
    const manualIncome = await craftFinance.income(craftContext, { amount: 10_000, transaction_date: today, treasury_account_id: craftTreasury, category_code: 'CRAFT_SALES', description: `Craft income ${token}` }); transactionIds.push(manualIncome.id);
    await craftFinance.customerPayment(craftContext, invoiceId, { amount: 20_000, payment_date: today, payment_method_id: Number(methods[0].id), treasury_account_id: craftTreasury, category_code: 'CRAFT_SALES', reference_number: `UF-CUSTOMER-${token}` });
    await craftFinance.supplierPayment(craftContext, supplierInvoiceId, { amount: 15_000, payment_date: today, payment_method_id: Number(methods[0].id), treasury_account_id: craftTreasury, category_code: 'CRAFT_MATERIAL', reference_number: `UF-SUPPLIER-${token}` });
    const [craftPaid]: any = await pool.execute('SELECT (SELECT status_code FROM invoices WHERE id=?) invoice_status,(SELECT status_code FROM supplier_invoices WHERE id=?) supplier_status', [invoiceId, supplierInvoiceId]);
    assert(craftPaid[0].invoice_status === 'paid' && craftPaid[0].supplier_status === 'paid', 'Craft customer/supplier payments did not complete through canonical posting.');

    const before = await pool.execute('SELECT id,current_balance FROM treasury_accounts WHERE id IN (?,?,?) ORDER BY id', [craftTreasury, studioTreasury, sharedTreasury]) as any;
    const transferKey = `uf-transfer-${token}`;
    const transfer = await unifiedFinanceService.createTransfer(financeActor, { from_treasury_account_id: craftTreasury, to_treasury_account_id: studioTreasury, amount: 125_000, transfer_date: today, description: `Smoke unified transfer ${token}`, idempotency_key: transferKey }); transferIds.push(transfer.id);
    assert(transfer.transfer_code.startsWith('TRF-'), 'Transfer did not receive a stable TRF code.');
    const retry = await unifiedFinanceService.createTransfer(financeActor, { from_treasury_account_id: craftTreasury, to_treasury_account_id: studioTreasury, amount: 125_000, transfer_date: today, description: `Smoke unified transfer ${token}`, idempotency_key: transferKey });
    assert(retry.id === transfer.id && retry.idempotent, 'Transfer idempotency retry produced a second movement.');
    let mismatchBlocked = false; try { await unifiedFinanceService.createTransfer(financeActor, { from_treasury_account_id: craftTreasury, to_treasury_account_id: usdTreasury, amount: 1, transfer_date: today, idempotency_key: `uf-mismatch-${token}` }); } catch (error: any) { mismatchBlocked = error.code === 'TRANSFER_CURRENCY_MISMATCH'; }
    assert(mismatchBlocked, 'Cross-currency transfer was not rejected.');
    const after = await pool.execute('SELECT id,current_balance FROM treasury_accounts WHERE id IN (?,?,?) ORDER BY id', [craftTreasury, studioTreasury, sharedTreasury]) as any;
    const beforeMap = new Map(before[0].map((row: any) => [Number(row.id), Number(row.current_balance)])); const afterMap = new Map(after[0].map((row: any) => [Number(row.id), Number(row.current_balance)]));
    assert(Number(afterMap.get(craftTreasury)) === Number(beforeMap.get(craftTreasury)) - 125_000 && Number(afterMap.get(studioTreasury)) === Number(beforeMap.get(studioTreasury)) + 125_000, 'Cross-unit transfer balances were not atomically updated once.');
    const [transferJournal]: any = await pool.execute(`SELECT ABS(SUM(jl.debit_amount)-SUM(jl.credit_amount)) difference FROM internal_transfers t JOIN journal_lines jl ON jl.journal_entry_id=t.journal_entry_id WHERE t.id=?`, [transfer.id]);
    assert(Number(transferJournal[0].difference) <= .01, 'Transfer journal is unbalanced.');

    const incomeKey = `uf-shared-income-${token}`;
    const income = await unifiedFinanceService.createSharedTransaction(financeActor, { direction: 'in', amount: 50_000, transaction_date: today, treasury_account_id: sharedTreasury, category_code: 'SHARED_OTHER_INCOME', description: `Shared income ${token}`, idempotency_key: incomeKey }); transactionIds.push(income.transactionId);
    const incomeRetry = await unifiedFinanceService.createSharedTransaction(financeActor, { direction: 'in', amount: 50_000, transaction_date: today, treasury_account_id: sharedTreasury, category_code: 'SHARED_OTHER_INCOME', description: `Shared income ${token}`, idempotency_key: incomeKey });
    assert(incomeRetry.transactionId === income.transactionId && incomeRetry.idempotent, 'Shared transaction request idempotency failed.');
    const reversal = await unifiedFinanceService.reverseSharedTransaction(financeActor, income.transactionId, { reversal_date: today, reason: `Reversal smoke ${token}`, idempotency_key: `uf-reverse-${token}` }); transactionIds.push(reversal.transactionId);
    const idrOverview = await unifiedFinanceService.overview(financeActor, { period: 'today', workspace: 'shared', currency: 'IDR', page: 1, limit: 25 });
    const usdOverview = await unifiedFinanceService.overview(financeActor, { period: 'today', workspace: 'shared', currency: 'USD', page: 1, limit: 25 });
    assert(idrOverview.metrics.operating_result.value === 0, 'Income reversal was counted as a second revenue item.');
    assert(usdOverview.metrics.total_cash.value === 100 && idrOverview.metrics.total_cash.value !== 100 + Number(idrOverview.metrics.total_cash.value), 'Multi-currency overview summed values across currencies.');
    const noCraft = await unifiedFinanceAccess.resolve({ ...financeActor, permissions: ['finance.read', 'studio.finance.read'] });
    assert(!noCraft.byCode.CRAFT && Boolean(noCraft.byCode.STUDIO), 'Source workspace finance permission was not enforced by the access resolver.');
    const transactions = await unifiedFinanceService.transactions(financeActor, { period: 'today', workspace: 'all', currency: 'IDR', q: token, page: 1, limit: 25 });
    assert(transactions.items.some((row: any) => row.id === income.transactionId), 'Consolidated transaction query did not expose the canonical Shared posting.');
    const transfers = await unifiedFinanceService.transfers(financeActor, { period: 'today', workspace: 'all', currency: 'IDR', q: token, page: 1, limit: 25 });
    assert(transfers.items.length === 1, 'Consolidated transfer query did not respect idempotency/history.');
    console.log('Unified Finance smoke test passed.');
  } finally {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); const treasuryIds = [craftTreasury, studioTreasury, sharedTreasury, usdTreasury].filter(Boolean);
      const [fixtureTransactions]: any = treasuryIds.length ? await connection.execute(`SELECT id FROM financial_transactions WHERE treasury_account_id IN (${treasuryIds.map(() => '?').join(',')})`, treasuryIds) : [[]]; transactionIds.push(...fixtureTransactions.map((row: any) => Number(row.id)));
      const [payments]: any = invoiceId || supplierInvoiceId ? await connection.execute(`SELECT id FROM payments WHERE invoice_id=? OR supplier_invoice_id=?`, [invoiceId, supplierInvoiceId]) : [[]]; const paymentIds = payments.map((row: any) => Number(row.id));
      const uniqueTransactions = [...new Set(transactionIds)]; const journalIds: number[] = [];
      if (uniqueTransactions.length) { const [journals]: any = await connection.execute(`SELECT id FROM journal_entries WHERE source_transaction_id IN (${uniqueTransactions.map(() => '?').join(',')})`, uniqueTransactions); journalIds.push(...journals.map((row: any) => Number(row.id))); }
      if (transferIds.length) { const [transferJournals]: any = await connection.execute(`SELECT journal_entry_id FROM internal_transfers WHERE id IN (${transferIds.map(() => '?').join(',')})`, transferIds); journalIds.push(...transferJournals.map((row: any) => Number(row.journal_entry_id)).filter(Boolean)); }
      const uniqueJournals = [...new Set(journalIds)]; if (uniqueJournals.length) { await connection.execute(`DELETE FROM journal_lines WHERE journal_entry_id IN (${uniqueJournals.map(() => '?').join(',')})`, uniqueJournals); await connection.execute(`DELETE FROM journal_entries WHERE id IN (${uniqueJournals.map(() => '?').join(',')})`, uniqueJournals); }
      if (transferIds.length) await connection.execute(`DELETE FROM internal_transfers WHERE id IN (${transferIds.map(() => '?').join(',')})`, transferIds);
      if (paymentIds.length) await connection.execute(`DELETE FROM payments WHERE id IN (${paymentIds.map(() => '?').join(',')})`, paymentIds);
      if (uniqueTransactions.length) await connection.execute(`DELETE FROM financial_transactions WHERE id IN (${uniqueTransactions.map(() => '?').join(',')})`, uniqueTransactions);
      if (invoiceId) await connection.execute('DELETE FROM invoices WHERE id=?', [invoiceId]);
      if (supplierInvoiceId) await connection.execute('DELETE FROM supplier_invoices WHERE id=?', [supplierInvoiceId]);
      if (treasuryIds.length) await connection.execute(`DELETE FROM treasury_accounts WHERE id IN (${treasuryIds.map(() => '?').join(',')})`, treasuryIds);
      if (partyId) await connection.execute('DELETE FROM parties WHERE id=?', [partyId]);
      if (transferIds.length) await connection.execute(`DELETE FROM audit_logs WHERE module_code='finance' AND entity_type='internal_transfer' AND entity_id IN (${transferIds.map(() => '?').join(',')})`, transferIds);
      if (uniqueTransactions.length) await connection.execute(`DELETE FROM audit_logs WHERE module_code IN ('finance','craft_finance','studio_finance') AND entity_type='financial_transaction' AND entity_id IN (${uniqueTransactions.map(() => '?').join(',')})`, uniqueTransactions);
      if (paymentIds.length) await connection.execute(`DELETE FROM audit_logs WHERE module_code IN ('finance','craft_finance','studio_finance') AND entity_type='payment' AND entity_id IN (${paymentIds.map(() => '?').join(',')})`, paymentIds);
      if (treasuryIds.length) await connection.execute(`DELETE FROM audit_logs WHERE module_code IN ('finance','craft_finance','studio_finance') AND entity_type='treasury_account' AND entity_id IN (${treasuryIds.map(() => '?').join(',')})`, treasuryIds);
      await connection.execute(`DELETE FROM audit_logs WHERE module_code IN ('finance','craft_finance','studio_finance') AND (entity_code LIKE ? OR description LIKE ?)`, [`%${token}%`, `%${token}%`]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
