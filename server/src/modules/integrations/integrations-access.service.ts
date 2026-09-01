import { pool } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { getBusinessUnitByCodeForOrganization } from '../../shared/utils/business-unit';
import type { IntegrationActor, IntegrationDomainAction, IntegrationScope } from './integrations.types';

/**
 * A Global Integration permission never bypasses a domain permission. Only
 * integration_type='marketplace' carries an extra domain layer today — other
 * types (google, messaging, other, payment, api) require only the matching
 * integrations.* permission plus organization/BU access.
 */
const DOMAIN_PERMISSIONS_BY_INTEGRATION_TYPE: Record<string, Record<IntegrationDomainAction, string>> = {
  marketplace: { read: 'craft.marketplace.read', manage: 'craft.marketplace.write', sync: 'craft.marketplace.sync' },
};

export class IntegrationsAccessService {
  private has(actor: IntegrationActor, permission: string): boolean {
    return Array.isArray(actor.permissions) && actor.permissions.includes(permission);
  }

  /** Throws unless the actor holds the global integrations.<action> permission. */
  requireGlobal(actor: IntegrationActor, action: IntegrationDomainAction): void {
    if (!this.has(actor, `integrations.${action}`)) {
      throw new AppError(403, 'INTEGRATION_FORBIDDEN', 'Anda tidak memiliki hak akses Pusat Integrasi untuk tindakan ini.');
    }
  }

  /** Throws unless the actor also holds the domain-specific permission layered on top of the global one, when one applies. */
  requireDomain(actor: IntegrationActor, integrationType: string, action: IntegrationDomainAction): void {
    const domain = DOMAIN_PERMISSIONS_BY_INTEGRATION_TYPE[integrationType];
    if (!domain) return;
    if (!this.has(actor, domain[action])) {
      throw new AppError(403, 'INTEGRATION_FORBIDDEN', 'Anda tidak memiliki hak akses domain untuk integrasi ini.');
    }
  }

  domainReadPermission(integrationType: string): string | null {
    return DOMAIN_PERMISSIONS_BY_INTEGRATION_TYPE[integrationType]?.read ?? null;
  }

  canReadIntegrationType(actor: IntegrationActor, integrationType: string): boolean {
    const domain = DOMAIN_PERMISSIONS_BY_INTEGRATION_TYPE[integrationType];
    return !domain || this.has(actor, domain.read);
  }

  /** Business units the actor can actually operate in, scoped to the actor's own organization. */
  async accessibleBusinessUnits(actor: IntegrationActor): Promise<Array<{ id: number; code: string }>> {
    const [rows]: any = await pool.execute(
      `SELECT bu.id, bu.code FROM business_units bu
       JOIN user_business_units ubu ON ubu.business_unit_id=bu.id AND ubu.user_id=? AND ubu.can_access=1
       WHERE bu.organization_id=? AND bu.is_active=1 AND bu.code IN ('CRAFT','STUDIO')`,
      [actor.id, actor.organization_id],
    );
    return rows.map((row: any) => ({ id: Number(row.id), code: String(row.code).toUpperCase() }));
  }

  /**
   * Resolves the actor-requested scope into a business_unit_id, always server-side —
   * a numeric business_unit_id supplied by a client is never trusted directly.
   */
  async resolveScope(actor: IntegrationActor, scope: IntegrationScope): Promise<{ businessUnitId: number | null }> {
    if (scope === 'organization') return { businessUnitId: null };
    const bu = await getBusinessUnitByCodeForOrganization(actor.organization_id, scope.toUpperCase());
    const units = await this.accessibleBusinessUnits(actor);
    if (!units.some((unit) => unit.id === bu.id)) {
      throw new AppError(403, 'INTEGRATION_FORBIDDEN', 'Anda tidak memiliki akses ke workspace ini.');
    }
    return { businessUnitId: bu.id };
  }

  /** SQL fragment + params restricting rows to what the actor's organization/BU access allows. */
  async visibilityClause(actor: IntegrationActor, alias = ''): Promise<{ clause: string; params: unknown[] }> {
    const column = alias ? `${alias}.business_unit_id` : 'business_unit_id';
    const units = await this.accessibleBusinessUnits(actor);
    if (!units.length) return { clause: `${column} IS NULL`, params: [] };
    return { clause: `(${column} IS NULL OR ${column} IN (${units.map(() => '?').join(',')}))`, params: units.map((unit) => unit.id) };
  }
}

export const integrationsAccessService = new IntegrationsAccessService();
