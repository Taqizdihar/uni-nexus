import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/AppError';
import { integrationsService } from './integrations.service';
import { connectionFiltersSchema, createConnectionSchema, credentialsSchema, logFiltersSchema, updateConnectionSchema } from './integrations.schema';
import type { IntegrationActor } from './integrations.types';

const parseId = (value: string, label = 'ID') => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'VALIDATION_ERROR', `${label} tidak valid.`);
  return id;
};
const actorFor = (req: Request): IntegrationActor => {
  const user = (req as any).user;
  return { id: Number(user.id), organization_id: Number(user.organization_id), permissions: Array.isArray(user.permissions) ? user.permissions : [] };
};
const zodError = (error: unknown) => (error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Data integrasi tidak valid.', error.issues) : error);

export class IntegrationsController {
  overview = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.overview(actorFor(req))); } catch (error) { next(error); } };
  meta = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.meta(actorFor(req))); } catch (error) { next(error); } };
  providers = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.providers(actorFor(req))); } catch (error) { next(error); } };

  listConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = connectionFiltersSchema.parse(req.query);
      sendSuccess(res, await integrationsService.listConnections(actorFor(req), filters));
    } catch (error) { next(zodError(error)); }
  };
  createConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createConnectionSchema.parse(req.body);
      sendSuccess(res, await integrationsService.createConnection(actorFor(req), data), undefined, 201);
    } catch (error) { next(zodError(error)); }
  };
  getConnection = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.getConnection(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
  updateConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateConnectionSchema.parse(req.body);
      sendSuccess(res, await integrationsService.updateConnection(actorFor(req), parseId(String(req.params.id)), data));
    } catch (error) { next(zodError(error)); }
  };
  updateCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = credentialsSchema.parse(req.body);
      sendSuccess(res, { credentials: await integrationsService.updateCredentials(actorFor(req), parseId(String(req.params.id)), data) });
    } catch (error) { next(zodError(error)); }
  };
  deleteCredential = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await integrationsService.deleteCredential(actorFor(req), parseId(String(req.params.id)), String(req.params.secretName))); }
    catch (error) { next(error); }
  };
  testConnection = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.testConnection(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
  syncConnection = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.syncConnection(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
  enable = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.enable(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
  disable = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.disable(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
  disconnect = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.disconnect(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };

  listLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = logFiltersSchema.parse(req.query);
      sendSuccess(res, await integrationsService.listLogs(actorFor(req), { integrationId: filters.integration_id, status: filters.status, syncType: filters.sync_type }));
    } catch (error) { next(zodError(error)); }
  };
  getLog = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await integrationsService.getLog(actorFor(req), parseId(String(req.params.id)))); } catch (error) { next(error); } };
}
