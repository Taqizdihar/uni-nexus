import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { presenceHeartbeatSchema, presenceLeaveSchema } from './presence.schema';
import { PresenceService } from './presence.service';

const service = new PresenceService();
const actor = (req: AuthRequest) => ({ id: Number(req.user.id), organization_id: Number(req.user.organization_id) });
const invalid = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'PRESENCE_INVALID_INPUT', 'Data presence tidak valid.', error.issues) : error;

export class PresenceController {
  heartbeat = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const input = presenceHeartbeatSchema.parse(req.body); sendSuccess(res, await service.heartbeat(actor(req), input.session_key, input.workspace_code)); }
    catch (error) { next(invalid(error)); }
  };
  active = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.list(actor(req))); } catch (error) { next(error); }
  };
  leave = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const input = presenceLeaveSchema.parse(req.body); sendSuccess(res, await service.leave(actor(req), input.session_key)); }
    catch (error) { next(invalid(error)); }
  };
}
