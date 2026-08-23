import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class UsersController {
  static async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = req.query;
      const users = await UsersService.getUsers(filters);
      return sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getUserById(parseInt(req.params.id as string));
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableRoles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const forUserId = req.query.forUserId ? parseInt(req.query.forUserId as string) : undefined;
      const roles = await UsersService.getAvailableRoles(forUserId);
      return sendSuccess(res, roles);
    } catch (error) {
      next(error);
    }
  }

  static async approveUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.approveUser(parseInt(req.params.id as string), req.body.roleCode, req.user.id);
      return sendSuccess(res, { message: 'Pengguna berhasil disetujui.' });
    } catch (error) {
      next(error);
    }
  }

  static async rejectUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.rejectUser(parseInt(req.params.id as string), req.user.id, req.body.reason);
      return sendSuccess(res, { message: 'Pengguna berhasil ditolak.' });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.updateStatus(parseInt(req.params.id as string), req.body.status_code, req.user.id);
      return sendSuccess(res, { message: 'Status pengguna berhasil diperbarui.' });
    } catch (error) {
      next(error);
    }
  }
  
  static async updateRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.updateRole(parseInt(req.params.id as string), req.body.roleCode, req.user.id);
      return sendSuccess(res, { message: 'Role pengguna berhasil diperbarui.' });
    } catch (error) {
      next(error);
    }
  }

  static async softDeleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.softDeleteUser(parseInt(req.params.id as string), req.user.id);
      return sendSuccess(res, { message: 'Pengguna berhasil dihapus.' });
    } catch (error) {
      next(error);
    }
  }

  // Profile
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getUserById(req.user.id);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, { message: 'Profil berhasil diperbarui.' });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.changePassword(req.user.id, req.body);
      return sendSuccess(res, { message: 'Kata sandi berhasil diubah.' });
    } catch (error) {
      next(error);
    }
  }
}
