import { pool } from '../../config/database';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError';
import { UserResponse } from './users.types';
import bcrypt from 'bcryptjs';

export class UsersService {
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

  static async getAvailableRoles(): Promise<any[]> {
    const [roles] = await pool.execute<any[]>(
      'SELECT id, code, name FROM roles WHERE is_active = 1 AND is_system = 0 AND code IN ("CEO", "COO", "CTO", "OPERATOR", "ENGINEER_3D")'
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
         
         if (occupants.length === 0) {
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
       throw new ValidationError('Anda tidak dapat mengubah status akun Anda sendiri.', 'CANNOT_SELF_MODIFY');
    }
    await pool.execute(
      'UPDATE users SET status_code = ? WHERE id = ? AND deleted_at IS NULL',
      [status_code, id]
    );
  }

  static async updateRole(id: number, roleCode: string, managerId: number): Promise<void> {
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
}
