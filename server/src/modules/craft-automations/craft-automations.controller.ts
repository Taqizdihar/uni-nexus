import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { manualRunSchema, automationRulePatchSchema, automationRuleSchema } from './craft-automations.schema';
import { CraftAutomationsService } from './craft-automations.service';

const id = (value: string) => { const parsed = Number.parseInt(value, 10); if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'ID otomasi tidak valid.'); return parsed; };
const actor = (req: Request) => ({ id: Number((req as any).user.id), permissions: Array.isArray((req as any).user.permissions) ? (req as any).user.permissions : [] });
const zodError = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data otomasi tidak valid.', error.issues) : error;

export class CraftAutomationsController {
  readonly service = new CraftAutomationsService();
  private context = async () => { const craft = await getCraftBusinessUnit(); return { organizationId: craft.organizationId, businessUnitId: craft.id }; };
  overview = async (_req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.overview(context.businessUnitId)); } catch (error) { next(error); } };
  listRules = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.list(context.businessUnitId, req.query)); } catch (error) { next(error); } };
  getRule = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.get(id(String(req.params.id)), context.businessUnitId)); } catch (error) { next(error); } };
  createRule = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.create(automationRuleSchema.parse(req.body), actor(req), context), undefined, 201); } catch (error) { next(zodError(error)); } };
  updateRule = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.update(id(String(req.params.id)), automationRulePatchSchema.parse(req.body), actor(req), context)); } catch (error) { next(zodError(error)); } };
  activate = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.activate(id(String(req.params.id)), actor(req), context)); } catch (error) { next(error); } };
  pause = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.pause(id(String(req.params.id)), actor(req), context)); } catch (error) { next(error); } };
  resume = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.resume(id(String(req.params.id)), actor(req), context)); } catch (error) { next(error); } };
  disable = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.disable(id(String(req.params.id)), actor(req), context)); } catch (error) { next(error); } };
  duplicate = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.duplicate(id(String(req.params.id)), actor(req), context), undefined, 201); } catch (error) { next(error); } };
  test = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); const body = manualRunSchema.parse(req.body); sendSuccess(res, await this.service.rules.test(id(String(req.params.id)), body, context.businessUnitId)); } catch (error) { next(zodError(error)); } };
  run = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); const body = manualRunSchema.parse(req.body); sendSuccess(res, await this.service.queueManualRun(id(String(req.params.id)), body, actor(req), context), undefined, 202); } catch (error) { next(zodError(error)); } };
  listRuns = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.repository.listRuns(context.businessUnitId, req.query)); } catch (error) { next(error); } };
  getRun = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); const run = await this.service.rules.repository.getRun(id(String(req.params.id)), context.businessUnitId); if (!run) throw new AppError(404, 'AUTOMATION_RUN_NOT_FOUND', 'Riwayat eksekusi tidak ditemukan.'); sendSuccess(res, run); } catch (error) { next(error); } };
  templates = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, this.service.rules.templates.list()); } catch (error) { next(error); } };
  useTemplate = async (req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.useTemplate(String(req.params.code), actor(req), context), undefined, 201); } catch (error) { next(error); } };
  catalog = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.catalog()); } catch (error) { next(error); } };
  events = async (_req: Request, res: Response, next: NextFunction) => { try { const context = await this.context(); sendSuccess(res, await this.service.rules.repository.recentEvents(context.businessUnitId)); } catch (error) { next(error); } };
}
