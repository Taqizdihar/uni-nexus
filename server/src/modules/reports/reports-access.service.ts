import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { registeredReport } from './reports.registry';
import type { AccessibleUnit, ReportAccess, ReportActor, ReportCode, ReportDefinition, ReportRegistryEntry } from './reports.types';

const has = (actor: ReportActor, permissions: string[]) => permissions.every(permission => actor.permissions.includes(permission));

export class ReportAccessService {
  async units(actor: ReportActor): Promise<AccessibleUnit[]> {
    const [rows]: any = await pool.execute(`SELECT bu.id,bu.code,bu.name FROM business_units bu JOIN user_business_units ubu ON ubu.business_unit_id=bu.id AND ubu.user_id=? AND ubu.can_access=1 WHERE bu.organization_id=? AND bu.is_active=1 AND bu.code IN ('CRAFT','STUDIO','SHARED')`, [actor.id, actor.organization_id]);
    return rows.map((row: any) => ({ id: Number(row.id), code: String(row.code).toUpperCase(), name: String(row.name) })) as AccessibleUnit[];
  }

  private scopeAllowed(registry: ReportRegistryEntry, actor: ReportActor, units: AccessibleUnit[]) {
    if (!has(actor, registry.requiredReadPermissions)) return false;
    if (registry.businessUnitCode) return units.some(unit => unit.code === registry.businessUnitCode);
    if (registry.group === 'unified_finance') return units.some(unit => unit.code === 'SHARED');
    if (registry.group === 'global') return ['CRAFT', 'STUDIO', 'SHARED'].every(code => units.some(unit => unit.code === code));
    return true;
  }

  private exportAllowed(registry: ReportRegistryEntry, actor: ReportActor) { return this.scopeAllowed(registry, actor, []) ? false : has(actor, registry.requiredExportPermissions); }

  async definitions(actor: ReportActor): Promise<ReportDefinition[]> {
    const [rows]: any = await pool.execute(`SELECT id,organization_id,business_unit_id,report_code,name,report_type,is_active FROM report_definitions WHERE organization_id=?`, [actor.organization_id]);
    return rows.map((row: any) => ({ id: Number(row.id), organization_id: Number(row.organization_id), business_unit_id: row.business_unit_id == null ? null : Number(row.business_unit_id), report_code: String(row.report_code), name: String(row.name), report_type: String(row.report_type), is_active: Boolean(row.is_active) }));
  }

  async catalog(actor: ReportActor) {
    const [definitions, units] = await Promise.all([this.definitions(actor), this.units(actor)]);
    return definitions.flatMap(definition => {
      const registry = registeredReport(definition.report_code);
      if (!registry || !definition.is_active || !this.scopeAllowed(registry, actor, units)) return [];
      const definitionScopeMatches = !registry.businessUnitCode || definition.business_unit_id === units.find(unit => unit.code === registry.businessUnitCode)?.id;
      if (!definitionScopeMatches) return [];
      return [{ definition, registry, can_export: has(actor, registry.requiredExportPermissions) }];
    });
  }

  async resolve(actor: ReportActor, reportCode: string, action: 'preview' | 'export' = 'preview'): Promise<ReportAccess> {
    const registry = registeredReport(reportCode);
    if (!registry) throw new NotFoundError('Laporan tidak ditemukan.');
    const [definitions, units] = await Promise.all([this.definitions(actor), this.units(actor)]);
    const definition = definitions.find(item => item.report_code === reportCode);
    if (!definition || !definition.is_active || !this.scopeAllowed(registry, actor, units)) throw new NotFoundError('Laporan tidak ditemukan.');
    if (registry.businessUnitCode && definition.business_unit_id !== units.find(unit => unit.code === registry.businessUnitCode)?.id) throw new NotFoundError('Laporan tidak ditemukan.');
    const canExport = has(actor, registry.requiredExportPermissions);
    if (action === 'export' && !canExport) throw new AppError(403, 'REPORT_EXPORT_ACCESS_DENIED', 'Anda tidak memiliki izin untuk mengekspor laporan ini.');
    return { actor, definition, registry, units, canExport };
  }
}

export const reportAccessService = new ReportAccessService();
