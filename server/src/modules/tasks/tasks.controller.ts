import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { tasksService } from './tasks.service';

const principal = (req: AuthRequest) => ({ id: Number(req.user!.id), organization_id: Number(req.user!.organization_id), permissions: req.user!.permissions || [] });
export class TasksController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.list(principal(req), req.query)); } catch (error) { next(error); } };
  summary = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.summary(principal(req))); } catch (error) { next(error); } };
  meta = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.meta(principal(req))); } catch (error) { next(error); } };
  get = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.get(Number(req.params.id), principal(req))); } catch (error) { next(error); } };
  create = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.create(principal(req), req.body), undefined, 201); } catch (error) { next(error); } };
  update = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.update(Number(req.params.id), principal(req), req.body)); } catch (error) { next(error); } };
  status = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.changeStatus(Number(req.params.id), principal(req), req.body.status_code)); } catch (error) { next(error); } };
  assignees = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.setAssignees(Number(req.params.id), principal(req), req.body.assignee_ids)); } catch (error) { next(error); } };
  archive = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await tasksService.archive(Number(req.params.id), principal(req))); } catch (error) { next(error); } };
}
