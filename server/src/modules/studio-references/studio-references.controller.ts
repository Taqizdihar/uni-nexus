import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/utils/response';
import { getStudioBusinessUnit } from '../studio-projects/studio-projects.helpers';
import { studioReferencesService } from './studio-references.service';

const search = (req: Request) => (typeof req.query.search === 'string' ? req.query.search : undefined);

export class StudioReferencesController {
  getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await getStudioBusinessUnit();
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 50;
      sendSuccess(res, await studioReferencesService.getClients(studio, search(req), Number.isFinite(limit) ? limit : 50));
    } catch (error) { next(error); }
  };

  getServices = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioReferencesService.getServices(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getServicePackages = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioReferencesService.getServicePackages(await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioReferencesService.getUsers(await getStudioBusinessUnit(), search(req)));
    } catch (error) { next(error); }
  };

  getExternalParties = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await studioReferencesService.getExternalParties(await getStudioBusinessUnit(), search(req)));
    } catch (error) { next(error); }
  };
}
