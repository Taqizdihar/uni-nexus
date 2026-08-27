import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getStudioBusinessUnit, parseNumericId } from '../studio-projects/studio-projects.helpers';
import { createCategorySchema, createPackageSchema, createServiceSchema, deactivateCategorySchema, updateCategorySchema, updatePackageSchema, updateServiceSchema } from './studio-services.schema';
import { studioServicesService } from './studio-services.service';
import type { PackageListFilters, ServiceListFilters, ServiceProjectFilters, StudioServicePricingModel } from './studio-services.types';

const actorId = (req: Request) => Number((req as any).user?.id);
const asValidationError = (error: unknown, message: string) => error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;
const positiveInt = (value: unknown, fallback: number) => { const parsed = Number.parseInt(String(value ?? ''), 10); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; };
const itemId = (req: Request, key = 'id', label = 'ID') => parseNumericId(req.params[key], label);
const pricingModels = new Set<StudioServicePricingModel>(['fixed', 'hourly', 'daily', 'package', 'custom']);

export class StudioServicesController {
  getOverview = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.overview(await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pricing = String(req.query.pricing_model || '') as StudioServicePricingModel;
      const filters: ServiceListFilters = {
        page: positiveInt(req.query.page, 1), limit: positiveInt(req.query.limit, 20), search: typeof req.query.search === 'string' ? req.query.search : undefined,
        categoryId: req.query.category_id ? positiveInt(req.query.category_id, 0) || undefined : undefined,
        pricingModel: pricingModels.has(pricing) ? pricing : undefined,
        status: ['active', 'inactive', 'all'].includes(String(req.query.status)) ? String(req.query.status) as ServiceListFilters['status'] : 'active',
        sortBy: ['name', 'newest', 'base_price', 'most_used'].includes(String(req.query.sort_by)) ? String(req.query.sort_by) as ServiceListFilters['sortBy'] : 'name',
        sortOrder: req.query.sort_order === 'desc' ? 'desc' : 'asc',
      };
      sendSuccess(res, await studioServicesService.list(filters, await getStudioBusinessUnit()));
    } catch (error) { next(error); }
  };
  createService = async (req: Request, res: Response, next: NextFunction) => { try { const data = createServiceSchema.parse(req.body); sendSuccess(res, await studioServicesService.createService(data, actorId(req), await getStudioBusinessUnit()), undefined, 201); } catch (error) { next(asValidationError(error, 'Data layanan tidak valid.')); } };
  getService = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.getServiceDetail(itemId(req, 'id', 'ID layanan'), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  updateService = async (req: Request, res: Response, next: NextFunction) => { try { const data = updateServiceSchema.parse(req.body); sendSuccess(res, await studioServicesService.updateService(itemId(req, 'id', 'ID layanan'), data, actorId(req), await getStudioBusinessUnit())); } catch (error) { next(asValidationError(error, 'Data layanan tidak valid.')); } };
  activateService = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.activateService(itemId(req, 'id', 'ID layanan'), actorId(req), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  deactivateService = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.deactivateService(itemId(req, 'id', 'ID layanan'), actorId(req), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getServiceProjects = async (req: Request, res: Response, next: NextFunction) => { try { const filters: ServiceProjectFilters = { page: positiveInt(req.query.page, 1), limit: positiveInt(req.query.limit, 20) }; sendSuccess(res, await studioServicesService.serviceProjects(itemId(req, 'id', 'ID layanan'), filters, await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getServicePackages = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.servicePackages(itemId(req, 'id', 'ID layanan'), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getServiceCommercialUsage = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.serviceCommercialUsage(itemId(req, 'id', 'ID layanan'), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getServiceActivity = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.serviceActivity(itemId(req, 'id', 'ID layanan'), await getStudioBusinessUnit())); } catch (error) { next(error); } };

  getCategories = async (_req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.categories(await getStudioBusinessUnit())); } catch (error) { next(error); } };
  createCategory = async (req: Request, res: Response, next: NextFunction) => { try { const data = createCategorySchema.parse(req.body); sendSuccess(res, await studioServicesService.createCategory(data, actorId(req), await getStudioBusinessUnit()), undefined, 201); } catch (error) { next(asValidationError(error, 'Data kategori tidak valid.')); } };
  updateCategory = async (req: Request, res: Response, next: NextFunction) => { try { const data = updateCategorySchema.parse(req.body); sendSuccess(res, await studioServicesService.updateCategory(itemId(req, 'categoryId', 'ID kategori'), data, actorId(req), await getStudioBusinessUnit())); } catch (error) { next(asValidationError(error, 'Data kategori tidak valid.')); } };
  activateCategory = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.activateCategory(itemId(req, 'categoryId', 'ID kategori'), actorId(req), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  deactivateCategory = async (req: Request, res: Response, next: NextFunction) => { try { const data = deactivateCategorySchema.parse(req.body ?? {}); sendSuccess(res, await studioServicesService.deactivateCategory(itemId(req, 'categoryId', 'ID kategori'), data.confirm_active_services, actorId(req), await getStudioBusinessUnit())); } catch (error) { next(asValidationError(error, 'Data penonaktifan kategori tidak valid.')); } };

  getPackages = async (req: Request, res: Response, next: NextFunction) => { try { const filters: PackageListFilters = { status: ['active', 'inactive', 'all'].includes(String(req.query.status)) ? String(req.query.status) as PackageListFilters['status'] : 'active', search: typeof req.query.search === 'string' ? req.query.search : undefined }; sendSuccess(res, await studioServicesService.packages(filters, await getStudioBusinessUnit())); } catch (error) { next(error); } };
  createPackage = async (req: Request, res: Response, next: NextFunction) => { try { const data = createPackageSchema.parse(req.body); sendSuccess(res, await studioServicesService.createPackage(data, actorId(req), await getStudioBusinessUnit()), undefined, 201); } catch (error) { next(asValidationError(error, 'Data paket layanan tidak valid.')); } };
  getPackage = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.getPackageDetail(itemId(req, 'packageId', 'ID paket'), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  updatePackage = async (req: Request, res: Response, next: NextFunction) => { try { const data = updatePackageSchema.parse(req.body); sendSuccess(res, await studioServicesService.updatePackage(itemId(req, 'packageId', 'ID paket'), data, actorId(req), await getStudioBusinessUnit())); } catch (error) { next(asValidationError(error, 'Data paket layanan tidak valid.')); } };
  activatePackage = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.activatePackage(itemId(req, 'packageId', 'ID paket'), actorId(req), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  deactivatePackage = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await studioServicesService.deactivatePackage(itemId(req, 'packageId', 'ID paket'), actorId(req), await getStudioBusinessUnit())); } catch (error) { next(error); } };
  getPackageProjects = async (req: Request, res: Response, next: NextFunction) => { try { const filters: ServiceProjectFilters = { page: positiveInt(req.query.page, 1), limit: positiveInt(req.query.limit, 20) }; sendSuccess(res, await studioServicesService.packageProjects(itemId(req, 'packageId', 'ID paket'), filters, await getStudioBusinessUnit())); } catch (error) { next(error); } };
}
