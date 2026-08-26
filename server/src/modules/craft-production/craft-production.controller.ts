import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { addMinutes, parsePositiveId, toMysqlDateTime } from './craft-production.helpers';
import {
  cancelPrintSchema,
  createPrintJobSchema,
  failPrintSchema,
  finishPrintSchema,
  progressSchema,
  qcInspectionSchema,
  reasonSchema,
  scheduleSchema,
  startPrintSchema,
  updatePrintJobPlanningSchema,
} from './craft-production.schema';
import { CraftProductionService } from './craft-production.service';
import type { FailureFilters, ProductionFilters } from './craft-production.types';

function validationError(error: unknown, message: string) {
  return error instanceof z.ZodError
    ? new AppError(400, 'VALIDATION_ERROR', message, error.issues)
    : error;
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalDate(value: unknown, exclusiveNextDay = false): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const localDayStart = `${raw}T00:00:00`;
    return exclusiveNextDay ? addMinutes(localDayStart, 24 * 60) : toMysqlDateTime(localDayStart);
  }
  return toMysqlDateTime(raw);
}

function productionFilters(query: AuthRequest['query']): ProductionFilters {
  return {
    page: optionalPositiveInt(query.page),
    limit: optionalPositiveInt(query.limit),
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
    statuses: typeof query.statuses === 'string' ? query.statuses.split(',').map((value) => value.trim()).filter(Boolean) : undefined,
    printerId: optionalPositiveInt(query.printerId),
    operatorId: optionalPositiveInt(query.operatorId),
    priority: typeof query.priority === 'string' ? query.priority : undefined,
    orderId: optionalPositiveInt(query.orderId),
    deadlineRisk: typeof query.deadlineRisk === 'string' ? query.deadlineRisk : undefined,
    dateFrom: optionalDate(query.dateFrom),
    dateTo: optionalDate(query.dateTo, true),
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

function failureFilters(query: AuthRequest['query']): FailureFilters {
  return {
    page: optionalPositiveInt(query.page),
    limit: optionalPositiveInt(query.limit),
    failureType: typeof query.failureType === 'string' ? query.failureType : undefined,
    printerId: optionalPositiveInt(query.printerId),
    dateFrom: optionalDate(query.dateFrom),
    dateTo: optionalDate(query.dateTo, true),
    requiresReprint: query.requiresReprint === undefined ? undefined : query.requiresReprint === 'true',
  };
}

export class CraftProductionController {
  private service = new CraftProductionService();

  getBoard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getBoard(productionFilters(req.query), await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  getActive = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getActive(await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  getQueue = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getQueue(await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  getJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getJobs(productionFilters(req.query), await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  getJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getJob(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  createJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = createPrintJobSchema.parse(req.body);
      sendSuccess(res, await this.service.createJob(input, req.user.id, await getCraftBusinessUnit()), undefined, 201);
    } catch (error) { next(validationError(error, 'Data pekerjaan cetak tidak valid.')); }
  };

  updateJobPlanning = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = updatePrintJobPlanningSchema.parse(req.body);
      sendSuccess(res, await this.service.updateJobPlanning(
        parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'),
        input,
        req.user.id,
        await getCraftBusinessUnit(),
      ));
    } catch (error) { next(validationError(error, 'Data perencanaan pekerjaan tidak valid.')); }
  };

  markReady = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.jobs.markReady(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), req.user.id, await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  start = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = startPrintSchema.parse(req.body || {});
      sendSuccess(res, await this.service.jobs.start(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.operator_user_id, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Data mulai cetak tidak valid.')); }
  };

  pause = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = reasonSchema.parse(req.body || {});
      sendSuccess(res, await this.service.jobs.pause(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.reason, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Data jeda cetak tidak valid.')); }
  };

  resume = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = reasonSchema.parse(req.body || {});
      sendSuccess(res, await this.service.jobs.resume(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.reason, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Data lanjut cetak tidak valid.')); }
  };

  updateProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = progressSchema.parse(req.body);
      sendSuccess(res, await this.service.jobs.updateProgress(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.progress_percent, input.reason, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Progress cetak tidak valid.')); }
  };

  schedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = scheduleSchema.parse(req.body);
      sendSuccess(res, await this.service.jobs.scheduleJob(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.scheduled_start_at, input.estimated_print_minutes, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Jadwal pekerjaan tidak valid.')); }
  };

  finish = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = finishPrintSchema.parse(req.body || {});
      sendSuccess(res, await this.service.finishJob(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Data penyelesaian cetak tidak valid.')); }
  };

  fail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = failPrintSchema.parse(req.body);
      sendSuccess(res, await this.service.failJob(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input, req.user.id, await getCraftBusinessUnit()), undefined, 201);
    } catch (error) { next(validationError(error, 'Data kegagalan cetak tidak valid.')); }
  };

  cancel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = cancelPrintSchema.parse(req.body);
      sendSuccess(res, await this.service.jobs.cancel(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input.reason, req.user.id, await getCraftBusinessUnit()));
    } catch (error) { next(validationError(error, 'Data pembatalan pekerjaan tidak valid.')); }
  };

  getFailures = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getFailures(failureFilters(req.query), await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  createReprint = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = createPrintJobSchema.parse(req.body);
      sendSuccess(res, await this.service.createReprint(parsePositiveId(req.params.id, 'INVALID_FAILURE_ID', 'ID kegagalan'), input, req.user.id, await getCraftBusinessUnit()), undefined, 201);
    } catch (error) { next(validationError(error, 'Data reprint tidak valid.')); }
  };

  getQcQueue = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getQcQueue(await getCraftBusinessUnit())); }
    catch (error) { next(error); }
  };

  submitQc = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = qcInspectionSchema.parse(req.body);
      sendSuccess(res, await this.service.submitQc(parsePositiveId(req.params.id, 'INVALID_JOB_ID', 'ID pekerjaan'), input, req.user.id, await getCraftBusinessUnit()), undefined, 201);
    } catch (error) { next(validationError(error, 'Data pemeriksaan QC tidak valid.')); }
  };

  getCalendar = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (typeof req.query.start !== 'string' || typeof req.query.end !== 'string') {
        throw new AppError(400, 'CALENDAR_RANGE_REQUIRED', 'Rentang start dan end diperlukan.');
      }
      sendSuccess(res, await this.service.repository.getCalendar(
        toMysqlDateTime(req.query.start), toMysqlDateTime(req.query.end), optionalPositiveInt(req.query.printerId), (await getCraftBusinessUnit()).id,
      ));
    } catch (error) { next(error); }
  };

  getReferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(res, await this.service.repository.getReferences(
        craft.id, optionalPositiveInt(req.query.productId), optionalPositiveInt(req.query.variantId), optionalPositiveInt(req.query.printerId),
      ));
    } catch (error) { next(error); }
  };

  getPrinters = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getPrinters((await getCraftBusinessUnit()).id)); }
    catch (error) { next(error); }
  };
  getMaterials = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getMaterials((await getCraftBusinessUnit()).id)); }
    catch (error) { next(error); }
  };
  getOperators = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getOperators((await getCraftBusinessUnit()).id)); }
    catch (error) { next(error); }
  };
  getPrintProfiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getPrintProfiles((await getCraftBusinessUnit()).id, optionalPositiveInt(req.query.productId), optionalPositiveInt(req.query.variantId), optionalPositiveInt(req.query.printerId))); }
    catch (error) { next(error); }
  };
  getDesignFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getDesignFiles((await getCraftBusinessUnit()).id, optionalPositiveInt(req.query.productId), optionalPositiveInt(req.query.variantId))); }
    catch (error) { next(error); }
  };
  getQcTemplates = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.repository.getQcTemplates((await getCraftBusinessUnit()).id)); }
    catch (error) { next(error); }
  };
}
