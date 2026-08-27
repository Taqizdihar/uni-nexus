import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { AppError } from '../errors/AppError';
import type { BusinessUnitContext } from '../utils/business-unit';

/** The only relationship roles owned by the Studio external-party directory. */
export const STUDIO_EXTERNAL_ROLES = ['vendor', 'freelancer', 'studio_partner'] as const;
export type StudioExternalRole = typeof STUDIO_EXTERNAL_ROLES[number];

export interface StudioExternalPartyInput {
  display_name: string;
  party_kind?: 'individual' | 'company' | 'institution';
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  tax_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  notes?: string | null;
}

/**
 * Canonical Party mechanics for Studio Vendors/Freelancers/Partners.  It is
 * intentionally role-generic: it never introduces a vendor profile table and
 * never changes a Party's code when an existing record is adopted.
 */
export class StudioExternalPartyService {
  private assertRole(role: string): asserts role is StudioExternalRole {
    if (!(STUDIO_EXTERNAL_ROLES as readonly string[]).includes(role)) {
      throw new AppError(400, 'STUDIO_EXTERNAL_ROLE_INVALID', 'Peran pihak eksternal tidak didukung.');
    }
  }

  async grantRole(connection: PoolConnection, partyId: number, role: StudioExternalRole, studio: BusinessUnitContext) {
    this.assertRole(role);
    const [rows]: any = await connection.execute(
      `SELECT id, is_active, valid_from, valid_until FROM party_roles
       WHERE party_id = ? AND business_unit_id = ? AND role_code = ? ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [partyId, studio.id, role],
    );
    if (rows.length) {
      const current = rows[0];
      const today = new Date().toISOString().slice(0, 10);
      const effective = Number(current.is_active) === 1
        && (!current.valid_from || String(current.valid_from).slice(0, 10) <= today)
        && (!current.valid_until || String(current.valid_until).slice(0, 10) >= today);
      if (effective) return { id: Number(current.id), created: false, alreadyActive: true };
      await connection.execute('UPDATE party_roles SET is_active = 1, valid_from = NULL, valid_until = NULL WHERE id = ?', [current.id]);
      return { id: Number(current.id), created: false, alreadyActive: false };
    }
    const [result]: any = await connection.execute(
      'INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, ?, 1)',
      [partyId, studio.id, role],
    );
    return { id: Number(result.insertId), created: true, alreadyActive: false };
  }

  async grantRoles(connection: PoolConnection, partyId: number, roles: StudioExternalRole[], studio: BusinessUnitContext) {
    const uniqueRoles = [...new Set(roles)];
    if (!uniqueRoles.length) throw new AppError(400, 'STUDIO_EXTERNAL_ROLE_INVALID', 'Pilih minimal satu peran eksternal.');
    return Promise.all(uniqueRoles.map(role => this.grantRole(connection, partyId, role, studio)));
  }

  async createExternalParty(connection: PoolConnection, data: StudioExternalPartyInput, roles: StudioExternalRole[], studio: BusinessUnitContext) {
    const [result]: any = await connection.execute(
      `INSERT INTO parties (organization_id, code, party_kind, display_name, legal_name, email, phone, website, tax_id,
                            address_line1, address_line2, city, province, postal_code, country_code, notes, status_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        studio.organizationId, `TMP-${randomUUID()}`, data.party_kind || 'individual', data.display_name.trim(),
        data.legal_name || null, data.email || null, data.phone || null, data.website || null, data.tax_id || null,
        data.address_line1 || null, data.address_line2 || null, data.city || null, data.province || null,
        data.postal_code || null, data.country_code || 'ID', data.notes || null,
      ],
    );
    const id = Number(result.insertId);
    // Generated after insertion: concurrent inserts cannot race on MAX(id)+1.
    const code = `EXT-${id.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE parties SET code = ? WHERE id = ?', [code, id]);
    await this.grantRoles(connection, id, roles, studio);
    return { id, code, display_name: data.display_name.trim(), party_kind: data.party_kind || 'individual' };
  }

  async findDuplicates(connection: PoolConnection, data: Pick<StudioExternalPartyInput, 'display_name' | 'legal_name' | 'email' | 'phone' | 'tax_id'>, studio: BusinessUnitContext) {
    const clauses: string[] = [];
    const values: unknown[] = [studio.id, studio.organizationId];
    const add = (clause: string, value: string | null | undefined) => { if (value?.trim()) { clauses.push(clause); values.push(value.trim()); } };
    add('p.tax_id = ?', data.tax_id); add('p.email = ?', data.email); add('p.phone = ?', data.phone);
    add('p.legal_name = ?', data.legal_name); add('p.display_name = ?', data.display_name);
    if (!clauses.length) return [];
    const [rows]: any = await connection.execute(
      `SELECT p.id, p.code, p.display_name, p.legal_name, p.email, p.phone, p.tax_id, p.party_kind, p.status_code,
              GROUP_CONCAT(DISTINCT pr.role_code ORDER BY pr.role_code SEPARATOR ',') AS role_codes,
              MAX(pr.role_code IN ('vendor', 'freelancer', 'studio_partner') AND pr.business_unit_id = ?) AS is_studio_external
       FROM parties p LEFT JOIN party_roles pr ON pr.party_id = p.id
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND (${clauses.join(' OR ')})
       GROUP BY p.id ORDER BY p.id DESC LIMIT 10`,
      values as any[],
    );
    return (rows as any[]).map(row => ({
      ...row,
      role_codes: row.role_codes ? String(row.role_codes).split(',') : [],
      is_studio_external: Boolean(Number(row.is_studio_external)),
      match_reason: data.tax_id?.trim() === row.tax_id ? 'NPWP / Tax ID sama'
        : data.email?.trim() === row.email ? 'Email sama'
          : data.phone?.trim() === row.phone ? 'Nomor telepon sama'
            : data.legal_name?.trim() === row.legal_name ? 'Nama legal sama' : 'Nama sama',
    }));
  }
}

export const studioExternalPartyService = new StudioExternalPartyService();
