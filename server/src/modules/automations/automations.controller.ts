import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { automationRulePatchSchema, automationRuleSchema, manualRunSchema } from '../craft-automations/craft-automations.schema';
import { automationWorkspaceSchema } from './automations.schema';
import { globalAutomationsService } from './automations.service';

const actor = (req: Request) => ({ id: Number((req as any).user.id), organization_id: Number((req as any).user.organization_id), permissions: Array.isArray((req as any).user.permissions) ? (req as any).user.permissions : [] });
const id = (value: string) => { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'ID otomasi tidak valid.'); return parsed; };
const workspace = (value: unknown) => automationWorkspaceSchema.parse(value);
const zodError = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data otomasi tidak valid.', error.issues) : error;

export class GlobalAutomationsController {
  overview = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.overview(actor(req), req.query)); } catch (error) { next(error); } };
  meta = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.meta(actor(req))); } catch (error) { next(error); } };
  catalog = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.catalog(actor(req), req.query)); } catch (error) { next(error); } };
  templates = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.templates(actor(req), req.query)); } catch (error) { next(error); } };
  useTemplate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.useTemplate(actor(req), workspace(req.params.workspace), String(req.params.code)), undefined, 201); } catch (error) { next(zodError(error)); } };
  rules = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.rules(actor(req), req.query)); } catch (error) { next(error); } };
  rule = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.rule(actor(req), id(String(req.params.id)))); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { const selected = workspace(req.body?.workspace); const { workspace: _workspace, ...body } = req.body || {}; const value = automationRuleSchema.parse(body); sendSuccess(res, await globalAutomationsService.create(actor(req), selected, value), undefined, 201); } catch (error) { next(zodError(error)); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.update(actor(req), id(String(req.params.id)), automationRulePatchSchema.parse(req.body))); } catch (error) { next(zodError(error)); } };
  status = (action: 'activate' | 'pause' | 'resume' | 'disable') => async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.status(actor(req), id(String(req.params.id)), action)); } catch (error) { next(error); } };
  duplicate = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.duplicate(actor(req), id(String(req.params.id))), undefined, 201); } catch (error) { next(error); } };
  test = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.test(actor(req), id(String(req.params.id)), manualRunSchema.parse(req.body))); } catch (error) { next(zodError(error)); } };
  run = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.run(actor(req), id(String(req.params.id)), manualRunSchema.parse(req.body)), undefined, 202); } catch (error) { next(zodError(error)); } };
  runs = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.runs(actor(req), req.query)); } catch (error) { next(error); } };
  runDetail = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.runDetail(actor(req), id(String(req.params.id)))); } catch (error) { next(error); } };
  events = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await globalAutomationsService.events(actor(req), req.query)); } catch (error) { next(error); } };
}
