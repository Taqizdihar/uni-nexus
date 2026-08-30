import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { notificationsService } from './notifications.service';

export class NotificationsController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.list(req.user, req.query as any)); }
    catch (error) { next(error); }
  }
  static async summary(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.summary(req.user)); }
    catch (error) { next(error); }
  }
  static async meta(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.meta(req.user)); }
    catch (error) { next(error); }
  }
  static async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.markRead(req.user, Number(req.params.id), true)); }
    catch (error) { next(error); }
  }
  static async markUnread(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.markRead(req.user, Number(req.params.id), false)); }
    catch (error) { next(error); }
  }
  static async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await notificationsService.markAllRead(req.user)); }
    catch (error) { next(error); }
  }
}
