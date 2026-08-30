import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { auditRequestMeta } from '../../shared/audit/audit-request-meta';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return sendSuccess(res, result, undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body, auditRequestMeta(req));
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.logout(req.user, req.body.session_key, auditRequestMeta(req));
      return sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // req.user is set by requireAuth middleware
      return sendSuccess(res, req.user);
    } catch (error) {
      next(error);
    }
  }
}
