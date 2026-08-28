import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { DashboardService } from './dashboard.service';
import { dashboardFiltersSchema } from './dashboard.schema';

const service = new DashboardService();

export class DashboardController {
  overview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters = dashboardFiltersSchema.parse(req.query);
      const data = await service.overview(filters, {
        id: Number(req.user.id),
        organization_id: Number(req.user.organization_id),
        permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [],
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error instanceof z.ZodError
        ? new AppError(400, 'DASHBOARD_INVALID_FILTER', 'Filter Dasbor tidak valid.', error.issues)
        : error);
    }
  };
}
