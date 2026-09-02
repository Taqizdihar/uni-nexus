import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/utils/response';
import { searchService } from './search.service';

export class SearchController {
  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const actor = {
        organizationId: Number(user.organization_id),
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        workspaceAccess: {
          craft: Array.isArray(user.workspaces) && user.workspaces.includes('craft'),
          studio: Array.isArray(user.workspaces) && user.workspaces.includes('studio'),
        },
      };
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      sendSuccess(res, await searchService.search(actor, query));
    } catch (error) {
      next(error);
    }
  };
}
