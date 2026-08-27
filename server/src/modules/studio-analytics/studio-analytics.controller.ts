import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { analyticsFiltersSchema, exportSchema } from './studio-analytics.schema';
import { StudioAnalyticsService } from './studio-analytics.service';
import { StudioAnalyticsExportService } from './studio-analytics-export.service';
import { normalizeFilters, studioAnalyticsContext } from './studio-analytics.shared';
import type { StudioAnalyticsContext, StudioAnalyticsFilters } from './studio-analytics.types';

const service = new StudioAnalyticsService();
const exporter = new StudioAnalyticsExportService(service);
const actor = (req: Request) => Number((req as { user?: { id?: number } }).user?.id || 0);
const filters = (source: unknown) => {
  const value = analyticsFiltersSchema.parse(source);
  return normalizeFilters({ startDate: value.start_date || value.start, endDate: value.end_date || value.end, compare: value.compare, currency: value.currency, projectType: value.project_type, clientId: value.client_id, serviceId: value.service_id, page: value.page, limit: value.limit });
};
const handled = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'ANALYTICS_INVALID_FILTER', 'Filter analitik tidak valid.', error.issues) : error;

export class StudioAnalyticsController {
  private readonly analytics = service;
  private context(req: Request) { return studioAnalyticsContext(actor(req)); }
  private read(method: keyof StudioAnalyticsService) {
    return async (req: Request, res: Response, next: NextFunction) => { try { const ctx = await this.context(req); const action = this.analytics[method] as unknown as (context: StudioAnalyticsContext, reportFilters: StudioAnalyticsFilters) => Promise<unknown>; const data = await action.call(this.analytics, ctx, filters(req.query)); sendSuccess(res, data); } catch (error) { next(handled(error)); } };
  }
  overview = this.read('overview');
  projects = this.read('projects');
  clients = this.read('clients');
  services = this.read('services');
  commercial = this.read('commercial');
  revenue = this.read('revenue');
  profitability = this.read('profitability');
  receivables = this.read('receivables');
  vendors = this.read('vendors');
  equipment = this.read('equipment');
  export = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = exportSchema.parse(req.body);
      const reportFilters = filters({ ...(request.filters || {}), page: 1, limit: 100 });
      const result = await exporter.export(await this.context(req), request.report, request.format, reportFilters, actor(req));
      res.status(200).setHeader('Content-Type', result.contentType).setHeader('Content-Disposition', `attachment; filename=\"${result.filename}\"`).send(result.body);
    } catch (error) { next(handled(error)); }
  };
}
