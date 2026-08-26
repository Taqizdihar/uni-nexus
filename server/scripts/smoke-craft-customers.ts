import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { getCraftBusinessUnit } from '../src/modules/craft-orders/craft-orders.helpers';
import { CraftCustomersRepository } from '../src/modules/craft-customers/craft-customers.repository';
import { PartnerPricingService } from '../src/modules/craft-customers/partner-pricing.service';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };

async function smoke() {
  const craft = await getCraftBusinessUnit();
  const repository = new CraftCustomersRepository();
  const [permissions]: any = await pool.execute("SELECT code FROM permissions WHERE code IN ('craft.customers.read', 'craft.customers.write')");
  assert(permissions.length === 2, 'Customer permissions are missing.');
  const [existing]: any = await pool.execute("SELECT p.id, p.code, p.display_name FROM parties p JOIN party_roles pr ON pr.party_id = p.id WHERE p.organization_id = ? AND pr.business_unit_id = ? AND pr.role_code = 'craft_customer' LIMIT 1", [craft.organizationId, craft.id]);
  assert(existing.length > 0, 'No existing Craft customer found.');
  const list = await repository.getCustomers({ page: 1, limit: 24 }, craft);
  assert(list.items.some(customer => customer.id === Number(existing[0].id)), 'Existing Craft customer does not appear in the list contract.');
  const detail = await repository.getCustomer(Number(existing[0].id), craft);
  assert(detail?.code === existing[0].code, 'Existing customer detail contract failed.');
  const commercial = await repository.getCommercialSummary(Number(existing[0].id), craft);
  assert(typeof commercial.total_orders === 'number', 'Commercial summary contract failed.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const temporaryCode = `SMK-${randomUUID()}`;
    const [partyResult]: any = await connection.execute(
      "INSERT INTO parties (organization_id, code, party_kind, display_name, country_code, status_code) VALUES (?, ?, 'individual', 'Smoke Customer', 'ID', 'active')",
      [craft.organizationId, temporaryCode],
    );
    const partyId = Number(partyResult.insertId);
    await connection.execute("INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, 'craft_customer', 1)", [partyId, craft.id]);
    await connection.execute("INSERT INTO party_contacts (party_id, full_name, is_primary) VALUES (?, 'Contact A', 1)", [partyId]);
    const [secondContact]: any = await connection.execute("INSERT INTO party_contacts (party_id, full_name, is_primary) VALUES (?, 'Contact B', 0)", [partyId]);
    await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
    await connection.execute('UPDATE party_contacts SET is_primary = 1 WHERE id = ? AND party_id = ?', [Number(secondContact.insertId), partyId]);
    const [primaryRows]: any = await connection.execute('SELECT COUNT(*) AS primary_count FROM party_contacts WHERE party_id = ? AND is_primary = 1', [partyId]);
    assert(Number(primaryRows[0].primary_count) === 1, 'Primary contact contract failed.');

    const [products]: any = await connection.execute('SELECT id FROM products WHERE business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1', [craft.id]);
    if (products.length) {
      const productId = Number(products[0].id);
      await connection.execute("INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, 'craft_partner', 1)", [partyId, craft.id]);
      await connection.execute('INSERT INTO partner_price_rules (partner_party_id, product_id, minimum_qty, special_price, is_active) VALUES (?, ?, 50, 20000, 1)', [partyId, productId]);
      const resolved = await new PartnerPricingService().resolve(connection, partyId, productId, null, 50, craft.id);
      assert(resolved?.resolved_price === 20000, 'Partner price resolver contract failed.');
    }
    await connection.rollback();
    console.log(JSON.stringify({ ok: true, existing_customer: existing[0], list_total: list.meta.total, commercial }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

smoke().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exitCode = 1; });
