import type { PoolConnection } from 'mysql2/promise';
import { AppError } from '../../shared/errors/AppError';
import { studioExternalPartyService, type StudioExternalRole } from '../../shared/party/studio-external-party.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { studioProjectExternalService } from '../studio-projects/studio-project-external.service';
import { StudioVendorsRepository } from './studio-vendors.repository';
import { assertGloballyActive, externalRoleLabels, vendorRef, withVendorTransaction, writeVendorAudit } from './studio-vendors.shared';
import type { VendorListFilters } from './studio-vendors.types';

type ContactInput = { full_name: string; job_title?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; is_primary?: boolean; notes?: string | null };
const identityColumns = ['party_kind', 'display_name', 'legal_name', 'email', 'phone', 'website', 'tax_id', 'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country_code', 'notes'] as const;

export class StudioVendorsService {
  private repository = new StudioVendorsRepository();

  private async loadForUpdate(connection: PoolConnection, partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(
      `SELECT p.* FROM parties p WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM party_roles pr WHERE pr.party_id = p.id AND pr.business_unit_id = ? AND pr.role_code IN ('vendor', 'freelancer', 'studio_partner')) LIMIT 1 FOR UPDATE`,
      [partyId, studio.organizationId, studio.id],
    );
    if (!rows.length) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.');
    return rows[0];
  }

  private async addContacts(connection: PoolConnection, partyId: number, contacts: ContactInput[]) {
    if (!contacts.length) return;
    const [existing]: any = await connection.execute('SELECT COUNT(*) AS count FROM party_contacts WHERE party_id = ?', [partyId]);
    let primary = contacts.findIndex(contact => contact.is_primary);
    if (primary < 0 && Number(existing[0]?.count) === 0) primary = 0;
    if (primary >= 0) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
    for (let index = 0; index < contacts.length; index += 1) {
      const contact = contacts[index];
      await connection.execute(`INSERT INTO party_contacts (party_id, full_name, job_title, email, phone, whatsapp, is_primary, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [partyId, contact.full_name.trim(), contact.job_title || null, contact.email || null, contact.phone || null, contact.whatsapp || null, index === primary ? 1 : 0, contact.notes || null]);
    }
  }

  async create(data: any, userId: number, studio: BusinessUnitContext) {
    return withVendorTransaction(async connection => {
      const roles = data.roles as StudioExternalRole[]; let party: any; let reused = false;
      if (data.use_existing_party_id) {
        const [rows]: any = await connection.execute('SELECT * FROM parties WHERE id = ? AND organization_id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE', [data.use_existing_party_id, studio.organizationId]);
        if (!rows.length) throw new AppError(404, 'PARTY_NOT_FOUND', 'Party yang dipilih tidak ditemukan.');
        party = rows[0]; assertGloballyActive(party);
        await studioExternalPartyService.grantRoles(connection, Number(party.id), roles, studio); reused = true;
      } else {
        const duplicates = await studioExternalPartyService.findDuplicates(connection, data, studio);
        if (duplicates.length && !data.confirm_duplicate) throw new AppError(409, 'EXTERNAL_PARTY_DUPLICATE_CONFIRMATION_REQUIRED', 'Ditemukan Party dengan identitas yang serupa. Pilih Party yang ada atau konfirmasi pembuatan baru.', { candidates: duplicates });
        party = await studioExternalPartyService.createExternalParty(connection, data, roles, studio);
      }
      await this.addContacts(connection, Number(party.id), data.contacts || []);
      const ref = vendorRef(party);
      await writeVendorAudit(connection, studio, userId, reused ? 'studio.external_party_adopt' : 'studio.external_party_create', ref, reused ? `Mengadopsi Party ${ref.code} sebagai pihak eksternal Studio.` : `Membuat pihak eksternal Studio ${ref.code}.`, undefined, { roles, contacts: (data.contacts || []).length });
      return { id: ref.id, code: ref.code, display_name: party.display_name, reused, roles };
    });
  }

  async update(partyId: number, data: Record<string, unknown>, userId: number, studio: BusinessUnitContext) {
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio); const columns: string[] = []; const values: unknown[] = []; const before: Record<string, unknown> = {}; const after: Record<string, unknown> = {};
      for (const key of identityColumns) if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${key} = ?`); values.push(data[key] ?? null); before[key] = party[key]; after[key] = data[key] ?? null; }
      if (!columns.length) throw new AppError(400, 'NO_EXTERNAL_PARTY_CHANGES', 'Tidak ada perubahan yang dikirim.');
      await connection.execute(`UPDATE parties SET ${columns.join(', ')} WHERE id = ?`, [...values, partyId] as any[]);
      await writeVendorAudit(connection, studio, userId, 'studio.external_party_update', vendorRef(party), `Memperbarui identitas Party ${party.code}. Perubahan ini juga tampak pada peran lain.`, before, after);
      return { id: partyId };
    });
  }

  async activateRole(partyId: number, role: string, userId: number, studio: BusinessUnitContext) {
    if (!(['vendor', 'freelancer', 'studio_partner'] as string[]).includes(role)) throw new AppError(400, 'STUDIO_EXTERNAL_ROLE_INVALID', 'Peran pihak eksternal tidak didukung.');
    const managedRole = role as StudioExternalRole;
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio); assertGloballyActive(party);
      const result = await studioExternalPartyService.grantRole(connection, partyId, managedRole, studio);
      if (result.alreadyActive) throw new AppError(409, 'STUDIO_EXTERNAL_ROLE_ALREADY_ACTIVE', `${externalRoleLabels[managedRole]} sudah aktif.`);
      await writeVendorAudit(connection, studio, userId, 'studio.external_role_activate', vendorRef(party), `Mengaktifkan peran ${externalRoleLabels[managedRole]} pada ${party.code}.`, undefined, { role: managedRole });
      return { id: partyId, role: managedRole };
    });
  }

  async deactivateRole(partyId: number, role: string, reason: string | null, confirm: boolean, userId: number, studio: BusinessUnitContext) {
    if (!(['vendor', 'freelancer', 'studio_partner'] as string[]).includes(role)) throw new AppError(400, 'STUDIO_EXTERNAL_ROLE_INVALID', 'Peran pihak eksternal tidak didukung.');
    const managedRole = role as StudioExternalRole;
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio);
      const [roles]: any = await connection.execute('SELECT * FROM party_roles WHERE party_id = ? AND business_unit_id = ? AND role_code = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [partyId, studio.id, managedRole]);
      if (!roles.length) throw new AppError(409, 'STUDIO_EXTERNAL_ROLE_INACTIVE', `${externalRoleLabels[managedRole]} belum terdaftar atau sudah tidak aktif.`);
      const current = roles[0]; const now = new Date().toISOString().slice(0, 10);
      if (!Number(current.is_active) || (current.valid_until && String(current.valid_until).slice(0, 10) < now)) throw new AppError(409, 'STUDIO_EXTERNAL_ROLE_INACTIVE', `${externalRoleLabels[managedRole]} sudah tidak aktif.`);
      const activeAssignments = await this.repository.activeAssignmentCount(partyId, studio);
      if (activeAssignments && !confirm) throw new AppError(409, 'STUDIO_EXTERNAL_HAS_ACTIVE_ASSIGNMENTS', `Party ini masih memiliki ${activeAssignments} penugasan proyek aktif. Konfirmasi untuk tetap menonaktifkan peran ini.`, { active_assignment_count: activeAssignments });
      // Only this one role is changed. The Party and all unrelated roles remain untouched.
      await connection.execute('UPDATE party_roles SET is_active = 0, valid_until = UTC_DATE() WHERE id = ?', [current.id]);
      await writeVendorAudit(connection, studio, userId, 'studio.external_role_deactivate', vendorRef(party), `Menonaktifkan peran ${externalRoleLabels[managedRole]} pada ${party.code}.${reason ? ` Alasan: ${reason}` : ''}`, { role: managedRole, is_active: true }, { role: managedRole, is_active: false, reason, active_assignments: activeAssignments });
      return { id: partyId, role: managedRole };
    });
  }

  async createContact(partyId: number, data: ContactInput, userId: number, studio: BusinessUnitContext) {
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio); const [countRows]: any = await connection.execute('SELECT COUNT(*) AS count FROM party_contacts WHERE party_id = ?', [partyId]);
      const primary = Boolean(data.is_primary) || Number(countRows[0]?.count) === 0; if (primary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
      const [result]: any = await connection.execute(`INSERT INTO party_contacts (party_id, full_name, job_title, email, phone, whatsapp, is_primary, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [partyId, data.full_name.trim(), data.job_title || null, data.email || null, data.phone || null, data.whatsapp || null, primary ? 1 : 0, data.notes || null]);
      await writeVendorAudit(connection, studio, userId, 'studio.external_contact_create', vendorRef(party), `Menambahkan kontak "${data.full_name.trim()}" pada ${party.code}.`, undefined, { contact_id: Number(result.insertId), is_primary: primary });
      return { id: Number(result.insertId), is_primary: primary };
    });
  }
  async updateContact(partyId: number, contactId: number, data: Partial<ContactInput>, userId: number, studio: BusinessUnitContext) {
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio); const [rows]: any = await connection.execute('SELECT * FROM party_contacts WHERE id = ? LIMIT 1 FOR UPDATE', [contactId]);
      if (!rows.length) throw new AppError(404, 'EXTERNAL_CONTACT_NOT_FOUND', 'Kontak tidak ditemukan.'); if (Number(rows[0].party_id) !== partyId) throw new AppError(409, 'EXTERNAL_CONTACT_CROSS_PARTY', 'Kontak ini bukan milik Party yang dimaksud.');
      if (data.is_primary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
      const columns = ['full_name', 'job_title', 'email', 'phone', 'whatsapp', 'is_primary', 'notes'] as const; const changes: string[] = []; const values: unknown[] = [];
      for (const column of columns) if (Object.prototype.hasOwnProperty.call(data, column)) { changes.push(`${column} = ?`); values.push(column === 'is_primary' ? (data[column] ? 1 : 0) : (data[column] ?? null)); }
      if (!changes.length) throw new AppError(400, 'NO_CONTACT_CHANGES', 'Tidak ada perubahan kontak yang dikirim.');
      await connection.execute(`UPDATE party_contacts SET ${changes.join(', ')} WHERE id = ? AND party_id = ?`, [...values, contactId, partyId] as any[]);
      await writeVendorAudit(connection, studio, userId, data.is_primary ? 'studio.external_contact_primary' : 'studio.external_contact_update', vendorRef(party), `Memperbarui kontak "${rows[0].full_name}" pada ${party.code}.`, rows[0], data); return { id: contactId };
    });
  }
  async deleteContact(partyId: number, contactId: number, userId: number, studio: BusinessUnitContext) {
    return withVendorTransaction(async connection => {
      const party = await this.loadForUpdate(connection, partyId, studio); const [rows]: any = await connection.execute('SELECT * FROM party_contacts WHERE id = ? LIMIT 1 FOR UPDATE', [contactId]);
      if (!rows.length) throw new AppError(404, 'EXTERNAL_CONTACT_NOT_FOUND', 'Kontak tidak ditemukan.'); if (Number(rows[0].party_id) !== partyId) throw new AppError(409, 'EXTERNAL_CONTACT_CROSS_PARTY', 'Kontak ini bukan milik Party yang dimaksud.');
      await connection.execute('DELETE FROM party_contacts WHERE id = ? AND party_id = ?', [contactId, partyId]); let promoted: number | null = null;
      if (Number(rows[0].is_primary)) { const [remaining]: any = await connection.execute('SELECT id FROM party_contacts WHERE party_id = ? ORDER BY id LIMIT 1 FOR UPDATE', [partyId]); if (remaining.length) { promoted = Number(remaining[0].id); await connection.execute('UPDATE party_contacts SET is_primary = 1 WHERE id = ?', [promoted]); } }
      await writeVendorAudit(connection, studio, userId, 'studio.external_contact_delete', vendorRef(party), `Menghapus kontak "${rows[0].full_name}" dari ${party.code}.`, rows[0], { promoted_contact_id: promoted }); return { id: contactId, promoted_contact_id: promoted };
    });
  }

  async addAssignment(partyId: number, data: any, userId: number, studio: BusinessUnitContext) {
    const party = await this.assertUsableForNewAssignment(partyId, studio); const result = await studioProjectExternalService.addAssignment(data.project_id, { party_id: partyId, assignment_role: data.assignment_role, scope_description: data.scope_description, agreed_fee: data.agreed_fee, start_date: data.start_date || null, end_date: data.end_date || null, notes: data.notes }, userId, studio);
    await withVendorTransaction(connection => writeVendorAudit(connection, studio, userId, 'studio.external_assignment_add', vendorRef(party), `Menambahkan ${party.code} ke proyek sebagai ${data.assignment_role}.`, undefined, { assignment_id: result.id, project_id: data.project_id, agreed_fee: data.agreed_fee })); return result;
  }
  async updateAssignment(partyId: number, assignmentId: number, data: any, userId: number, studio: BusinessUnitContext) {
    const assignment = await this.assignmentForParty(partyId, assignmentId, studio); const result = await studioProjectExternalService.updateAssignment(Number(assignment.project_id), assignmentId, data, userId, studio);
    await withVendorTransaction(connection => writeVendorAudit(connection, studio, userId, 'studio.external_assignment_update', { id: partyId, code: assignment.party_code }, `Memperbarui penugasan ${assignmentId} pada proyek ${assignment.project_code}.`, undefined, data)); return result;
  }
  async endAssignment(partyId: number, assignmentId: number, endDate: string | null, userId: number, studio: BusinessUnitContext) {
    const assignment = await this.assignmentForParty(partyId, assignmentId, studio); const result = await studioProjectExternalService.endAssignment(Number(assignment.project_id), assignmentId, endDate, userId, studio);
    await withVendorTransaction(connection => writeVendorAudit(connection, studio, userId, 'studio.external_assignment_end', { id: partyId, code: assignment.party_code }, `Mengakhiri penugasan ${assignmentId} pada proyek ${assignment.project_code}.`, undefined, result)); return result;
  }
  private async assignmentForParty(partyId: number, assignmentId: number, studio: BusinessUnitContext) {
    const { pool } = await import('../../config/database'); const [rows]: any = await pool.execute(`SELECT pea.project_id, sp.project_code, p.code AS party_code FROM project_external_assignments pea JOIN studio_projects sp ON sp.id = pea.project_id JOIN parties p ON p.id = pea.party_id WHERE pea.id = ? AND pea.party_id = ? AND sp.business_unit_id = ? AND sp.deleted_at IS NULL LIMIT 1`, [assignmentId, partyId, studio.id]);
    if (!rows.length) throw new AppError(404, 'EXTERNAL_ASSIGNMENT_NOT_FOUND', 'Penugasan eksternal tidak ditemukan.'); return rows[0];
  }
  private async assertUsableForNewAssignment(partyId: number, studio: BusinessUnitContext) {
    const party = await this.repository.getParty(partyId, studio); if (!party) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); assertGloballyActive(party); if (party.relationship_status !== 'active') throw new AppError(409, 'STUDIO_EXTERNAL_ROLE_INACTIVE', 'Party tidak memiliki peran eksternal Studio yang aktif.'); return party;
  }

  list(filters: VendorListFilters, studio: BusinessUnitContext) { return this.repository.list(filters, studio); }
  summary(studio: BusinessUnitContext) { return this.repository.summary(studio); }
  async detail(id: number, studio: BusinessUnitContext) { const party = await this.repository.getParty(id, studio); if (!party) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); const [roles, otherRoles, contacts, assignments, commercial, maintenance] = await Promise.all([this.repository.getManagedRoles(id, studio), this.repository.getOtherRoles(id), this.repository.contacts(id), this.repository.assignments(id, studio), this.repository.commercialSummary(id, studio), this.repository.maintenance(id, studio)]); return { party, roles, other_roles: otherRoles.map(row => ({ ...row, label: externalRoleLabels[row.role_code] || row.role_code })), primary_contact: contacts.find(row => row.is_primary) || null, contact_count: contacts.length, assignments, commercial, maintenance }; }
  async contacts(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.contacts(id); }
  async assignments(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.assignments(id, studio); }
  async commercial(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.commercialSummary(id, studio); }
  async expenses(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.expenses(id, studio); }
  async maintenance(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.maintenance(id, studio); }
  async activity(id: number, studio: BusinessUnitContext) { if (!await this.repository.getParty(id, studio)) throw new AppError(404, 'STUDIO_EXTERNAL_PARTY_NOT_FOUND', 'Pihak eksternal Studio tidak ditemukan.'); return this.repository.activity(id, studio); }
  duplicates(data: any, studio: BusinessUnitContext) { return withVendorTransaction(connection => studioExternalPartyService.findDuplicates(connection, data, studio)); }
  projects(studio: BusinessUnitContext) { return this.repository.projectOptions(studio); }
}
export const studioVendorsService = new StudioVendorsService();
