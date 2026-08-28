import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import type {
  BomInput, BomUpdateInput, CategoryInput, CraftProductFilters, DesignInput, DesignUpdateInput,
  PrintProfileInput, ProductInput, ProductUpdateInput, VariantInput,
} from './craft-products.types';
import { CraftProductsRepository } from './craft-products.repository';

export interface ProductActor {
  id: number;
  organizationId: number;
  businessUnitId: number;
  ip?: string;
  userAgent?: string;
}

function cleanText(value: string | null | undefined) { return value?.trim() || null; }
function duplicateError(error: any) { return error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062; }

export class CraftProductsService {
  readonly repository = new CraftProductsRepository();

  private async transaction<T>(work: (connection: Awaited<ReturnType<typeof pool.getConnection>>) => Promise<T>) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const value = await work(connection);
      await connection.commit();
      return value;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  private audit(actor: ProductActor, action: string, entityType: string, entityId: number, entityCode: string | null, description: string, oldValues: unknown, newValues: unknown, connection: Awaited<ReturnType<typeof pool.getConnection>>) {
    return this.repository.insertAudit({
      organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, userId: actor.id, action, entityType,
      entityId, entityCode, description, oldValues, newValues, ip: actor.ip, userAgent: actor.userAgent,
    }, connection);
  }

  private async assertProduct(id: number, businessUnitId: number, connection?: Awaited<ReturnType<typeof pool.getConnection>>) {
    const product = await this.repository.getProduct(id, businessUnitId, connection);
    if (!product) throw new NotFoundError('Produk tidak ditemukan.');
    return product;
  }

  private async assertCategory(categoryId: number | null | undefined, businessUnitId: number, connection: Awaited<ReturnType<typeof pool.getConnection>>) {
    if (!categoryId) return null;
    const category = await this.repository.validateCategory(categoryId, businessUnitId, connection);
    if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Kategori tidak ditemukan di unit Craft.');
    return category;
  }

  private async assertVariant(productId: number, variantId: number | null | undefined, businessUnitId: number, connection?: Awaited<ReturnType<typeof pool.getConnection>>) {
    if (!variantId) return null;
    const variant = await this.repository.getVariant(variantId, productId, businessUnitId, connection);
    if (!variant) throw new AppError(400, 'INVALID_VARIANT', 'Varian tidak ditemukan untuk produk ini.');
    return variant;
  }

  private async assertProfileReferences(data: { product_id?: number | null; variant_id?: number | null; printer_id?: number | null; estimated_material_unit_id?: number | null }, actor: ProductActor, connection: Awaited<ReturnType<typeof pool.getConnection>>) {
    if (data.variant_id && !data.product_id) throw new AppError(400, 'PRODUCT_REQUIRED_FOR_VARIANT', 'Produk wajib dipilih saat memilih varian.');
    if (data.product_id) await this.assertProduct(data.product_id, actor.businessUnitId, connection);
    if (data.product_id && data.variant_id) await this.assertVariant(data.product_id, data.variant_id, actor.businessUnitId, connection);
    if (data.printer_id && !await this.repository.validatePrinter(data.printer_id, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_PRINTER', 'Printer tidak ditemukan di unit Craft.');
    if (data.estimated_material_unit_id && !await this.repository.validateUnit(data.estimated_material_unit_id, connection)) throw new AppError(400, 'INVALID_UNIT', 'Satuan material tidak ditemukan atau tidak aktif.');
  }

  private readiness(product: any, costing: any) {
    const checks = {
      active: Boolean(product.is_active) && !product.deleted_at,
      price: Number(product.base_selling_price) > 0,
      bom: Number(product.active_bom_count) > 0,
      design: Number(product.design_file_count) > 0,
      print_profile: Number(product.print_profile_count) > 0,
    };
    const warnings: string[] = [];
    if (!checks.active) warnings.push('Produk dinonaktifkan dan tidak dapat dipilih untuk pesanan baru.');
    if (!checks.price) warnings.push('Harga jual belum tersedia.');
    if (!checks.bom) warnings.push('BOM material belum tersedia.');
    if (!checks.design && product.product_type !== 'custom_service') warnings.push('File desain belum tersedia.');
    if (!checks.print_profile) warnings.push('Profil cetak belum tersedia.');
    if (!costing.cost_available) warnings.push('Biaya produksi belum dapat dihitung dari BOM atau estimasi biaya.');
    return { checks, warnings, ready: checks.active && checks.price && (product.product_type === 'custom_service' || (checks.bom && checks.design && checks.print_profile)) };
  }

  private calculateCosting(row: any) {
    const bomCost = row?.bom_cost === null || row?.bom_cost === undefined ? null : Number(row.bom_cost);
    const enteredEstimatedCost = Number(row?.estimated_cost || 0);
    const costAvailable = bomCost !== null || enteredEstimatedCost > 0;
    const effectiveCost = bomCost ?? (enteredEstimatedCost > 0 ? enteredEstimatedCost : null);
    const sellingPrice = Number(row?.base_selling_price || 0);
    const marginPercent = effectiveCost !== null && sellingPrice > 0 ? ((sellingPrice - effectiveCost) / sellingPrice) * 100 : null;
    const targetMargin = row?.default_margin_percent === null || row?.default_margin_percent === undefined ? null : Number(row.default_margin_percent);
    const suggestedSellingPrice = effectiveCost !== null && targetMargin !== null && targetMargin < 100
      ? effectiveCost / (1 - targetMargin / 100) : null;
    return {
      product_id: Number(row.id), selling_price: sellingPrice, entered_estimated_cost: enteredEstimatedCost,
      bom_id: row.bom_id === null || row.bom_id === undefined ? null : Number(row.bom_id), bom_name: row.bom_name || null,
      calculated_bom_cost: bomCost, effective_cost: effectiveCost, cost_available: costAvailable,
      margin_percent: marginPercent, target_margin_percent: targetMargin, suggested_selling_price: suggestedSellingPrice,
    };
  }

  async getProducts(businessUnitId: number, filters: CraftProductFilters) {
    const products = await this.repository.listProducts(businessUnitId, filters);
    return products.map(product => {
      const costing = this.calculateCosting(product);
      return { ...product, costing, readiness: this.readiness(product, costing) };
    });
  }

  async getProduct(id: number, actor: Pick<ProductActor, 'businessUnitId'>) {
    const product = await this.assertProduct(id, actor.businessUnitId);
    const [variants, boms, designs, profiles, costingRow, usage] = await Promise.all([
      this.repository.getVariants(id, actor.businessUnitId), this.repository.getBoms(id, actor.businessUnitId),
      this.repository.listDesignFiles(actor.businessUnitId, { productId: id }),
      this.repository.listPrintProfiles(actor.businessUnitId, { productId: id }), this.repository.getCosting(id, actor.businessUnitId), this.repository.getUsage(id),
    ]);
    const costing = this.calculateCosting(costingRow || product);
    return { product, variants, boms, design_files: designs, print_profiles: profiles, costing, readiness: this.readiness(product, costing), usage };
  }

  async createProduct(data: ProductInput, actor: ProductActor) {
    try {
      const result = await this.transaction(async connection => {
        await this.assertCategory(data.category_id, actor.businessUnitId, connection);
        const manualSku = cleanText(data.sku);
        const temporarySku = manualSku || `TMP-${randomUUID()}`;
        const id = await this.repository.createProduct(actor.businessUnitId, {
          sku: temporarySku, name: data.name.trim(), categoryId: data.category_id ?? null, description: cleanText(data.description), productType: data.product_type,
          sellingPrice: data.base_selling_price ?? 0, estimatedCost: data.estimated_cost ?? 0, weight: data.estimated_weight_g ?? null,
          minutes: data.estimated_print_minutes ?? null, margin: data.default_margin_percent ?? null,
        }, connection);
        const sku = manualSku || `PRD-${String(id).padStart(6, '0')}`;
        if (!manualSku) await this.repository.updateProduct(id, { sku }, undefined, connection);
        await this.audit(actor, 'product.create', 'product', id, sku, `Membuat produk ${data.name.trim()}.`, null, { ...data, sku }, connection);
        return { id, sku };
      });
      return result;
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'PRODUCT_SKU_EXISTS', 'SKU tersebut sudah digunakan oleh produk lain.');
      throw error;
    }
  }

  async updateProduct(id: number, data: ProductUpdateInput, actor: ProductActor) {
    if (data.sku !== undefined && !cleanText(data.sku)) throw new AppError(400, 'SKU_REQUIRED', 'SKU produk tidak boleh kosong.');
    try {
      await this.transaction(async connection => {
        const previous = await this.assertProduct(id, actor.businessUnitId, connection);
        await this.assertCategory(data.category_id, actor.businessUnitId, connection);
        await this.repository.updateProduct(id, data, data.category_id, connection);
        const updated = await this.assertProduct(id, actor.businessUnitId, connection);
        await this.audit(actor, 'product.update', 'product', id, updated.sku, `Memperbarui produk ${updated.name}.`, previous, updated, connection);
      });
      return this.getProduct(id, actor);
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'PRODUCT_SKU_EXISTS', 'SKU tersebut sudah digunakan oleh produk lain.');
      throw error;
    }
  }

  async archiveProduct(id: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const previous = await this.assertProduct(id, actor.businessUnitId, connection);
      await this.repository.setProductArchive(id, false, connection);
      await this.audit(actor, 'product.archive', 'product', id, previous.sku, `Menonaktifkan produk ${previous.name}.`, previous, { is_active: false }, connection);
    });
    return { message: 'Produk berhasil dinonaktifkan.' };
  }

  async reactivateProduct(id: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const previous = await this.assertProduct(id, actor.businessUnitId, connection);
      await this.repository.setProductArchive(id, true, connection);
      await this.audit(actor, 'product.reactivate', 'product', id, previous.sku, `Mengaktifkan kembali produk ${previous.name}.`, previous, { is_active: true }, connection);
    });
    return { message: 'Produk berhasil diaktifkan kembali.' };
  }

  async saveProductImage(id: number, file: Express.Multer.File, actor: ProductActor) {
    await this.assertProduct(id, actor.businessUnitId);
    const saved = await storageService.saveUploadedFile('product_image', file, { productId: id });
    let previousPath: string | null = null;
    try {
      await this.transaction(async connection => {
        const product = await this.assertProduct(id, actor.businessUnitId, connection);
        previousPath = product.image_path;
        await this.repository.setProductImage(id, saved.key, connection);
        await this.audit(actor, 'product.image_upload', 'product', id, product.sku, `Mengunggah gambar utama produk ${product.name}.`, { image_path: product.image_path }, { image_path: saved.key }, connection);
      });
    } catch (error) {
      await storageService.delete(saved.key);
      throw error;
    }
    await storageService.delete(previousPath);
    return { image_path: saved.key };
  }

  async removeProductImage(id: number, actor: ProductActor) {
    let previousPath: string | null = null;
    await this.transaction(async connection => {
      const product = await this.assertProduct(id, actor.businessUnitId, connection);
      previousPath = product.image_path;
      if (!previousPath) return;
      await this.repository.setProductImage(id, null, connection);
      await this.audit(actor, 'product.image_remove', 'product', id, product.sku, `Menghapus gambar utama produk ${product.name}.`, { image_path: previousPath }, { image_path: null }, connection);
    });
    await storageService.delete(previousPath);
    return { message: 'Gambar produk berhasil dihapus.' };
  }

  async getProductImage(id: number, businessUnitId: number) {
    const product = await this.assertProduct(id, businessUnitId);
    if (!product.image_path) throw new NotFoundError('Gambar produk belum tersedia.');
    if (!await storageService.exists(product.image_path)) throw new NotFoundError('Berkas gambar produk tidak ditemukan.');
    return { storageKey: product.image_path, filename: 'product-image' };
  }

  private async nextCategoryCode(baseValue: string, businessUnitId: number, connection: Awaited<ReturnType<typeof pool.getConnection>>, excludeId?: number) {
    const base = (baseValue.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 44) || 'CATEGORY');
    for (let suffix = 1; suffix < 500; suffix += 1) {
      const code = suffix === 1 ? base : `${base.slice(0, 50 - String(suffix).length - 1)}_${suffix}`;
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM product_categories WHERE business_unit_id = ? AND code = ? LIMIT 1', [businessUnitId, code]);
      if (!rows.length || (excludeId && Number(rows[0].id) === excludeId)) return code;
    }
    throw new AppError(409, 'CATEGORY_CODE_EXISTS', 'Kode kategori tidak dapat dibuat secara unik.');
  }

  async getCategories(businessUnitId: number) { return this.repository.getCategories(businessUnitId); }

  async createCategory(data: CategoryInput, actor: ProductActor) {
    try {
      const id = await this.transaction(async connection => {
        if (data.parent_id) await this.assertCategory(data.parent_id, actor.businessUnitId, connection);
        const code = await this.nextCategoryCode(cleanText(data.code) || data.name, actor.businessUnitId, connection);
        const categoryId = await this.repository.createCategory(actor.businessUnitId, code, data.name.trim(), data.parent_id ?? null, data.is_active ?? true, connection);
        await this.audit(actor, 'category.create', 'product_category', categoryId, code, `Membuat kategori ${data.name.trim()}.`, null, { ...data, code }, connection);
        return categoryId;
      });
      return this.repository.getCategory(id, actor.businessUnitId);
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'CATEGORY_CODE_EXISTS', 'Kode kategori tersebut sudah digunakan.');
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<CategoryInput>, actor: ProductActor) {
    try {
      await this.transaction(async connection => {
        const previous = await this.repository.getCategory(id, actor.businessUnitId, connection);
        if (!previous) throw new NotFoundError('Kategori tidak ditemukan.');
        if (data.parent_id === id) throw new AppError(400, 'INVALID_CATEGORY_PARENT', 'Kategori tidak dapat menjadi induk dirinya sendiri.');
        if (data.parent_id) await this.assertCategory(data.parent_id, actor.businessUnitId, connection);
        const code = data.code !== undefined ? await this.nextCategoryCode(cleanText(data.code) || data.name || previous.name, actor.businessUnitId, connection, id) : undefined;
        await this.repository.updateCategory(id, { ...data, code }, data.parent_id, connection);
        const updated = await this.repository.getCategory(id, actor.businessUnitId, connection);
        await this.audit(actor, data.is_active === false ? 'category.deactivate' : 'category.update', 'product_category', id, updated?.code || previous.code, `Memperbarui kategori ${previous.name}.`, previous, updated, connection);
      });
      return this.repository.getCategory(id, actor.businessUnitId);
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'CATEGORY_CODE_EXISTS', 'Kode kategori tersebut sudah digunakan.');
      throw error;
    }
  }

  async deactivateCategory(id: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const category = await this.repository.getCategory(id, actor.businessUnitId, connection);
      if (!category) throw new NotFoundError('Kategori tidak ditemukan.');
      await this.repository.setCategoryActive(id, false, connection);
      await this.audit(actor, 'category.deactivate', 'product_category', id, category.code, `Menonaktifkan kategori ${category.name}.`, category, { is_active: false }, connection);
    });
    return { message: 'Kategori berhasil dinonaktifkan.' };
  }

  async getVariants(productId: number, businessUnitId: number) {
    await this.assertProduct(productId, businessUnitId);
    return this.repository.getVariants(productId, businessUnitId);
  }

  async createVariant(productId: number, data: VariantInput, actor: ProductActor) {
    try {
      const result = await this.transaction(async connection => {
        const product = await this.assertProduct(productId, actor.businessUnitId, connection);
        const manualSku = cleanText(data.sku);
        const temporarySku = manualSku || `TMP-${randomUUID()}`;
        const id = await this.repository.createVariant(productId, {
          sku: temporarySku, name: data.name.trim(), attributes: data.attributes ?? null, sellingPrice: data.selling_price ?? null,
          estimatedCost: data.estimated_cost ?? null, weight: data.estimated_weight_g ?? null, minutes: data.estimated_print_minutes ?? null, active: data.is_active ?? true,
        }, connection);
        const sku = manualSku || `VAR-${String(id).padStart(6, '0')}`;
        if (!manualSku) await this.repository.updateVariant(id, { sku }, connection);
        await this.audit(actor, 'variant.create', 'product_variant', id, sku, `Membuat varian ${data.name.trim()} untuk produk ${product.name}.`, null, { ...data, sku, product_id: productId }, connection);
        return { id, sku };
      });
      return result;
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'VARIANT_SKU_EXISTS', 'SKU tersebut sudah digunakan oleh varian lain.');
      throw error;
    }
  }

  async updateVariant(productId: number, variantId: number, data: Partial<VariantInput>, actor: ProductActor) {
    if (data.sku !== undefined && !cleanText(data.sku)) throw new AppError(400, 'SKU_REQUIRED', 'SKU varian tidak boleh kosong.');
    try {
      await this.transaction(async connection => {
        const product = await this.assertProduct(productId, actor.businessUnitId, connection);
        const previous = await this.assertVariant(productId, variantId, actor.businessUnitId, connection);
        await this.repository.updateVariant(variantId, data, connection);
        const updated = await this.assertVariant(productId, variantId, actor.businessUnitId, connection);
        const action = data.is_active === false ? 'variant.deactivate' : data.is_active === true && !previous?.is_active ? 'variant.reactivate' : 'variant.update';
        await this.audit(actor, action, 'product_variant', variantId, updated?.sku || previous?.sku || null, `Memperbarui varian pada produk ${product.name}.`, previous, updated, connection);
      });
      return this.repository.getVariant(variantId, productId, actor.businessUnitId);
    } catch (error) {
      if (duplicateError(error)) throw new AppError(409, 'VARIANT_SKU_EXISTS', 'SKU tersebut sudah digunakan oleh varian lain.');
      throw error;
    }
  }

  async getBoms(productId: number, businessUnitId: number) {
    await this.assertProduct(productId, businessUnitId);
    return this.repository.getBoms(productId, businessUnitId);
  }

  async createBom(productId: number, data: BomInput, actor: ProductActor) {
    const result = await this.transaction(async connection => {
      const product = await this.assertProduct(productId, actor.businessUnitId, connection);
      await this.assertVariant(productId, data.variant_id, actor.businessUnitId, connection);
      if (!await this.repository.validateBomItems(data.items, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_BOM_ITEM', 'Material atau satuan BOM tidak valid untuk unit Craft. Gunakan satuan dasar material.');
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT COALESCE(MAX(version_no), 0) AS current_version FROM product_boms WHERE product_id = ? AND variant_id <=> ? FOR UPDATE',
        [productId, data.variant_id ?? null],
      );
      const versionNo = Number(rows[0].current_version) + 1;
      const id = await this.repository.createBom(productId, data.variant_id ?? null, versionNo, data.name.trim(), cleanText(data.notes), connection);
      await this.repository.replaceBomItems(id, data.items, connection);
      await this.repository.setActiveBom(productId, data.variant_id ?? null, id, connection);
      await this.audit(actor, 'bom.create', 'product_bom', id, `${product.sku}-BOM-${versionNo}`, `Membuat BOM ${data.name.trim()} untuk produk ${product.name}.`, null, data, connection);
      return { id, version_no: versionNo };
    });
    return result;
  }

  async updateBom(productId: number, bomId: number, data: BomUpdateInput, actor: ProductActor) {
    await this.transaction(async connection => {
      const product = await this.assertProduct(productId, actor.businessUnitId, connection);
      const bom = await this.repository.getBom(bomId, productId, actor.businessUnitId, connection);
      if (!bom) throw new NotFoundError('BOM tidak ditemukan.');
      if (data.items && !await this.repository.validateBomItems(data.items, actor.businessUnitId, connection)) throw new AppError(400, 'INVALID_BOM_ITEM', 'Material atau satuan BOM tidak valid untuk unit Craft. Gunakan satuan dasar material.');
      await this.repository.updateBom(bomId, { name: data.name?.trim(), notes: data.notes === undefined ? undefined : cleanText(data.notes) }, connection);
      if (data.items) await this.repository.replaceBomItems(bomId, data.items, connection);
      await this.audit(actor, 'bom.update', 'product_bom', bomId, `${product.sku}-BOM-${bom.version_no}`, `Memperbarui BOM ${bom.name}.`, bom, data, connection);
    });
    return this.repository.getBoms(productId, actor.businessUnitId);
  }

  async activateBom(productId: number, bomId: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const product = await this.assertProduct(productId, actor.businessUnitId, connection);
      const bom = await this.repository.getBom(bomId, productId, actor.businessUnitId, connection);
      if (!bom) throw new NotFoundError('BOM tidak ditemukan.');
      await this.repository.setActiveBom(productId, bom.variant_id, bomId, connection);
      await this.audit(actor, 'bom.activate', 'product_bom', bomId, `${product.sku}-BOM-${bom.version_no}`, `Mengaktifkan BOM ${bom.name}.`, { is_active: bom.is_active }, { is_active: true }, connection);
    });
    return { message: 'Versi BOM aktif diperbarui.' };
  }

  async getDesignFiles(businessUnitId: number, filters: { productId?: number; variantId?: number }) {
    if (filters.productId) await this.assertProduct(filters.productId, businessUnitId);
    if (filters.productId && filters.variantId) await this.assertVariant(filters.productId, filters.variantId, businessUnitId);
    return this.repository.listDesignFiles(businessUnitId, filters);
  }

  async uploadDesignFile(data: DesignInput, file: Express.Multer.File, actor: ProductActor) {
    if (data.variant_id && !data.product_id) throw new AppError(400, 'PRODUCT_REQUIRED_FOR_VARIANT', 'Produk wajib dipilih saat memilih varian.');
    if (data.product_id) await this.assertProduct(data.product_id, actor.businessUnitId);
    if (data.product_id && data.variant_id) await this.assertVariant(data.product_id, data.variant_id, actor.businessUnitId);
    const saved = await storageService.saveUploadedFile('product_design', file, { productId: data.product_id ?? undefined });
    try {
      const result = await this.transaction(async connection => {
        if (data.variant_id && !data.product_id) throw new AppError(400, 'PRODUCT_REQUIRED_FOR_VARIANT', 'Produk wajib dipilih saat memilih varian.');
        if (data.product_id) await this.assertProduct(data.product_id, actor.businessUnitId, connection);
        if (data.product_id && data.variant_id) await this.assertVariant(data.product_id, data.variant_id, actor.businessUnitId, connection);
        const id = await this.repository.createDesignFile({
          businessUnitId: actor.businessUnitId, productId: data.product_id ?? null, variantId: data.variant_id ?? null,
          designCode: `DSN-${randomUUID()}`, name: data.name.trim(), fileType: saved.extension.replace('.', ''), fileName: saved.original_name,
          storagePath: saved.key, versionLabel: cleanText(data.version_label), size: saved.size_bytes,
          checksum: saved.checksum_sha256, isFinal: data.is_final ?? false, uploadedBy: actor.id, notes: cleanText(data.notes),
        }, connection);
        if (data.is_final) await this.repository.setDesignFinal(actor.businessUnitId, data.product_id ?? null, data.variant_id ?? null, id, connection);
        await this.audit(actor, 'design.upload', 'design_file', id, null, `Mengunggah file desain ${data.name.trim()}.`, null, { ...data, file_name: file.originalname, file_size_bytes: file.size }, connection);
        return { id };
      });
      return result;
    } catch (error) {
      await storageService.delete(saved.key);
      throw error;
    }
  }

  async updateDesignFile(id: number, data: DesignUpdateInput, actor: ProductActor) {
    await this.transaction(async connection => {
      const previous = await this.repository.getDesignFile(id, actor.businessUnitId, connection);
      if (!previous) throw new NotFoundError('File desain tidak ditemukan.');
      const productId = data.product_id === undefined ? previous.product_id : data.product_id;
      const variantId = data.variant_id === undefined ? previous.variant_id : data.variant_id;
      if (variantId && !productId) throw new AppError(400, 'PRODUCT_REQUIRED_FOR_VARIANT', 'Produk wajib dipilih saat memilih varian.');
      if (productId) await this.assertProduct(productId, actor.businessUnitId, connection);
      if (productId && variantId) await this.assertVariant(productId, variantId, actor.businessUnitId, connection);
      await this.repository.updateDesignFile(id, {
        ...data, name: data.name?.trim(), version_label: data.version_label === undefined ? undefined : cleanText(data.version_label), notes: data.notes === undefined ? undefined : cleanText(data.notes),
      }, connection);
      if (data.is_final) await this.repository.setDesignFinal(actor.businessUnitId, productId ?? null, variantId ?? null, id, connection);
      await this.audit(actor, data.is_final ? 'design.mark_final' : 'design.update', 'design_file', id, previous.design_code, `Memperbarui metadata desain ${previous.name}.`, previous, data, connection);
    });
    return this.repository.getDesignFile(id, actor.businessUnitId);
  }

  async downloadDesignFile(id: number, businessUnitId: number) {
    const design = await this.repository.getDesignFile(id, businessUnitId);
    if (!design) throw new NotFoundError('File desain tidak ditemukan.');
    if (!await storageService.exists(design.storage_path)) throw new NotFoundError('Berkas desain tidak ditemukan pada penyimpanan.');
    return { storageKey: design.storage_path, filename: String(design.file_name).replace(/[\\/:*?"<>|]/g, '_') };
  }

  async deleteDesignFile(id: number, actor: ProductActor) {
    let storagePath: string | null = null;
    await this.transaction(async connection => {
      const design = await this.repository.getDesignFile(id, actor.businessUnitId, connection);
      if (!design) throw new NotFoundError('File desain tidak ditemukan.');
      storagePath = design.storage_path;
      await this.repository.deleteDesignFile(id, connection);
      await this.audit(actor, 'design.delete', 'design_file', id, design.design_code, `Menghapus metadata file desain ${design.name}.`, design, null, connection);
    });
    await storageService.delete(storagePath);
    return { message: 'File desain berhasil dihapus.' };
  }

  async getPrintProfiles(businessUnitId: number, filters: { productId?: number; variantId?: number; printerId?: number }) {
    if (filters.productId) await this.assertProduct(filters.productId, businessUnitId);
    return this.repository.listPrintProfiles(businessUnitId, filters);
  }

  async createPrintProfile(data: PrintProfileInput, actor: ProductActor) {
    const result = await this.transaction(async connection => {
      await this.assertProfileReferences(data, actor, connection);
      const id = await this.repository.createPrintProfile(actor.businessUnitId, data, connection);
      if (data.is_default) await this.repository.setDefaultPrintProfile(actor.businessUnitId, data.product_id ?? null, data.variant_id ?? null, data.printer_id ?? null, id, connection);
      await this.audit(actor, 'print_profile.create', 'print_profile', id, null, `Membuat profil cetak ${data.name.trim()}.`, null, data, connection);
      return { id };
    });
    return result;
  }

  async updatePrintProfile(id: number, data: Partial<PrintProfileInput>, actor: ProductActor) {
    await this.transaction(async connection => {
      const previous = await this.repository.getPrintProfile(id, actor.businessUnitId, connection);
      if (!previous) throw new NotFoundError('Profil cetak tidak ditemukan.');
      const effective = {
        product_id: data.product_id === undefined ? previous.product_id : data.product_id,
        variant_id: data.variant_id === undefined ? previous.variant_id : data.variant_id,
        printer_id: data.printer_id === undefined ? previous.printer_id : data.printer_id,
        estimated_material_unit_id: data.estimated_material_unit_id === undefined ? previous.estimated_material_unit_id : data.estimated_material_unit_id,
      };
      await this.assertProfileReferences(effective, actor, connection);
      await this.repository.updatePrintProfile(id, { ...data, name: data.name?.trim() }, connection);
      if (data.is_default) await this.repository.setDefaultPrintProfile(actor.businessUnitId, effective.product_id ?? null, effective.variant_id ?? null, effective.printer_id ?? null, id, connection);
      await this.audit(actor, data.is_default ? 'print_profile.default' : 'print_profile.update', 'print_profile', id, null, `Memperbarui profil cetak ${previous.name}.`, previous, data, connection);
    });
    return this.repository.getPrintProfile(id, actor.businessUnitId);
  }

  async setDefaultPrintProfile(id: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const profile = await this.repository.getPrintProfile(id, actor.businessUnitId, connection);
      if (!profile) throw new NotFoundError('Profil cetak tidak ditemukan.');
      await this.repository.setDefaultPrintProfile(actor.businessUnitId, profile.product_id, profile.variant_id, profile.printer_id, id, connection);
      await this.audit(actor, 'print_profile.default', 'print_profile', id, null, `Menjadikan ${profile.name} sebagai profil cetak default.`, { is_default: profile.is_default }, { is_default: true }, connection);
    });
    return { message: 'Profil cetak default diperbarui.' };
  }

  async deletePrintProfile(id: number, actor: ProductActor) {
    await this.transaction(async connection => {
      const profile = await this.repository.getPrintProfile(id, actor.businessUnitId, connection);
      if (!profile) throw new NotFoundError('Profil cetak tidak ditemukan.');
      await this.repository.deletePrintProfile(id, connection);
      await this.audit(actor, 'print_profile.delete', 'print_profile', id, null, `Menghapus profil cetak ${profile.name}.`, profile, null, connection);
    });
    return { message: 'Profil cetak berhasil dihapus.' };
  }

  async getCosting(id: number, businessUnitId: number) {
    const product = await this.assertProduct(id, businessUnitId);
    const costing = this.calculateCosting(await this.repository.getCosting(id, businessUnitId) || product);
    return { ...costing, product: { id: product.id, sku: product.sku, name: product.name }, readiness: this.readiness(product, costing) };
  }
}
