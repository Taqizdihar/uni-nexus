import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import { completeMaintenanceSchema, issueSchema, issueUpdateSchema, printerSchema, printerUpdateSchema, scheduleSchema, scheduleUpdateSchema } from './craft-printers.schema';
import { CraftPrintersService, type PrinterActor } from './craft-printers.service';

const numberId = (value: string | string[] | undefined, code: string, label: string) => {
  if (Array.isArray(value)) throw new AppError(400, code, `${label} tidak valid.`);
  const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, code, `${label} tidak valid.`); return parsed;
};
const optionalId = (value: unknown) => { if (value === undefined || value === null || value === '') return undefined; const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined; };
const validation = (error: unknown, message: string) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;
const queryString = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

export class CraftPrintersController {
  private service = new CraftPrintersService();
  private async actor(req: AuthRequest): Promise<PrinterActor> {
    const craft = await getCraftBusinessUnit();
    return { id: Number(req.user.id), organizationId: craft.organizationId, businessUnitId: craft.id, ip: req.ip, userAgent: req.get('user-agent') || undefined };
  }

  getPrinters = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getPrinters(actor.businessUnitId, { search: queryString(req.query.search), status: queryString(req.query.status) as any, printerType: queryString(req.query.printerType) as any, location: queryString(req.query.location), archived: req.query.archived === 'true' })); }
    catch (error) { next(error); }
  };
  createPrinter = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createPrinter(printerSchema.parse(req.body), await this.actor(req)), undefined, 201); } catch (error) { next(validation(error, 'Data printer tidak valid.')); } };
  getPrinter = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getPrinter(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), await this.actor(req))); } catch (error) { next(error); } };
  updatePrinter = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.updatePrinter(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), printerUpdateSchema.parse(req.body), await this.actor(req))); } catch (error) { next(validation(error, 'Data printer tidak valid.')); } };
  archivePrinter = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.archivePrinter(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), await this.actor(req))); } catch (error) { next(error); } };
  reactivatePrinter = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.reactivatePrinter(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), await this.actor(req))); } catch (error) { next(error); } };
  setOffline = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.setStatus(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), 'offline', await this.actor(req))); } catch (error) { next(error); } };
  restoreAvailable = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.setStatus(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), 'available', await this.actor(req))); } catch (error) { next(error); } };

  getActivity = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getActivity(actor.businessUnitId)); } catch (error) { next(error); } };
  getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getHistory(actor.businessUnitId, { search: queryString(req.query.search), printerId: optionalId(req.query.printerId), status: queryString(req.query.status), operatorId: optionalId(req.query.operatorId), dateFrom: queryString(req.query.dateFrom), dateTo: queryString(req.query.dateTo) })); } catch (error) { next(error); } };
  getProfiles = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getProfiles(actor.businessUnitId, optionalId(req.query.printerId))); } catch (error) { next(error); } };
  getTechnicians = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getTechnicians(actor.businessUnitId)); } catch (error) { next(error); } };

  getMaintenance = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getMaintenance(actor.businessUnitId, optionalId(req.query.printerId))); } catch (error) { next(error); } };
  createSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createSchedule(scheduleSchema.parse(req.body), await this.actor(req)), undefined, 201); } catch (error) { next(validation(error, 'Data jadwal perawatan tidak valid.')); } };
  updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.updateSchedule(numberId(req.params.scheduleId, 'INVALID_SCHEDULE_ID', 'ID jadwal'), scheduleUpdateSchema.parse(req.body), await this.actor(req))); } catch (error) { next(validation(error, 'Data jadwal perawatan tidak valid.')); } };
  deleteSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.deleteSchedule(numberId(req.params.scheduleId, 'INVALID_SCHEDULE_ID', 'ID jadwal'), await this.actor(req))); } catch (error) { next(error); } };
  startMaintenance = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.startMaintenance(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), await this.actor(req))); } catch (error) { next(error); } };
  completeMaintenance = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.completeMaintenance(numberId(req.params.id, 'INVALID_PRINTER_ID', 'ID printer'), completeMaintenanceSchema.parse(req.body), await this.actor(req))); } catch (error) { next(validation(error, 'Data penyelesaian perawatan tidak valid.')); } };

  getIssues = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const actor = await this.actor(req); sendSuccess(res, await this.service.getIssues(actor.businessUnitId, { printerId: optionalId(req.query.printerId), status: queryString(req.query.status), severity: queryString(req.query.severity), search: queryString(req.query.search) })); } catch (error) { next(error); } };
  createIssue = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.createIssue(issueSchema.parse(req.body), await this.actor(req)), undefined, 201); } catch (error) { next(validation(error, 'Data masalah printer tidak valid.')); } };
  updateIssue = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.updateIssue(numberId(req.params.issueId, 'INVALID_ISSUE_ID', 'ID masalah'), issueUpdateSchema.parse(req.body), await this.actor(req))); } catch (error) { next(validation(error, 'Data masalah printer tidak valid.')); } };
}
