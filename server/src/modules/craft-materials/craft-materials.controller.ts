import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import {
  adjustmentSchema, categorySchema, categoryTypes, categoryUpdateSchema, materialSchema,
  materialUpdateSchema, receiveStockSchema, spoolUpdateSchema, wasteSchema,
} from './craft-materials.schema';
import { CraftMaterialsService } from './craft-materials.service';
import type { MaterialActor, MaterialCategoryType } from './craft-materials.types';

function id(raw: unknown, code: string, label: string) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, code, `${label} tidak valid.`);
  return parsed;
}

function optionalId(raw: unknown) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  return id(raw, 'INVALID_MATERIAL_ID', 'ID material');
}

function validationError(error: unknown, message: string) {
  return error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;
}

export class CraftMaterialsController {
  private service = new CraftMaterialsService();

  private async actor(req: AuthRequest): Promise<MaterialActor> {
    const craft = await getCraftBusinessUnit();
    return { id: Number(req.user.id), organizationId: craft.organizationId, businessUnitId: craft.id };
  }

  getMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const categoryType = typeof req.query.categoryType === 'string' && (categoryTypes as readonly string[]).includes(req.query.categoryType)
        ? req.query.categoryType as MaterialCategoryType : undefined;
      const status = req.query.status === 'inactive' || req.query.status === 'all' ? req.query.status : 'active';
      sendSuccess(res, await this.service.getMaterials(await this.actor(req), {
        search: typeof req.query.search === 'string' ? req.query.search.trim() || undefined : undefined, categoryType, status,
      }));
    } catch (error) { next(error); }
  };

  createMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createMaterial(materialSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data material tidak valid.')); }
  };
  getMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getMaterialDetail(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), await this.actor(req))); }
    catch (error) { next(error); }
  };
  updateMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateMaterial(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), materialUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data material tidak valid.')); }
  };
  archiveMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.archiveMaterial(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), await this.actor(req))); }
    catch (error) { next(error); }
  };
  reactivateMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.reactivateMaterial(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.getCategories(await this.actor(req))); } catch (error) { next(error); }
  };
  createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createCategory(categorySchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data kategori material tidak valid.')); }
  };
  updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateCategory(id(req.params.categoryId, 'INVALID_CATEGORY_ID', 'ID kategori'), categoryUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data kategori material tidak valid.')); }
  };

  getUnits = async (_req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getUnits()); } catch (error) { next(error); } };
  getSuppliers = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getSuppliers(await this.actor(req))); } catch (error) { next(error); } };
  getSpools = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getSpools(await this.actor(req), optionalId(req.query.materialId))); } catch (error) { next(error); } };
  getMovements = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getMovements(await this.actor(req), optionalId(req.query.materialId))); } catch (error) { next(error); } };
  getLowStock = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getLowStock(await this.actor(req))); } catch (error) { next(error); } };
  getWaste = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await this.service.getWaste(await this.actor(req))); } catch (error) { next(error); } };

  receiveStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.receiveStock(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), receiveStockSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data penerimaan stok tidak valid.')); }
  };
  adjustStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.adjustStock(id(req.params.id, 'INVALID_MATERIAL_ID', 'ID material'), adjustmentSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data penyesuaian stok tidak valid.')); }
  };
  updateSpool = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateSpool(id(req.params.spoolId, 'INVALID_SPOOL_ID', 'ID spool'), spoolUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data spool tidak valid.')); }
  };
  recordWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.recordWaste(wasteSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data limbah material tidak valid.')); }
  };
}
