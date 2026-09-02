import { pool } from '../../config/database';
import type { PresenceActor, PresenceWorkspace } from './presence.types';

export const PRESENCE_TTL_SECONDS = 90;
const CLEANUP_AFTER_SECONDS = 60 * 60;
let lastCleanupAt = 0;

export class PresenceService {
  private async cleanup() {
    const now = Date.now();
    if (now - lastCleanupAt < CLEANUP_AFTER_SECONDS * 1000) return;
    lastCleanupAt = now;
    await pool.execute('DELETE FROM user_presence_sessions WHERE last_seen_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY)');
  }

  private async active(actor: PresenceActor) {
    const [rows]: any = await pool.execute(
      `SELECT u.id, u.full_name, u.avatar_path, r.code AS role_code, r.name AS role_name,
              GROUP_CONCAT(DISTINCT ups.workspace_code ORDER BY ups.workspace_code SEPARATOR ',') AS workspaces,
              MAX(ups.last_seen_at) AS last_seen_at
       FROM user_presence_sessions ups
       JOIN users u ON u.id = ups.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
       WHERE ups.organization_id = ? AND ups.left_at IS NULL
         AND ups.last_seen_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${PRESENCE_TTL_SECONDS} SECOND)
         AND u.status_code = 'active' AND u.approval_status_code = 'approved' AND u.deleted_at IS NULL
       GROUP BY u.id, u.full_name, u.avatar_path, r.code, r.name
       ORDER BY last_seen_at DESC, u.full_name`,
      [actor.organization_id],
    );
    const activeUsers = rows.map((row: any) => ({
      id: Number(row.id), full_name: row.full_name, avatar_path: row.avatar_path || null,
      role: row.role_code ? { code: row.role_code, name: row.role_name } : null,
      workspaces: String(row.workspaces || '').split(',').filter(Boolean),
      last_seen_at: row.last_seen_at, is_self: Number(row.id) === actor.id,
    }));
    return { active_users: activeUsers, active_count: activeUsers.length, ttl_seconds: PRESENCE_TTL_SECONDS, generated_at: new Date().toISOString() };
  }

  async heartbeat(actor: PresenceActor, sessionKey: string, workspace: PresenceWorkspace) {
    await this.cleanup();
    // A single atomic upsert avoids the race in a separate UPDATE-then-INSERT: two concurrent
    // heartbeats for the same session (e.g. rapid navigation firing overlapping requests) could
    // both see zero rows updated and then both attempt to INSERT, tripping the unique constraint
    // on (user_id, session_key) as an unhandled 500.
    await pool.execute(
      `INSERT INTO user_presence_sessions (organization_id, user_id, session_key, workspace_code, connected_at, last_seen_at, left_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), NULL)
       ON DUPLICATE KEY UPDATE workspace_code = VALUES(workspace_code), last_seen_at = VALUES(last_seen_at), left_at = NULL`,
      [actor.organization_id, actor.id, sessionKey, workspace],
    );
    return this.active(actor);
  }

  async list(actor: PresenceActor) {
    await this.cleanup();
    return this.active(actor);
  }

  async leave(actor: PresenceActor, sessionKey: string) {
    await pool.execute(
      `UPDATE user_presence_sessions SET left_at = UTC_TIMESTAMP(3)
       WHERE organization_id = ? AND user_id = ? AND session_key = ? AND left_at IS NULL`,
      [actor.organization_id, actor.id, sessionKey],
    );
    return this.active(actor);
  }
}
