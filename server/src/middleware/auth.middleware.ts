import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';
import { pool } from '../config/database';

export interface AuthRequest extends Request {
  user?: any; // We'll refine this later with specific type
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token otentikasi tidak ditemukan.');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      
      const [users] = await pool.execute<any[]>(
        'SELECT id, organization_id, full_name, username, email, status_code, default_workspace_code FROM users WHERE id = ? AND status_code = "active"',
        [decoded.id]
      );

      if (!users || users.length === 0) {
        throw new UnauthorizedError('Akun pengguna tidak ditemukan atau tidak aktif.');
      }

      req.user = users[0];
      next();
    } catch (err) {
      throw new UnauthorizedError('Token otentikasi tidak valid atau sudah kadaluarsa.');
    }
  } catch (error) {
    next(error);
  }
};
