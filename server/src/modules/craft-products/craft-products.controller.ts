import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess } from '../../shared/utils/response';
import { getCraftBusinessUnit } from '../craft-orders/craft-orders.helpers';
import {
  bomSchema, bomUpdateSchema, categorySchema, categoryUpdateSchema, designMetadataSchema, designUpdateSchema,
  printProfileSchema, printProfileUpdateSchema, productSchema, productUpdateSchema, variantSchema, variantUpdateSchema,
} from './craft-products.schema';
import { CraftProductsService, type ProductActor } from './craft-products.service';
import { storageService } from '../../shared/storage';

function id(value: string | string[] | undefined, code: string, label: string) {
  if (Array.isArray(value)) throw new AppError(400, code, `${label} tidak valid.`);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, code, `${label} tidak valid.`);
  return parsed;
}

function optionalId(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[]) {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

function validationError(error: unknown, message: string) {
  return error instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', message, error.issues) : error;
}

function multipartValues(body: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...body };
  const ids = ['product_id', 'variant_id', 'printer_id', 'estimated_material_unit_id'];
  const numbers = ['nozzle_diameter_mm', 'layer_height_mm', 'infill_percent', 'estimated_print_minutes', 'estimated_material_qty'];
  for (const key of ids) if (normalized[key] === '') normalized[key] = null; else if (typeof normalized[key] === 'string') normalized[key] = Number(normalized[key]);
  for (const key of numbers) if (normalized[key] === '') normalized[key] = null; else if (typeof normalized[key] === 'string') normalized[key] = Number(normalized[key]);
  if (typeof normalized.is_final === 'string') normalized.is_final = normalized.is_final === 'true' || normalized.is_final === '1';
  if (typeof normalized.support_enabled === 'string') normalized.support_enabled = normalized.support_enabled === 'true' || normalized.support_enabled === '1';
  if (typeof normalized.is_default === 'string') normalized.is_default = normalized.is_default === 'true' || normalized.is_default === '1';
  if (typeof normalized.settings_json === 'string' && normalized.settings_json.trim()) {
    try { normalized.settings_json = JSON.parse(normalized.settings_json); }
    catch { throw new AppError(400, 'INVALID_SETTINGS_JSON', 'Pengaturan profil cetak harus berupa JSON yang valid.'); }
  }
  return normalized;
}

export class CraftProductsController {
  private service = new CraftProductsService();

  private async actor(req: AuthRequest): Promise<ProductActor> {
    const craft = await getCraftBusinessUnit();
    return {
      id: Number(req.user.id), organizationId: craft.organizationId, businessUnitId: craft.id,
      ip: req.ip, userAgent: req.get('user-agent') || undefined,
    };
  }

  getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      const status = optionalEnum(req.query.status, ['active', 'inactive', 'all'] as const) || 'active';
      sendSuccess(res, await this.service.getProducts(actor.businessUnitId, {
        search: typeof req.query.search === 'string' ? req.query.search.trim() || undefined : undefined,
        categoryId: optionalId(req.query.categoryId),
        productType: optionalEnum(req.query.productType, ['premade', 'customizable', 'custom_service'] as const), status,
      }));
    } catch (error) { next(error); }
  };

  createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createProduct(productSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data produk tidak valid.')); }
  };

  getProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getProduct(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), actor)); }
    catch (error) { next(error); }
  };

  updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateProduct(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), productUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data produk tidak valid.')); }
  };

  archiveProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.archiveProduct(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  reactivateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.reactivateProduct(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  uploadImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'IMAGE_REQUIRED', 'Pilih gambar produk terlebih dahulu.');
      sendSuccess(res, await this.service.saveProductImage(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), req.file, await this.actor(req)));
    } catch (error) { next(error); }
  };

  getImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      const image = await this.service.getProductImage(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), actor.businessUnitId);
      await storageService.streamToResponse(res, image.storageKey, { filename: image.filename, disposition: 'inline', cacheControl: 'private, max-age=3600' });
    } catch (error) { next(error); }
  };

  removeImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.removeProductImage(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getCategories(actor.businessUnitId)); }
    catch (error) { next(error); }
  };

  createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createCategory(categorySchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data kategori tidak valid.')); }
  };

  updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateCategory(id(req.params.categoryId, 'INVALID_CATEGORY_ID', 'ID kategori'), categoryUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data kategori tidak valid.')); }
  };

  deactivateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.deactivateCategory(id(req.params.categoryId, 'INVALID_CATEGORY_ID', 'ID kategori'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getVariants = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getVariants(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), actor.businessUnitId)); }
    catch (error) { next(error); }
  };

  createVariant = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createVariant(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), variantSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data varian tidak valid.')); }
  };

  updateVariant = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateVariant(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), id(req.params.variantId, 'INVALID_VARIANT_ID', 'ID varian'), variantUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data varian tidak valid.')); }
  };

  getBoms = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getBoms(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), actor.businessUnitId)); }
    catch (error) { next(error); }
  };

  createBom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createBom(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), bomSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data BOM tidak valid.')); }
  };

  updateBom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateBom(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), id(req.params.bomId, 'INVALID_BOM_ID', 'ID BOM'), bomUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data BOM tidak valid.')); }
  };

  activateBom = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.activateBom(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), id(req.params.bomId, 'INVALID_BOM_ID', 'ID BOM'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getDesignFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      sendSuccess(res, await this.service.getDesignFiles(actor.businessUnitId, { productId: optionalId(req.query.productId), variantId: optionalId(req.query.variantId) }));
    } catch (error) { next(error); }
  };

  uploadDesignFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'DESIGN_FILE_REQUIRED', 'Pilih file desain terlebih dahulu.');
      const parsed = designMetadataSchema.parse(multipartValues(req.body));
      sendSuccess(res, await this.service.uploadDesignFile(parsed, req.file, await this.actor(req)), undefined, 201);
    } catch (error) { next(validationError(error, 'Metadata file desain tidak valid.')); }
  };

  updateDesignFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updateDesignFile(id(req.params.designId, 'INVALID_DESIGN_ID', 'ID desain'), designUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Metadata file desain tidak valid.')); }
  };

  downloadDesignFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      const design = await this.service.downloadDesignFile(id(req.params.designId, 'INVALID_DESIGN_ID', 'ID desain'), actor.businessUnitId);
      await storageService.streamToResponse(res, design.storageKey, { filename: design.filename });
    } catch (error) { next(error); }
  };

  deleteDesignFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.deleteDesignFile(id(req.params.designId, 'INVALID_DESIGN_ID', 'ID desain'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getPrintProfiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      sendSuccess(res, await this.service.getPrintProfiles(actor.businessUnitId, { productId: optionalId(req.query.productId), variantId: optionalId(req.query.variantId), printerId: optionalId(req.query.printerId) }));
    } catch (error) { next(error); }
  };

  createPrintProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.createPrintProfile(printProfileSchema.parse(req.body), await this.actor(req)), undefined, 201); }
    catch (error) { next(validationError(error, 'Data profil cetak tidak valid.')); }
  };

  updatePrintProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.updatePrintProfile(id(req.params.profileId, 'INVALID_PROFILE_ID', 'ID profil cetak'), printProfileUpdateSchema.parse(req.body), await this.actor(req))); }
    catch (error) { next(validationError(error, 'Data profil cetak tidak valid.')); }
  };

  setDefaultPrintProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.setDefaultPrintProfile(id(req.params.profileId, 'INVALID_PROFILE_ID', 'ID profil cetak'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  deletePrintProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await this.service.deletePrintProfile(id(req.params.profileId, 'INVALID_PROFILE_ID', 'ID profil cetak'), await this.actor(req))); }
    catch (error) { next(error); }
  };

  getCosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { const actor = await this.actor(req); sendSuccess(res, await this.service.getCosting(id(req.params.id, 'INVALID_PRODUCT_ID', 'ID produk'), actor.businessUnitId)); }
    catch (error) { next(error); }
  };
}
