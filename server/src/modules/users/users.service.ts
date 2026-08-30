import type { PoolConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import { AccountLifecycleService } from './account-lifecycle.service';
import type { ProfileStatusCode, UpdateProfileInput } from './users.schema';
import { UserResponse } from './users.types';
import { notificationService, notifyBestEffort } from '../../shared/notifications/notification.service';
import { AuditService } from '../../shared/audit/audit.service';

const SINGLETON_ROLES = ['CEO', 'COO', 'CTO'];
const domainConflict = (code: string, message: string) => new AppError(409, code, message);

const userSelect = `
  SELECT u.id, u.organization_id, u.full_name, u.username, u.email, u.phone,
         u.avatar_path, u.profile_banner_path, u.profile_status_code, u.default_workspace_code,
         u.status_code, u.approval_status_code, u.registration_source,
         u.approval_requested_at, u.approved_at, u.created_at, u.last_login_at, u.password_changed_at,
         r.code AS role_code, r.name AS role_name
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
`;

const asUserResponse = (row: any): UserResponse => {
  const { role_code, role_name, ...user } = row;
  return { ...user, role: role_code ? { code: role_code, name: role_name } : undefined } as UserResponse;
};

export class UsersService {
  static async getAuthPrincipal(id: number) {
    const [users] = await pool.execute<any[]>(
      `SELECT id, organization_id, full_name, username, email, phone, avatar_path, profile_banner_path,
              profile_status_code, status_code, approval_status_code, default_workspace_code, password_changed_at
       FROM users WHERE id = ? AND deleted_at IS NULL`, [id],
    );
    if (!users.length) return null;
    const user = users[0];
    const [roles] = await pool.execute<any[]>(
      `SELECT r.code, r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.is_active = 1 LIMIT 1`, [user.id],
    );
    const role = roles[0] || null;
    let permissions: string[] = [];
    if (role) {
      const [perms] = await pool.execute<any[]>(
        `SELECT DISTINCT p.code FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id WHERE ur.user_id = ?`, [user.id],
      );
      permissions = perms.map(permission => permission.code);
    }
    return { ...user, role, permissions };
  }

  static async getUsers(filters?: Record<string, unknown>): Promise<UserResponse[]> {
    let query = `${userSelect} WHERE u.deleted_at IS NULL`;
    const params: any[] = [];
    if (typeof filters?.approval_status_code === 'string') { query += ' AND u.approval_status_code = ?'; params.push(filters.approval_status_code); }
    if (typeof filters?.status_code === 'string') { query += ' AND u.status_code = ?'; params.push(filters.status_code); }
    query += ' ORDER BY u.created_at DESC';
    const [rows] = await pool.execute<any[]>(query, params);
    return rows.map(asUserResponse);
  }

  static async getUserById(id: number): Promise<UserResponse> {
    const [rows] = await pool.execute<any[]>(`${userSelect} WHERE u.id = ? AND u.deleted_at IS NULL`, [id]);
    if (!rows.length) throw new NotFoundError('Pengguna tidak ditemukan.');
    return asUserResponse(rows[0]);
  }

  static async getAvailableRoles(forUserId?: number) {
    const [roles] = await pool.execute<any[]>(
      'SELECT id, code, name FROM roles WHERE is_active = 1 AND code IN ("CEO", "COO", "CTO", "SPECIALIST_STAFF", "ENGINEER_3D")',
    );
    const available: any[] = [];
    for (const role of roles) {
      if (!SINGLETON_ROLES.includes(role.code)) { available.push(role); continue; }
      const [occupants] = await pool.execute<any[]>(
        `SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id
         WHERE ur.role_id = ? AND u.deleted_at IS NULL`, [role.id],
      );
      if (!occupants.length || (forUserId !== undefined && occupants.some(occupant => Number(occupant.id) === forUserId))) available.push(role);
    }
    return available;
  }

  /** Shares normal approval and reactivation role/access invariants in one transaction. */
  static async assignRoleAndBusinessUnitAccess(connection: PoolConnection, userId: number, roleCode: string, managerId: number) {
    const [roles] = await connection.execute<any[]>('SELECT id, code FROM roles WHERE code = ? AND is_active = 1 FOR UPDATE', [roleCode]);
    if (!roles.length) throw new AppError(400, 'ROLE_INVALID', 'Role tidak valid.');
    const role = roles[0];
    if (SINGLETON_ROLES.includes(role.code)) {
      const [occupants] = await connection.execute<any[]>(
        `SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id
         WHERE ur.role_id = ? AND u.deleted_at IS NULL FOR UPDATE`, [role.id],
      );
      if (occupants.some(occupant => Number(occupant.id) !== userId)) {
        throw domainConflict('ROLE_ALREADY_OCCUPIED', `Role ${roleCode} sudah digunakan oleh pengguna lain.`);
      }
    }
    await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await connection.execute('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [userId, role.id, managerId]);
    const [businessUnits] = await connection.execute<any[]>('SELECT id FROM business_units WHERE is_active = 1');
    await connection.execute('DELETE FROM user_business_units WHERE user_id = ?', [userId]);
    for (const businessUnit of businessUnits) {
      await connection.execute('INSERT INTO user_business_units (user_id, business_unit_id, can_access) VALUES (?, ?, 1)', [userId, businessUnit.id]);
    }
  }

  static async approveUser(id: number, roleCode: string, managerId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>('SELECT id, organization_id, username, full_name, status_code, approval_status_code, deleted_at FROM users WHERE id = ? FOR UPDATE', [id]);
      if (!users.length || users[0].deleted_at !== null) throw new NotFoundError('Pengguna tidak ditemukan.');
      await this.assignRoleAndBusinessUnitAccess(connection, id, roleCode, managerId);
      await connection.execute(
        `UPDATE users SET approval_status_code = 'approved', status_code = 'active', approved_by = ?, approved_at = CURRENT_TIMESTAMP(3),
         rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL WHERE id = ?`, [managerId, id],
      );
      await notifyBestEffort(() => notificationService.createForUser(id, {
        organizationId: Number(users[0].organization_id), notificationType: 'system', moduleCode: 'users', severityCode: 'success',
        title: 'Akun Anda disetujui', message: 'Akun UNI-NEXUS Anda telah aktif. Selamat datang!',
        actionUrl: '/app/dashboard', entityType: 'user', entityId: id,
      }, {}, connection));
      await this.audit(connection, Number(users[0].organization_id), managerId, 'approval', `Menyetujui akun ${users[0].full_name}.`, {
        entityType: 'user', entityId: id, entityCode: users[0].username,
        oldValues: { status_code: users[0].status_code, approval_status_code: users[0].approval_status_code },
        newValues: { status_code: 'active', approval_status_code: 'approved', role_code: roleCode },
      });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  static async rejectUser(id: number, managerId: number, reason?: string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>('SELECT id, organization_id, username, full_name, status_code, approval_status_code FROM users WHERE id=? AND deleted_at IS NULL FOR UPDATE', [id]);
      if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
      const target = users[0];
      await connection.execute(`UPDATE users SET approval_status_code = 'rejected', status_code = 'inactive', rejected_by = ?, rejected_at = CURRENT_TIMESTAMP(3), rejection_reason = ? WHERE id = ?`, [managerId, reason?.trim() || null, id]);
      await this.audit(connection, Number(target.organization_id), managerId, 'rejection', `Menolak akun ${target.full_name}.`, {
        entityType: 'user', entityId: id, entityCode: target.username,
        oldValues: { status_code: target.status_code, approval_status_code: target.approval_status_code },
        newValues: { status_code: 'inactive', approval_status_code: 'rejected' },
      });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  static async updateStatus(id: number, statusCode: string, managerId: number) {
    if (!['active', 'inactive', 'suspended'].includes(statusCode)) throw new AppError(400, 'STATUS_INVALID', 'Status pengguna tidak valid.');
    if (id === managerId) {
      const principal = await this.getAuthPrincipal(managerId);
      if (principal?.role?.code === 'CTO') throw new AppError(403, 'CTO_SELF_PROTECTION', 'Akun Chief Technology Officer tidak dapat mengubah status dirinya sendiri.');
      throw new AppError(403, 'CANNOT_SELF_MODIFY', 'Anda tidak dapat mengubah status akun sendiri.');
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>('SELECT id, organization_id, username, full_name, status_code FROM users WHERE id=? AND deleted_at IS NULL FOR UPDATE', [id]);
      if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
      const target = users[0];
      await connection.execute('UPDATE users SET status_code = ? WHERE id = ?', [statusCode, id]);
      await this.audit(connection, Number(target.organization_id), managerId, 'status_change', `Mengubah status akun ${target.full_name}.`, {
        entityType: 'user', entityId: id, entityCode: target.username, oldValues: { status_code: target.status_code }, newValues: { status_code: statusCode },
      });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  static async updateRole(id: number, roleCode: string, managerId: number) {
    if (id === managerId) {
      const principal = await this.getAuthPrincipal(managerId);
      if (principal?.role?.code === 'CTO') throw new AppError(403, 'CTO_SELF_PROTECTION', 'Akun Chief Technology Officer tidak dapat mengubah peran dirinya sendiri.');
      throw new AppError(403, 'CANNOT_SELF_MODIFY', 'Anda tidak dapat mengubah peran akun sendiri.');
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>(`SELECT u.id,u.organization_id,u.username,u.full_name,u.deleted_at,r.code AS role_code
        FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id AND r.is_active=1 WHERE u.id = ? FOR UPDATE`, [id]);
      if (!users.length || users[0].deleted_at !== null) throw new NotFoundError('Pengguna tidak ditemukan.');
      await this.assignRoleAndBusinessUnitAccess(connection, id, roleCode, managerId);
      await this.audit(connection, Number(users[0].organization_id), managerId, 'role_change', `Mengubah role ${users[0].full_name}.`, {
        entityType: 'user', entityId: id, entityCode: users[0].username, oldValues: { role_code: users[0].role_code || null }, newValues: { role_code: roleCode },
      });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  static async softDeleteUser(id: number, managerId: number) {
    if (id === managerId) {
      const principal = await this.getAuthPrincipal(managerId);
      if (principal?.role?.code === 'CTO') throw new AppError(403, 'CTO_SELF_PROTECTION', 'Akun Chief Technology Officer tidak dapat menghapus dirinya sendiri.');
      throw new AppError(403, 'CANNOT_SELF_DELETE', 'Anda tidak dapat menghapus akun sendiri.');
    }
    const manager = await this.getAuthPrincipal(managerId);
    if (!manager) throw new NotFoundError('Pengelola tidak ditemukan.');
    const connection = await pool.getConnection();
    let media: { avatar_path: string | null; profile_banner_path: string | null } | null = null;
    try {
      await connection.beginTransaction();
      media = await AccountLifecycleService.archiveUser(connection, id, managerId, manager.organization_id);
      await this.audit(connection, manager.organization_id, managerId, 'account_delete', 'Account archived by management', { entityType: 'user', entityId: id });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    for (const key of [media?.avatar_path, media?.profile_banner_path]) await storageService.delete(key).catch(() => undefined);
  }

  static async updateProfile(id: number, data: UpdateProfileInput): Promise<UserResponse> {
    const provided = Object.entries(data).filter(([, value]) => value !== undefined);
    if (!provided.length) throw new AppError(400, 'PROFILE_UPDATE_EMPTY', 'Tidak ada perubahan profil untuk disimpan.');
    const [currentRows] = await pool.execute<any[]>('SELECT id, organization_id, full_name, username, email, phone, default_workspace_code FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!currentRows.length) throw new NotFoundError('Pengguna tidak ditemukan.');
    const current = currentRows[0];
    const next = {
      full_name: data.full_name !== undefined ? data.full_name.trim() : current.full_name,
      username: data.username !== undefined ? data.username.trim() : current.username,
      email: data.email !== undefined ? data.email.trim().toLowerCase() : current.email,
      phone: data.phone !== undefined ? (data.phone.trim() || null) : current.phone,
      default_workspace_code: data.default_workspace_code !== undefined ? data.default_workspace_code : current.default_workspace_code,
    };
    const [identityRows] = await pool.execute<any[]>(
      'SELECT id, username, email, deleted_at FROM users WHERE (username = ? OR email = ?) AND id != ?', [next.username, next.email, id],
    );
    for (const conflictRow of identityRows) {
      if (conflictRow.email === next.email) throw domainConflict(conflictRow.deleted_at === null ? 'EMAIL_ALREADY_REGISTERED' : 'ARCHIVED_EMAIL_CONFLICT', conflictRow.deleted_at === null ? 'Email sudah terdaftar.' : 'Email terikat pada akun yang diarsipkan.');
      if (conflictRow.username === next.username) throw domainConflict(conflictRow.deleted_at === null ? 'USERNAME_ALREADY_USED' : 'ARCHIVED_USERNAME_CONFLICT', conflictRow.deleted_at === null ? 'Username sudah digunakan.' : 'Username terikat pada akun yang diarsipkan.');
    }
    try {
      await pool.execute(
        'UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, default_workspace_code = ? WHERE id = ? AND deleted_at IS NULL',
        [next.full_name, next.username, next.email, next.phone, next.default_workspace_code, id],
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') throw domainConflict('PROFILE_IDENTITY_CONFLICT', 'Email atau username sudah digunakan oleh akun lain.');
      throw error;
    }
    await this.audit(pool as unknown as PoolConnection, current.organization_id, id, 'profile.update', 'Profile updated', {
      entityType: 'user', entityId: id, entityCode: next.username,
      oldValues: { full_name: current.full_name, username: current.username, email: current.email, phone: current.phone, default_workspace_code: current.default_workspace_code },
      newValues: { full_name: next.full_name, username: next.username, email: next.email, phone: next.phone, default_workspace_code: next.default_workspace_code },
    });
    return this.getUserById(id);
  }

  static async updateProfileStatus(id: number, status: ProfileStatusCode): Promise<UserResponse> {
    if (!['default', 'busy', 'sick', 'leave'].includes(status)) throw new AppError(400, 'PROFILE_STATUS_INVALID', 'Status profil tidak valid.');
    const [before] = await pool.execute<any[]>('SELECT organization_id, username, profile_status_code FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    const [result] = await pool.execute<any>('UPDATE users SET profile_status_code = ? WHERE id = ? AND deleted_at IS NULL', [status, id]);
    if (!result.affectedRows) throw new NotFoundError('Pengguna tidak ditemukan.');
    await this.audit(pool as unknown as PoolConnection, Number(before[0].organization_id), id, 'profile.status_change', 'Profile status updated', { entityType: 'user', entityId: id, entityCode: before[0].username, oldValues: { profile_status_code: before[0].profile_status_code }, newValues: { profile_status_code: status } });
    return this.getUserById(id);
  }

  static async changePassword(id: number, data: { currentPassword: string; newPassword: string }) {
    const [users] = await pool.execute<any[]>('SELECT password_hash, organization_id FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
    if (!(await bcrypt.compare(data.currentPassword, users[0].password_hash))) throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Kata sandi saat ini tidak valid.');
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP(3), must_change_password = 0 WHERE id = ?', [passwordHash, id]);
    await this.audit(pool as unknown as PoolConnection, users[0].organization_id, id, 'profile.password_change', 'Password changed', { entityType: 'user', entityId: id, newValues: { password_changed: true } });
  }

  private static async replaceProfileMedia(id: number, column: 'avatar_path' | 'profile_banner_path', policy: 'avatar' | 'profile_banner', file: Express.Multer.File) {
    const saved = await storageService.saveUploadedFile(policy, file);
    const connection = await pool.getConnection();
    let previous: string | null = null;
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>(`SELECT ${column}, organization_id FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE`, [id]);
      if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
      previous = users[0][column] || null;
      await connection.execute(`UPDATE users SET ${column} = ? WHERE id = ?`, [saved.key, id]);
      await this.audit(connection, users[0].organization_id, id, column === 'avatar_path' ? 'profile.avatar_update' : 'profile.banner_update', 'Profile media updated', { entityType: 'user', entityId: id, oldValues: { has_media: Boolean(previous) }, newValues: { has_media: true } });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      await storageService.delete(saved.key).catch(() => undefined);
      throw error;
    } finally { connection.release(); }
    await storageService.delete(previous).catch(error => console.warn('Old profile media cleanup failed:', error instanceof Error ? error.message : 'unknown error'));
    return this.getUserById(id);
  }

  private static async deleteProfileMedia(id: number, column: 'avatar_path' | 'profile_banner_path') {
    const connection = await pool.getConnection();
    let previous: string | null = null;
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<any[]>(`SELECT ${column}, organization_id FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE`, [id]);
      if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
      previous = users[0][column] || null;
      await connection.execute(`UPDATE users SET ${column} = NULL WHERE id = ?`, [id]);
      await this.audit(connection, users[0].organization_id, id, column === 'avatar_path' ? 'profile.avatar_delete' : 'profile.banner_delete', 'Profile media deleted', { entityType: 'user', entityId: id, oldValues: { has_media: Boolean(previous) }, newValues: { has_media: false } });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    await storageService.delete(previous).catch(error => console.warn('Profile media cleanup failed after committed deletion:', error instanceof Error ? error.message : 'unknown error'));
    return this.getUserById(id);
  }

  static replaceAvatar(id: number, file: Express.Multer.File) { return this.replaceProfileMedia(id, 'avatar_path', 'avatar', file); }
  static deleteAvatar(id: number) { return this.deleteProfileMedia(id, 'avatar_path'); }
  static replaceBanner(id: number, file: Express.Multer.File) { return this.replaceProfileMedia(id, 'profile_banner_path', 'profile_banner', file); }
  static deleteBanner(id: number) { return this.deleteProfileMedia(id, 'profile_banner_path'); }

  private static async audit(connection: Pick<PoolConnection, 'execute'>, organizationId: number, userId: number, actionCode: string, description: string, details: { entityType?: string; entityId?: number; entityCode?: string | null; oldValues?: unknown; newValues?: unknown } = {}) {
    await AuditService.write({ organizationId, userId, moduleCode: 'users', actionCode, description, ...details }, connection);
  }
}
