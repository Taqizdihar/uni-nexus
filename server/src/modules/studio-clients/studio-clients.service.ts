import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { STUDIO_CLIENT_ROLE, studioClientService, type StudioClientInput } from '../../shared/party/studio-client.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { ACTIVE_CLIENT_PROJECT_STATUSES, STUDIO_LOCAL_DATE_SQL } from './studio-clients.helpers';
import { StudioClientsRepository } from './studio-clients.repository';
import {
  assertPartyGloballyUsable, clientRef, isRoleEffectivelyActive, loadClientForUpdate,
  publishClientEvent, withTransaction, writeClientAudit,
} from './studio-clients.shared';
import type { ClientListFilters, ClientProjectFilters } from './studio-clients.types';

/** Informational labels for a Party's other active roles across UNI-NEXUS. */
const ROLE_LABELS: Record<string, string> = {
  studio_client: 'Klien Studio',
  craft_customer: 'Pelanggan Craft',
  craft_partner: 'Mitra Craft',
  supplier: 'Supplier',
  vendor: 'Vendor',
  freelancer: 'Freelancer',
  studio_partner: 'Mitra Studio',
};

const CLIENT_IDENTITY_COLUMNS = [
  'party_kind', 'display_name', 'legal_name', 'email', 'phone', 'website', 'tax_id',
  'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country_code', 'notes',
] as const;

interface ContactDraft {
  full_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

const relationshipStatusOf = (role: { is_active: boolean | number; valid_from: unknown; valid_until: unknown }, partyStatus: string) => {
  if (partyStatus !== 'active') return 'party_inactive' as const;
  return isRoleEffectivelyActive(role as any) ? ('active' as const) : ('role_inactive' as const);
};

/**
 * The Studio Client module's write engine. Party/role mechanics are delegated to
 * the shared `studioClientService` so this is the same canonical creation/duplicate
 * logic Studio Projects quick-create already relies on — never a second engine.
 */
export class StudioClientsService {
  private repository = new StudioClientsRepository();

  private async insertContacts(connection: PoolConnection, partyId: number, contacts: ContactDraft[], existingContactCount: number) {
    if (!contacts.length) return;
    let primaryIndex = contacts.findIndex(contact => contact.is_primary);
    // A brand-new client's very first contact becomes primary automatically.
    if (primaryIndex === -1 && existingContactCount === 0) primaryIndex = 0;
    if (primaryIndex !== -1) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);

    for (let index = 0; index < contacts.length; index += 1) {
      const contact = contacts[index];
      await connection.execute(
        `INSERT INTO party_contacts (party_id, full_name, job_title, email, phone, whatsapp, is_primary, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [partyId, contact.full_name.trim(), contact.job_title || null, contact.email || null, contact.phone || null, contact.whatsapp || null, index === primaryIndex ? 1 : 0, contact.notes || null],
      );
    }
  }

  /**
   * Creates a brand-new Studio Client, or — when `use_existing_party_id` is set —
   * adopts an existing Party by granting/reactivating the studio_client role.
   * Adopting a party never overwrites its identity fields; only the additive
   * contacts in this request are attached.
   */
  async createClient(data: StudioClientInput & { contacts?: ContactDraft[]; use_existing_party_id?: number | null }, userId: number, studio: BusinessUnitContext) {
    const contacts = data.contacts || [];
    return withTransaction(async connection => {
      let client: { id: number; code: string; display_name: string; party_kind: string; email: string | null; phone: string | null };
      let reused = false;
      let existingContactCount = 0;

      if (data.use_existing_party_id) {
        const [rows]: any = await connection.execute(
          `SELECT id, organization_id, code, display_name, party_kind, email, phone, status_code
           FROM parties WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
          [data.use_existing_party_id],
        );
        if (!rows.length || Number(rows[0].organization_id) !== studio.organizationId) {
          throw new AppError(400, 'PARTY_NOT_FOUND', 'Party yang dipilih tidak ditemukan.');
        }
        const party = rows[0];
        assertPartyGloballyUsable(party);

        const [roleRows]: any = await connection.execute(
          `SELECT id, is_active, valid_from, valid_until FROM party_roles
           WHERE party_id = ? AND business_unit_id = ? AND role_code = ? ORDER BY id DESC LIMIT 1 FOR UPDATE`,
          [party.id, studio.id, STUDIO_CLIENT_ROLE],
        );
        if (roleRows.length && isRoleEffectivelyActive(roleRows[0])) {
          throw new AppError(409, 'STUDIO_CLIENT_ALREADY_ACTIVE', `Party ini sudah menjadi Klien Studio aktif (${party.code}).`, { id: Number(party.id), code: party.code });
        }

        await studioClientService.grantStudioClientRole(connection, Number(party.id), studio);
        client = { id: Number(party.id), code: party.code, display_name: party.display_name, party_kind: party.party_kind, email: party.email, phone: party.phone };
        reused = true;
        existingContactCount = await this.repository.getContactCount(client.id);
      } else {
        const created = await studioClientService.createStudioClient(connection, data, studio);
        client = created;
      }

      await this.insertContacts(connection, client.id, contacts, existingContactCount);

      const actionCode = reused ? 'studio.client_adopt_existing_party' : 'studio.client_create';
      const description = reused
        ? `Mengadopsi Party ${client.code} sebagai Klien Studio.`
        : `Membuat Klien Studio ${client.code}.`;
      await writeClientAudit(connection, studio, userId, actionCode, clientRef(client), description, undefined, {
        display_name: client.display_name, party_kind: client.party_kind, contacts: contacts.length,
      });
      await publishClientEvent(connection, studio, 'studio.client.created', clientRef(client), userId, {
        client: { id: client.id, code: client.code, display_name: client.display_name, party_kind: client.party_kind, relationship_status: 'active' },
      });

      return { ...client, reused };
    });
  }

  async updateClient(partyId: number, data: Record<string, unknown>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const current = await loadClientForUpdate(connection, partyId, studio);

      const assignments: string[] = [];
      const values: unknown[] = [];
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const column of CLIENT_IDENTITY_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(data, column)) {
          assignments.push(`${column} = ?`);
          values.push(data[column] ?? null);
          before[column] = current[column];
          after[column] = data[column] ?? null;
        }
      }
      if (!assignments.length) throw new AppError(400, 'NO_CLIENT_CHANGES', 'Tidak ada perubahan yang dikirim.');

      await connection.execute(`UPDATE parties SET ${assignments.join(', ')} WHERE id = ?`, [...values, partyId] as any[]);
      await writeClientAudit(connection, studio, userId, 'studio.client_update', clientRef(current), `Memperbarui data Klien Studio ${current.code}.`, before, after);
      await publishClientEvent(connection, studio, 'studio.client.updated', clientRef(current), userId, {
        client: {
          id: partyId, code: current.code,
          display_name: (after.display_name as string | undefined) ?? current.display_name,
          party_kind: (after.party_kind as string | undefined) ?? current.party_kind,
          relationship_status: relationshipStatusOf({ is_active: current.role_is_active, valid_from: current.role_valid_from, valid_until: current.role_valid_until }, current.status_code),
        },
      });
      return { id: partyId };
    });
  }

  async activateClient(partyId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const current = await loadClientForUpdate(connection, partyId, studio);
      assertPartyGloballyUsable(current);
      if (isRoleEffectivelyActive({ is_active: current.role_is_active, valid_from: current.role_valid_from, valid_until: current.role_valid_until })) {
        throw new AppError(409, 'STUDIO_CLIENT_ALREADY_ACTIVE', 'Klien Studio ini sudah aktif.');
      }

      await studioClientService.grantStudioClientRole(connection, partyId, studio);
      await writeClientAudit(connection, studio, userId, 'studio.client_activate', clientRef(current), `Mengaktifkan kembali Klien Studio ${current.code}.`, { role_is_active: false }, { role_is_active: true });
      await publishClientEvent(connection, studio, 'studio.client.activated', clientRef(current), userId, {
        client: { id: partyId, code: current.code, display_name: current.display_name, party_kind: current.party_kind, relationship_status: 'active' },
      });
      return { id: partyId };
    });
  }

  /**
   * Deactivates only the studio_client role — the Party, its contacts, and every
   * Project/Quotation/Invoice stay untouched. Active projects require explicit
   * confirmation so nobody deactivates a client mid-engagement by accident.
   */
  async deactivateClient(partyId: number, reason: string | null, confirmActiveProjects: boolean, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const current = await loadClientForUpdate(connection, partyId, studio);
      const currentlyActive = isRoleEffectivelyActive({ is_active: current.role_is_active, valid_from: current.role_valid_from, valid_until: current.role_valid_until });
      if (!currentlyActive) throw new AppError(409, 'STUDIO_CLIENT_ROLE_INACTIVE', 'Klien Studio ini sudah tidak aktif.');

      const [activeProjectRows]: any = await connection.execute(
        `SELECT COUNT(*) AS count FROM studio_projects
         WHERE client_party_id = ? AND business_unit_id = ? AND deleted_at IS NULL AND status_code IN (${ACTIVE_CLIENT_PROJECT_STATUSES.map(status => `'${status}'`).join(',')})`,
        [partyId, studio.id],
      );
      const activeProjectCount = Number(activeProjectRows[0].count);
      if (activeProjectCount > 0 && !confirmActiveProjects) {
        throw new AppError(409, 'STUDIO_CLIENT_HAS_ACTIVE_PROJECTS', `Klien ini masih memiliki ${activeProjectCount} proyek aktif. Konfirmasi untuk tetap menonaktifkan.`, { active_project_count: activeProjectCount });
      }

      await connection.execute(`UPDATE party_roles SET is_active = 0, valid_until = ${STUDIO_LOCAL_DATE_SQL} WHERE id = ?`, [current.role_id]);
      await writeClientAudit(
        connection, studio, userId, 'studio.client_deactivate', clientRef(current),
        `Menonaktifkan hubungan Klien Studio ${current.code}.${reason ? ` Alasan: ${reason}` : ''}`,
        { role_is_active: true }, { role_is_active: false, reason: reason || null, active_project_count: activeProjectCount },
      );
      await publishClientEvent(connection, studio, 'studio.client.deactivated', clientRef(current), userId, {
        client: { id: partyId, code: current.code, display_name: current.display_name, party_kind: current.party_kind, relationship_status: 'role_inactive' },
      });
      return { id: partyId };
    });
  }

  findDuplicates(data: { display_name?: string | null; legal_name?: string | null; email?: string | null; phone?: string | null; tax_id?: string | null }, studio: BusinessUnitContext) {
    return withTransaction(connection => studioClientService.findDuplicates(connection, { ...data, display_name: data.display_name || '' }, studio));
  }

  list(filters: ClientListFilters, studio: BusinessUnitContext) {
    return this.repository.getClients(filters, studio);
  }

  summary(studio: BusinessUnitContext) {
    return this.repository.getSummary(studio);
  }

  async assertClientExists(partyId: number, studio: BusinessUnitContext) {
    const client = await this.repository.getClient(partyId, studio);
    if (!client) throw new NotFoundError('Klien Studio tidak ditemukan.');
    return client;
  }

  async getClientDetail(partyId: number, studio: BusinessUnitContext) {
    const client = await this.assertClientExists(partyId, studio);

    const [otherRoles, contacts, contactCount, projectSummary] = await Promise.all([
      this.repository.getOtherRoles(partyId),
      this.repository.getContacts(partyId),
      this.repository.getContactCount(partyId),
      this.repository.getProjectSummary(partyId, studio),
    ]);
    const primaryContact = contacts.find(contact => contact.is_primary) || null;

    return {
      client: {
        ...client,
        relationship_status: relationshipStatusOf({ is_active: client.role_is_active, valid_from: client.role_valid_from, valid_until: client.role_valid_until }, client.status_code),
      },
      other_roles: otherRoles.map(row => ({ role_code: row.role_code, label: ROLE_LABELS[row.role_code] || row.role_code })),
      primary_contact: primaryContact,
      contact_count: contactCount,
      project_summary: projectSummary,
    };
  }

  getProjects(partyId: number, filters: ClientProjectFilters, studio: BusinessUnitContext) {
    return this.repository.getProjects(partyId, studio, filters);
  }
}

export const studioClientsService = new StudioClientsService();
