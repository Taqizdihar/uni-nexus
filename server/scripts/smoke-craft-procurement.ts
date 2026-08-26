import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
const temp = (prefix: string) => `${prefix}-${randomUUID().slice(0, 12).toUpperCase()}`;

async function main() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const [[craft]]: any = await connection.execute("SELECT id,organization_id FROM business_units WHERE code='CRAFT' AND is_active=1 LIMIT 1");
    const [[user]]: any = await connection.execute('SELECT id FROM users ORDER BY id LIMIT 1');
    const [[category]]: any = await connection.execute("SELECT id FROM material_categories WHERE business_unit_id=? AND category_type='filament' LIMIT 1", [craft.id]);
    const [[unit]]: any = await connection.execute("SELECT id FROM units_of_measure WHERE code='G' AND is_active=1 LIMIT 1");
    assert(craft && user && category && unit, 'Craft, user, category filament, dan satuan gram harus tersedia untuk smoke test.');

    const [supplierResult]: any = await connection.execute(
      "INSERT INTO parties (organization_id,code,party_kind,display_name,status_code) VALUES (?,?,'company',?,'active')",
      [craft.organization_id, temp('TMP'), temp('Smoke Supplier')],
    );
    const supplierId = Number(supplierResult.insertId); const supplierCode = `SUP-${supplierId.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE parties SET code=? WHERE id=?', [supplierCode, supplierId]);
    await connection.execute("INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'supplier',1)", [supplierId, craft.id]);
    const [[supplierRole]]: any = await connection.execute("SELECT id FROM party_roles WHERE party_id=? AND business_unit_id=? AND role_code='supplier'", [supplierId, craft.id]);
    assert(supplierRole, 'Peran supplier tidak tercipta pada Party kanonis.');

    const [materialResult]: any = await connection.execute(
      `INSERT INTO materials (business_unit_id,category_id,sku,name,base_unit_id,default_unit_cost,low_stock_threshold,reorder_qty,is_active)
       VALUES (?,?,?,?,?,120,1000,2000,1)`, [craft.id, category.id, temp('SMK-MAT'), temp('Smoke PLA'), unit.id],
    );
    const materialId = Number(materialResult.insertId);

    const [requestResult]: any = await connection.execute(
      "INSERT INTO purchase_requests (business_unit_id,request_code,requested_by,status_code,purpose) VALUES (?,? ,?,'draft',?)",
      [craft.id, temp('TMP'), user.id, 'Smoke procurement rollback'],
    );
    const requestId = Number(requestResult.insertId); const requestCode = `PR-${requestId.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE purchase_requests SET request_code=? WHERE id=?', [requestCode, requestId]);
    const [requestItemResult]: any = await connection.execute(
      'INSERT INTO purchase_request_items (purchase_request_id,material_id,description,quantity,unit_id,estimated_unit_cost) VALUES (?,?,?,?,?,?)', [requestId, materialId, 'PLA smoke', 2000, unit.id, 120],
    );
    const requestItemId = Number(requestItemResult.insertId);
    await connection.execute("UPDATE purchase_requests SET status_code='submitted' WHERE id=?", [requestId]);
    await connection.execute("UPDATE purchase_requests SET status_code='approved',approved_by=?,approved_at=CURRENT_TIMESTAMP(3) WHERE id=?", [user.id, requestId]);

    const [orderResult]: any = await connection.execute(
      `INSERT INTO purchase_orders (business_unit_id,po_number,supplier_party_id,purchase_request_id,order_date,status_code,currency_code,subtotal,tax_amount,shipping_amount,total_amount,created_by)
       VALUES (?,? ,?,?,CURDATE(),'confirmed','IDR',240000,0,0,240000,?)`, [craft.id, temp('TMP'), supplierId, requestId, user.id],
    );
    const orderId = Number(orderResult.insertId); const poNumber = `PO-${orderId.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE purchase_orders SET po_number=? WHERE id=?', [poNumber, orderId]);
    const [orderItemResult]: any = await connection.execute(
      `INSERT INTO purchase_order_items (purchase_order_id,purchase_request_item_id,material_id,description,quantity,unit_id,unit_price,line_total,received_qty)
       VALUES (?,?,?,?,?,?,?,?,0)`, [orderId, requestItemId, materialId, 'PLA smoke', 2000, unit.id, 120, 240000],
    );
    const orderItemId = Number(orderItemResult.insertId);
    const [[mapped]]: any = await connection.execute('SELECT purchase_request_item_id FROM purchase_order_items WHERE id=?', [orderItemId]);
    assert(Number(mapped.purchase_request_item_id) === requestItemId, 'Pemetaan PR → PO item tidak tersimpan.');
    await connection.execute("UPDATE purchase_requests SET status_code='ordered' WHERE id=?", [requestId]);

    const receive = async (accepted: number, rejected: number, suffix: string) => {
      const [receiptResult]: any = await connection.execute(
        "INSERT INTO goods_receipts (business_unit_id,receipt_number,purchase_order_id,received_at,received_by,status_code) VALUES (?,? ,?,CURRENT_TIMESTAMP(3),?,'received')", [craft.id, temp('TMP'), orderId, user.id],
      );
      const receiptId = Number(receiptResult.insertId); const receiptCode = `GR-${receiptId.toString().padStart(6, '0')}`;
      await connection.execute('UPDATE goods_receipts SET receipt_number=? WHERE id=?', [receiptCode, receiptId]);
      let batchId: number | null = null;
      if (accepted > 0) {
        const [batchResult]: any = await connection.execute(
          `INSERT INTO material_batches (material_id,batch_code,supplier_id,purchase_order_item_id,received_at,initial_qty,current_qty,unit_cost,status_code)
           VALUES (?,?,?,?,CURRENT_TIMESTAMP(3),?,?,?,'available')`, [materialId, temp(`BAT-${suffix}`), supplierId, orderItemId, accepted, accepted, 120],
        );
        batchId = Number(batchResult.insertId);
        await connection.execute(
          `INSERT INTO filament_spools (material_batch_id,spool_code,nominal_net_weight_g,current_net_weight_g) VALUES (?,?,?,?)`, [batchId, temp(`SPL-${suffix}`), accepted, accepted],
        );
        await connection.execute(
          `INSERT INTO inventory_movements (business_unit_id,material_id,material_batch_id,movement_type,quantity,unit_id,unit_cost,total_cost,reference_type,reference_id,reference_code,notes,created_by)
           VALUES (?,? ,?,'stock_in',?,?,?,?, 'goods_receipt',?,?,?,?)`, [craft.id, materialId, batchId, accepted, unit.id, 120, accepted * 120, receiptId, receiptCode, 'Smoke rollback receipt', user.id],
        );
        await connection.execute('UPDATE purchase_order_items SET received_qty=received_qty+? WHERE id=?', [accepted, orderItemId]);
      }
      await connection.execute(
        'INSERT INTO goods_receipt_items (goods_receipt_id,purchase_order_item_id,material_batch_id,quantity,accepted_qty,rejected_qty,rejection_reason) VALUES (?,?,?,?,?,?,?)',
        [receiptId, orderItemId, batchId, accepted + rejected, accepted, rejected, rejected ? 'Smoke rejection' : null],
      );
      return receiptId;
    };
    await receive(1000, 0, 'A'); await connection.execute("UPDATE purchase_orders SET status_code='partial' WHERE id=?", [orderId]);
    await receive(0, 200, 'REJECTED');
    await receive(1000, 0, 'B'); await connection.execute("UPDATE purchase_orders SET status_code='received' WHERE id=?", [orderId]);
    const [[received]]: any = await connection.execute('SELECT received_qty FROM purchase_order_items WHERE id=?', [orderItemId]);
    const [[stock]]: any = await connection.execute('SELECT COALESCE(SUM(current_qty),0) AS quantity FROM material_batches WHERE material_id=?', [materialId]);
    const [[spools]]: any = await connection.execute('SELECT COUNT(*) AS count FROM filament_spools fs JOIN material_batches mb ON mb.id=fs.material_batch_id WHERE mb.material_id=?', [materialId]);
    const [[rejected]]: any = await connection.execute('SELECT SUM(rejected_qty) AS quantity FROM goods_receipt_items WHERE purchase_order_item_id=?', [orderItemId]);
    assert(Number(received.received_qty) === 2000 && Number(stock.quantity) === 2000 && Number(spools.count) === 2, 'Penerimaan parsial tidak menyinkronkan batch, spool, atau received_qty.');
    assert(Number(rejected.quantity) === 200, 'Kuantitas penolakan tidak tersimpan.');

    const invoiceNumber = temp('INV');
    const [invoiceResult]: any = await connection.execute(
      `INSERT INTO supplier_invoices (business_unit_id,supplier_party_id,purchase_order_id,supplier_invoice_number,invoice_date,status_code,total_amount,paid_amount,balance_due,currency_code)
       VALUES (?,?,?, ?,CURDATE(),'unpaid',240000,0,240000,'IDR')`, [craft.id, supplierId, orderId, invoiceNumber],
    );
    const invoiceId = Number(invoiceResult.insertId);
    const [[ap]]: any = await connection.execute('SELECT balance_due FROM v_accounts_payable WHERE supplier_invoice_id=?', [invoiceId]);
    assert(Number(ap.balance_due) === 240000, 'Supplier invoice tidak tampil pada v_accounts_payable.');
    await connection.rollback();
    console.log('Smoke Craft Procurement passed (all writes rolled back).');
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); await pool.end(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
