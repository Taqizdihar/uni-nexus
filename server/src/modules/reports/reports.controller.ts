import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { reportAccessService } from './reports-access.service';
import { exportSchema, historySchema, reportFiltersSchema } from './reports.schema';
import { reportsService } from './reports.service';
import type { ReportActor, ReportFilters } from './reports.types';

const actor = (req: AuthRequest): ReportActor => ({ id: Number(req.user!.id), organization_id: Number(req.user!.organization_id), permissions: Array.isArray(req.user!.permissions) ? req.user!.permissions : [] });
const handled = (error: unknown) => error instanceof z.ZodError ? new AppError(400, 'REPORT_INVALID_FILTER', 'Filter laporan tidak valid.', error.issues) : error;
const id = (value: string) => { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(404, 'REPORT_EXPORT_NOT_FOUND', 'Ekspor laporan tidak ditemukan.'); return parsed; };
const filters = (value: unknown): ReportFilters => {
  const parsed = reportFiltersSchema.parse(value);
  return { ...parsed, period: parsed.period ?? 'last_30_days', workspace: parsed.workspace ?? 'all', compare: parsed.compare ?? false, page: parsed.page ?? 1, limit: parsed.limit ?? 25 };
};

export class ReportsController {
  overview = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await reportsService.overview(actor(req))); } catch (error) { next(handled(error)); } };
  catalog = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const entries = await reportsService.catalog(actor(req)); sendSuccess(res, entries.map(item => ({ id: item.definition.id, report_code: item.registry.reportCode, name: item.definition.name || item.registry.displayName, description: item.registry.description, group: item.registry.group, scope: item.registry.businessUnitCode?.toLowerCase() || item.registry.group, report_type: item.definition.report_type, supported_formats: item.registry.supportedFormats, can_preview: true, can_export: item.can_export, default_period: item.registry.defaultPeriod, source_module: item.registry.sourceModule, source_path: item.registry.sourcePath }))); } catch (error) { next(handled(error)); } };
  meta = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await reportsService.meta(actor(req))); } catch (error) { next(handled(error)); } };
  preview = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const access = await reportAccessService.resolve(actor(req), String(req.params.reportCode)); sendSuccess(res, await reportsService.preview(access, filters(req.query))); } catch (error) { next(handled(error)); } };
  export = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const request = exportSchema.parse(req.body); const access = await reportAccessService.resolve(actor(req), String(req.params.reportCode), 'export'); sendSuccess(res, await reportsService.export(access, filters({ ...(request.filters || {}), page: 1, limit: 100 }), request.format), undefined, 201); } catch (error) { next(handled(error)); } };
  history = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const query = historySchema.parse(req.query); sendSuccess(res, await reportsService.history(actor(req), { ...query, page: query.page ?? 1, limit: query.limit ?? 25 })); } catch (error) { next(handled(error)); } };
  exportDetail = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await reportsService.exportDetail(actor(req), id(String(req.params.id)))); } catch (error) { next(handled(error)); } };
  download = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await reportsService.download(actor(req), id(String(req.params.id)), res); } catch (error) { next(handled(error)); } };
}
