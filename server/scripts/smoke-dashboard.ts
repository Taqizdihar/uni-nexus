import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/config/database';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { PresenceService } from '../src/modules/presence/presence.service';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };

async function specialistActor() {
  const [rows]: any = await pool.execute(
    `SELECT u.id, u.organization_id
     FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
     JOIN role_permissions rp ON rp.role_id = r.id JOIN permissions p ON p.id = rp.permission_id
     WHERE r.code = 'SPECIALIST_STAFF' AND r.is_active = 1 AND p.code = 'dashboard.read'
       AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id = ubu.business_unit_id WHERE ubu.user_id = u.id AND ubu.can_access = 1 AND bu.code = 'CRAFT' AND bu.is_active = 1)
       AND EXISTS (SELECT 1 FROM user_business_units ubu JOIN business_units bu ON bu.id = ubu.business_unit_id WHERE ubu.user_id = u.id AND ubu.can_access = 1 AND bu.code = 'STUDIO' AND bu.is_active = 1)
     LIMIT 1`,
  );
  assert(rows.length, 'No active Specialist Staff user with Dashboard and Craft/Studio access exists.');
  const user = rows[0];
  const [permissions]: any = await pool.execute(
    `SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ?`, [user.id],
  );
  return { id: Number(user.id), organization_id: Number(user.organization_id), permissions: permissions.map((item: any) => String(item.code)) };
}

async function countAudits() {
  const [rows]: any = await pool.execute('SELECT COUNT(*) AS count FROM audit_logs');
  return Number(rows[0].count);
}

async function run() {
  const [roles]: any = await pool.execute(`SELECT id, code, name FROM roles WHERE code IN ('OPERATOR', 'SPECIALIST_STAFF') ORDER BY id`);
  const specialist = roles.find((role: any) => role.code === 'SPECIALIST_STAFF');
  assert(specialist?.name === 'Staf Spesialis', 'SPECIALIST_STAFF must be active with the Staf Spesialis display name.');
  assert(!roles.some((role: any) => role.code === 'OPERATOR'), 'The legacy OPERATOR replacement role still exists.');
  const [dashboardPermission]: any = await pool.execute(
    `SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ? AND p.code = 'dashboard.read'`,
    [specialist.id],
  );
  assert(dashboardPermission.length, 'SPECIALIST_STAFF lost dashboard.read.');

  const actor = await specialistActor();
  const restrictedActor = { ...actor, permissions: ['dashboard.read'] };
  const dashboard = new DashboardService();
  const beforeDashboardAudits = await countAudits();
  const overview = await dashboard.overview({ range: 'month' }, restrictedActor);
  const afterDashboardAudits = await countAudits();
  assert(beforeDashboardAudits === afterDashboardAudits, 'Dashboard overview created an audit row.');
  assert(overview.period.range === 'month' && overview.period.timezone === 'Asia/Jakarta', 'Dashboard period is invalid.');
  assert(overview.kpis.length === 4 && overview.cash_flow && overview.revenue_breakdown, 'Dashboard financial structure is not valid for a dashboard.read actor.');
  assert(overview.craft_summary && overview.studio_summary && Array.isArray(overview.production) && Array.isArray(overview.attention), 'Dashboard source summaries were hidden by module permissions.');
  assert(Object.values(overview.navigation).every(value => value === false), 'Navigation permissions were not separated from Dashboard data.');
  assert(overview.kpis.every((item: any) => Number.isFinite(item.value)), 'Dashboard financial KPIs contain invalid values.');
  const [financialActivity]: any = await pool.execute(`SELECT (SELECT COUNT(*) FROM financial_transactions WHERE organization_id = ?) + (SELECT COUNT(*) FROM treasury_accounts WHERE organization_id = ?) AS count`, [actor.organization_id, actor.organization_id]);
  if (Number(financialActivity[0].count) === 0) assert(overview.kpis.every((item: any) => item.value === 0), 'A true empty financial result must return zero-value KPIs.');

  const marker = `__dashboard_smoke_${randomUUID()}`;
  try {
    const [units]: any = await pool.execute(
      `SELECT bu.id, bu.code FROM business_units bu JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
       WHERE ubu.user_id = ? AND ubu.can_access = 1 AND bu.organization_id = ? AND bu.code IN ('CRAFT', 'STUDIO')`,
      [actor.id, actor.organization_id],
    );
    const craftId = Number(units.find((unit: any) => unit.code === 'CRAFT')?.id);
    const studioId = Number(units.find((unit: any) => unit.code === 'STUDIO')?.id);
    assert(Number.isFinite(craftId) && Number.isFinite(studioId), 'Smoke actor is missing an accessible Craft or Studio business unit.');
    await pool.execute(
      `INSERT INTO quick_links (organization_id, business_unit_id, label, url, icon_key, sort_order, is_active) VALUES
       (?, ?, ?, ?, 'store', 990001, 1), (?, ?, ?, ?, 'website', 990002, 1), (?, NULL, ?, ?, 'link', 990003, 1), (?, ?, ?, 'javascript:alert(1)', 'link', 990004, 1)`,
      [actor.organization_id, craftId, `${marker}_craft`, '/app/dashboard?smoke=craft', actor.organization_id, studioId, `${marker}_studio`, 'https://example.test/studio', actor.organization_id, `${marker}_shared`, 'https://example.test/shared', actor.organization_id, craftId, `${marker}_unsafe`],
    );
    const linksOverview = await dashboard.overview({ range: 'month' }, restrictedActor);
    const labels = (items: any[]) => items.map(item => item.label);
    assert(labels(linksOverview.quick_links.craft).includes(`${marker}_craft`), 'Craft Quick Link is missing from the Craft group.');
    assert(labels(linksOverview.quick_links.studio).includes(`${marker}_studio`), 'Studio Quick Link is missing from the Studio group.');
    assert(labels(linksOverview.quick_links.shared).includes(`${marker}_shared`), 'Shared Quick Link is missing from the shared group.');
    assert(!labels(linksOverview.quick_links.studio).includes(`${marker}_craft`), 'Craft Quick Link leaked into the Studio group.');
    assert(!Object.values(linksOverview.quick_links).flat().some((item: any) => item.label === `${marker}_unsafe` || item.url.startsWith('javascript:')), 'Unsafe Quick Link URL was returned.');
  } finally {
    await pool.execute('DELETE FROM quick_links WHERE organization_id = ? AND label LIKE ?', [actor.organization_id, `${marker}%`]);
  }

  const dashboardSource = await readFile(path.resolve(import.meta.dirname, '../../src/pages/global/Dashboard.tsx'), 'utf8');
  assert(!/LockKeyhole|Data arus kas tidak diizinkan|Data produksi tidak diizinkan|Data pesanan tidak diizinkan|Data proyek tidak diizinkan/.test(dashboardSource), 'Dashboard still contains a module-permission lock state.');
  assert(dashboardSource.includes('data-testid="quick-access-studio"') && dashboardSource.includes('data-testid="quick-access-craft"'), 'Dashboard Quick Access test selectors are missing.');

  const presence = new PresenceService();
  const sessionKey = randomUUID();
  const [peerRows]: any = await pool.execute(
    `SELECT id, organization_id FROM users WHERE organization_id = ? AND id <> ?
     AND status_code = 'active' AND approval_status_code = 'approved' AND deleted_at IS NULL LIMIT 1`,
    [actor.organization_id, actor.id],
  );
  const peer = peerRows[0] ? { id: Number(peerRows[0].id), organization_id: Number(peerRows[0].organization_id) } : null;
  const peerSessionKey = peer ? randomUUID() : null;
  const [beforeUser]: any = await pool.execute('SELECT updated_at FROM users WHERE id = ?', [actor.id]);
  const beforePresenceAudits = await countAudits();
  try {
    const first = await presence.heartbeat(actor, sessionKey, 'craft');
    const second = await presence.heartbeat(actor, sessionKey, 'studio');
    assert(first.ttl_seconds === 90 && second.active_count >= 1, 'Presence heartbeat did not return its active snapshot.');
    assert(second.active_users.filter((user: any) => user.id === actor.id).length === 1, 'Presence did not deduplicate the current user.');
    assert(second.active_users.every((user: any) => !('email' in user) && !('phone' in user) && !('session_key' in user)), 'Presence leaked private fields.');
    if (peer && peerSessionKey) {
      const withPeer = await presence.heartbeat(peer, peerSessionKey, 'craft');
      assert(withPeer.active_users.filter((user: any) => user.id === actor.id || user.id === peer.id).length === 2, 'Presence did not return two active users.');
    }
    await presence.leave(actor, sessionKey);
    const [sessionRows]: any = await pool.execute('SELECT left_at FROM user_presence_sessions WHERE user_id = ? AND session_key = ?', [actor.id, sessionKey]);
    assert(sessionRows.length === 1 && sessionRows[0].left_at, 'Presence leave did not mark the session as left.');
  } finally {
    await pool.execute('DELETE FROM user_presence_sessions WHERE user_id = ? AND session_key = ?', [actor.id, sessionKey]);
    if (peer && peerSessionKey) await pool.execute('DELETE FROM user_presence_sessions WHERE user_id = ? AND session_key = ?', [peer.id, peerSessionKey]);
  }
  const [afterUser]: any = await pool.execute('SELECT updated_at FROM users WHERE id = ?', [actor.id]);
  assert(String(beforeUser[0].updated_at) === String(afterUser[0].updated_at), 'Presence updated users.updated_at.');
  assert(beforePresenceAudits === await countAudits(), 'Presence heartbeat created audit rows.');
  console.log('Dashboard and presence smoke test passed.');
}

run().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exit(1); });
