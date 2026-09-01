import sharp from 'sharp';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { storageService } from '../../shared/storage';
import { settingsService, type SettingsActor } from '../../shared/settings/settings.service';
import type { SettingScope } from '../../shared/settings/settings.types';

type Executor = Pick<PoolConnection, 'execute'>;
type Organization = { id: number; code: string; name: string; legal_name: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; province: string | null; postal_code: string | null; country_code: string; currency_code: string; timezone: string; logo_path: string | null; is_active: number; updated_at: string };

const organizationFields = ['name', 'legal_name', 'email', 'phone', 'address', 'city', 'province', 'postal_code', 'country_code', 'currency_code', 'timezone'] as const;
type OrganizationField = typeof organizationFields[number];
const number = (value: unknown) => Number(value);

export class OrganizationSettingsService {
  private async row(organizationId: number, executor: Executor = pool): Promise<Organization> {
    const [rows]: any = await executor.execute(`SELECT id,code,name,legal_name,email,phone,address,city,province,postal_code,country_code,currency_code,timezone,logo_path,is_active,updated_at FROM organizations WHERE id=? LIMIT 1`, [organizationId]);
    if (!rows.length) throw new NotFoundError('Organisasi tidak ditemukan.');
    return rows[0] as Organization;
  }

  private expose(row: Organization) {
    const { logo_path: _logoPath, ...organization } = row;
    return { ...organization, id: number(organization.id), is_active: Boolean(organization.is_active), logo_configured: Boolean(row.logo_path), logo_url: row.logo_path ? '/settings/organization/logo' : null };
  }

  async get(actor: SettingsActor) { return this.expose(await this.row(actor.organizationId)); }

  async update(actor: SettingsActor, values: Partial<Record<OrganizationField, unknown>>) {
    const entries = organizationFields.filter(field => Object.prototype.hasOwnProperty.call(values, field)).map(field => [field, values[field]] as const);
    if (!entries.length) throw new AppError(400, 'ORGANIZATION_NO_CHANGES', 'Tidak ada perubahan organisasi yang dikirim.');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const previous = await this.row(actor.organizationId, connection);
      const sql = `UPDATE organizations SET ${entries.map(([field]) => `${field}=?`).join(', ')},updated_at=UTC_TIMESTAMP(3) WHERE id=?`;
      await connection.execute(sql, [...entries.map(([, value]) => value), actor.organizationId] as any[]);
      const next = await this.row(actor.organizationId, connection);
      await AuditService.write({ organizationId: actor.organizationId, userId: actor.id, moduleCode: 'settings', actionCode: 'settings.organization.update', entityType: 'organization', entityId: actor.organizationId, entityCode: previous.code, description: 'Memperbarui profil organisasi.', oldValues: Object.fromEntries(entries.map(([field]) => [field, previous[field]])), newValues: Object.fromEntries(entries.map(([field]) => [field, next[field]])), ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
      await connection.commit(); return this.expose(next);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async uploadLogo(actor: SettingsActor, file: Express.Multer.File) {
    const source = await storageService.consumeStagedUpload('organization_logo', file);
    let normalized: Buffer;
    try { normalized = await sharp(source, { failOn: 'error' }).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(); }
    catch { throw new AppError(400, 'ORGANIZATION_LOGO_INVALID', 'Logo harus merupakan gambar raster yang valid.'); }
    const saved = await storageService.writeBuffer('organization_logo', normalized, 'organization-logo.webp', { organizationId: actor.organizationId });
    const connection = await pool.getConnection(); let previousPath: string | null = null;
    try {
      await connection.beginTransaction(); const previous = await this.row(actor.organizationId, connection); previousPath = previous.logo_path;
      await connection.execute('UPDATE organizations SET logo_path=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [saved.key, actor.organizationId]);
      await AuditService.write({ organizationId: actor.organizationId, userId: actor.id, moduleCode: 'settings', actionCode: 'settings.organization.logo.upload', entityType: 'organization', entityId: actor.organizationId, entityCode: previous.code, description: 'Mengganti logo organisasi.', oldValues: { logo_configured: Boolean(previousPath) }, newValues: { logo_configured: true }, ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
      await connection.commit();
    } catch (error) { await connection.rollback(); await storageService.delete(saved.key).catch(() => undefined); throw error; } finally { connection.release(); }
    if (previousPath && previousPath !== saved.key) await storageService.delete(previousPath).catch(() => undefined);
    return this.get(actor);
  }

  async deleteLogo(actor: SettingsActor) {
    const connection = await pool.getConnection(); let previousPath: string | null = null;
    try {
      await connection.beginTransaction(); const previous = await this.row(actor.organizationId, connection); previousPath = previous.logo_path;
      if (!previousPath) throw new NotFoundError('Logo organisasi belum tersedia.');
      await connection.execute('UPDATE organizations SET logo_path=NULL,updated_at=UTC_TIMESTAMP(3) WHERE id=?', [actor.organizationId]);
      await AuditService.write({ organizationId: actor.organizationId, userId: actor.id, moduleCode: 'settings', actionCode: 'settings.organization.logo.delete', entityType: 'organization', entityId: actor.organizationId, entityCode: previous.code, description: 'Menghapus logo organisasi.', oldValues: { logo_configured: true }, newValues: { logo_configured: false }, ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await storageService.delete(previousPath).catch(() => undefined); return this.get(actor);
  }

  async streamLogo(actor: SettingsActor, res: Parameters<typeof storageService.streamToResponse>[0]) {
    const organization = await this.row(actor.organizationId);
    if (!organization.logo_path || !await storageService.exists(organization.logo_path)) throw new NotFoundError('Logo organisasi tidak ditemukan.');
    await storageService.streamToResponse(res, organization.logo_path, { filename: 'organization-logo.webp', mimeType: 'image/webp', disposition: 'inline', cacheControl: 'private, no-store' });
  }
}

export const organizationSettingsService = new OrganizationSettingsService();
export { settingsService };
export type { SettingsActor, SettingScope };
