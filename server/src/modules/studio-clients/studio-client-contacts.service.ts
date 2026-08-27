import type { PoolConnection } from 'mysql2/promise';
import { AppError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { StudioClientsRepository } from './studio-clients.repository';
import { clientRef, loadClientForUpdate, withTransaction, writeClientAudit } from './studio-clients.shared';

interface ContactInput {
  full_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

/**
 * Contact CRUD with transactional "at most one primary contact per Party" enforcement.
 *
 * Every mutation locks the parent Party row first (`loadClientForUpdate` uses
 * `FOR UPDATE`), which serializes concurrent contact writes for the same client
 * and rules out the two-primaries race the database schema does not prevent on
 * its own.
 */
export class StudioClientContactsService {
  private repository = new StudioClientsRepository();

  private async loadContact(connection: PoolConnection, partyId: number, contactId: number) {
    const [rows]: any = await connection.execute('SELECT * FROM party_contacts WHERE id = ? LIMIT 1 FOR UPDATE', [contactId]);
    if (!rows.length) throw new AppError(404, 'CLIENT_CONTACT_NOT_FOUND', 'Kontak klien tidak ditemukan.');
    if (Number(rows[0].party_id) !== partyId) throw new AppError(409, 'CLIENT_CONTACT_CROSS_PARTY', 'Kontak ini bukan milik klien yang dimaksud.');
    return rows[0];
  }

  async createContact(partyId: number, data: ContactInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const client = await loadClientForUpdate(connection, partyId, studio);
      const [existing]: any = await connection.execute('SELECT COUNT(*) AS count FROM party_contacts WHERE party_id = ?', [partyId]);
      // The first contact on a Party becomes primary automatically; later ones only if explicitly requested.
      const isPrimary = Boolean(data.is_primary) || Number(existing[0].count) === 0;

      if (isPrimary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
      const [result]: any = await connection.execute(
        `INSERT INTO party_contacts (party_id, full_name, job_title, email, phone, whatsapp, is_primary, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [partyId, data.full_name.trim(), data.job_title || null, data.email || null, data.phone || null, data.whatsapp || null, isPrimary ? 1 : 0, data.notes || null],
      );

      await writeClientAudit(
        connection, studio, userId, 'studio.client_contact_create', clientRef(client),
        `Menambahkan kontak "${data.full_name.trim()}" untuk Klien Studio ${client.code}.`,
        undefined, { contact_id: Number(result.insertId), full_name: data.full_name, is_primary: isPrimary },
      );
      return { id: Number(result.insertId), is_primary: isPrimary };
    });
  }

  async updateContact(partyId: number, contactId: number, data: Partial<ContactInput>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const client = await loadClientForUpdate(connection, partyId, studio);
      const current = await this.loadContact(connection, partyId, contactId);

      if (data.is_primary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);

      const columns = ['full_name', 'job_title', 'email', 'phone', 'whatsapp', 'is_primary', 'notes'] as const;
      const assignments: string[] = [];
      const values: unknown[] = [];
      for (const column of columns) {
        if (Object.prototype.hasOwnProperty.call(data, column)) {
          assignments.push(`${column} = ?`);
          values.push(column === 'is_primary' ? (data[column] ? 1 : 0) : (data[column] ?? null));
        }
      }
      if (!assignments.length) throw new AppError(400, 'NO_CONTACT_CHANGES', 'Tidak ada perubahan kontak yang dikirim.');

      await connection.execute(`UPDATE party_contacts SET ${assignments.join(', ')} WHERE id = ? AND party_id = ?`, [...values, contactId, partyId] as any[]);
      await writeClientAudit(
        connection, studio, userId, data.is_primary ? 'studio.client_contact_primary' : 'studio.client_contact_update', clientRef(client),
        `Memperbarui kontak "${current.full_name}" pada Klien Studio ${client.code}.`, current, data,
      );
      return { id: contactId };
    });
  }

  /**
   * Deletes a contact. If the deleted contact was primary and other contacts
   * remain, the oldest remaining contact is deterministically promoted so the
   * Party never ends up with zero or ambiguous multi-primary state.
   */
  async deleteContact(partyId: number, contactId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const client = await loadClientForUpdate(connection, partyId, studio);
      const current = await this.loadContact(connection, partyId, contactId);

      await connection.execute('DELETE FROM party_contacts WHERE id = ? AND party_id = ?', [contactId, partyId]);

      let promoted: number | null = null;
      if (Number(current.is_primary)) {
        const [remaining]: any = await connection.execute(
          'SELECT id FROM party_contacts WHERE party_id = ? ORDER BY id ASC LIMIT 1 FOR UPDATE',
          [partyId],
        );
        if (remaining.length) {
          await connection.execute('UPDATE party_contacts SET is_primary = 1 WHERE id = ?', [remaining[0].id]);
          promoted = Number(remaining[0].id);
        }
      }

      await writeClientAudit(
        connection, studio, userId, 'studio.client_contact_delete', clientRef(client),
        `Menghapus kontak "${current.full_name}" dari Klien Studio ${client.code}.${promoted ? ' Kontak lain dipromosikan menjadi utama.' : ''}`,
        current, promoted ? { promoted_contact_id: promoted } : undefined,
      );
      return { id: contactId, promoted_contact_id: promoted };
    });
  }

  list(partyId: number) {
    return this.repository.getContacts(partyId);
  }
}

export const studioClientContactsService = new StudioClientContactsService();
