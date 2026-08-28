import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/config/database';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { PresenceService } from '../src/modules/presence/presence.service';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };

async function dashboardActor() {
  const [rows]: any = await pool.execute(
    `SELECT u.id, u.organization_id, GROUP_CONCAT(DISTINCT p.code SEPARATOR ',') AS permissions
     FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL AND p.code = 'dashboard.read'
     GROUP BY u.id, u.organization_id LIMIT 1`,
  );
  assert(rows.length, 'No active user has dashboard.read.');
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
  const actor = await dashboardActor();
  const dashboard = new DashboardService();
  const beforeDashboardAudits = await countAudits();
  const overview = await dashboard.overview({ range: 'month' }, actor);
  const afterDashboardAudits = await countAudits();
  assert(beforeDashboardAudits === afterDashboardAudits, 'Dashboard overview created an audit row.');
  assert(overview.period.range === 'month' && overview.period.timezone === 'Asia/Jakarta', 'Dashboard period is invalid.');
  assert(overview.kpis.length === 0 || overview.kpis.length === 4, 'Dashboard KPI shape is invalid.');
  const dashboardSource = await readFile(path.resolve(import.meta.dirname, '../../src/pages/global/Dashboard.tsx'), 'utf8');
  assert(!/mockKPIs|revenueData|mockOrders|mockProjects|mockPrinters|href="#"/.test(dashboardSource), 'Dashboard still contains a mock dependency or dead link.');

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
