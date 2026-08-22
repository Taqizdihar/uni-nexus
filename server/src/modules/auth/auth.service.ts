import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';
import { env } from '../../config/env';
import { ValidationError, UnauthorizedError } from '../../shared/errors/AppError';

export class AuthService {
  static async register(data: any) {
    const { organization_id = 1, full_name, username, email, password, phone } = data;

    // Check if user already exists
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing && existing.length > 0) {
      throw new ValidationError('Username atau email sudah digunakan.');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const safePhone = phone !== undefined ? phone : null;
    console.log('Inserting with values:', [organization_id, full_name, username, email, password_hash, safePhone]);

    const [result] = await pool.execute<any>(
      `INSERT INTO users (organization_id, full_name, username, email, password_hash, phone, status_code, default_workspace_code)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 'craft')`,
      [organization_id, full_name, username, email, password_hash, safePhone]
    );

    return {
      id: result.insertId,
      full_name,
      username,
      email,
    };
  }

  static async login(data: any) {
    const { usernameOrEmail, password } = data;

    const [users] = await pool.execute<any[]>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [usernameOrEmail, usernameOrEmail]
    );

    const user = users?.[0];

    if (!user || user.status_code !== 'active') {
      throw new UnauthorizedError('Kredensial tidak valid atau akun tidak aktif.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Kredensial tidak valid.');
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [user.id]
    );

    const payload = {
      id: user.id,
      organization_id: user.organization_id,
      username: user.username,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    // Remove password hash from response
    delete user.password_hash;

    return {
      token,
      user,
    };
  }
}
