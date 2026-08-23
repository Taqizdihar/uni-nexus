import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';
import { pool } from '../config/database';

export interface AuthRequest extends Request {
  user?: any;
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
        'SELECT id, organization_id, full_name, username, email, phone, avatar_path, status_code, approval_status_code, default_workspace_code FROM users WHERE id = ? AND status_code = "active" AND approval_status_code = "approved" AND deleted_at IS NULL',
        [decoded.id]
      );

      if (!users || users.length === 0) {
        throw new UnauthorizedError('Akun pengguna tidak ditemukan atau tidak aktif.', 'ACCOUNT_INACTIVE');
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
      
      req.user = {
         ...user,
         role,
         permissions
      };
      
      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Token otentikasi tidak valid atau sudah kadaluarsa.');
    }
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permissionCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Otentikasi diperlukan.'));
    }
    
    if (!req.user.permissions || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Anda tidak memiliki hak akses untuk tindakan ini.'
        }
      });
    }
    
    next();
  };
};
