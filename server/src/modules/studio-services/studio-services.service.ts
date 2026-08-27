import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { studioServicesRepository } from './studio-services.repository';
import { publishStudioServicesEvent, withStudioServicesTransaction, writeStudioServicesAudit, type EntityRef } from './studio-services.shared';
import type { PackageItemInput, PackageListFilters, ServiceListFilters, ServiceProjectFilters, StudioServicePricingModel } from './studio-services.types';

const asNumber = (value: unknown) => Number(value ?? 0);
const serviceRef = (row: any): EntityRef => ({ id: Number(row.id), code: row.code, entityType: 'studio_service' });
const packageRef = (row: any): EntityRef => ({ id: Number(row.id), code: row.code, entityType: 'service_package' });
const categoryRef = (row: any): EntityRef => ({ id: Number(row.id), code: row.code, entityType: 'studio_service_category' });
const normalizeCode = (source: string) => source.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'CATEGORY';
const isDuplicate = (error: any) => error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;

export class StudioServicesService {
  async overview(studio: BusinessUnitContext) { return studioServicesRepository.getOverview(studio); }
  async list(filters: ServiceListFilters, studio: BusinessUnitContext) { return studioServicesRepository.listServices(filters, studio); }
  async categories(studio: BusinessUnitContext) { return studioServicesRepository.listCategories(studio); }
  async packages(filters: PackageListFilters, studio: BusinessUnitContext) { return studioServicesRepository.listPackages(filters, studio); }

  private async requireService(id: number, studio: BusinessUnitContext) {
    const service = await studioServicesRepository.getService(id, studio);
    if (!service) throw new AppError(404, 'STUDIO_SERVICE_NOT_FOUND', 'Layanan Studio tidak ditemukan.');
    return service;
  }

  private async requirePackage(id: number, studio: BusinessUnitContext) {
    const servicePackage = await studioServicesRepository.getPackage(id, studio);
    if (!servicePackage) throw new AppError(404, 'STUDIO_SERVICE_PACKAGE_NOT_FOUND', 'Paket layanan Studio tidak ditemukan.');
    return servicePackage;
  }

  private async assertCategory(connection: any, categoryId: number | null | undefined, studio: BusinessUnitContext, activeCatalogData = true) {
    if (!categoryId) return null;
    const category = await studioServicesRepository.getCategoryForUpdate(connection, categoryId, studio);
    if (!category) throw new AppError(400, 'STUDIO_SERVICE_CATEGORY_NOT_FOUND', 'Kategori layanan Studio tidak ditemukan.');
    if (activeCatalogData && !Number(category.is_active)) throw new AppError(409, 'STUDIO_SERVICE_CATEGORY_INACTIVE', 'Kategori layanan yang dipilih sedang tidak aktif.');
    return category;
  }

  async createService(data: { name: string; category_id?: number | null; description?: string | null; pricing_model: StudioServicePricingModel; base_price: number; unit_label?: string | null; is_active: boolean }, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      await this.assertCategory(connection, data.category_id, studio, data.is_active);
      const tempCode = `TMP-SVC-${randomUUID()}`;
      const [result]: any = await connection.execute(
        `INSERT INTO studio_services (business_unit_id, category_id, code, name, description, pricing_model, base_price, unit_label, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studio.id, data.category_id || null, tempCode, data.name.trim(), data.description || null, data.pricing_model, data.base_price, data.unit_label || null, data.is_active ? 1 : 0],
      );
      const id = Number(result.insertId); const code = `SVC-${String(id).padStart(6, '0')}`;
      await connection.execute('UPDATE studio_services SET code = ? WHERE id = ?', [code, id]);
      const entity: EntityRef = { id, code, entityType: 'studio_service' };
      const payload = { id, code, name: data.name.trim(), category_id: data.category_id || null, pricing_model: data.pricing_model, base_price: data.base_price, is_active: data.is_active };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_create', entity, `Membuat layanan Studio ${code}.`, undefined, payload);
      await publishStudioServicesEvent(connection, studio, 'studio.service.created', entity, userId, { service: payload });
      return { id, code };
    });
  }

  async updateService(id: number, data: Partial<{ name: string; category_id: number | null; description: string | null; pricing_model: StudioServicePricingModel; base_price: number; unit_label: string | null }>, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getServiceForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_NOT_FOUND', 'Layanan Studio tidak ditemukan.');
      const nextCategory = data.category_id === undefined ? current.category_id : data.category_id;
      if (data.category_id !== undefined) await this.assertCategory(connection, nextCategory, studio, Boolean(Number(current.is_active)));
      const fields: string[] = []; const values: unknown[] = []; const before: Record<string, unknown> = {}; const after: Record<string, unknown> = {};
      const set = (key: string, value: unknown) => { if (value !== undefined) { fields.push(`${key} = ?`); values.push(value); before[key] = current[key]; after[key] = value; } };
      set('name', data.name?.trim()); set('category_id', data.category_id); set('description', data.description); set('pricing_model', data.pricing_model); set('base_price', data.base_price); set('unit_label', data.unit_label);
      if (!fields.length) throw new AppError(400, 'NO_SERVICE_CHANGES', 'Tidak ada perubahan layanan yang dikirim.');
      await connection.execute(`UPDATE studio_services SET ${fields.join(', ')} WHERE id = ?`, [...values, id] as any[]);
      const entity = serviceRef(current);
      const payload = { id, code: current.code, name: data.name?.trim() ?? current.name, category_id: nextCategory || null, pricing_model: data.pricing_model ?? current.pricing_model, base_price: data.base_price ?? asNumber(current.base_price), is_active: Boolean(Number(current.is_active)) };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_update', entity, `Memperbarui layanan Studio ${current.code}.`, before, after);
      await publishStudioServicesEvent(connection, studio, 'studio.service.updated', entity, userId, { service: payload });
      return { id };
    });
  }

  async activateService(id: number, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getServiceForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_NOT_FOUND', 'Layanan Studio tidak ditemukan.');
      if (Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_ALREADY_ACTIVE', 'Layanan Studio ini sudah aktif.');
      await this.assertCategory(connection, current.category_id, studio, true);
      await connection.execute('UPDATE studio_services SET is_active = 1 WHERE id = ?', [id]);
      const entity = serviceRef(current); const payload = { id, code: current.code, name: current.name, category_id: current.category_id, pricing_model: current.pricing_model, base_price: asNumber(current.base_price), is_active: true };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_activate', entity, `Mengaktifkan layanan Studio ${current.code}.`, { is_active: false }, { is_active: true });
      await publishStudioServicesEvent(connection, studio, 'studio.service.activated', entity, userId, { service: payload });
      return { id };
    });
  }

  async deactivateService(id: number, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getServiceForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_NOT_FOUND', 'Layanan Studio tidak ditemukan.');
      if (!Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_ALREADY_INACTIVE', 'Layanan Studio ini sudah tidak aktif.');
      await connection.execute('UPDATE studio_services SET is_active = 0 WHERE id = ?', [id]);
      const entity = serviceRef(current); const payload = { id, code: current.code, name: current.name, category_id: current.category_id, pricing_model: current.pricing_model, base_price: asNumber(current.base_price), is_active: false };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_deactivate', entity, `Menonaktifkan layanan Studio ${current.code}.`, { is_active: true }, { is_active: false });
      await publishStudioServicesEvent(connection, studio, 'studio.service.deactivated', entity, userId, { service: payload });
      return { id };
    });
  }

  async getServiceDetail(id: number, studio: BusinessUnitContext) { return { service: await this.requireService(id, studio) }; }
  async servicePackages(id: number, studio: BusinessUnitContext) { await this.requireService(id, studio); return studioServicesRepository.listServicePackages(id, studio); }
  async serviceProjects(id: number, filters: ServiceProjectFilters, studio: BusinessUnitContext) { await this.requireService(id, studio); return studioServicesRepository.listServiceProjects(id, filters, studio); }
  async serviceCommercialUsage(id: number, studio: BusinessUnitContext) { await this.requireService(id, studio); return studioServicesRepository.serviceCommercialUsage(id, studio); }
  async serviceActivity(id: number, studio: BusinessUnitContext) { await this.requireService(id, studio); return studioServicesRepository.serviceActivity(id, studio); }

  async createCategory(data: { name: string; code?: string; is_active: boolean }, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const base = normalizeCode(data.code || data.name); let candidate = base; let suffix = 2;
      while (await studioServicesRepository.getCategoryByCode(connection, candidate, studio)) candidate = `${base.slice(0, Math.max(1, 50 - String(suffix).length - 1))}_${suffix++}`;
      const [result]: any = await connection.execute(`INSERT INTO studio_service_categories (business_unit_id, code, name, is_active) VALUES (?, ?, ?, ?)`, [studio.id, candidate, data.name.trim(), data.is_active ? 1 : 0]);
      const entity: EntityRef = { id: Number(result.insertId), code: candidate, entityType: 'studio_service_category' };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_category_create', entity, `Membuat kategori layanan ${candidate}.`, undefined, { name: data.name.trim(), is_active: data.is_active });
      return { id: entity.id, code: candidate };
    });
  }

  async updateCategory(id: number, data: { name?: string }, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getCategoryForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_CATEGORY_NOT_FOUND', 'Kategori layanan Studio tidak ditemukan.');
      if (data.name === undefined) throw new AppError(400, 'NO_CATEGORY_CHANGES', 'Tidak ada perubahan kategori yang dikirim.');
      await connection.execute('UPDATE studio_service_categories SET name = ? WHERE id = ?', [data.name.trim(), id]);
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_category_update', categoryRef(current), `Memperbarui kategori layanan ${current.code}.`, { name: current.name }, { name: data.name.trim() });
      return { id };
    });
  }

  async activateCategory(id: number, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getCategoryForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_CATEGORY_NOT_FOUND', 'Kategori layanan Studio tidak ditemukan.');
      if (Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_CATEGORY_ALREADY_ACTIVE', 'Kategori layanan ini sudah aktif.');
      await connection.execute('UPDATE studio_service_categories SET is_active = 1 WHERE id = ?', [id]);
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_category_activate', categoryRef(current), `Mengaktifkan kategori layanan ${current.code}.`, { is_active: false }, { is_active: true });
      return { id };
    });
  }

  async deactivateCategory(id: number, confirmActiveServices: boolean, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getCategoryForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_CATEGORY_NOT_FOUND', 'Kategori layanan Studio tidak ditemukan.');
      if (!Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_CATEGORY_ALREADY_INACTIVE', 'Kategori layanan ini sudah tidak aktif.');
      const activeServiceCount = await studioServicesRepository.activeServiceCountForCategory(connection, id, studio);
      if (activeServiceCount > 0 && !confirmActiveServices) throw new AppError(409, 'STUDIO_SERVICE_CATEGORY_HAS_ACTIVE_SERVICES', `Kategori ini masih digunakan oleh ${activeServiceCount} layanan aktif. Konfirmasi untuk tetap menonaktifkan.`, { active_service_count: activeServiceCount });
      await connection.execute('UPDATE studio_service_categories SET is_active = 0 WHERE id = ?', [id]);
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_category_deactivate', categoryRef(current), `Menonaktifkan kategori layanan ${current.code}.`, { is_active: true }, { is_active: false, active_service_count: activeServiceCount });
      return { id, active_service_count: activeServiceCount };
    });
  }

  private async validatePackageItems(connection: any, items: PackageItemInput[], studio: BusinessUnitContext, requireItems: boolean) {
    if (requireItems && !items.length) throw new AppError(400, 'STUDIO_SERVICE_PACKAGE_EMPTY', 'Paket aktif harus memiliki minimal satu layanan.');
    const unique = new Set<number>();
    for (const item of items) {
      if (unique.has(item.service_id)) throw new AppError(409, 'PACKAGE_SERVICE_DUPLICATE', 'Layanan tidak boleh muncul lebih dari sekali dalam paket.');
      unique.add(item.service_id);
      const [rows]: any = await connection.execute(`SELECT id, is_active FROM studio_services WHERE id = ? AND business_unit_id = ? LIMIT 1 FOR UPDATE`, [item.service_id, studio.id]);
      if (!rows.length) throw new AppError(400, 'STUDIO_SERVICE_NOT_FOUND', 'Layanan paket tidak ditemukan di Studio.');
      if (!Number(rows[0].is_active)) throw new AppError(409, 'PACKAGE_CONTAINS_INACTIVE_SERVICE', 'Paket tidak dapat menggunakan layanan yang tidak aktif.');
    }
  }

  private async replacePackageItems(connection: any, packageId: number, items: PackageItemInput[]) {
    await connection.execute('DELETE FROM service_package_items WHERE package_id = ?', [packageId]);
    for (const item of items) await connection.execute(
      `INSERT INTO service_package_items (package_id, service_id, quantity, notes) VALUES (?, ?, ?, ?)`, [packageId, item.service_id, item.quantity, item.notes || null],
    );
  }

  async createPackage(data: { name: string; description?: string | null; package_price: number; items: PackageItemInput[]; is_active: boolean }, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      await this.validatePackageItems(connection, data.items, studio, data.is_active);
      const [result]: any = await connection.execute(
        `INSERT INTO service_packages (business_unit_id, code, name, description, package_price, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [studio.id, `TMP-PKG-${randomUUID()}`, data.name.trim(), data.description || null, data.package_price, data.is_active ? 1 : 0],
      );
      const id = Number(result.insertId); const code = `PKG-${String(id).padStart(6, '0')}`;
      await connection.execute('UPDATE service_packages SET code = ? WHERE id = ?', [code, id]);
      await this.replacePackageItems(connection, id, data.items);
      const entity: EntityRef = { id, code, entityType: 'service_package' }; const payload = { id, code, name: data.name.trim(), package_price: data.package_price, item_count: data.items.length, is_active: data.is_active };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_package_create', entity, `Membuat paket layanan ${code}.`, undefined, payload);
      await publishStudioServicesEvent(connection, studio, 'studio.service_package.created', entity, userId, { package: payload });
      return { id, code };
    });
  }

  async updatePackage(id: number, data: Partial<{ name: string; description: string | null; package_price: number; items: PackageItemInput[] }>, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getPackageForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_PACKAGE_NOT_FOUND', 'Paket layanan Studio tidak ditemukan.');
      if (data.items !== undefined) await this.validatePackageItems(connection, data.items, studio, Boolean(Number(current.is_active)));
      const fields: string[] = []; const values: unknown[] = []; const before: Record<string, unknown> = {}; const after: Record<string, unknown> = {};
      const set = (key: string, value: unknown) => { if (value !== undefined) { fields.push(`${key} = ?`); values.push(value); before[key] = current[key]; after[key] = value; } };
      set('name', data.name?.trim()); set('description', data.description); set('package_price', data.package_price);
      if (fields.length) await connection.execute(`UPDATE service_packages SET ${fields.join(', ')} WHERE id = ?`, [...values, id] as any[]);
      if (data.items !== undefined) { await this.replacePackageItems(connection, id, data.items); before.items_changed = true; after.item_count = data.items.length; }
      if (!fields.length && data.items === undefined) throw new AppError(400, 'NO_PACKAGE_CHANGES', 'Tidak ada perubahan paket yang dikirim.');
      const entity = packageRef(current); const payload = { id, code: current.code, name: data.name?.trim() ?? current.name, package_price: data.package_price ?? asNumber(current.package_price), item_count: data.items?.length ?? (await studioServicesRepository.getPackage(id, studio))?.item_count ?? 0, is_active: Boolean(Number(current.is_active)) };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_package_update', entity, `Memperbarui paket layanan ${current.code}.`, before, after);
      await publishStudioServicesEvent(connection, studio, 'studio.service_package.updated', entity, userId, { package: payload });
      return { id };
    });
  }

  async activatePackage(id: number, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getPackageForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_PACKAGE_NOT_FOUND', 'Paket layanan Studio tidak ditemukan.');
      if (Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_PACKAGE_ALREADY_ACTIVE', 'Paket layanan ini sudah aktif.');
      const [items]: any = await connection.execute('SELECT service_id, quantity, notes FROM service_package_items WHERE package_id = ?', [id]);
      await this.validatePackageItems(connection, items.map((item: any) => ({ service_id: Number(item.service_id), quantity: Number(item.quantity), notes: item.notes })), studio, true);
      await connection.execute('UPDATE service_packages SET is_active = 1 WHERE id = ?', [id]);
      const entity = packageRef(current); const payload = { id, code: current.code, name: current.name, package_price: asNumber(current.package_price), item_count: items.length, is_active: true };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_package_activate', entity, `Mengaktifkan paket layanan ${current.code}.`, { is_active: false }, { is_active: true });
      await publishStudioServicesEvent(connection, studio, 'studio.service_package.activated', entity, userId, { package: payload });
      return { id };
    });
  }

  async deactivatePackage(id: number, userId: number, studio: BusinessUnitContext) {
    return withStudioServicesTransaction(async connection => {
      const current = await studioServicesRepository.getPackageForUpdate(connection, id, studio);
      if (!current) throw new AppError(404, 'STUDIO_SERVICE_PACKAGE_NOT_FOUND', 'Paket layanan Studio tidak ditemukan.');
      if (!Number(current.is_active)) throw new AppError(409, 'STUDIO_SERVICE_PACKAGE_ALREADY_INACTIVE', 'Paket layanan ini sudah tidak aktif.');
      await connection.execute('UPDATE service_packages SET is_active = 0 WHERE id = ?', [id]);
      const entity = packageRef(current); const payload = { id, code: current.code, name: current.name, package_price: asNumber(current.package_price), item_count: 0, is_active: false };
      await writeStudioServicesAudit(connection, studio, userId, 'studio.service_package_deactivate', entity, `Menonaktifkan paket layanan ${current.code}.`, { is_active: true }, { is_active: false });
      await publishStudioServicesEvent(connection, studio, 'studio.service_package.deactivated', entity, userId, { package: payload });
      return { id };
    });
  }

  async getPackageDetail(id: number, studio: BusinessUnitContext) { return { package: await this.requirePackage(id, studio) }; }
  async packageProjects(id: number, filters: ServiceProjectFilters, studio: BusinessUnitContext) { await this.requirePackage(id, studio); return studioServicesRepository.listPackageProjects(id, filters, studio); }
}

export const studioServicesService = new StudioServicesService();
