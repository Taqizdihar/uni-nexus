const mysql = require("mysql2/promise");
async function main() {
  const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", password: "", database: "uni-nexus" });
  let ok = 0;
  
  try {
    const q = "SELECT o.id, o.order_code, p.party_kind as customer_type, sc.name as sales_channel_name FROM craft_orders o JOIN parties p ON o.customer_party_id = p.id JOIN sales_channels sc ON o.sales_channel_id = sc.id WHERE o.deleted_at IS NULL LIMIT 1";
    await conn.execute(q);
    console.log("getOrders query: OK"); ok++;
  } catch(e) { console.error("getOrders FAIL:", e.message); }

  try {
    await conn.execute("SELECT DISTINCT p.id, p.display_name, p.party_kind, p.email FROM parties p WHERE p.deleted_at IS NULL LIMIT 5");
    console.log("customers query: OK"); ok++;
  } catch(e) { console.error("customers FAIL:", e.message); }

  try {
    await conn.execute("SELECT id, name, sku, base_selling_price FROM products WHERE is_active = 1 AND deleted_at IS NULL LIMIT 5");
    console.log("products query: OK"); ok++;
  } catch(e) { console.error("products FAIL:", e.message); }

  try {
    const [r] = await conn.execute("SELECT id, code, name, method_type FROM payment_methods WHERE is_active = 1");
    console.log("payment_methods query: OK, count=" + r.length); ok++;
  } catch(e) { console.error("payment_methods FAIL:", e.message); }

  try {
    const [r] = await conn.execute("SELECT id, name, status_code FROM printers WHERE is_active = 1 AND deleted_at IS NULL AND status_code IN ('available','busy','maintenance','error','offline')");
    console.log("printers query: OK, count=" + r.length + (r[0] ? ", first=" + r[0].name : "")); ok++;
  } catch(e) { console.error("printers FAIL:", e.message); }

  try {
    const [r] = await conn.execute("SELECT id FROM business_units WHERE code = 'CRAFT' AND is_active = 1 LIMIT 1");
    console.log("BU resolver: OK, id=" + r[0].id); ok++;
  } catch(e) { console.error("BU resolver FAIL:", e.message); }

  try {
    const q = "SELECT o.full_name as created_by_name FROM users o LIMIT 1";
    await conn.execute(q.replace("o.full_name", "u.full_name").replace("users o", "users u"));
    console.log("full_name check: OK"); ok++;
  } catch(e) { console.error("full_name check FAIL:", e.message); }

  await conn.end();
  console.log("DONE. Passed " + ok + "/7");
}
main().catch(e => console.error("FATAL:", e.message));
