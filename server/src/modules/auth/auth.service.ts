import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';
import { env } from '../../config/env';
import { ValidationError, UnauthorizedError } from '../../shared/errors/AppError';
import { UsersService } from '../users/users.service';

export class AuthService {
  static async register(data: any) {
    const { organization_id = 1, full_name, username, email: rawEmail, password, phone } = data;
    const email = rawEmail.trim().toLowerCase();
    const cleanUsername = username.trim();
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.execute<any[]>(
        'SELECT id, email, username, deleted_at FROM users WHERE username = ? OR email = ?',
        [cleanUsername, email]
      );

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const safePhone = phone !== undefined ? phone : null;

      let isBootstrapCTO = false;
      let targetUserId: number | null = null;
      let approvalStatus = 'pending';
      let statusCode = 'inactive';
      let registrationSource = 'self_signup';
      let roleCodeToAssign: string | null = null;

      if (email === env.BOOTSTRAP_CTO_EMAIL) {
        const [roles] = await connection.execute<any[]>(
          'SELECT id FROM roles WHERE code = "CTO" AND is_active = 1 FOR UPDATE'
        );
        const ctoRoleId = roles[0]?.id;

        if (ctoRoleId) {
          const [existingCTOs] = await connection.execute<any[]>(
            `SELECT u.id FROM users u 
             JOIN user_roles ur ON u.id = ur.user_id 
             WHERE ur.role_id = ? AND u.deleted_at IS NULL`,
            [ctoRoleId]
          );

          if (existingCTOs.length === 0) {
             isBootstrapCTO = true;
             approvalStatus = 'approved';
             statusCode = 'active';
             registrationSource = 'bootstrap';
             roleCodeToAssign = 'CTO';
          }
        }
      }

      const existingActiveOrPending = existing.find(u => u.deleted_at === null);

      if (existingActiveOrPending) {
         throw new ValidationError('Username atau email sudah digunakan.');
      }
      
      const existingDeletedEmail = existing.find(u => u.email === email && u.deleted_at !== null);

      if (isBootstrapCTO && existingDeletedEmail) {
         targetUserId = existingDeletedEmail.id;
         await connection.execute(
           `UPDATE users SET 
              full_name = ?, username = ?, password_hash = ?, phone = ?, 
              status_code = ?, approval_status_code = ?, 
              registration_source = ?, approved_at = CURRENT_TIMESTAMP(3), 
              deleted_at = NULL, rejection_reason = NULL, rejected_at = NULL, rejected_by = NULL
            WHERE id = ?`,
            [full_name, cleanUsername, password_hash, safePhone, statusCode, approvalStatus, registrationSource, targetUserId]
         );
      } else {
         if (existing.length > 0 && existing.find(u => u.username === cleanUsername)) {
            throw new ValidationError('Username atau email sudah digunakan.');
         }

         const [result] = await connection.execute<any>(
           `INSERT INTO users (organization_id, full_name, username, email, password_hash, phone, status_code, approval_status_code, registration_source, default_workspace_code, approval_requested_at${isBootstrapCTO ? ', approved_at' : ''})
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'craft', CURRENT_TIMESTAMP(3)${isBootstrapCTO ? ', CURRENT_TIMESTAMP(3)' : ''})`,
           [organization_id, full_name, cleanUsername, email, password_hash, safePhone, statusCode, approvalStatus, registrationSource]
         );
         targetUserId = result.insertId;
      }

      if (isBootstrapCTO && targetUserId && roleCodeToAssign) {
         const [roles] = await connection.execute<any[]>(
           'SELECT id FROM roles WHERE code = ?', [roleCodeToAssign]
         );
         if (roles.length > 0) {
            await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [targetUserId]);
            await connection.execute(
               'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
               [targetUserId, roles[0].id]
            );
         }
         
         const [businessUnits] = await connection.execute<any[]>(
           'SELECT id FROM business_units WHERE is_active = 1'
         );
         
         await connection.execute('DELETE FROM user_business_units WHERE user_id = ?', [targetUserId]);
         for (const bu of businessUnits) {
             await connection.execute(
                 'INSERT INTO user_business_units (user_id, business_unit_id, can_access) VALUES (?, ?, 1)',
                 [targetUserId, bu.id]
             );
         }
      }
      
      await connection.execute(
        `INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description)
         VALUES (?, ?, ?, ?, ?)`,
         [organization_id, targetUserId, 'users', isBootstrapCTO ? 'bootstrap_cto' : 'signup_request', isBootstrapCTO ? 'CTO bootstrap registration' : 'User signup request']
      );

      await connection.commit();

      return {
        id: targetUserId,
        full_name,
        username: cleanUsername,
        email,
        bootstrap: isBootstrapCTO,
        approvalRequired: !isBootstrapCTO,
        approvalStatus
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async login(data: any) {
    const { usernameOrEmail, password } = data;
    const loginIdentifier = usernameOrEmail.trim().toLowerCase(); 
    const isEmailLike = loginIdentifier.includes('@');

    let users: any[];
    if (isEmailLike) {
      [users] = await pool.execute<any[]>(
        'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
        [loginIdentifier]
      );
    } else {
      [users] = await pool.execute<any[]>(
        'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL',
        [usernameOrEmail.trim()]
      );
    }

    const user = users?.[0];

    if (!user) {
      throw new UnauthorizedError('Email/username atau kata sandi tidak valid.', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Email/username atau kata sandi tidak valid.', 'INVALID_CREDENTIALS');
    }

    if (user.approval_status_code === 'pending') {
      throw new UnauthorizedError('Akun Anda masih menunggu persetujuan.', 'ACCOUNT_PENDING_APPROVAL');
    }

    if (user.approval_status_code === 'rejected') {
      throw new UnauthorizedError('Permintaan akun Anda telah ditolak.', 'ACCOUNT_REJECTED');
    }

    if (user.status_code === 'suspended') {
      throw new UnauthorizedError('Akun Anda sedang ditangguhkan.', 'ACCOUNT_SUSPENDED');
    }

    if (user.status_code === 'inactive') {
      throw new UnauthorizedError('Akun Anda tidak aktif.', 'ACCOUNT_INACTIVE');
    }

    if (user.status_code !== 'active' || user.approval_status_code !== 'approved') {
       throw new UnauthorizedError('Akun Anda tidak dapat mengakses sistem saat ini.', 'ACCOUNT_INACTIVE');
    }

    await pool.execute(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [user.id]
    );
    
    await pool.execute(
      `INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description)
       VALUES (?, ?, ?, ?, ?)`,
       [user.organization_id, user.id, 'auth', 'login', 'User logged in successfully']
    );

    const payload = {
      id: user.id,
      organization_id: user.organization_id,
      username: user.username,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const authenticatedUser = await UsersService.getAuthPrincipal(user.id);

    return {
      token,
      user: authenticatedUser,
    };
  }
}
