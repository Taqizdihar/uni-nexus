import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../errors/AppError';
import { getSettingDefinition, settingIdentity, settingsFor, settingsRegistry } from './settings.registry';
import type { EffectiveSetting, SettingDefinition, SettingScope, SettingValue, SettingsSnapshot } from './settings.types';

type Executor = Pick<PoolConnection, 'execute'>;
export type SettingsActor = { id: number; organizationId: number; ip?: string; userAgent?: string };
type UnitRow = { id: number; code: 'CRAFT' | 'STUDIO' | 'SHARED' };

const parseStoredValue = (value: unknown) => {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
  return value;
};
const isDuplicate = (error: unknown) => (error as { code?: string }).code === 'ER_DUP_ENTRY';

export class SettingsService {
  private async units(organizationId: number, executor: Executor = pool) {
    const [rows]: any = await executor.execute('SELECT id,code FROM business_units WHERE organization_id=? AND code IN (\'CRAFT\',\'STUDIO\',\'SHARED\') AND is_active=1', [organizationId]);
    const mapped = Object.fromEntries((rows as UnitRow[]).map(row => [row.code, Number(row.id)])) as Partial<Record<'CRAFT' | 'STUDIO' | 'SHARED', number>>;
    if (!mapped.CRAFT || !mapped.STUDIO || !mapped.SHARED) throw new AppError(409, 'SETTINGS_CANONICAL_UNIT_MISSING', 'Business unit canonical Craft, Studio, dan Shared harus tersedia.');
    return mapped as Record<'CRAFT' | 'STUDIO' | 'SHARED', number>;
  }

  private unitId(scope: SettingScope, units: Record<'CRAFT' | 'STUDIO' | 'SHARED', number>) { return scope === 'craft' ? units.CRAFT : scope === 'studio' ? units.STUDIO : null; }

  async snapshot(organizationId: number, executor: Executor = pool): Promise<SettingsSnapshot> {
    const units = await this.units(organizationId, executor);
    const [rows]: any = await executor.execute(`SELECT ss.setting_group,ss.setting_key,ss.setting_value,ss.is_secret,ss.business_unit_id,ss.updated_at,ss.updated_by,u.full_name updated_by_name FROM system_settings ss LEFT JOIN users u ON u.id=ss.updated_by WHERE ss.organization_id=? AND (ss.business_unit_id IS NULL OR ss.business_unit_id IN (?,?))`, [organizationId, units.CRAFT, units.STUDIO]);
    const indexed = new Map<string, any>();
    for (const row of rows) {
      const scope: SettingScope | null = row.business_unit_id == null ? 'organization' : Number(row.business_unit_id) === units.CRAFT ? 'craft' : Number(row.business_unit_id) === units.STUDIO ? 'studio' : null;
      if (scope) indexed.set(settingIdentity(scope, row.setting_group, row.setting_key), row);
    }
    const definitions = settingsRegistry as readonly SettingDefinition[];
    const settings: EffectiveSetting[] = definitions.map(definition => {
      const row = indexed.get(settingIdentity(definition.scope, definition.group, definition.key));
      if (!row) return { definition, value: definition.defaultValue, source: 'default', updatedAt: null, updatedBy: null };
      if (Boolean(row.is_secret) || definition.isSecret) return { definition, value: definition.defaultValue, source: 'invalid_override', updatedAt: row.updated_at || null, updatedBy: row.updated_by ? { id: Number(row.updated_by), fullName: row.updated_by_name || null } : null };
      const parsed = definition.schema.safeParse(parseStoredValue(row.setting_value));
      return !parsed.success
        ? { definition, value: definition.defaultValue, source: 'invalid_override', updatedAt: row.updated_at || null, updatedBy: row.updated_by ? { id: Number(row.updated_by), fullName: row.updated_by_name || null } : null }
        : { definition, value: parsed.data, source: 'override', updatedAt: row.updated_at || null, updatedBy: row.updated_by ? { id: Number(row.updated_by), fullName: row.updated_by_name || null } : null };
    });
    return { organizationId, businessUnits: units, settings };
  }

  async value<T extends SettingValue>(organizationId: number, scope: SettingScope, group: string, key: string): Promise<T> {
    const definition = getSettingDefinition(scope, group, key);
    if (!definition) throw new AppError(500, 'SETTINGS_UNKNOWN_CONSUMER_KEY', 'Konfigurasi aplikasi tidak terdaftar.');
    const snapshot = await this.snapshot(organizationId);
    return snapshot.settings.find(item => item.definition === definition)!.value as T;
  }

  async ensureBusinessUnitAccess(actor: SettingsActor, scope: SettingScope, executor: Executor = pool) {
    if (scope === 'organization') return;
    const units = await this.units(actor.organizationId, executor);
    const businessUnitId = this.unitId(scope, units)!;
    const [rows]: any = await executor.execute('SELECT 1 FROM user_business_units WHERE user_id=? AND business_unit_id=? AND can_access=1 LIMIT 1', [actor.id, businessUnitId]);
    if (!rows.length) throw new AppError(403, 'SETTINGS_BUSINESS_UNIT_FORBIDDEN', 'Anda tidak memiliki akses ke business unit pengaturan ini.');
  }

  async updateGroup(actor: SettingsActor, scope: SettingScope, group: string, values: Record<string, unknown>) {
    const definitions = settingsFor(scope, group);
    if (!definitions.length) throw new AppError(404, 'SETTINGS_GROUP_NOT_FOUND', 'Grup pengaturan tidak dikenal.');
    const supplied = Object.keys(values || {});
    if (!supplied.length || supplied.some(key => !definitions.some(definition => definition.key === key))) throw new AppError(400, 'SETTINGS_INVALID_KEYS', 'Kunci pengaturan tidak terdaftar.');
    const normalized = definitions.filter(definition => supplied.includes(definition.key)).map(definition => {
      const parsed = definition.schema.safeParse(values[definition.key]);
      if (!parsed.success) throw new AppError(400, 'SETTINGS_INVALID_VALUE', `Nilai ${definition.label} tidak valid.`, parsed.error.issues);
      return { definition, value: parsed.data };
    });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.ensureBusinessUnitAccess(actor, scope, connection);
      const units = await this.units(actor.organizationId, connection);
      const businessUnitId = this.unitId(scope, units);
      const previous = await this.snapshot(actor.organizationId, connection);
      for (const item of normalized) {
        await connection.execute(`INSERT INTO system_settings (organization_id,business_unit_id,setting_group,setting_key,setting_value,is_secret,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),is_secret=0,updated_by=VALUES(updated_by),updated_at=UTC_TIMESTAMP(3)`, [actor.organizationId, businessUnitId, item.definition.group, item.definition.key, JSON.stringify(item.value), 0, actor.id]);
      }
      const changed = normalized.map(item => ({ key: item.definition.key, old_value: previous.settings.find(setting => setting.definition === item.definition)?.value, new_value: item.value }));
      await AuditService.write({ organizationId: actor.organizationId, businessUnitId, userId: actor.id, moduleCode: 'settings', actionCode: 'settings.group.update', entityType: 'system_setting_group', entityCode: `${scope}:${group}`, description: `Memperbarui grup pengaturan ${group}.`, oldValues: { scope, group, settings: changed.map(item => ({ key: item.key, value: item.old_value })) }, newValues: { scope, group, settings: changed.map(item => ({ key: item.key, value: item.new_value })) }, ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
      await connection.commit();
      return this.snapshot(actor.organizationId);
    } catch (error) { await connection.rollback(); if (isDuplicate(error)) throw new AppError(409, 'SETTINGS_CONCURRENT_UPDATE', 'Pengaturan berubah secara bersamaan; silakan muat ulang.'); throw error; } finally { connection.release(); }
  }

  async reset(actor: SettingsActor, scope: SettingScope, group: string, key: string) {
    const definition = getSettingDefinition(scope, group, key);
    if (!definition) throw new AppError(404, 'SETTINGS_NOT_FOUND', 'Pengaturan tidak dikenal.');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); await this.ensureBusinessUnitAccess(actor, scope, connection);
      const units = await this.units(actor.organizationId, connection); const businessUnitId = this.unitId(scope, units);
      const previous = await this.snapshot(actor.organizationId, connection);
      await connection.execute('DELETE FROM system_settings WHERE organization_id=? AND business_unit_id <=> ? AND setting_group=? AND setting_key=?', [actor.organizationId, businessUnitId, group, key]);
      await AuditService.write({ organizationId: actor.organizationId, businessUnitId, userId: actor.id, moduleCode: 'settings', actionCode: 'settings.reset', entityType: 'system_setting', entityCode: `${scope}:${group}:${key}`, description: `Mereset ${definition.label} ke default.`, oldValues: { value: previous.settings.find(item => item.definition === definition)?.value }, newValues: { value: definition.defaultValue, source: 'default' }, ipAddress: actor.ip, userAgent: actor.userAgent }, connection);
      await connection.commit(); return this.snapshot(actor.organizationId);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}

export const settingsService = new SettingsService();
