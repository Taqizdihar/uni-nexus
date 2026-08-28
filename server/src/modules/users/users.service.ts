import { readFile } from 'fs/promises';
import { pool } from '../../config/database';
import { AppError, ValidationError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError';
import { getStoragePolicy, normalizeAvatarImage, storageService, validateAgainstPolicy } from '../../shared/storage';
import { UserResponse } from './users.types';
import bcrypt from 'bcryptjs';

export class UsersService {
  static async getAuthPrincipal(id: number): Promise<any> {
    const [users] = await pool.execute<any[]>(
      'SELECT id, organization_id, full_name, username, email, phone, avatar_path, status_code, approval_status_code, default_workspace_code FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (!users || users.length === 0) {
      return null;
    }

    const user = users[0];

    const [roles] = await pool.execute<any[]>(
      `SELECT r.code, r.name 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.is_active = 1
       LIMIT 1`,
      [user.id]
    );
    
    const role = roles[0] || null;
    let permissions: string[] = [];
    
    if (role) {
       const [perms] = await pool.execute<any[]>(
         `SELECT p.code 
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          JOIN user_roles ur ON rp.role_id = ur.role_id
          WHERE ur.user_id = ?`,
         [user.id]
       );
       permissions = perms.map(p => p.code);
    }
    
    return {
       ...user,
       role,
       permissions
    };
  }
  static async getUsers(filters?: any): Promise<UserResponse[]> {
    let query = `
      SELECT u.id, u.organization_id, u.full_name, u.username, u.email, u.phone, 
             u.avatar_path, u.status_code, u.approval_status_code, u.registration_source, 
             u.approval_requested_at, u.approved_at, u.created_at, u.last_login_at,
             r.code as role_code, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];
    
    if (filters?.approval_status_code) {
       query += ' AND u.approval_status_code = ?';
       params.push(filters.approval_status_code);
    }
    if (filters?.status_code) {
       query += ' AND u.status_code = ?';
       params.push(filters.status_code);
    }
    
    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.execute<any[]>(query, params);
    
    return rows.map(row => {
      const { role_code, role_name, ...userData } = row;
      return {
        ...userData,
        role: role_code ? { code: role_code, name: role_name } : undefined
      };
    });
  }

  static async getUserById(id: number): Promise<UserResponse> {
    const [rows] = await pool.execute<any[]>(`
      SELECT u.id, u.organization_id, u.full_name, u.username, u.email, u.phone, 
             u.avatar_path, u.status_code, u.approval_status_code, u.registration_source, 
             u.approval_requested_at, u.approved_at, u.created_at, u.last_login_at,
             r.code as role_code, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
      WHERE u.id = ? AND u.deleted_at IS NULL
    `, [id]);
    
    if (rows.length === 0) {
      throw new NotFoundError('Pengguna tidak ditemukan.');
    }
    
    const { role_code, role_name, ...userData } = rows[0];
    return {
      ...userData,
      role: role_code ? { code: role_code, name: role_name } : undefined
    };
  }

  static async getAvailableRoles(forUserId?: number): Promise<any[]> {
    const [roles] = await pool.execute<any[]>(
      'SELECT id, code, name FROM roles WHERE is_active = 1 AND code IN ("CEO", "COO", "CTO", "SPECIALIST_STAFF", "ENGINEER_3D")'
    );
    
    // Check singleton occupancy
    const singletonRoles = ['CEO', 'COO', 'CTO'];
    const availableRoles = [];
    
    for (const role of roles) {
      if (singletonRoles.includes(role.code)) {
         const [occupants] = await pool.execute<any[]>(
           `SELECT u.id FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            WHERE ur.role_id = ? AND u.deleted_at IS NULL`,
           [role.id]
         );
         
         const isOccupied = occupants.length > 0;
         const isOccupiedByTargetUser = forUserId && occupants.some(o => o.id === forUserId);
         
         if (!isOccupied || isOccupiedByTargetUser) {
            availableRoles.push(role);
         }
      } else {
         availableRoles.push(role);
      }
    }
    
    return availableRoles;
  }

  static async approveUser(id: number, roleCode: string, managerId: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if user exists and is pending
      const [users] = await connection.execute<any[]>(
        'SELECT id, approval_status_code, deleted_at FROM users WHERE id = ? FOR UPDATE',
        [id]
      );

      if (users.length === 0 || users[0].deleted_at !== null) {
         throw new NotFoundError('Pengguna tidak ditemukan.');
      }
      
      const targetUser = users[0];

      // Verify role
      const [roles] = await connection.execute<any[]>(
        'SELECT id, code FROM roles WHERE code = ? AND is_active = 1 FOR UPDATE',
        [roleCode]
      );

      if (roles.length === 0) {
         throw new ValidationError('Role tidak valid.');
      }

      const role = roles[0];
      const singletonRoles = ['CEO', 'COO', 'CTO'];
      
      if (singletonRoles.includes(role.code)) {
         const [occupants] = await connection.execute<any[]>(
           `SELECT u.id FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            WHERE ur.role_id = ? AND u.deleted_at IS NULL`,
           [role.id]
         );
         
         if (occupants.length > 0 && !occupants.some(o => o.id === id)) {
             throw new ValidationError(`Role ${roleCode} sudah digunakan oleh pengguna lain.`, 'ROLE_ALREADY_OCCUPIED');
         }
      }

      // Assign role
      await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
      await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, role.id]);

      // Approve user
      await connection.execute(
        `UPDATE users SET 
         approval_status_code = 'approved', status_code = 'active', 
         approved_by = ?, approved_at = CURRENT_TIMESTAMP(3),
         rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL
         WHERE id = ?`,
        [managerId, id]
      );
      
      // Access to business units
      const [businessUnits] = await connection.execute<any[]>('SELECT id FROM business_units WHERE is_active = 1');
      await connection.execute('DELETE FROM user_business_units WHERE user_id = ?', [id]);
      for (const bu of businessUnits) {
          await connection.execute('INSERT INTO user_business_units (user_id, business_unit_id, can_access) VALUES (?, ?, 1)', [id, bu.id]);
      }

      await connection.execute(
        'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "approval", "Account approved")',
         [managerId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async rejectUser(id: number, managerId: number, reason?: string): Promise<void> {
     await pool.execute(
       `UPDATE users SET 
        approval_status_code = 'rejected', status_code = 'inactive', 
        rejected_by = ?, rejected_at = CURRENT_TIMESTAMP(3), rejection_reason = ?
        WHERE id = ? AND deleted_at IS NULL`,
       [managerId, reason || null, id]
     );
     
     await pool.execute(
        'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "rejection", "Account rejected")',
         [managerId]
      );
  }

  static async updateStatus(id: number, status_code: string, managerId: number): Promise<void> {
    if (id === managerId) {
       // Check if manager is CTO
       const managerPrincipal = await this.getAuthPrincipal(managerId);
       if (managerPrincipal?.role?.code === 'CTO') {
          throw new ValidationError('Akun Chief Technology Officer tidak dapat mengubah peran atau menonaktifkan dirinya sendiri.', 'CTO_SELF_PROTECTION');
       }
       throw new ValidationError('Anda tidak dapat mengubah status akun Anda sendiri.', 'CANNOT_SELF_MODIFY');
    }
    await pool.execute(
      'UPDATE users SET status_code = ? WHERE id = ? AND deleted_at IS NULL',
      [status_code, id]
    );
  }

  static async updateRole(id: number, roleCode: string, managerId: number): Promise<void> {
     if (id === managerId) {
        const managerPrincipal = await this.getAuthPrincipal(managerId);
        if (managerPrincipal?.role?.code === 'CTO') {
           throw new ValidationError('Akun Chief Technology Officer tidak dapat mengubah peran atau menonaktifkan dirinya sendiri.', 'CTO_SELF_PROTECTION');
        }
     }
     
     const connection = await pool.getConnection();
     try {
       await connection.beginTransaction();

       const [users] = await connection.execute<any[]>('SELECT id, deleted_at FROM users WHERE id = ? FOR UPDATE', [id]);
       if (users.length === 0 || users[0].deleted_at !== null) throw new NotFoundError('Pengguna tidak ditemukan.');

       const [roles] = await connection.execute<any[]>('SELECT id, code FROM roles WHERE code = ? AND is_active = 1 FOR UPDATE', [roleCode]);
       if (roles.length === 0) throw new ValidationError('Role tidak valid.');
       const role = roles[0];

       const singletonRoles = ['CEO', 'COO', 'CTO'];
       if (singletonRoles.includes(role.code)) {
          const [occupants] = await connection.execute<any[]>(
            `SELECT u.id FROM users u 
             JOIN user_roles ur ON u.id = ur.user_id 
             WHERE ur.role_id = ? AND u.deleted_at IS NULL`,
            [role.id]
          );
          if (occupants.length > 0 && !occupants.some(o => o.id === id)) {
              throw new ValidationError(`Role ${roleCode} sudah digunakan oleh pengguna lain.`, 'ROLE_ALREADY_OCCUPIED');
          }
       }

       await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
       await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, role.id]);
       
       await connection.execute(
        'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "role_change", "Role updated")',
         [managerId]
       );

       await connection.commit();
     } catch (error) {
       await connection.rollback();
       throw error;
     } finally {
       connection.release();
     }
  }

  static async softDeleteUser(id: number, managerId: number): Promise<void> {
    if (id === managerId) {
       const managerPrincipal = await this.getAuthPrincipal(managerId);
       if (managerPrincipal?.role?.code === 'CTO') {
          throw new ValidationError('Akun Chief Technology Officer tidak dapat menghapus dirinya sendiri.', 'CTO_SELF_PROTECTION');
       }
       throw new ValidationError('Anda tidak dapat menghapus akun Anda sendiri.', 'CANNOT_SELF_DELETE');
    }
    await pool.execute(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [id]
    );
    
    await pool.execute(
      'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "account_delete", "Account soft deleted")',
       [managerId]
    );
  }

  // Profile methods
  static async updateProfile(id: number, data: any): Promise<void> {
     const { full_name, username, email, phone, default_workspace_code } = data;
     
     // Check unique
     const [existing] = await pool.execute<any[]>(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ? AND deleted_at IS NULL',
        [username.trim(), email.trim().toLowerCase(), id]
     );
     if (existing.length > 0) throw new ValidationError('Username atau email sudah digunakan.');
     
     await pool.execute(
       'UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, default_workspace_code = ? WHERE id = ?',
       [full_name, username.trim(), email.trim().toLowerCase(), phone || null, default_workspace_code || 'craft', id]
     );
  }

  static async changePassword(id: number, data: any): Promise<void> {
    const { currentPassword, newPassword } = data;
    
    const [users] = await pool.execute<any[]>('SELECT password_hash FROM users WHERE id = ?', [id]);
    if (users.length === 0) throw new NotFoundError('Pengguna tidak ditemukan.');
    
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) throw new ValidationError('Kata sandi saat ini tidak valid.');
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    await pool.execute(
      'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP(3), must_change_password = 0 WHERE id = ?',
      [password_hash, id]
    );
  }

  /**
   * Validates the uploaded image, normalizes it to a 512x512 WEBP, and finalizes it before
   * touching the database — if the `UPDATE` fails, the freshly written avatar is deleted so it
   * never becomes an orphan. The previous avatar is only removed once the new one is committed.
   */
  static async uploadAvatar(userId: number, file: Express.Multer.File): Promise<{ avatar_path: string }> {
    try {
      const buffer = await readFile(file.path);
      validateAgainstPolicy(getStoragePolicy('avatar'), {
        originalName: file.originalname, mimeType: file.mimetype, sizeBytes: buffer.length, headBuffer: buffer,
      });

      let webp: Buffer;
      try {
        webp = await normalizeAvatarImage(buffer);
      } catch {
        throw new AppError(400, 'FILE_CONTENT_INVALID', 'Foto tidak dapat diproses. Pastikan file adalah gambar yang valid.');
      }

      const key = storageService.buildKey('avatars', '.webp');
      const stored = await storageService.finalizeBuffer(key, webp);

      let previousPath: string | null = null;
      try {
        const [users] = await pool.execute<any[]>('SELECT avatar_path FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
        if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
        previousPath = users[0].avatar_path;
        await pool.execute('UPDATE users SET avatar_path = ? WHERE id = ?', [stored.key, userId]);
      } catch (error) {
        await storageService.deleteQuietly(stored.key);
        throw error;
      }

      if (previousPath && previousPath !== stored.key) await storageService.deleteQuietly(previousPath);
      await pool.execute(
        'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "profile.avatar_update", "Foto profil diperbarui.")',
        [userId],
      );
      return { avatar_path: stored.key };
    } finally {
      // The original upload is never finalized directly (its pixels are re-encoded into a new
      // WEBP buffer instead), so the temp file always needs its own cleanup.
      await storageService.discardTempFile(file.path);
    }
  }

  static async removeAvatar(userId: number): Promise<void> {
    const [users] = await pool.execute<any[]>('SELECT avatar_path FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!users.length) throw new NotFoundError('Pengguna tidak ditemukan.');
    const previousPath = users[0].avatar_path;
    if (!previousPath) return;
    await pool.execute('UPDATE users SET avatar_path = NULL WHERE id = ?', [userId]);
    await pool.execute(
      'INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (1, ?, "users", "profile.avatar_remove", "Foto profil dihapus.")',
      [userId],
    );
    await storageService.deleteQuietly(previousPath);
  }
}
