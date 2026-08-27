import { pool } from '../../config/database';
import { StudioClientService } from '../../shared/party/studio-client.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';

/** Party roles that can legitimately be booked as external project collaborators. */
export const EXTERNAL_PARTY_ROLES = ['vendor', 'freelancer', 'studio_partner', 'supplier'];

const like = (search?: string) => `%${(search || '').trim()}%`;

/**
 * Read-only lookups shared by every Studio module.
 *
 * Kept deliberately generic so Clients, Services, Billing, Vendor and Finance
 * can reuse the same endpoints instead of each shipping their own selectors.
 */
export class StudioReferencesService {
  /**
   * Studio clients are Parties holding an effective `studio_client` role.
   * Search runs on the server across code, names, email and phone.
   */
  async getClients(studio: BusinessUnitContext, search?: string, limit = 50) {
    const hasSearch = Boolean(search?.trim());
    const params: unknown[] = [studio.id, studio.organizationId];
    let filter = '';
    if (hasSearch) {
      filter = ` AND (p.code LIKE ? OR p.display_name LIKE ? OR p.legal_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`;
      params.push(like(search), like(search), like(search), like(search), like(search));
    }

    const [rows]: any = await pool.execute(
      `SELECT DISTINCT p.id, p.code, p.display_name, p.legal_name, p.party_kind, p.email, p.phone, p.city
       FROM parties p
       JOIN party_roles pr ON pr.party_id = p.id AND ${StudioClientService.ACTIVE_ROLE_SQL}
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND p.status_code = 'active'${filter}
       ORDER BY p.display_name ASC
       LIMIT ${Math.min(200, Math.max(1, limit))}`,
      params as any[],
    );
    return rows as any[];
  }

  async getServices(studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT id, code, name, description, pricing_model, base_price, unit_label
       FROM studio_services
       WHERE business_unit_id = ? AND is_active = 1
       ORDER BY name ASC LIMIT 300`,
      [studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, base_price: Number(row.base_price) }));
  }

  async getServicePackages(studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT id, code, name, description, package_price,
              (SELECT COUNT(*) FROM service_package_items spi WHERE spi.package_id = sp.id) AS item_count
       FROM service_packages sp
       WHERE business_unit_id = ? AND is_active = 1
       ORDER BY name ASC LIMIT 300`,
      [studio.id],
    );
    return (rows as any[]).map(row => ({ ...row, package_price: Number(row.package_price), item_count: Number(row.item_count) }));
  }

  /** Internal users eligible to run or staff a Studio project. */
  async getUsers(studio: BusinessUnitContext, search?: string) {
    const hasSearch = Boolean(search?.trim());
    const params: unknown[] = [studio.organizationId];
    let filter = '';
    if (hasSearch) {
      filter = ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)`;
      params.push(like(search), like(search), like(search));
    }

    // Grouped on the user alone so someone holding several roles is listed once.
    const [rows]: any = await pool.execute(
      `SELECT u.id, u.full_name, u.email, u.employee_code, u.avatar_path,
              MIN(r.name) AS role_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.organization_id = ? AND u.deleted_at IS NULL
         AND u.status_code = 'active' AND u.approval_status_code = 'approved'${filter}
       GROUP BY u.id, u.full_name, u.email, u.employee_code, u.avatar_path
       ORDER BY u.full_name ASC LIMIT 200`,
      params as any[],
    );
    return rows as any[];
  }

  /**
   * Parties available as external project collaborators.
   *
   * Vendors, freelancers and studio partners are surfaced first, but any active
   * party can be booked — a party may already exist under a different role and
   * must never be duplicated just to be assigned here.
   */
  async getExternalParties(studio: BusinessUnitContext, search?: string) {
    const rolePlaceholders = EXTERNAL_PARTY_ROLES.map(() => '?').join(',');
    const params: unknown[] = [...EXTERNAL_PARTY_ROLES, studio.id, studio.organizationId];
    let filter = '';
    if (search?.trim()) {
      filter = ` AND (p.code LIKE ? OR p.display_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`;
      params.push(like(search), like(search), like(search), like(search));
    }

    const [rows]: any = await pool.execute(
      `SELECT p.id, p.code, p.display_name, p.party_kind, p.email, p.phone,
              GROUP_CONCAT(DISTINCT pr.role_code ORDER BY pr.role_code SEPARATOR ',') AS role_codes,
              MAX(pr.role_code IN (${rolePlaceholders})) AS is_preferred
       FROM parties p
       LEFT JOIN party_roles pr ON pr.party_id = p.id AND pr.is_active = 1
         AND (pr.business_unit_id = ? OR pr.business_unit_id IS NULL)
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND p.status_code = 'active'${filter}
       GROUP BY p.id, p.code, p.display_name, p.party_kind, p.email, p.phone
       ORDER BY is_preferred DESC, p.display_name ASC LIMIT 200`,
      params as any[],
    );
    return (rows as any[]).map(row => ({
      ...row,
      role_codes: row.role_codes ? String(row.role_codes).split(',') : [],
      is_preferred: Boolean(Number(row.is_preferred)),
    }));
  }
}

export const studioReferencesService = new StudioReferencesService();
