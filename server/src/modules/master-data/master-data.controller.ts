import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { requireMasterDataDataset } from './master-data.registry';
import { createSchemas, masterDataExportSchema, masterDataListSchema, updateSchemas } from './master-data.schema';
import { masterDataService } from './master-data.service';
import type { MasterDataActor } from './master-data.types';

const single = (value: string | string[] | undefined, label = 'Parameter') => {
  if (typeof value !== 'string') throw new AppError(400, 'MASTER_DATA_INVALID_PARAMETER', `${label} tidak valid.`);
  return value;
};

const parseId = (value: string | string[] | undefined) => {
  value = single(value, 'ID data referensi');
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'MASTER_DATA_INVALID_ID', 'ID data referensi tidak valid.');
  return id;
};

const validationError = (error: unknown) => error instanceof z.ZodError
  ? new AppError(400, 'VALIDATION_ERROR', 'Data Data Master tidak valid.', error.issues)
  : error;

export class MasterDataController {
  private actor(req: AuthRequest): MasterDataActor {
    return {
      id: Number(req.user.id), organizationId: Number(req.user.organization_id), permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [],
      ip: req.ip, userAgent: req.get('user-agent') || undefined,
    };
  }

  overview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await masterDataService.overview(this.actor(req))); } catch (error) { next(error); }
  };

  meta = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await masterDataService.meta(this.actor(req))); } catch (error) { next(error); }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key;
      const query = masterDataListSchema.parse(req.query);
      sendSuccess(res, await masterDataService.list(dataset, this.actor(req), {
        q: query.q, status: query.status, page: query.page, limit: query.limit, unitGroup: query.unit_group, channelType: query.channel_type,
        transactionType: query.transaction_type, businessUnit: query.business_unit, parentId: query.parent_id,
      }));
    } catch (error) { next(validationError(error)); }
  };

  detail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key; sendSuccess(res, await masterDataService.detail(dataset, parseId(req.params.id), this.actor(req))); }
    catch (error) { next(error); }
  };

  usage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key; sendSuccess(res, await masterDataService.usage(dataset, parseId(req.params.id), this.actor(req))); }
    catch (error) { next(error); }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key;
      const body = createSchemas[dataset].parse(req.body) as Record<string, unknown>;
      sendSuccess(res, await masterDataService.create(dataset, body, this.actor(req)), undefined, 201);
    } catch (error) { next(validationError(error)); }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key;
      const body = updateSchemas[dataset].parse(req.body) as Record<string, unknown>;
      sendSuccess(res, await masterDataService.update(dataset, parseId(req.params.id), body, this.actor(req)));
    } catch (error) { next(validationError(error)); }
  };

  activate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key; sendSuccess(res, await masterDataService.setActive(dataset, parseId(req.params.id), true, this.actor(req))); }
    catch (error) { next(error); }
  };

  deactivate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const dataset = requireMasterDataDataset(single(req.params.dataset, 'Dataset')).key; sendSuccess(res, await masterDataService.setActive(dataset, parseId(req.params.id), false, this.actor(req))); }
    catch (error) { next(error); }
  };

  export = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = masterDataExportSchema.parse(req.query);
      const dataset = requireMasterDataDataset(query.dataset).key;
      const result = await masterDataService.export(dataset, query.format, {
        q: query.q, status: query.status, page: query.page, limit: query.limit, unitGroup: query.unit_group, channelType: query.channel_type,
        transactionType: query.transaction_type, businessUnit: query.business_unit, parentId: query.parent_id,
      }, this.actor(req));
      res.setHeader('Content-Type', result.mime);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Export-Total', String(result.total));
      res.send(result.buffer);
    } catch (error) { next(validationError(error)); }
  };
}
