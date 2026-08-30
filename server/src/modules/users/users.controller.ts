import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { AccountLifecycleService } from './account-lifecycle.service';

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

  static async getDeletionRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await AccountLifecycleService.listDeletionRequests()); }
    catch (error) { next(error); }
  }

  static async approveDeletionRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await AccountLifecycleService.reviewDeletionRequest(req.user, Number(req.params.requestId), 'approve', req.body.review_note));
    } catch (error) { next(error); }
  }

  static async rejectDeletionRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await AccountLifecycleService.reviewDeletionRequest(req.user, Number(req.params.requestId), 'reject', req.body.review_note));
    } catch (error) { next(error); }
  }

  static async getReactivationRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await AccountLifecycleService.listReactivationRequests()); }
    catch (error) { next(error); }
  }

  static async approveReactivationRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await AccountLifecycleService.reviewReactivationRequest(req.user, Number(req.params.requestId), 'approve', req.body.roleCode, req.body.review_note));
    } catch (error) { next(error); }
  }

  static async rejectReactivationRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await AccountLifecycleService.reviewReactivationRequest(req.user, Number(req.params.requestId), 'reject', undefined, req.body.review_note));
    } catch (error) { next(error); }
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
      return sendSuccess(res, await UsersService.updateProfile(req.user.id, req.body));
    } catch (error) {
      next(error);
    }
  }

  static async updateProfileStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await UsersService.updateProfileStatus(req.user.id, req.body.profile_status_code)); }
    catch (error) { next(error); }
  }

  static async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError(400, 'AVATAR_REQUIRED', 'Pilih foto profil terlebih dahulu.');
      return sendSuccess(res, await UsersService.replaceAvatar(req.user.id, req.file));
    } catch (error) { next(error); }
  }

  static async deleteAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await UsersService.deleteAvatar(req.user.id)); }
    catch (error) { next(error); }
  }

  static async uploadBanner(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError(400, 'BANNER_REQUIRED', 'Pilih banner profil terlebih dahulu.');
      return sendSuccess(res, await UsersService.replaceBanner(req.user.id, req.file));
    } catch (error) { next(error); }
  }

  static async deleteBanner(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await UsersService.deleteBanner(req.user.id)); }
    catch (error) { next(error); }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UsersService.changePassword(req.user.id, req.body);
      return sendSuccess(res, { message: 'Kata sandi berhasil diubah.' });
    } catch (error) {
      next(error);
    }
  }

  static async getDeletionRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await AccountLifecycleService.getCurrentDeletionRequest(req.user.id)); }
    catch (error) { next(error); }
  }

  static async createDeletionRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await AccountLifecycleService.createDeletionRequest(req.user, req.body.reason), undefined, 201); }
    catch (error) { next(error); }
  }

  static async revokeDeletionRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await AccountLifecycleService.revokeDeletionRequest(req.user)); }
    catch (error) { next(error); }
  }
}
