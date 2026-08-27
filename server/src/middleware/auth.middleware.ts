import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';
import { pool } from '../config/database';
import { UsersService } from '../modules/users/users.service';

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
      
      const authenticatedUser = await UsersService.getAuthPrincipal(decoded.id);

      if (!authenticatedUser || authenticatedUser.status_code !== 'active' || authenticatedUser.approval_status_code !== 'approved') {
        throw new UnauthorizedError('Akun pengguna tidak ditemukan atau tidak aktif.', 'ACCOUNT_INACTIVE');
      }
      
      req.user = authenticatedUser;
      
      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Token otentikasi tidak valid atau sudah kadaluarsa.');
    }
  } catch (error) {
    next(error);
  }
};

/** Passes when the user holds at least one of the listed permissions. */
export const requireAnyPermission = (...permissionCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Otentikasi diperlukan.'));
    }

    const granted: string[] = req.user.permissions || [];
    if (!permissionCodes.some(code => granted.includes(code))) {
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
