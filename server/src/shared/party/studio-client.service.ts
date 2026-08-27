import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { AppError } from '../errors/AppError';
import type { BusinessUnitContext } from '../utils/business-unit';

export const STUDIO_CLIENT_ROLE = 'studio_client';

export interface StudioClientInput {
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

export interface StudioClientDuplicate {
  id: number;
  code: string;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  party_kind: string;
  status_code: string;
  match_reason: string;
  is_studio_client: boolean;
}

/**
 * Shared Party helper for the `studio_client` role.
 *
 * Studio Projects quick-create and the future Studio Clients module both go
 * through this service so client identity is never duplicated into a second
 * table and role activation behaves identically everywhere.
 */
export class StudioClientService {
  /** SQL fragment matching an effective, currently active studio_client role. */
  static readonly ACTIVE_ROLE_SQL = `
    pr.business_unit_id = ?
    AND pr.role_code = '${STUDIO_CLIENT_ROLE}'
    AND pr.is_active = 1
    AND (pr.valid_from IS NULL OR pr.valid_from <= UTC_DATE())
    AND (pr.valid_until IS NULL OR pr.valid_until >= UTC_DATE())`;

  /**
   * Confirms a party is a usable Studio client. Returns the party row.
   * Throws 404 when the party does not exist and 409 when it exists but is not
   * (or is no longer) a Studio client.
   */
  async assertStudioClient(connection: PoolConnection, partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(
      `SELECT p.id, p.code, p.display_name, p.legal_name, p.email, p.phone, p.party_kind, p.status_code,
              EXISTS (SELECT 1 FROM party_roles pr WHERE pr.party_id = p.id AND ${StudioClientService.ACTIVE_ROLE_SQL}) AS is_studio_client
       FROM parties p
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [studio.id, partyId, studio.organizationId],
    );
    if (!rows.length) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Klien Studio tidak ditemukan.');
    if (!Number(rows[0].is_studio_client)) {
      throw new AppError(409, 'CLIENT_ROLE_INACTIVE', 'Party ini belum terdaftar sebagai Klien Studio yang aktif.');
    }
    if (rows[0].status_code !== 'active') {
      throw new AppError(409, 'CLIENT_INACTIVE', 'Klien Studio ini berstatus tidak aktif.');
    }
    return rows[0];
  }

  /** Adds or reactivates the studio_client role on an existing party. Never renames the party code. */
  async grantStudioClientRole(connection: PoolConnection, partyId: number, studio: BusinessUnitContext) {
    const [existing]: any = await connection.execute(
      `SELECT id FROM party_roles
       WHERE party_id = ? AND business_unit_id = ? AND role_code = ?
       ORDER BY id DESC LIMIT 1`,
      [partyId, studio.id, STUDIO_CLIENT_ROLE],
    );
    if (existing.length) {
      await connection.execute(
        `UPDATE party_roles SET is_active = 1, valid_until = NULL WHERE id = ?`,
        [existing[0].id],
      );
      return { created: false };
    }
    await connection.execute(
      `INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, ?, 1)`,
      [partyId, studio.id, STUDIO_CLIENT_ROLE],
    );
    return { created: true };
  }

  /**
   * Creates a brand-new party and grants it the studio_client role.
   * The code is derived from the inserted ID (CLI-000001) inside the caller's
   * transaction, so no MAX(id)+1 race is possible.
   */
  async createStudioClient(connection: PoolConnection, data: StudioClientInput, studio: BusinessUnitContext) {
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
    const partyId = Number(result.insertId);
    const code = `CLI-${partyId.toString().padStart(6, '0')}`;
    await connection.execute('UPDATE parties SET code = ? WHERE id = ?', [code, partyId]);
    await this.grantStudioClientRole(connection, partyId, studio);
    return { id: partyId, code, display_name: data.display_name.trim(), party_kind: data.party_kind || 'individual', email: data.email || null, phone: data.phone || null };
  }

  /**
   * Looks for parties that probably already represent this client.
   * Nothing is merged automatically — the caller decides what to do.
   */
  async findDuplicates(connection: PoolConnection, data: StudioClientInput, studio: BusinessUnitContext): Promise<StudioClientDuplicate[]> {
    const clauses: string[] = [];
    const params: unknown[] = [studio.id, studio.organizationId];
    const push = (clause: string, ...values: unknown[]) => { clauses.push(clause); params.push(...values); };

    if (data.tax_id?.trim()) push('p.tax_id = ?', data.tax_id.trim());
    if (data.email?.trim()) push('p.email = ?', data.email.trim());
    if (data.phone?.trim()) push('p.phone = ?', data.phone.trim());
    if (data.display_name?.trim()) push('p.display_name = ?', data.display_name.trim());
    if (data.legal_name?.trim()) push('p.legal_name = ?', data.legal_name.trim());
    if (!clauses.length) return [];

    const [rows]: any = await connection.execute(
      `SELECT p.id, p.code, p.display_name, p.legal_name, p.email, p.phone, p.tax_id, p.party_kind, p.status_code,
              EXISTS (SELECT 1 FROM party_roles pr WHERE pr.party_id = p.id AND ${StudioClientService.ACTIVE_ROLE_SQL}) AS is_studio_client
       FROM parties p
       WHERE p.organization_id = ? AND p.deleted_at IS NULL AND (${clauses.join(' OR ')})
       ORDER BY p.id DESC
       LIMIT 10`,
      params as any[],
    );

    return (rows as any[]).map(row => ({
      ...row,
      is_studio_client: Boolean(Number(row.is_studio_client)),
      match_reason: this.matchReason(row, data),
    }));
  }

  private matchReason(row: any, data: StudioClientInput) {
    if (data.tax_id?.trim() && row.tax_id === data.tax_id.trim()) return 'NPWP / Tax ID sama';
    if (data.email?.trim() && row.email === data.email.trim()) return 'Email sama';
    if (data.phone?.trim() && row.phone === data.phone.trim()) return 'Nomor telepon sama';
    if (data.legal_name?.trim() && row.legal_name === data.legal_name.trim()) return 'Nama legal sama';
    return 'Nama sama';
  }
}

export const studioClientService = new StudioClientService();
