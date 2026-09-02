import { randomUUID } from 'crypto';
import { pool } from '../src/config/database';
import { searchService } from '../src/modules/search/search.service';

async function main() {
  let partyId: number | null = null;
  let orderId: number | null = null;
  let channelId: number | null = null;
  let createdChannel = false;
  try {
    const [craftRows]: any = await pool.execute(`SELECT id, organization_id FROM business_units WHERE code='CRAFT' AND is_active=1 LIMIT 1`);
    if (!craftRows.length) throw new Error('No active CRAFT business unit is available to run this smoke test.');
    const craft = craftRows[0];
    const organizationId = Number(craft.organization_id);

    const marker = `SMOKESEARCH-${randomUUID().slice(0, 8)}`;

    const [existingChannel]: any = await pool.execute(`SELECT id FROM sales_channels WHERE business_unit_id=? LIMIT 1`, [craft.id]);
    if (existingChannel.length) {
      channelId = Number(existingChannel[0].id);
    } else {
      // An empty transactional database has no sales channel yet — create a throwaway one for this run only.
      const [channelInsert]: any = await pool.execute(
        `INSERT INTO sales_channels (business_unit_id, code, name, channel_type) VALUES (?, ?, ?, 'direct')`,
        [craft.id, marker, `${marker} Channel`],
      );
      channelId = Number(channelInsert.insertId);
      createdChannel = true;
    }
    const [partyInsert]: any = await pool.execute(
      `INSERT INTO parties (organization_id, code, party_kind, display_name, status_code) VALUES (?, ?, 'individual', ?, 'active')`,
      [organizationId, marker, `${marker} Customer`],
    );
    partyId = Number(partyInsert.insertId);
    await pool.execute(`INSERT INTO party_roles (party_id, business_unit_id, role_code) VALUES (?, ?, 'craft_customer')`, [partyId, craft.id]);

    const [orderInsert]: any = await pool.execute(
      `INSERT INTO craft_orders (business_unit_id, order_code, customer_party_id, sales_channel_id, order_date) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [craft.id, marker, partyId, channelId],
    );
    orderId = Number(orderInsert.insertId);

    // A user holding craft.orders.read must find the fixture order.
    const authorized = await searchService.search({ organizationId, permissions: ['craft.orders.read'], workspaceAccess: { craft: true, studio: false } }, marker);
    const found = authorized.results.find((item) => item.type === 'craft_order' && item.id === orderId);
    if (!found) throw new Error('Expected an authorized actor to find the fixture craft order.');
    if (found.route !== `/app/craft/orders/${orderId}`) throw new Error(`Unexpected result route: ${found.route}`);

    // A user without craft.orders.read must never see it, even though matching data exists.
    const unauthorized = await searchService.search({ organizationId, permissions: [], workspaceAccess: { craft: true, studio: false } }, marker);
    if (unauthorized.results.some((item) => item.type === 'craft_order')) throw new Error('Permission leakage: craft order surfaced to an actor without craft.orders.read.');
    if (Object.keys(unauthorized.categories).length !== 0) throw new Error('Permission leakage: category counts exposed without any granted permission.');

    // A user with an unrelated permission must not see the craft order either.
    const otherPermission = await searchService.search({ organizationId, permissions: ['studio.projects.read'], workspaceAccess: { craft: true, studio: false } }, marker);
    if (otherPermission.results.some((item) => item.type === 'craft_order')) throw new Error('Permission leakage: craft order surfaced to an actor holding only studio.projects.read.');

    // Below the minimum query length, no query should run regardless of permissions.
    const workspaceDenied = await searchService.search({ organizationId, permissions: ['craft.orders.read'], workspaceAccess: { craft: false, studio: false } }, marker);
    if (workspaceDenied.results.length || Object.keys(workspaceDenied.categories).length) throw new Error('Workspace leakage: Craft result or count surfaced without Craft access.');

    const tooShort = await searchService.search({ organizationId, permissions: ['craft.orders.read'], workspaceAccess: { craft: true, studio: false } }, marker.slice(0, 1));
    if (tooShort.results.length !== 0) throw new Error('Expected no results below the minimum query length.');

    console.log('Search smoke passed: authorized lookup, permission/workspace-scoped leakage prevention, and minimum query length.');
  } finally {
    if (orderId) await pool.execute('DELETE FROM craft_orders WHERE id=?', [orderId]);
    if (partyId) await pool.execute('DELETE FROM party_roles WHERE party_id=?', [partyId]);
    if (partyId) await pool.execute('DELETE FROM parties WHERE id=?', [partyId]);
    if (createdChannel && channelId) await pool.execute('DELETE FROM sales_channels WHERE id=?', [channelId]);
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
