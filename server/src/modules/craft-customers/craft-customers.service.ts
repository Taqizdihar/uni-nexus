import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../craft-orders/craft-orders.helpers';
import { CraftCustomersRepository } from './craft-customers.repository';
import { PartnerPricingService } from './partner-pricing.service';
import type { ContactInput, CustomerCreateInput, CustomerUpdateInput, PartnerInput, PartnerPriceRuleInput, PartnerPriceRuleUpdateInput } from './craft-customers.types';

type SqlConnection = Awaited<ReturnType<typeof pool.getConnection>>;

export class CraftCustomersService {
  private repository = new CraftCustomersRepository();
  readonly pricing = new PartnerPricingService();

  private async writeAudit(connection: SqlConnection, craft: BusinessUnitContext, userId: number, actionCode: string, party: { id: number; code: string }, description: string, oldValues?: unknown, newValues?: unknown) {
    await connection.execute(
      `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, old_values, new_values)
       VALUES (?, ?, ?, 'craft_customers', ?, 'party', ?, ?, ?, ?, ?)`,
      [craft.organizationId, craft.id, userId, actionCode, party.id, party.code, description, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null],
    );
  }

  private async getCustomerForUpdate(connection: SqlConnection, partyId: number, craft: BusinessUnitContext) {
    const [rows]: any = await connection.execute(
      `SELECT p.*, customer_role.id AS customer_role_id, customer_role.is_active AS customer_role_active
       FROM parties p JOIN party_roles customer_role ON customer_role.party_id = p.id
         AND customer_role.business_unit_id = ? AND customer_role.role_code = 'craft_customer'
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL
       ORDER BY customer_role.id DESC LIMIT 1 FOR UPDATE`,
      [craft.id, partyId, craft.organizationId],
    );
    if (!rows.length) throw new NotFoundError('Pelanggan Craft tidak ditemukan.');
    return rows[0];
  }

  private async setCustomerActive(connection: SqlConnection, partyId: number, active: boolean, craft: BusinessUnitContext) {
    if (active) {
      await connection.execute(
        `UPDATE party_roles SET is_active = 1, valid_until = NULL
         WHERE party_id = ? AND business_unit_id = ? AND role_code = 'craft_customer'`,
        [partyId, craft.id],
      );
      await connection.execute("UPDATE parties SET status_code = 'active' WHERE id = ?", [partyId]);
      return;
    }
    // A partner cannot remain a Craft partner without the Craft customer role.
    await connection.execute(
      `UPDATE party_roles SET is_active = 0
       WHERE party_id = ? AND business_unit_id = ? AND role_code IN ('craft_customer', 'craft_partner')`,
      [partyId, craft.id],
    );
    await connection.execute('UPDATE partner_price_rules SET is_active = 0 WHERE partner_party_id = ? AND is_active = 1', [partyId]);
    const [roles]: any = await connection.execute('SELECT COUNT(*) AS active_role_count FROM party_roles WHERE party_id = ? AND is_active = 1', [partyId]);
    if (Number(roles[0]?.active_role_count || 0) === 0) {
      await connection.execute("UPDATE parties SET status_code = 'inactive' WHERE id = ?", [partyId]);
    }
  }

  async createCustomer(data: CustomerCreateInput, userId: number, craft: BusinessUnitContext) {
    const duplicates = await this.repository.findDuplicates(data, craft);
    const exactTaxId = Boolean(data.tax_id && duplicates.some(row => row.tax_id && String(row.tax_id) === data.tax_id));
    if (exactTaxId && !data.confirm_duplicate) {
      throw new AppError(409, 'POSSIBLE_DUPLICATE', 'NPWP/Tax ID yang sama sudah terdaftar. Konfirmasi sebelum membuat pelanggan baru.', { candidates: duplicates, strong_conflict: true });
    }
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const [result]: any = await connection.execute(
        `INSERT INTO parties (organization_id, code, party_kind, display_name, legal_name, email, phone, website, tax_id,
                              address_line1, address_line2, city, province, postal_code, country_code, notes, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [craft.organizationId, `TMP-${randomUUID()}`, data.party_kind, data.display_name, data.legal_name || null, data.email || null, data.phone || null,
          data.website || null, data.tax_id || null, data.address_line1 || null, data.address_line2 || null, data.city || null, data.province || null,
          data.postal_code || null, data.country_code || 'ID', data.notes || null],
      );
      const partyId = Number(result.insertId); const code = `CUS-${partyId.toString().padStart(6, '0')}`;
      await connection.execute('UPDATE parties SET code = ? WHERE id = ?', [code, partyId]);
      await connection.execute(
        `INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active) VALUES (?, ?, 'craft_customer', ?)`,
        [partyId, craft.id, data.status_code === 'inactive' ? 0 : 1],
      );
      if (data.status_code === 'inactive') await connection.execute("UPDATE parties SET status_code = 'inactive' WHERE id = ?", [partyId]);
      await this.writeAudit(connection, craft, userId, 'customer.create', { id: partyId, code }, `Membuat pelanggan Craft ${code}.`, undefined, { ...data, confirm_duplicate: undefined });
      await connection.commit();
      return { id: partyId, code };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async updateCustomer(partyId: number, data: CustomerUpdateInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const current = await this.getCustomerForUpdate(connection, partyId, craft);
      const columns = ['party_kind', 'display_name', 'legal_name', 'email', 'phone', 'website', 'tax_id', 'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country_code', 'notes'] as const;
      const assignments: string[] = []; const values: unknown[] = [];
      for (const column of columns) {
        if (Object.prototype.hasOwnProperty.call(data, column)) { assignments.push(`${column} = ?`); values.push(data[column]); }
      }
      if (assignments.length) await connection.execute(`UPDATE parties SET ${assignments.join(', ')} WHERE id = ?`, [...values, partyId] as any[]);
      if (data.status_code === 'active') await this.setCustomerActive(connection, partyId, true, craft);
      if (data.status_code === 'inactive') await this.setCustomerActive(connection, partyId, false, craft);
      await this.writeAudit(connection, craft, userId, 'customer.update', { id: partyId, code: current.code }, `Memperbarui pelanggan Craft ${current.code}.`, current, data);
      if (data.status_code === 'inactive') await this.writeAudit(connection, craft, userId, 'customer.deactivate', { id: partyId, code: current.code }, `Menonaktifkan hubungan Craft untuk ${current.code}.`, { customer_role_active: current.customer_role_active }, { customer_role_active: false });
      if (data.status_code === 'active' && !current.customer_role_active) await this.writeAudit(connection, craft, userId, 'customer.reactivate', { id: partyId, code: current.code }, `Mengaktifkan kembali pelanggan Craft ${current.code}.`, { customer_role_active: false }, { customer_role_active: true });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async setCustomerStatus(partyId: number, active: boolean, userId: number, craft: BusinessUnitContext) {
    return this.updateCustomer(partyId, { status_code: active ? 'active' : 'inactive' }, userId, craft);
  }

  async createContact(partyId: number, data: ContactInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      if (data.is_primary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
      const [result]: any = await connection.execute(
        `INSERT INTO party_contacts (party_id, full_name, job_title, email, phone, whatsapp, is_primary, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [partyId, data.full_name, data.job_title || null, data.email || null, data.phone || null, data.whatsapp || null, data.is_primary ? 1 : 0, data.notes || null],
      );
      await this.writeAudit(connection, craft, userId, 'customer.contact_create', { id: partyId, code: party.code }, `Menambahkan kontak untuk ${party.code}.`, undefined, { contact_id: Number(result.insertId), ...data });
      await connection.commit(); return { id: Number(result.insertId) };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async updateContact(partyId: number, contactId: number, data: Partial<ContactInput>, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      const [existingRows]: any = await connection.execute('SELECT * FROM party_contacts WHERE id = ? AND party_id = ? FOR UPDATE', [contactId, partyId]);
      if (!existingRows.length) throw new NotFoundError('Kontak pelanggan tidak ditemukan.');
      if (data.is_primary) await connection.execute('UPDATE party_contacts SET is_primary = 0 WHERE party_id = ?', [partyId]);
      const columns = ['full_name', 'job_title', 'email', 'phone', 'whatsapp', 'is_primary', 'notes'] as const; const assignments: string[] = []; const values: unknown[] = [];
      for (const column of columns) if (Object.prototype.hasOwnProperty.call(data, column)) { assignments.push(`${column} = ?`); values.push(column === 'is_primary' ? (data[column] ? 1 : 0) : data[column]); }
      if (assignments.length) await connection.execute(`UPDATE party_contacts SET ${assignments.join(', ')} WHERE id = ? AND party_id = ?`, [...values, contactId, partyId] as any[]);
      await this.writeAudit(connection, craft, userId, data.is_primary ? 'customer.contact_primary' : 'customer.contact_update', { id: partyId, code: party.code }, `Memperbarui kontak ${party.code}.`, existingRows[0], data);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async deleteContact(partyId: number, contactId: number, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      const [rows]: any = await connection.execute('SELECT * FROM party_contacts WHERE id = ? AND party_id = ? FOR UPDATE', [contactId, partyId]);
      if (!rows.length) throw new NotFoundError('Kontak pelanggan tidak ditemukan.');
      await connection.execute('DELETE FROM party_contacts WHERE id = ? AND party_id = ?', [contactId, partyId]);
      await this.writeAudit(connection, craft, userId, 'customer.contact_delete', { id: partyId, code: party.code }, `Menghapus kontak ${party.code}.`, rows[0]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async promoteToPartner(partyId: number, data: PartnerInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      await this.setCustomerActive(connection, partyId, true, craft);
      const [roles]: any = await connection.execute(
        `SELECT id, is_active, valid_from, valid_until FROM party_roles
         WHERE party_id = ? AND business_unit_id = ? AND role_code = 'craft_partner' ORDER BY id DESC LIMIT 1 FOR UPDATE`, [partyId, craft.id],
      );
      if (roles.length) await connection.execute('UPDATE party_roles SET is_active = 1, valid_from = ?, valid_until = ? WHERE id = ?', [data.valid_from || null, data.valid_until || null, roles[0].id]);
      else await connection.execute("INSERT INTO party_roles (party_id, business_unit_id, role_code, is_active, valid_from, valid_until) VALUES (?, ?, 'craft_partner', 1, ?, ?)", [partyId, craft.id, data.valid_from || null, data.valid_until || null]);
      await this.writeAudit(connection, craft, userId, 'partner.promote', { id: partyId, code: party.code }, `Mempromosikan ${party.code} menjadi Mitra Craft.`, roles[0] || null, data);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async updatePartner(partyId: number, data: PartnerInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      const [roles]: any = await connection.execute("SELECT * FROM party_roles WHERE party_id = ? AND business_unit_id = ? AND role_code = 'craft_partner' ORDER BY id DESC LIMIT 1 FOR UPDATE", [partyId, craft.id]);
      if (!roles.length) throw new AppError(409, 'NOT_A_PARTNER', 'Pelanggan ini belum menjadi Mitra Craft.');
      const validFrom = data.valid_from === undefined ? roles[0].valid_from : data.valid_from;
      const validUntil = data.valid_until === undefined ? roles[0].valid_until : data.valid_until;
      if (validFrom && validUntil && String(validFrom) > String(validUntil)) throw new AppError(400, 'INVALID_DATE_RANGE', 'Tanggal akhir kemitraan tidak boleh sebelum tanggal mulai.');
      await connection.execute('UPDATE party_roles SET valid_from = ?, valid_until = ? WHERE id = ?', [validFrom || null, validUntil || null, roles[0].id]);
      await this.writeAudit(connection, craft, userId, 'partner.update', { id: partyId, code: party.code }, `Memperbarui masa berlaku Mitra ${party.code}.`, roles[0], { valid_from: validFrom, valid_until: validUntil });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async endPartnership(partyId: number, endDate: string | null | undefined, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const party = await this.getCustomerForUpdate(connection, partyId, craft);
      const [roles]: any = await connection.execute("SELECT * FROM party_roles WHERE party_id = ? AND business_unit_id = ? AND role_code = 'craft_partner' AND is_active = 1 ORDER BY id DESC LIMIT 1 FOR UPDATE", [partyId, craft.id]);
      if (!roles.length) throw new AppError(409, 'PARTNERSHIP_INACTIVE', 'Kemitraan Craft sudah tidak aktif.');
      await connection.execute("UPDATE party_roles SET is_active = 0, valid_until = ? WHERE id = ?", [endDate || new Date().toISOString().slice(0, 10), roles[0].id]);
      await connection.execute('UPDATE partner_price_rules SET is_active = 0 WHERE partner_party_id = ? AND is_active = 1', [partyId]);
      await this.writeAudit(connection, craft, userId, 'partner.end', { id: partyId, code: party.code }, `Mengakhiri kemitraan Craft ${party.code}; peran pelanggan tetap aktif.`, roles[0], { valid_until: endDate || new Date().toISOString().slice(0, 10) });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  private async assertActivePartner(connection: SqlConnection, partyId: number, craft: BusinessUnitContext) {
    const [rows]: any = await connection.execute(
      `SELECT p.id, p.code FROM parties p JOIN party_roles pr ON pr.party_id = p.id
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL AND pr.business_unit_id = ? AND pr.role_code = 'craft_partner'
         AND pr.is_active = 1 AND (pr.valid_from IS NULL OR pr.valid_from <= UTC_DATE()) AND (pr.valid_until IS NULL OR pr.valid_until >= UTC_DATE()) LIMIT 1 FOR UPDATE`,
      [partyId, craft.organizationId, craft.id],
    );
    if (!rows.length) throw new AppError(409, 'PARTNERSHIP_INACTIVE', 'Harga khusus hanya dapat dikelola untuk Mitra Craft yang aktif.');
    return rows[0];
  }

  private async assertProduct(connection: SqlConnection, data: { product_id: number; variant_id?: number | null }, craft: BusinessUnitContext) {
    const [products]: any = await connection.execute('SELECT id FROM products WHERE id = ? AND business_unit_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1', [data.product_id, craft.id]);
    if (!products.length) throw new AppError(400, 'INVALID_PRODUCT', 'Produk Craft tidak ditemukan atau tidak aktif.');
    if (data.variant_id) {
      const [variants]: any = await connection.execute('SELECT id FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1 LIMIT 1', [data.variant_id, data.product_id]);
      if (!variants.length) throw new AppError(400, 'INVALID_VARIANT', 'Varian produk tidak valid.');
    }
  }

  async createPriceRule(partyId: number, data: PartnerPriceRuleInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const partner = await this.assertActivePartner(connection, partyId, craft); await this.assertProduct(connection, data, craft);
      const [duplicates]: any = await connection.execute(
        `SELECT id FROM partner_price_rules WHERE partner_party_id = ? AND product_id = ? AND variant_id <=> ? AND minimum_qty = ? AND is_active = 1 FOR UPDATE`,
        [partyId, data.product_id, data.variant_id || null, data.minimum_qty],
      );
      if (duplicates.length) throw new AppError(409, 'DUPLICATE_PRICE_RULE', 'Aturan harga aktif dengan produk, varian, dan kuantitas minimum yang sama sudah ada.');
      const [result]: any = await connection.execute(
        `INSERT INTO partner_price_rules (partner_party_id, product_id, variant_id, minimum_qty, special_price, discount_percent, valid_from, valid_until, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [partyId, data.product_id, data.variant_id || null, data.minimum_qty, data.special_price ?? null, data.discount_percent ?? null, data.valid_from || null, data.valid_until || null, data.is_active === false ? 0 : 1],
      );
      await this.writeAudit(connection, craft, userId, 'partner_pricing.create', { id: partyId, code: partner.code }, `Menambahkan aturan harga Mitra ${partner.code}.`, undefined, { rule_id: Number(result.insertId), ...data });
      await connection.commit(); return { id: Number(result.insertId) };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async updatePriceRule(partyId: number, ruleId: number, data: PartnerPriceRuleUpdateInput, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const partner = await this.assertActivePartner(connection, partyId, craft);
      const [rows]: any = await connection.execute('SELECT * FROM partner_price_rules WHERE id = ? AND partner_party_id = ? FOR UPDATE', [ruleId, partyId]);
      if (!rows.length) throw new NotFoundError('Aturan harga Mitra tidak ditemukan.');
      const current = rows[0]; const merged = { ...current, ...data };
      if (merged.special_price === null && merged.discount_percent === null) throw new AppError(400, 'PRICE_REQUIRED', 'Aturan harga membutuhkan harga khusus atau persentase diskon.');
      if (merged.valid_from && merged.valid_until && String(merged.valid_from) > String(merged.valid_until)) throw new AppError(400, 'INVALID_DATE_RANGE', 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
      if (data.minimum_qty !== undefined && data.minimum_qty !== Number(current.minimum_qty) && data.is_active !== false) {
        const [duplicates]: any = await connection.execute('SELECT id FROM partner_price_rules WHERE partner_party_id = ? AND product_id = ? AND variant_id <=> ? AND minimum_qty = ? AND is_active = 1 AND id != ? FOR UPDATE', [partyId, current.product_id, current.variant_id, data.minimum_qty, ruleId]);
        if (duplicates.length) throw new AppError(409, 'DUPLICATE_PRICE_RULE', 'Aturan harga aktif dengan kuantitas minimum yang sama sudah ada.');
      }
      const columns = ['variant_id', 'minimum_qty', 'special_price', 'discount_percent', 'valid_from', 'valid_until', 'is_active'] as const; const assignments: string[] = []; const values: unknown[] = [];
      for (const column of columns) if (Object.prototype.hasOwnProperty.call(data, column)) { assignments.push(`${column} = ?`); values.push(column === 'is_active' ? (data[column] ? 1 : 0) : data[column]); }
      if (assignments.length) await connection.execute(`UPDATE partner_price_rules SET ${assignments.join(', ')} WHERE id = ? AND partner_party_id = ?`, [...values, ruleId, partyId] as any[]);
      await this.writeAudit(connection, craft, userId, 'partner_pricing.update', { id: partyId, code: partner.code }, `Memperbarui aturan harga Mitra ${partner.code}.`, current, data);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async deactivatePriceRule(partyId: number, ruleId: number, userId: number, craft: BusinessUnitContext) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const partner = await this.getCustomerForUpdate(connection, partyId, craft);
      const [rows]: any = await connection.execute('SELECT * FROM partner_price_rules WHERE id = ? AND partner_party_id = ? FOR UPDATE', [ruleId, partyId]);
      if (!rows.length) throw new NotFoundError('Aturan harga Mitra tidak ditemukan.');
      await connection.execute('UPDATE partner_price_rules SET is_active = 0 WHERE id = ? AND partner_party_id = ?', [ruleId, partyId]);
      await this.writeAudit(connection, craft, userId, 'partner_pricing.deactivate', { id: partyId, code: partner.code }, `Menonaktifkan aturan harga Mitra ${partner.code}.`, rows[0], { is_active: false });
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}
