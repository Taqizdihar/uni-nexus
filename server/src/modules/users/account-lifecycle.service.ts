import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import { UsersService } from './users.service';

const EXECUTIVE_ROLES = new Set(['CEO', 'COO', 'CTO']);
type Reviewer = { id: number; organization_id: number; role?: { code: string } | null };
type MediaKeys = { avatar_path: string | null; profile_banner_path: string | null };

const conflict = (code: string, message: string) => new AppError(409, code, message);
const cleanupMedia = async (media: MediaKeys) => {
  for (const key of [media.avatar_path, media.profile_banner_path]) {
    await storageService.delete(key).catch(error => console.warn('Profile media cleanup failed after committed archival:', error instanceof Error ? error.message : 'unknown error'));
  }
};

export class AccountLifecycleService {
  private static assertExecutive(reviewer: Reviewer) {
    if (!reviewer.role?.code || !EXECUTIVE_ROLES.has(reviewer.role.code)) {
      throw new AppError(403, 'EXECUTIVE_REVIEW_REQUIRED', 'Hanya CEO, COO, atau CTO yang dapat meninjau pengajuan ini.');
    }
  }

  private static async audit(connection: PoolConnection, organizationId: number, actorId: number | null, action: string, entityType: string, entityId: number, description: string) {
    await connection.execute(
      `INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, entity_type, entity_id, description)
       VALUES (?, ?, 'users', ?, ?, ?, ?)`,
      [organizationId, actorId, action, entityType, entityId, description],
    );
  }

  /** A shared archive primitive. The transaction remains owned by the caller. */
  static async archiveUser(connection: PoolConnection, userId: number, actorId: number, organizationId: number): Promise<MediaKeys> {
    const [users] = await connection.execute<any[]>(
      `SELECT id, status_code, deleted_at, avatar_path, profile_banner_path
       FROM users WHERE id = ? FOR UPDATE`, [userId],
    );
    if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
    if (users[0].deleted_at !== null) throw conflict('ACCOUNT_ALREADY_ARCHIVED', 'Akun ini sudah diarsipkan.');
    const media = { avatar_path: users[0].avatar_path || null, profile_banner_path: users[0].profile_banner_path || null };
    await connection.execute(
      `UPDATE users SET status_code = 'inactive', deleted_at = CURRENT_TIMESTAMP(3),
       avatar_path = NULL, profile_banner_path = NULL WHERE id = ?`, [userId],
    );
    await connection.execute(
      `UPDATE user_presence_sessions SET left_at = UTC_TIMESTAMP(3)
       WHERE organization_id = ? AND user_id = ? AND left_at IS NULL`, [organizationId, userId],
    );
    await connection.execute('UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
    return media;
  }

  static async createDeletionRequest(actor: Reviewer, reason?: string | null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>(
        'SELECT id, deleted_at FROM users WHERE id = ? FOR UPDATE', [actor.id],
      );
      if (!users.length || users[0].deleted_at !== null) throw new NotFoundError('Pengguna tidak ditemukan.');
      const [existing] = await connection.execute<any[]>(
        `SELECT id FROM user_deletion_requests WHERE user_id = ? AND status_code = 'pending' FOR UPDATE`, [actor.id],
      );
      if (existing.length) throw conflict('DELETION_REQUEST_ALREADY_PENDING', 'Anda sudah memiliki pengajuan penghapusan yang menunggu peninjauan.');
      const cleanReason = reason?.trim() || null;
      const [result] = await connection.execute<any>(
        `INSERT INTO user_deletion_requests (organization_id, user_id, request_reason, status_code)
         VALUES (?, ?, ?, 'pending')`, [actor.organization_id, actor.id, cleanReason],
      );
      await this.audit(connection, actor.organization_id, actor.id, 'account.deletion_request', 'user_deletion_request', result.insertId, 'Account deletion requested');
      await connection.commit();
      return this.getCurrentDeletionRequest(actor.id);
    } catch (error: any) {
      await connection.rollback();
      if (error?.code === 'ER_DUP_ENTRY') throw conflict('DELETION_REQUEST_ALREADY_PENDING', 'Anda sudah memiliki pengajuan penghapusan yang menunggu peninjauan.');
      throw error;
    } finally { connection.release(); }
  }

  static async getCurrentDeletionRequest(userId: number) {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, status_code, request_reason, requested_at, revoked_at
       FROM user_deletion_requests WHERE user_id = ? AND status_code = 'pending'
       ORDER BY requested_at DESC LIMIT 1`, [userId],
    );
    return rows[0] || null;
  }

  static async revokeDeletionRequest(actor: Reviewer) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<any[]>(
        `SELECT id, status_code FROM user_deletion_requests
         WHERE user_id = ? AND status_code = 'pending' ORDER BY requested_at DESC LIMIT 1 FOR UPDATE`, [actor.id],
      );
      if (!rows.length) throw new AppError(404, 'DELETION_REQUEST_NOT_FOUND', 'Pengajuan penghapusan yang menunggu tidak ditemukan.');
      await connection.execute(
        `UPDATE user_deletion_requests SET status_code = 'revoked', revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [rows[0].id],
      );
      await this.audit(connection, actor.organization_id, actor.id, 'account.deletion_request_revoke', 'user_deletion_request', rows[0].id, 'Account deletion request revoked');
      await connection.commit();
      return { id: rows[0].id, status_code: 'revoked' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  static async listDeletionRequests() {
    const [rows] = await pool.execute<any[]>(
      `SELECT dr.id, dr.user_id, dr.status_code, dr.request_reason, dr.requested_at,
              u.full_name, u.username, u.email, u.avatar_path, u.profile_status_code,
              r.code AS role_code, r.name AS role_name
       FROM user_deletion_requests dr
       JOIN users u ON u.id = dr.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
       WHERE dr.status_code = 'pending'
       ORDER BY dr.requested_at ASC`,
    );
    return rows.map(row => ({ ...row, role: row.role_code ? { code: row.role_code, name: row.role_name } : null }));
  }

  static async reviewDeletionRequest(reviewer: Reviewer, requestId: number, decision: 'approve' | 'reject', reviewNote?: string) {
    this.assertExecutive(reviewer);
    const connection = await pool.getConnection();
    let media: MediaKeys | null = null;
    try {
      await connection.beginTransaction();
      const [requests] = await connection.execute<any[]>(
        'SELECT * FROM user_deletion_requests WHERE id = ? FOR UPDATE', [requestId],
      );
      if (!requests.length) throw new AppError(404, 'DELETION_REQUEST_NOT_FOUND', 'Pengajuan penghapusan tidak ditemukan.');
      const request = requests[0];
      if (request.status_code !== 'pending') throw conflict('DELETION_REQUEST_NOT_PENDING', 'Pengajuan ini tidak lagi dapat ditinjau.');
      if (Number(request.user_id) === reviewer.id) throw new AppError(403, 'CANNOT_REVIEW_OWN_DELETION', 'Anda tidak dapat meninjau pengajuan penghapusan akun sendiri.');
      if (decision === 'approve') {
        media = await this.archiveUser(connection, Number(request.user_id), reviewer.id, reviewer.organization_id);
        await connection.execute(
          `UPDATE user_deletion_requests SET status_code = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3), review_note = ? WHERE id = ?`,
          [reviewer.id, reviewNote?.trim() || null, requestId],
        );
      } else {
        await connection.execute(
          `UPDATE user_deletion_requests SET status_code = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3), review_note = ? WHERE id = ?`,
          [reviewer.id, reviewNote?.trim() || null, requestId],
        );
      }
      await this.audit(connection, reviewer.organization_id, reviewer.id, decision === 'approve' ? 'account.deletion_request_approve' : 'account.deletion_request_reject', 'user_deletion_request', requestId, `Account deletion request ${decision}d`);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    if (media) await cleanupMedia(media);
    return { id: requestId, status_code: decision === 'approve' ? 'approved' : 'rejected' };
  }

  static async createReactivationRequest(input: {
    organization_id: number; deleted_user_id: number; full_name: string; username: string; email: string;
    password_hash: string; phone: string | null; default_workspace_code: 'craft' | 'studio';
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [archived] = await connection.execute<any[]>(
        'SELECT id, organization_id, email, deleted_at FROM users WHERE id = ? FOR UPDATE', [input.deleted_user_id],
      );
      if (!archived.length || archived[0].deleted_at === null || archived[0].email !== input.email) {
        throw conflict('ARCHIVED_EMAIL_CONFLICT', 'Email arsip tidak lagi dapat diajukan untuk aktivasi ulang.');
      }
      const organizationId = Number(archived[0].organization_id);
      const [conflicts] = await connection.execute<any[]>(
        'SELECT id FROM users WHERE username = ? AND id != ? FOR UPDATE', [input.username, input.deleted_user_id],
      );
      if (conflicts.length) throw conflict('USERNAME_ALREADY_USED', 'Username sudah digunakan oleh akun lain.');
      const [pending] = await connection.execute<any[]>(
        `SELECT id FROM user_reactivation_requests WHERE deleted_user_id = ? AND status_code = 'pending' FOR UPDATE`, [input.deleted_user_id],
      );
      if (pending.length) throw conflict('ACCOUNT_REACTIVATION_ALREADY_PENDING', 'Pengajuan aktivasi ulang untuk akun ini sudah menunggu peninjauan.');
      const [result] = await connection.execute<any>(
        `INSERT INTO user_reactivation_requests
         (organization_id, deleted_user_id, requested_full_name, requested_username, requested_email, requested_password_hash, requested_phone, requested_default_workspace_code, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [organizationId, input.deleted_user_id, input.full_name, input.username, input.email, input.password_hash, input.phone, input.default_workspace_code],
      );
      await this.audit(connection, organizationId, input.deleted_user_id, 'account.reactivation_request', 'user_reactivation_request', result.insertId, 'Account reactivation requested');
      await connection.commit();
      return { id: result.insertId, reactivationRequired: true, reactivationPending: true, approvalRequired: true, code: 'ACCOUNT_REACTIVATION_REQUESTED' };
    } catch (error: any) {
      await connection.rollback();
      if (error?.code === 'ER_DUP_ENTRY') throw conflict('ACCOUNT_REACTIVATION_ALREADY_PENDING', 'Pengajuan aktivasi ulang untuk akun ini sudah menunggu peninjauan.');
      throw error;
    } finally { connection.release(); }
  }

  static async listReactivationRequests() {
    const [rows] = await pool.execute<any[]>(
      `SELECT rr.id, rr.deleted_user_id, rr.requested_full_name, rr.requested_username, rr.requested_email,
              rr.requested_phone, rr.requested_default_workspace_code, rr.status_code, rr.requested_at,
              u.full_name AS archived_full_name, u.username AS archived_username, u.email AS archived_email,
              u.avatar_path, r.code AS archived_role_code, r.name AS archived_role_name
       FROM user_reactivation_requests rr
       JOIN users u ON u.id = rr.deleted_user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
       WHERE rr.status_code = 'pending'
       ORDER BY rr.requested_at ASC`,
    );
    return rows.map(row => ({ ...row, archived_role: row.archived_role_code ? { code: row.archived_role_code, name: row.archived_role_name } : null }));
  }

  static async reviewReactivationRequest(reviewer: Reviewer, requestId: number, decision: 'approve' | 'reject', roleCode?: string, reviewNote?: string) {
    this.assertExecutive(reviewer);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [requests] = await connection.execute<any[]>('SELECT * FROM user_reactivation_requests WHERE id = ? FOR UPDATE', [requestId]);
      if (!requests.length) throw new AppError(404, 'REACTIVATION_REQUEST_NOT_FOUND', 'Pengajuan aktivasi ulang tidak ditemukan.');
      const request = requests[0];
      if (request.status_code !== 'pending') throw conflict('REACTIVATION_REQUEST_NOT_PENDING', 'Pengajuan ini tidak lagi dapat ditinjau.');
      const [users] = await connection.execute<any[]>('SELECT id, email, deleted_at FROM users WHERE id = ? FOR UPDATE', [request.deleted_user_id]);
      if (!users.length || users[0].deleted_at === null || users[0].email !== request.requested_email) {
        throw conflict('REACTIVATION_REQUEST_NOT_PENDING', 'Akun arsip tidak lagi cocok dengan pengajuan aktivasi ulang ini.');
      }
      if (decision === 'reject') {
        await connection.execute(
          `UPDATE user_reactivation_requests SET status_code = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3), review_note = ?, requested_password_hash = NULL WHERE id = ?`,
          [reviewer.id, reviewNote?.trim() || null, requestId],
        );
        await this.audit(connection, reviewer.organization_id, reviewer.id, 'account.reactivation_reject', 'user_reactivation_request', requestId, 'Account reactivation request rejected');
      } else {
        if (!roleCode) throw new AppError(400, 'ROLE_REQUIRED', 'Pilih peran untuk akun yang diaktifkan kembali.');
        if (!request.requested_password_hash) throw conflict('REACTIVATION_REQUEST_NOT_PENDING', 'Data kata sandi pengajuan tidak tersedia.');
        const [conflicts] = await connection.execute<any[]>('SELECT id FROM users WHERE username = ? AND id != ? FOR UPDATE', [request.requested_username, request.deleted_user_id]);
        if (conflicts.length) throw conflict('USERNAME_ALREADY_USED', 'Username sudah digunakan oleh akun lain.');
        await UsersService.assignRoleAndBusinessUnitAccess(connection, Number(request.deleted_user_id), roleCode, reviewer.id);
        await connection.execute(
          `UPDATE users SET full_name = ?, username = ?, email = ?, password_hash = ?, phone = ?, default_workspace_code = ?,
           status_code = 'active', approval_status_code = 'approved', registration_source = 'reactivation',
           deleted_at = NULL, rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL,
           approved_by = ?, approved_at = CURRENT_TIMESTAMP(3), must_change_password = 0, profile_status_code = 'default'
           WHERE id = ?`,
          [request.requested_full_name, request.requested_username, request.requested_email, request.requested_password_hash, request.requested_phone, request.requested_default_workspace_code, reviewer.id, request.deleted_user_id],
        );
        await connection.execute(
          `UPDATE user_reactivation_requests SET status_code = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3), review_note = ?, requested_password_hash = NULL WHERE id = ?`,
          [reviewer.id, reviewNote?.trim() || null, requestId],
        );
        await this.audit(connection, reviewer.organization_id, reviewer.id, 'account.reactivation_approve', 'user_reactivation_request', requestId, 'Account reactivation request approved');
      }
      await connection.commit();
      return { id: requestId, status_code: decision === 'approve' ? 'approved' : 'rejected' };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
}
