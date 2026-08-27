import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { getCraftBusinessUnit } from '../src/modules/craft-orders/craft-orders.helpers';
import { FinancePostingService } from '../src/shared/finance/finance-posting.service';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const craft = await getCraftBusinessUnit();
  const connection = await pool.getConnection();
  const marker = randomUUID().slice(0, 8).toUpperCase();
  const report: string[] = [];
  try {
    const [seeded]: any = await connection.execute(`SELECT code FROM sales_channels WHERE business_unit_id=? AND code IN ('SHOPEE','TIKTOK_SHOP','TOKOPEDIA','DIRECT','PARTNER')`, [craft.id]);
    assert(seeded.length === 5, 'Seeded sales channels are incomplete.');
    report.push('sales_channels: seeded records present');

    const [indexes]: any = await connection.execute(`SELECT table_name,index_name,GROUP_CONCAT(column_name ORDER BY seq_in_index) columns FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name IN ('craft_orders','channel_product_mappings') GROUP BY table_name,index_name`);
    const indexColumns = indexes.map((row: any) => `${row.TABLE_NAME}:${row.columns}`);
    assert(indexColumns.some((value) => value === 'craft_orders:sales_channel_id,external_order_id'), `Missing craft order external-ID unique key. Found: ${indexColumns.join('; ')}`);
    assert(indexColumns.some((value) => value === 'channel_product_mappings:sales_channel_id,external_sku'), `Missing channel SKU unique key. Found: ${indexColumns.join('; ')}`);
    report.push('idempotency indexes: present');

    const [columns]: any = await connection.execute(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND ((table_name='integrations' AND column_name='sales_channel_id') OR (table_name='marketplace_settlements' AND column_name='financial_transaction_id'))`);
    assert(columns.length === 2, 'Required marketplace relation columns are missing.');
    report.push('integration and settlement links: present');

    const [users]: any = await connection.execute(`SELECT id FROM users WHERE organization_id=? LIMIT 1`, [craft.organizationId]);
    assert(users.length, 'No user is available for audit-bound smoke checks.');
    const userId = Number(users[0].id);
    const [channelRows]: any = await connection.execute(`SELECT id FROM sales_channels WHERE business_unit_id=? AND code='SHOPEE' LIMIT 1`, [craft.id]);
    const channelId = Number(channelRows[0].id);

    await connection.beginTransaction();
    const [partyResult]: any = await connection.execute(`INSERT INTO parties (organization_id,code,party_kind,display_name,status_code) VALUES (?,?, 'individual', ?, 'active')`, [craft.organizationId, `TMP-${marker}`, `Smoke Marketplace ${marker}`]);
    const partyId = Number(partyResult.insertId);
    await connection.execute(`INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'craft_customer',1)`, [partyId, craft.id]);
    const [orderResult]: any = await connection.execute(
      `INSERT INTO craft_orders (business_unit_id,order_code,customer_party_id,sales_channel_id,external_order_id,order_type,order_date,priority_code,priority_score,is_priority_manual,currency_code,subtotal,discount_amount,shipping_amount,marketplace_fee_amount,tax_amount,total_amount,paid_amount,payment_status_code,status_code,created_by)
       VALUES (?,?,?,?,?,'standard',UTC_TIMESTAMP(),'normal',20,0,'IDR',10000,0,0,650,0,10000,0,'unpaid','new',?)`,
      [craft.id, `SMK-${marker}`, partyId, channelId, `SMK-ORDER-${marker}`, userId],
    );
    const orderId = Number(orderResult.insertId);
    await connection.execute(`INSERT INTO craft_order_items (order_id,item_name,quantity,unit_price,discount_amount,line_total,custom_spec_json) VALUES (?, 'Smoke item', 1, 10000, 0, 10000, ?)`, [orderId, JSON.stringify({ import_source: 'smoke' })]);
    report.push('craft order external-ID insertion: passed');

    await connection.execute(`INSERT INTO marketplace_fee_rules (sales_channel_id,name,fee_type,percentage_rate,fixed_amount,applies_to,effective_from,is_active) VALUES (?,?,'mixed',6.5,1000,'gross_sales',UTC_DATE(),1)`, [channelId, `Smoke fee ${marker}`]);
    report.push('marketplace fee rule: passed');

    const [integrationResult]: any = await connection.execute(`INSERT INTO integrations (organization_id,business_unit_id,sales_channel_id,integration_code,integration_type,provider_name,display_name,status_code,config_json,created_by) VALUES (?,?,?,?, 'marketplace','SMOKE','Smoke Import','not_connected',?,?)`, [craft.organizationId, craft.id, channelId, `SMK-${marker}`, JSON.stringify({ mode: 'manual_import' }), userId]);
    const integrationId = Number(integrationResult.insertId);
    await connection.execute(`INSERT INTO integration_sync_logs (integration_id,sync_type,direction,status_code,started_at,finished_at,records_processed,records_success,records_failed,metadata) VALUES (?,'orders','inbound','success',UTC_TIMESTAMP(),UTC_TIMESTAMP(),1,1,0,?)`, [integrationId, JSON.stringify({ smoke: true })]);
    report.push('integration metadata and sync log: passed');

    const [settlementResult]: any = await connection.execute(`INSERT INTO marketplace_settlements (sales_channel_id,settlement_code,gross_sales,platform_fees,net_settlement,status_code) VALUES (?,?,10000,650,9350,'pending')`, [channelId, `SMK-SET-${marker}`]);
    const settlementId = Number(settlementResult.insertId);
    await connection.execute(`INSERT INTO marketplace_settlement_items (settlement_id,order_id,external_order_id,gross_amount,fee_amount,net_amount) VALUES (?,?,?,?,?,?)`, [settlementId, orderId, `SMK-ORDER-${marker}`, 10000, 650, 9350]);
    report.push('settlement and channel-scoped order matching: passed');

    const [treasuries]: any = await connection.execute(`SELECT id FROM treasury_accounts WHERE organization_id=? AND business_unit_id=? AND is_active=1 LIMIT 1`, [craft.organizationId, craft.id]);
    if (treasuries.length) {
      const finance = new FinancePostingService();
      const posted = await finance.postMarketplaceSettlement(connection, { organizationId: craft.organizationId, businessUnitId: craft.id, userId }, { settlementId, settlementCode: `SMK-SET-${marker}`, treasuryAccountId: Number(treasuries[0].id), amount: 9350, receivedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') });
      await connection.execute(`UPDATE marketplace_settlements SET financial_transaction_id=?,treasury_account_id=?,status_code='received' WHERE id=?`, [posted.transactionId, Number(treasuries[0].id), settlementId]);
      report.push('canonical finance payout link: passed');
    } else {
      report.push('canonical finance payout link: skipped (no active Craft treasury)');
    }
    await connection.rollback();
    console.log(['Craft Marketplace smoke test passed (all writes rolled back):', ...report.map((item) => `- ${item}`)].join('\n'));
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(`Craft Marketplace smoke test failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
