import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';
import { env } from '../../config/env';
import { AppError, UnauthorizedError } from '../../shared/errors/AppError';
import { AccountLifecycleService } from '../users/account-lifecycle.service';
import { UsersService } from '../users/users.service';

type RegisterInput = {
  organization_id?: number;
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  default_workspace_code?: 'craft' | 'studio';
};

export class AuthService {
  static async register(data: RegisterInput) {
    const organizationId = data.organization_id || 1;
    const fullName = data.full_name.trim();
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();
    const phone = data.phone?.trim() || null;
    const defaultWorkspace = data.default_workspace_code || 'craft';
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [matching] = await connection.execute<any[]>(
        'SELECT id, email, username, deleted_at FROM users WHERE username = ? OR email = ? FOR UPDATE', [username, email],
      );
      const emailMatch = matching.find(row => row.email === email);
      const usernameMatch = matching.find(row => row.username === username);
      if (usernameMatch && (!emailMatch || Number(usernameMatch.id) !== Number(emailMatch.id))) {
        throw new AppError(409, 'USERNAME_ALREADY_USED', 'Username sudah digunakan oleh akun lain.');
      }
      if (emailMatch?.deleted_at === null) throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Email sudah terdaftar.');
      if (emailMatch?.deleted_at !== null) {
        // Release this short preflight transaction; lifecycle creation re-locks
        // the archived identity and owns its own complete transaction.
        await connection.commit();
        const passwordHash = await bcrypt.hash(data.password, 10);
        return AccountLifecycleService.createReactivationRequest({
          organization_id: organizationId,
          deleted_user_id: Number(emailMatch.id),
          full_name: fullName,
          username,
          email,
          password_hash: passwordHash,
          phone,
          default_workspace_code: defaultWorkspace,
        });
      }

      let bootstrap = false;
      let roleId: number | null = null;
      if (email === env.BOOTSTRAP_CTO_EMAIL) {
        const [roles] = await connection.execute<any[]>('SELECT id FROM roles WHERE code = "CTO" AND is_active = 1 FOR UPDATE');
        if (roles.length) {
          const [occupants] = await connection.execute<any[]>(
            `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id
             WHERE ur.role_id = ? AND u.deleted_at IS NULL FOR UPDATE`, [roles[0].id],
          );
          if (!occupants.length) { bootstrap = true; roleId = Number(roles[0].id); }
        }
      }
      const passwordHash = await bcrypt.hash(data.password, 10);
      const [result] = await connection.execute<any>(
        `INSERT INTO users (organization_id, full_name, username, email, password_hash, phone, status_code,
          approval_status_code, registration_source, default_workspace_code, approval_requested_at${bootstrap ? ', approved_at' : ''})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3)${bootstrap ? ', CURRENT_TIMESTAMP(3)' : ''})`,
        [organizationId, fullName, username, email, passwordHash, phone, bootstrap ? 'active' : 'inactive', bootstrap ? 'approved' : 'pending', bootstrap ? 'bootstrap' : 'self_signup', defaultWorkspace],
      );
      const userId = Number(result.insertId);
      if (bootstrap && roleId) {
        await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
        const [businessUnits] = await connection.execute<any[]>('SELECT id FROM business_units WHERE is_active = 1');
        for (const businessUnit of businessUnits) await connection.execute('INSERT INTO user_business_units (user_id, business_unit_id, can_access) VALUES (?, ?, 1)', [userId, businessUnit.id]);
      }
      await connection.execute(
        `INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description)
         VALUES (?, ?, 'users', ?, ?)`, [organizationId, userId, bootstrap ? 'bootstrap_cto' : 'signup_request', bootstrap ? 'CTO bootstrap registration' : 'User signup request'],
      );
      await connection.commit();
      return { id: userId, full_name: fullName, username, email, bootstrap, approvalRequired: !bootstrap, approvalStatus: bootstrap ? 'approved' : 'pending' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  static async login(data: { usernameOrEmail: string; password: string }) {
    const loginIdentifier = data.usernameOrEmail.trim().toLowerCase();
    const field = loginIdentifier.includes('@') ? 'email' : 'username';
    const [users] = await pool.execute<any[]>(`SELECT * FROM users WHERE ${field} = ? AND deleted_at IS NULL`, [loginIdentifier]);
    const user = users[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new UnauthorizedError('Email/username atau kata sandi tidak valid.', 'INVALID_CREDENTIALS');
    }
    if (user.approval_status_code === 'pending') throw new UnauthorizedError('Akun Anda masih menunggu persetujuan.', 'ACCOUNT_PENDING_APPROVAL');
    if (user.approval_status_code === 'rejected') throw new UnauthorizedError('Permintaan akun Anda telah ditolak.', 'ACCOUNT_REJECTED');
    if (user.status_code === 'suspended') throw new UnauthorizedError('Akun Anda sedang ditangguhkan.', 'ACCOUNT_SUSPENDED');
    if (user.status_code !== 'active' || user.approval_status_code !== 'approved') throw new UnauthorizedError('Akun Anda tidak aktif.', 'ACCOUNT_INACTIVE');
    await pool.execute('UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [user.id]);
    await pool.execute(`INSERT INTO audit_logs (organization_id, user_id, module_code, action_code, description) VALUES (?, ?, 'auth', 'login', 'User logged in successfully')`, [user.organization_id, user.id]);
    const token = jwt.sign({ id: user.id, organization_id: user.organization_id, username: user.username }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    return { token, user: await UsersService.getAuthPrincipal(user.id) };
  }
}
