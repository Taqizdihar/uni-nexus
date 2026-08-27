import { randomUUID } from "crypto";
import { pool } from "../../config/database";
import { AppError } from "../../shared/errors/AppError";
import { domainEvents } from "../../shared/automation/domain-event-outbox.service";
import type { BusinessUnitContext } from "../craft-orders/craft-orders.helpers";
import { CraftProcurementRepository } from "./craft-procurement.repository";
import type {
  ContactInput,
  GoodsReceiptInput,
  ProcurementActor,
  PurchaseOrderInput,
  PurchaseRequestInput,
  SupplierInput,
  SupplierInvoiceInput,
} from "./craft-procurement.types";

type DbConnection = Awaited<ReturnType<typeof pool.getConnection>>;
const code = (prefix: string, id: number) =>
  `${prefix}-${id.toString().padStart(6, "0")}`;
const nullable = (value: string | null | undefined) => value?.trim() || null;
const today = () => new Date().toISOString().slice(0, 10);
const toDateTime = (value?: string | null) =>
  value ? `${value.slice(0, 10)} 12:00:00` : new Date();
const number = (value: unknown) => Number(value || 0);

export class CraftProcurementService {
  readonly repository = new CraftProcurementRepository();

  private async audit(
    connection: DbConnection,
    actor: ProcurementActor,
    action: string,
    entityType: string,
    entityId: number,
    entityCode: string | null,
    description: string,
    oldValues?: unknown,
    newValues?: unknown,
  ) {
    await connection.execute(
      `INSERT INTO audit_logs (organization_id,business_unit_id,user_id,module_code,action_code,entity_type,entity_id,entity_code,description,old_values,new_values)
       VALUES (?,?,?,'craft_procurement',?,?,?,?,?,?,?)`,
      [
        actor.organizationId,
        actor.id,
        actor.userId,
        action,
        entityType,
        entityId,
        entityCode,
        description,
        oldValues === undefined ? null : JSON.stringify(oldValues),
        newValues === undefined ? null : JSON.stringify(newValues),
      ],
    );
  }

  private async supplierForUpdate(
    connection: DbConnection,
    partyId: number,
    craft: BusinessUnitContext,
    activeOnly = false,
  ) {
    const [rows]: any = await connection.execute(
      `SELECT p.*,pr.id AS role_id,pr.is_active,pr.valid_from,pr.valid_until FROM parties p JOIN party_roles pr ON pr.party_id=p.id
       WHERE p.id=? AND p.organization_id=? AND p.deleted_at IS NULL AND pr.business_unit_id=? AND pr.role_code='supplier'
       ORDER BY pr.id DESC LIMIT 1 FOR UPDATE`,
      [partyId, craft.organizationId, craft.id],
    );
    if (!rows.length)
      throw new AppError(404, "SUPPLIER_NOT_FOUND", "Pemasok tidak ditemukan.");
    const supplier = rows[0];
    const isEffective =
      Boolean(supplier.is_active) &&
      supplier.status_code === "active" &&
      (!supplier.valid_from ||
        String(supplier.valid_from).slice(0, 10) <= today()) &&
      (!supplier.valid_until ||
        String(supplier.valid_until).slice(0, 10) >= today());
    if (activeOnly && !isEffective)
      throw new AppError(
        400,
        "INVALID_SUPPLIER",
        "Pemasok tidak aktif untuk Pengadaan Craft.",
      );
    return supplier;
  }

  private async partyForUpdate(
    connection: DbConnection,
    partyId: number,
    craft: BusinessUnitContext,
  ) {
    const [rows]: any = await connection.execute(
      "SELECT * FROM parties WHERE id=? AND organization_id=? AND deleted_at IS NULL FOR UPDATE",
      [partyId, craft.organizationId],
    );
    if (!rows.length)
      throw new AppError(404, "SUPPLIER_NOT_FOUND", "Party tidak ditemukan.");
    return rows[0];
  }

  private async assertUnit(
    connection: DbConnection,
    unitId: number | null | undefined,
    required = false,
  ) {
    if (!unitId) {
      if (required)
        throw new AppError(400, "INVALID_UNIT", "Satuan wajib diisi.");
      return null;
    }
    const [rows]: any = await connection.execute(
      "SELECT id,code,decimal_places FROM units_of_measure WHERE id=? AND is_active=1 LIMIT 1",
      [unitId],
    );
    if (!rows.length)
      throw new AppError(400, "INVALID_UNIT", "Satuan tidak valid.");
    return rows[0] as { id: number; code: string; decimal_places: number };
  }

  private assertPrecision(
    quantity: number,
    unit: { decimal_places: number } | null,
  ) {
    if (!unit) return;
    const factor = 10 ** Number(unit.decimal_places || 0);
    if (Math.abs(quantity * factor - Math.round(quantity * factor)) > 0.0000001)
      throw new AppError(
        400,
        "INVALID_QUANTITY_PRECISION",
        `Kuantitas melebihi presisi satuan (${unit.decimal_places} desimal).`,
      );
  }

  private async assertMaterial(
    connection: DbConnection,
    materialId: number,
    craft: BusinessUnitContext,
    lock = false,
  ) {
    const [rows]: any = await connection.execute(
      `SELECT m.id,m.sku,m.name,m.base_unit_id,m.default_unit_cost,mc.category_type,u.code AS unit_code,u.symbol AS unit_symbol
       FROM materials m JOIN material_categories mc ON mc.id=m.category_id JOIN units_of_measure u ON u.id=m.base_unit_id
       WHERE m.id=? AND m.business_unit_id=? AND m.deleted_at IS NULL${lock ? " FOR UPDATE" : ""}`,
      [materialId, craft.id],
    );
    if (!rows.length)
      throw new AppError(
        400,
        "INVALID_MATERIAL",
        "Material tidak valid untuk bisnis Craft.",
      );
    return rows[0];
  }

  private async requestForUpdate(
    connection: DbConnection,
    requestId: number,
    craft: BusinessUnitContext,
  ) {
    const [rows]: any = await connection.execute(
      "SELECT * FROM purchase_requests WHERE id=? AND business_unit_id=? FOR UPDATE",
      [requestId, craft.id],
    );
    if (!rows.length)
      throw new AppError(
        404,
        "PURCHASE_REQUEST_NOT_FOUND",
        "Permintaan pembelian tidak ditemukan.",
      );
    return rows[0];
  }

  private async orderForUpdate(
    connection: DbConnection,
    orderId: number,
    craft: BusinessUnitContext,
  ) {
    const [rows]: any = await connection.execute(
      "SELECT * FROM purchase_orders WHERE id=? AND business_unit_id=? FOR UPDATE",
      [orderId, craft.id],
    );
    if (!rows.length)
      throw new AppError(
        404,
        "PURCHASE_ORDER_NOT_FOUND",
        "Pesanan pembelian tidak ditemukan.",
      );
    return rows[0];
  }

  private async syncRequestOrderStatus(
    connection: DbConnection,
    requestId: number,
    craft: BusinessUnitContext,
  ) {
    const request = await this.requestForUpdate(connection, requestId, craft);
    if (["rejected", "closed"].includes(request.status_code)) return;
    const [rows]: any = await connection.execute(
      `SELECT COUNT(*) AS total_items, COALESCE(SUM(CASE WHEN COALESCE(ordered.ordered_qty,0) + 0.000001 < pri.quantity THEN 1 ELSE 0 END),0) AS remaining_items
       FROM purchase_request_items pri LEFT JOIN (
         SELECT poi.purchase_request_item_id,SUM(poi.quantity) AS ordered_qty FROM purchase_order_items poi JOIN purchase_orders po ON po.id=poi.purchase_order_id
         WHERE po.status_code<>'cancelled' AND poi.purchase_request_item_id IS NOT NULL GROUP BY poi.purchase_request_item_id
       ) ordered ON ordered.purchase_request_item_id=pri.id WHERE pri.purchase_request_id=?`,
      [requestId],
    );
    const allOrdered =
      Number(rows[0]?.total_items || 0) > 0 &&
      Number(rows[0]?.remaining_items || 0) === 0;
    const nextStatus = allOrdered
      ? "ordered"
      : request.status_code === "ordered"
        ? "approved"
        : request.status_code;
    if (nextStatus !== request.status_code)
      await connection.execute(
        "UPDATE purchase_requests SET status_code=? WHERE id=?",
        [nextStatus, requestId],
      );
  }

  async createSupplier(data: SupplierInput, actor: ProcurementActor) {
    if (!data.existing_party_id) {
      const duplicates = await this.repository.findSupplierDuplicates(
        data,
        actor,
      );
      const taxConflict = Boolean(
        data.tax_id &&
          duplicates.some(
            (item: any) => item.tax_id && String(item.tax_id) === data.tax_id,
          ),
      );
      if (taxConflict && !data.confirm_duplicate)
        throw new AppError(
          409,
          "POSSIBLE_DUPLICATE",
          "NPWP/Tax ID yang sama sudah terdaftar. Konfirmasi sebelum membuat Party baru.",
          { candidates: duplicates, strong_conflict: true },
        );
    }
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      let party: any;
      let partyId: number;
      let partyCode: string;
      if (data.existing_party_id) {
        party = await this.partyForUpdate(
          connection,
          data.existing_party_id,
          actor,
        );
        partyId = Number(party.id);
        partyCode = party.code;
      } else {
        const [result]: any = await connection.execute(
          `INSERT INTO parties (organization_id,code,party_kind,display_name,legal_name,email,phone,website,tax_id,address_line1,address_line2,city,province,postal_code,country_code,notes,status_code)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active')`,
          [
            actor.organizationId,
            `TMP-${randomUUID()}`,
            data.party_kind!,
            data.display_name!,
            nullable(data.legal_name),
            nullable(data.email),
            nullable(data.phone),
            nullable(data.website),
            nullable(data.tax_id),
            nullable(data.address_line1),
            nullable(data.address_line2),
            nullable(data.city),
            nullable(data.province),
            nullable(data.postal_code),
            data.country_code || "ID",
            nullable(data.notes),
          ],
        );
        partyId = Number(result.insertId);
        partyCode = code("SUP", partyId);
        await connection.execute("UPDATE parties SET code=? WHERE id=?", [
          partyCode,
          partyId,
        ]);
        party = { id: partyId, code: partyCode };
      }
      const [roles]: any = await connection.execute(
        `SELECT * FROM party_roles WHERE party_id=? AND business_unit_id=? AND role_code='supplier' ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [partyId, actor.id],
      );
      if (roles.length)
        await connection.execute(
          "UPDATE party_roles SET is_active=1,valid_until=NULL WHERE id=?",
          [roles[0].id],
        );
      else
        await connection.execute(
          "INSERT INTO party_roles (party_id,business_unit_id,role_code,is_active) VALUES (?,?,'supplier',1)",
          [partyId, actor.id],
        );
      await connection.execute(
        "UPDATE parties SET status_code='active' WHERE id=?",
        [partyId],
      );
      await this.audit(
        connection,
        actor,
        data.existing_party_id ? "supplier.role_add" : "supplier.create",
        "supplier",
        partyId,
        partyCode,
        data.existing_party_id
          ? `Menambahkan peran pemasok Craft pada ${partyCode}.`
          : `Membuat pemasok Craft ${partyCode}.`,
        roles[0] || null,
        data,
      );
      await connection.commit();
      return { id: partyId, code: partyCode };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateSupplier(
    partyId: number,
    data: SupplierInput,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const supplier = await this.supplierForUpdate(connection, partyId, actor);
      const allowed = [
        "party_kind",
        "display_name",
        "legal_name",
        "email",
        "phone",
        "website",
        "tax_id",
        "address_line1",
        "address_line2",
        "city",
        "province",
        "postal_code",
        "country_code",
        "notes",
      ];
      const updates: string[] = [];
      const values: unknown[] = [];
      for (const key of allowed)
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          updates.push(`${key}=?`);
          values.push((data as any)[key]);
        }
      if (updates.length)
        await connection.execute(
          `UPDATE parties SET ${updates.join(",")} WHERE id=?`,
          [...values, partyId] as any[],
        );
      await this.audit(
        connection,
        actor,
        "supplier.update",
        "supplier",
        partyId,
        supplier.code,
        `Memperbarui pemasok ${supplier.code}.`,
        supplier,
        data,
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async setSupplierActive(
    partyId: number,
    active: boolean,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const supplier = await this.supplierForUpdate(connection, partyId, actor);
      if (!active) {
        const [[openPos]]: any = await connection.execute(
          "SELECT COUNT(*) AS count FROM purchase_orders WHERE business_unit_id=? AND supplier_party_id=? AND status_code IN ('draft','sent','confirmed','partial')",
          [actor.id, partyId],
        );
        const [[openInvoices]]: any = await connection.execute(
          "SELECT COUNT(*) AS count FROM supplier_invoices WHERE business_unit_id=? AND supplier_party_id=? AND status_code IN ('unpaid','partial','overdue') AND balance_due>0",
          [actor.id, partyId],
        );
        if (Number(openPos.count) || Number(openInvoices.count))
          throw new AppError(
            409,
            "SUPPLIER_HAS_OPEN_WORKFLOW",
            "Pemasok masih memiliki PO aktif atau tagihan yang belum lunas.",
            {
              open_purchase_orders: Number(openPos.count),
              open_invoices: Number(openInvoices.count),
            },
          );
      }
      await connection.execute(
        "UPDATE party_roles SET is_active=?,valid_until=? WHERE id=?",
        [active ? 1 : 0, active ? null : today(), supplier.role_id],
      );
      if (active)
        await connection.execute(
          "UPDATE parties SET status_code='active' WHERE id=?",
          [partyId],
        );
      if (!active) {
        const [[roles]]: any = await connection.execute(
          "SELECT COUNT(*) AS count FROM party_roles WHERE party_id=? AND is_active=1",
          [partyId],
        );
        if (!Number(roles.count))
          await connection.execute(
            "UPDATE parties SET status_code='inactive' WHERE id=?",
            [partyId],
          );
      }
      await this.audit(
        connection,
        actor,
        active ? "supplier.activate" : "supplier.deactivate",
        "supplier",
        partyId,
        supplier.code,
        `${active ? "Mengaktifkan" : "Menonaktifkan"} pemasok ${supplier.code}.`,
        { is_active: supplier.is_active },
        { is_active: active },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async assertSupplierContact(
    connection: DbConnection,
    partyId: number,
    actor: ProcurementActor,
  ) {
    return this.supplierForUpdate(connection, partyId, actor);
  }
  async createContact(
    partyId: number,
    data: ContactInput,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const supplier = await this.assertSupplierContact(
        connection,
        partyId,
        actor,
      );
      if (data.is_primary)
        await connection.execute(
          "UPDATE party_contacts SET is_primary=0 WHERE party_id=?",
          [partyId],
        );
      const [result]: any = await connection.execute(
        "INSERT INTO party_contacts (party_id,full_name,job_title,email,phone,whatsapp,is_primary,notes) VALUES (?,?,?,?,?,?,?,?)",
        [
          partyId,
          data.full_name,
          nullable(data.job_title),
          nullable(data.email),
          nullable(data.phone),
          nullable(data.whatsapp),
          data.is_primary ? 1 : 0,
          nullable(data.notes),
        ],
      );
      await this.audit(
        connection,
        actor,
        "supplier.contact_create",
        "supplier",
        partyId,
        supplier.code,
        `Menambahkan kontak pemasok ${supplier.code}.`,
        undefined,
        { contact_id: Number(result.insertId), ...data },
      );
      await connection.commit();
      return { id: Number(result.insertId) };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async updateContact(
    partyId: number,
    contactId: number,
    data: Partial<ContactInput>,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const supplier = await this.assertSupplierContact(
        connection,
        partyId,
        actor,
      );
      const [rows]: any = await connection.execute(
        "SELECT * FROM party_contacts WHERE id=? AND party_id=? FOR UPDATE",
        [contactId, partyId],
      );
      if (!rows.length)
        throw new AppError(
          404,
          "SUPPLIER_CONTACT_NOT_FOUND",
          "Kontak pemasok tidak ditemukan.",
        );
      if (data.is_primary)
        await connection.execute(
          "UPDATE party_contacts SET is_primary=0 WHERE party_id=?",
          [partyId],
        );
      const cols = [
        "full_name",
        "job_title",
        "email",
        "phone",
        "whatsapp",
        "is_primary",
        "notes",
      ];
      const updates: string[] = [];
      const values: unknown[] = [];
      for (const col of cols)
        if (Object.prototype.hasOwnProperty.call(data, col)) {
          updates.push(`${col}=?`);
          values.push(
            col === "is_primary"
              ? (data as any)[col]
                ? 1
                : 0
              : (data as any)[col],
          );
        }
      if (updates.length)
        await connection.execute(
          `UPDATE party_contacts SET ${updates.join(",")} WHERE id=? AND party_id=?`,
          [...values, contactId, partyId] as any[],
        );
      await this.audit(
        connection,
        actor,
        "supplier.contact_update",
        "supplier",
        partyId,
        supplier.code,
        `Memperbarui kontak pemasok ${supplier.code}.`,
        rows[0],
        data,
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async deleteContact(
    partyId: number,
    contactId: number,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const supplier = await this.assertSupplierContact(
        connection,
        partyId,
        actor,
      );
      const [rows]: any = await connection.execute(
        "SELECT * FROM party_contacts WHERE id=? AND party_id=? FOR UPDATE",
        [contactId, partyId],
      );
      if (!rows.length)
        throw new AppError(
          404,
          "SUPPLIER_CONTACT_NOT_FOUND",
          "Kontak pemasok tidak ditemukan.",
        );
      await connection.execute(
        "DELETE FROM party_contacts WHERE id=? AND party_id=?",
        [contactId, partyId],
      );
      await this.audit(
        connection,
        actor,
        "supplier.contact_delete",
        "supplier",
        partyId,
        supplier.code,
        `Menghapus kontak pemasok ${supplier.code}.`,
        rows[0],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async writeRequestItems(
    connection: DbConnection,
    requestId: number,
    items: PurchaseRequestInput["items"],
    actor: ProcurementActor,
  ) {
    for (const item of items) {
      let unit = await this.assertUnit(
        connection,
        item.unit_id || null,
        Boolean(item.material_id),
      );
      if (item.material_id) {
        const material = await this.assertMaterial(
          connection,
          item.material_id,
          actor,
        );
        if (!unit)
          unit = await this.assertUnit(
            connection,
            Number(material.base_unit_id),
            true,
          );
      }
      this.assertPrecision(item.quantity, unit);
      await connection.execute(
        "INSERT INTO purchase_request_items (purchase_request_id,material_id,description,quantity,unit_id,estimated_unit_cost,notes) VALUES (?,?,?,?,?,?,?)",
        [
          requestId,
          item.material_id || null,
          item.description.trim(),
          item.quantity,
          unit?.id || null,
          item.estimated_unit_cost ?? null,
          nullable(item.notes),
        ],
      );
    }
  }
  async createPurchaseRequest(
    data: PurchaseRequestInput,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [result]: any = await connection.execute(
        "INSERT INTO purchase_requests (business_unit_id,request_code,requested_by,required_by,status_code,purpose) VALUES (?,? ,?,?,'draft',?)",
        [
          actor.id,
          `TMP-${randomUUID()}`,
          actor.userId,
          data.required_by || null,
          nullable(data.purpose),
        ],
      );
      const id = Number(result.insertId);
      const requestCode = code("PR", id);
      await connection.execute(
        "UPDATE purchase_requests SET request_code=? WHERE id=?",
        [requestCode, id],
      );
      await this.writeRequestItems(connection, id, data.items, actor);
      await this.audit(
        connection,
        actor,
        "purchase_request.create",
        "purchase_request",
        id,
        requestCode,
        `Membuat permintaan pembelian ${requestCode}.`,
        undefined,
        data,
      );
      await domainEvents.publish(connection, {
        eventKey: `procurement.request_created:${id}`, eventName: 'procurement.request_created', moduleCode: 'craft_procurement',
        organizationId: actor.organizationId, businessUnitId: actor.id, entityType: 'purchase_request', entityId: id, entityCode: requestCode, actorUserId: actor.userId,
        payload: { context: { procurement: { id, request_code: requestCode, status_code: 'draft', item_count: data.items.length } } },
      });
      await connection.commit();
      return { id, request_code: requestCode };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async updatePurchaseRequest(
    id: number,
    data: PurchaseRequestInput,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const request = await this.requestForUpdate(connection, id, actor);
      if (request.status_code !== "draft")
        throw new AppError(
          409,
          "PURCHASE_REQUEST_READ_ONLY",
          "Hanya permintaan berstatus Draf yang dapat diubah.",
        );
      await connection.execute(
        "UPDATE purchase_requests SET required_by=?,purpose=? WHERE id=?",
        [data.required_by || null, nullable(data.purpose), id],
      );
      await connection.execute(
        "DELETE FROM purchase_request_items WHERE purchase_request_id=?",
        [id],
      );
      await this.writeRequestItems(connection, id, data.items, actor);
      await this.audit(
        connection,
        actor,
        "purchase_request.update",
        "purchase_request",
        id,
        request.request_code,
        `Memperbarui permintaan pembelian ${request.request_code}.`,
        request,
        data,
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async submitPurchaseRequest(id: number, actor: ProcurementActor) {
    return this.transitionRequest(id, "submitted", actor);
  }
  private async transitionRequest(
    id: number,
    next: "submitted" | "approved" | "closed",
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const request = await this.requestForUpdate(connection, id, actor);
      const permitted =
        (next === "submitted" && request.status_code === "draft") ||
        (next === "approved" && request.status_code === "submitted") ||
        (next === "closed" &&
          ["draft", "ordered"].includes(request.status_code));
      if (!permitted)
        throw new AppError(
          409,
          "INVALID_REQUEST_TRANSITION",
          `Status ${request.status_code} tidak dapat diubah menjadi ${next}.`,
        );
      if (next === "approved")
        await connection.execute(
          "UPDATE purchase_requests SET status_code=?,approved_by=?,approved_at=CURRENT_TIMESTAMP(3) WHERE id=?",
          [next, actor.userId, id],
        );
      else
        await connection.execute(
          "UPDATE purchase_requests SET status_code=? WHERE id=?",
          [next, id],
        );
      await this.audit(
        connection,
        actor,
        `purchase_request.${next}`,
        "purchase_request",
        id,
        request.request_code,
        `Mengubah ${request.request_code} menjadi ${next}.`,
        { status_code: request.status_code },
        { status_code: next },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async approvePurchaseRequest(id: number, actor: ProcurementActor) {
    return this.transitionRequest(id, "approved", actor);
  }
  async closePurchaseRequest(id: number, actor: ProcurementActor) {
    return this.transitionRequest(id, "closed", actor);
  }
  async rejectPurchaseRequest(
    id: number,
    reason: string,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const request = await this.requestForUpdate(connection, id, actor);
      if (request.status_code !== "submitted")
        throw new AppError(
          409,
          "INVALID_REQUEST_TRANSITION",
          "Hanya permintaan diajukan yang dapat ditolak.",
        );
      await connection.execute(
        "UPDATE purchase_requests SET status_code='rejected',approved_by=?,approved_at=CURRENT_TIMESTAMP(3) WHERE id=?",
        [actor.userId, id],
      );
      await this.audit(
        connection,
        actor,
        "purchase_request.reject",
        "purchase_request",
        id,
        request.request_code,
        `Menolak ${request.request_code}: ${reason}.`,
        { status_code: request.status_code },
        { status_code: "rejected", rejection_reason: reason },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async writeOrderItems(
    connection: DbConnection,
    orderId: number,
    data: PurchaseOrderInput,
    actor: ProcurementActor,
  ) {
    const request = data.purchase_request_id
      ? await this.requestForUpdate(connection, data.purchase_request_id, actor)
      : null;
    if (request && !["approved", "ordered"].includes(request.status_code))
      throw new AppError(
        409,
        "INVALID_REQUEST_TRANSITION",
        "PO hanya dapat dibuat dari permintaan yang telah disetujui.",
      );
    let subtotal = 0;
    for (const item of data.items) {
      let material: any = null;
      if (item.material_id)
        material = await this.assertMaterial(
          connection,
          item.material_id,
          actor,
        );
      let unit = await this.assertUnit(
        connection,
        item.unit_id || null,
        Boolean(item.material_id),
      );
      if (material && !unit)
        unit = await this.assertUnit(
          connection,
          Number(material.base_unit_id),
          true,
        );
      this.assertPrecision(item.quantity, unit);
      let requestItem: any = null;
      if (item.purchase_request_item_id) {
        if (!request)
          throw new AppError(
            400,
            "INVALID_REQUEST_MAPPING",
            "Item PO yang dipetakan harus memiliki permintaan pembelian.",
          );
        const [rows]: any = await connection.execute(
          "SELECT * FROM purchase_request_items WHERE id=? AND purchase_request_id=? FOR UPDATE",
          [item.purchase_request_item_id, request.id],
        );
        if (!rows.length)
          throw new AppError(
            400,
            "INVALID_REQUEST_MAPPING",
            "Item permintaan pembelian tidak valid.",
          );
        requestItem = rows[0];
        const [[ordered]]: any = await connection.execute(
          "SELECT COALESCE(SUM(poi.quantity),0) AS ordered_qty FROM purchase_order_items poi JOIN purchase_orders po ON po.id=poi.purchase_order_id WHERE poi.purchase_request_item_id=? AND po.status_code<>'cancelled'",
          [requestItem.id],
        );
        if (
          number(ordered.ordered_qty) + item.quantity >
          number(requestItem.quantity) + 0.000001
        )
          throw new AppError(
            409,
            "REQUEST_QUANTITY_EXCEEDED",
            "Kuantitas PO melampaui sisa permintaan pembelian.",
          );
        if (
          item.material_id !== null &&
          item.material_id !== undefined &&
          Number(item.material_id) !== Number(requestItem.material_id || 0)
        )
          throw new AppError(
            400,
            "INVALID_REQUEST_MAPPING",
            "Material PO harus sesuai item permintaan.",
          );
      }
      const lineTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      subtotal += lineTotal;
      await connection.execute(
        "INSERT INTO purchase_order_items (purchase_order_id,purchase_request_item_id,material_id,description,quantity,unit_id,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?)",
        [
          orderId,
          requestItem?.id || null,
          item.material_id || null,
          item.description.trim(),
          item.quantity,
          unit?.id || null,
          item.unit_price,
          lineTotal,
        ],
      );
    }
    return Math.round(subtotal * 100) / 100;
  }
  async createPurchaseOrder(data: PurchaseOrderInput, actor: ProcurementActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await this.supplierForUpdate(
        connection,
        data.supplier_party_id,
        actor,
        true,
      );
      if (data.purchase_request_id)
        await this.requestForUpdate(
          connection,
          data.purchase_request_id,
          actor,
        );
      const [result]: any = await connection.execute(
        "INSERT INTO purchase_orders (business_unit_id,po_number,supplier_party_id,purchase_request_id,order_date,expected_date,status_code,currency_code,subtotal,tax_amount,shipping_amount,total_amount,notes,created_by) VALUES (?,? ,?,?,?,?,'draft',?,0,0,0,0,?,?)",
        [
          actor.id,
          `TMP-${randomUUID()}`,
          data.supplier_party_id,
          data.purchase_request_id || null,
          data.order_date,
          data.expected_date || null,
          data.currency_code || "IDR",
          nullable(data.notes),
          actor.userId,
        ],
      );
      const id = Number(result.insertId);
      const poNumber = code("PO", id);
      await connection.execute(
        "UPDATE purchase_orders SET po_number=? WHERE id=?",
        [poNumber, id],
      );
      const subtotal = await this.writeOrderItems(connection, id, data, actor);
      const tax = number(data.tax_amount);
      const shipping = number(data.shipping_amount);
      await connection.execute(
        "UPDATE purchase_orders SET subtotal=?,tax_amount=?,shipping_amount=?,total_amount=? WHERE id=?",
        [
          subtotal,
          tax,
          shipping,
          Math.round((subtotal + tax + shipping) * 100) / 100,
          id,
        ],
      );
      if (data.purchase_request_id)
        await this.syncRequestOrderStatus(
          connection,
          data.purchase_request_id,
          actor,
        );
      await this.audit(
        connection,
        actor,
        "purchase_order.create",
        "purchase_order",
        id,
        poNumber,
        `Membuat pesanan pembelian ${poNumber}.`,
        undefined,
        data,
      );
      await connection.commit();
      return { id, po_number: poNumber };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async updatePurchaseOrder(
    id: number,
    data: Partial<PurchaseOrderInput>,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const order = await this.orderForUpdate(connection, id, actor);
      if (order.status_code !== "draft")
        throw new AppError(
          409,
          "PURCHASE_ORDER_READ_ONLY",
          "Hanya PO Draf yang dapat diubah.",
        );
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];
      for (const field of [
        "order_date",
        "expected_date",
        "currency_code",
        "notes",
      ] as const)
        if ((data as any)[field] !== undefined) {
          updateFields.push(`${field}=?`);
          updateValues.push((data as any)[field]);
        }
      if (updateFields.length)
        await connection.execute(
          `UPDATE purchase_orders SET ${updateFields.join(",")} WHERE id=?`,
          [...updateValues, id] as any[],
        );
      if (data.items) {
        await connection.execute(
          "DELETE FROM purchase_order_items WHERE purchase_order_id=?",
          [id],
        );
        const full = {
          ...data,
          supplier_party_id: Number(order.supplier_party_id),
          purchase_request_id: order.purchase_request_id || null,
          items: data.items,
        } as PurchaseOrderInput;
        const subtotal = await this.writeOrderItems(
          connection,
          id,
          full,
          actor,
        );
        const tax =
          data.tax_amount === undefined
            ? number(order.tax_amount)
            : number(data.tax_amount);
        const shipping =
          data.shipping_amount === undefined
            ? number(order.shipping_amount)
            : number(data.shipping_amount);
        await connection.execute(
          "UPDATE purchase_orders SET subtotal=?,tax_amount=?,shipping_amount=?,total_amount=? WHERE id=?",
          [
            subtotal,
            tax,
            shipping,
            Math.round((subtotal + tax + shipping) * 100) / 100,
            id,
          ],
        );
      } else if (
        data.tax_amount !== undefined ||
        data.shipping_amount !== undefined
      ) {
        const tax =
          data.tax_amount === undefined
            ? number(order.tax_amount)
            : number(data.tax_amount);
        const shipping =
          data.shipping_amount === undefined
            ? number(order.shipping_amount)
            : number(data.shipping_amount);
        await connection.execute(
          "UPDATE purchase_orders SET tax_amount=?,shipping_amount=?,total_amount=? WHERE id=?",
          [
            tax,
            shipping,
            Math.round((number(order.subtotal) + tax + shipping) * 100) / 100,
            id,
          ],
        );
      }
      if (order.purchase_request_id)
        await this.syncRequestOrderStatus(
          connection,
          Number(order.purchase_request_id),
          actor,
        );
      await this.audit(
        connection,
        actor,
        "purchase_order.update",
        "purchase_order",
        id,
        order.po_number,
        `Memperbarui pesanan pembelian ${order.po_number}.`,
        order,
        data,
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  private async poTransition(
    id: number,
    next: "sent" | "confirmed" | "closed",
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const order = await this.orderForUpdate(connection, id, actor);
      const valid =
        (next === "sent" && order.status_code === "draft") ||
        (next === "confirmed" &&
          ["draft", "sent"].includes(order.status_code)) ||
        (next === "closed" && order.status_code === "received");
      if (!valid)
        throw new AppError(
          409,
          "INVALID_PO_TRANSITION",
          `Status ${order.status_code} tidak dapat diubah menjadi ${next}.`,
        );
      await connection.execute(
        "UPDATE purchase_orders SET status_code=? WHERE id=?",
        [next, id],
      );
      await this.audit(
        connection,
        actor,
        `purchase_order.${next}`,
        "purchase_order",
        id,
        order.po_number,
        `Mengubah ${order.po_number} menjadi ${next}.`,
        { status_code: order.status_code },
        { status_code: next },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async markPurchaseOrderSent(id: number, actor: ProcurementActor) {
    return this.poTransition(id, "sent", actor);
  }
  async confirmPurchaseOrder(id: number, actor: ProcurementActor) {
    return this.poTransition(id, "confirmed", actor);
  }
  async closePurchaseOrder(id: number, actor: ProcurementActor) {
    return this.poTransition(id, "closed", actor);
  }
  async cancelPurchaseOrder(id: number, actor: ProcurementActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const order = await this.orderForUpdate(connection, id, actor);
      if (!["draft", "sent", "confirmed"].includes(order.status_code))
        throw new AppError(
          409,
          "INVALID_PO_TRANSITION",
          "PO berstatus parsial atau diterima tidak dapat dibatalkan.",
        );
      const [[received]]: any = await connection.execute(
        "SELECT COALESCE(SUM(received_qty),0) AS quantity FROM purchase_order_items WHERE purchase_order_id=?",
        [id],
      );
      if (number(received.quantity) > 0)
        throw new AppError(
          409,
          "INVALID_PO_TRANSITION",
          "PO yang telah diterima sebagian tidak dapat dibatalkan.",
        );
      await connection.execute(
        "UPDATE purchase_orders SET status_code='cancelled' WHERE id=?",
        [id],
      );
      if (order.purchase_request_id)
        await this.syncRequestOrderStatus(
          connection,
          Number(order.purchase_request_id),
          actor,
        );
      await this.audit(
        connection,
        actor,
        "purchase_order.cancel",
        "purchase_order",
        id,
        order.po_number,
        `Membatalkan pesanan pembelian ${order.po_number}.`,
        { status_code: order.status_code },
        { status_code: "cancelled" },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createGoodsReceipt(data: GoodsReceiptInput, actor: ProcurementActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const order = await this.orderForUpdate(
        connection,
        data.purchase_order_id,
        actor,
      );
      if (!["sent", "confirmed", "partial"].includes(order.status_code))
        throw new AppError(
          409,
          "PO_NOT_RECEIVABLE",
          "Hanya PO Terkirim, Dikonfirmasi, atau Parsial yang dapat diterima.",
        );
      const [poItemsResult] = await connection.execute(
        "SELECT * FROM purchase_order_items WHERE purchase_order_id=? FOR UPDATE",
        [order.id],
      );
      const poItems = poItemsResult as any[];
      const byId = new Map<number, any>(
        poItems.map((item) => [Number(item.id), item]),
      );
      const seen = new Set<number>();
      for (const received of data.items) {
        if (seen.has(received.purchase_order_item_id))
          throw new AppError(
            400,
            "DUPLICATE_RECEIPT_ITEM",
            "Item PO tidak boleh diterima dua kali dalam satu dokumen.",
          );
        seen.add(received.purchase_order_item_id);
        const item = byId.get(received.purchase_order_item_id);
        if (!item)
          throw new AppError(
            400,
            "INVALID_PO_ITEM",
            "Item penerimaan bukan bagian dari PO.",
          );
        const unit = await this.assertUnit(
          connection,
          item.unit_id || null,
          Boolean(item.material_id),
        );
        this.assertPrecision(received.accepted_qty, unit);
        this.assertPrecision(received.rejected_qty || 0, unit);
        if (
          received.accepted_qty + (received.rejected_qty || 0) >
          number(item.quantity) - number(item.received_qty) + 0.000001
        )
          throw new AppError(
            409,
            "OVER_RECEIPT_NOT_ALLOWED",
            "Kuantitas diterima melampaui sisa PO.",
          );
      }
      const [receiptResult]: any = await connection.execute(
        "INSERT INTO goods_receipts (business_unit_id,receipt_number,purchase_order_id,received_at,received_by,status_code,notes) VALUES (?,? ,?,?,?,'received',?)",
        [
          actor.id,
          `TMP-${randomUUID()}`,
          order.id,
          toDateTime(data.received_at),
          actor.userId,
          nullable(data.notes),
        ],
      );
      const receiptId = Number(receiptResult.insertId);
      const receiptNumber = code("GR", receiptId);
      await connection.execute(
        "UPDATE goods_receipts SET receipt_number=? WHERE id=?",
        [receiptNumber, receiptId],
      );
      for (const received of data.items) {
        const item = byId.get(received.purchase_order_item_id)!;
        let batchId: number | null = null;
        if (item.material_id && received.accepted_qty > 0) {
          const material = await this.assertMaterial(
            connection,
            Number(item.material_id),
            actor,
            true,
          );
          if (Number(item.unit_id) !== Number(material.base_unit_id))
            throw new AppError(
              400,
              "INVALID_MATERIAL_UNIT",
              "Satuan PO material harus sama dengan satuan dasar material sebelum stok dapat diterima.",
            );
          const batchCode =
            received.batch_code?.trim() || `TMP-${randomUUID()}`;
          const [batchResult]: any = await connection.execute(
            `INSERT INTO material_batches (material_id,batch_code,supplier_id,purchase_order_item_id,received_at,initial_qty,current_qty,unit_cost,expiry_date,location_code,status_code) VALUES (?,?,?,?,?,?,?,?,?,?,'available')`,
            [
              material.id,
              batchCode,
              order.supplier_party_id,
              item.id,
              toDateTime(data.received_at),
              received.accepted_qty,
              received.accepted_qty,
              item.unit_price,
              received.expiry_date || null,
              nullable(received.location_code),
            ],
          );
          batchId = Number(batchResult.insertId);
          const finalBatchCode =
            received.batch_code?.trim() || code("BAT", batchId);
          if (!received.batch_code)
            await connection.execute(
              "UPDATE material_batches SET batch_code=? WHERE id=?",
              [finalBatchCode, batchId],
            );
          if (
            material.category_type === "filament" &&
            received.create_spool !== false
          ) {
            const unitCode = String(material.unit_code).toUpperCase();
            if (!["G", "KG"].includes(unitCode))
              throw new AppError(
                400,
                "SPOOL_UNIT_UNSUPPORTED",
                "Filament harus menggunakan satuan Gram atau Kilogram.",
              );
            const grams =
              unitCode === "G"
                ? received.accepted_qty
                : received.accepted_qty * 1000;
            const [spoolResult]: any = await connection.execute(
              `INSERT INTO filament_spools (material_batch_id,spool_code,diameter_mm,nominal_net_weight_g,tare_weight_g,current_net_weight_g,storage_location,notes) VALUES (?,?,?,?,?,?,?,?)`,
              [
                batchId,
                received.spool_code?.trim() || `TMP-${randomUUID()}`,
                received.diameter_mm ?? 1.75,
                grams,
                received.tare_weight_g ?? null,
                grams,
                nullable(received.storage_location) ||
                  nullable(received.location_code),
                nullable(received.notes),
              ],
            );
            if (!received.spool_code)
              await connection.execute(
                "UPDATE filament_spools SET spool_code=? WHERE id=?",
                [
                  code("SPL", Number(spoolResult.insertId)),
                  Number(spoolResult.insertId),
                ],
              );
          }
          await connection.execute(
            `INSERT INTO inventory_movements (business_unit_id,material_id,material_batch_id,movement_type,quantity,unit_id,unit_cost,total_cost,reference_type,reference_id,reference_code,notes,occurred_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3),?)`,
            [
              actor.id,
              material.id,
              batchId,
              "stock_in",
              received.accepted_qty,
              item.unit_id,
              item.unit_price,
              Math.round(received.accepted_qty * item.unit_price * 100) / 100,
              "goods_receipt",
              receiptId,
              receiptNumber,
              nullable(received.notes) || `Penerimaan ${receiptNumber}.`,
              actor.userId,
            ],
          );
        }
        await connection.execute(
          "INSERT INTO goods_receipt_items (goods_receipt_id,purchase_order_item_id,material_batch_id,quantity,accepted_qty,rejected_qty,rejection_reason) VALUES (?,?,?,?,?,?,?)",
          [
            receiptId,
            item.id,
            batchId,
            received.accepted_qty + (received.rejected_qty || 0),
            received.accepted_qty,
            received.rejected_qty || 0,
            nullable(received.rejection_reason),
          ],
        );
        if (received.accepted_qty > 0)
          await connection.execute(
            "UPDATE purchase_order_items SET received_qty=received_qty+? WHERE id=?",
            [received.accepted_qty, item.id],
          );
      }
      const [afterItemsResult] = await connection.execute(
        "SELECT quantity,received_qty FROM purchase_order_items WHERE purchase_order_id=?",
        [order.id],
      );
      const afterItems = afterItemsResult as any[];
      const allReceived =
        afterItems.length > 0 &&
        afterItems.every(
          (item: any) =>
            number(item.received_qty) + 0.000001 >= number(item.quantity),
        );
      const anyReceived = afterItems.some(
        (item: any) => number(item.received_qty) > 0,
      );
      const status = allReceived
        ? "received"
        : anyReceived
          ? "partial"
          : order.status_code;
      if (status !== order.status_code)
        await connection.execute(
          "UPDATE purchase_orders SET status_code=? WHERE id=?",
          [status, order.id],
        );
      await this.audit(
        connection,
        actor,
        "goods_receipt.create",
        "goods_receipt",
        receiptId,
        receiptNumber,
        `Mencatat penerimaan barang ${receiptNumber} untuk ${order.po_number}.`,
        undefined,
        { purchase_order_id: order.id, items: data.items },
      );
      await connection.commit();
      return {
        id: receiptId,
        receipt_number: receiptNumber,
        status_code: status,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createSupplierInvoice(
    data: SupplierInvoiceInput,
    actor: ProcurementActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await this.supplierForUpdate(
        connection,
        data.supplier_party_id,
        actor,
        true,
      );
      if (data.purchase_order_id) {
        const order = await this.orderForUpdate(
          connection,
          data.purchase_order_id,
          actor,
        );
        if (Number(order.supplier_party_id) !== data.supplier_party_id)
          throw new AppError(
            400,
            "INVALID_SUPPLIER_INVOICE",
            "Pemasok invoice harus sama dengan pemasok PO.",
          );
      }
      const [existing]: any = await connection.execute(
        "SELECT id FROM supplier_invoices WHERE business_unit_id=? AND supplier_party_id=? AND supplier_invoice_number=? FOR UPDATE",
        [actor.id, data.supplier_party_id, data.supplier_invoice_number],
      );
      if (existing.length)
        throw new AppError(
          409,
          "SUPPLIER_INVOICE_EXISTS",
          "Nomor tagihan tersebut sudah tercatat untuk pemasok ini.",
        );
      const [result]: any = await connection.execute(
        "INSERT INTO supplier_invoices (business_unit_id,supplier_party_id,purchase_order_id,supplier_invoice_number,invoice_date,due_date,status_code,total_amount,paid_amount,balance_due,currency_code,document_path,notes) VALUES (?,?,?,?,?,?, 'unpaid',?,0,?,?,?,?)",
        [
          actor.id,
          data.supplier_party_id,
          data.purchase_order_id || null,
          data.supplier_invoice_number,
          data.invoice_date,
          data.due_date || null,
          data.total_amount,
          data.total_amount,
          data.currency_code || "IDR",
          nullable(data.document_path),
          nullable(data.notes),
        ],
      );
      const id = Number(result.insertId);
      await this.audit(
        connection,
        actor,
        "supplier_invoice.create",
        "supplier_invoice",
        id,
        data.supplier_invoice_number,
        `Mencatat tagihan pemasok ${data.supplier_invoice_number}.`,
        undefined,
        data,
      );
      await connection.commit();
      return { id };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async voidSupplierInvoice(id: number, actor: ProcurementActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        "SELECT * FROM supplier_invoices WHERE id=? AND business_unit_id=? FOR UPDATE",
        [id, actor.id],
      );
      if (!rows.length)
        throw new AppError(
          404,
          "SUPPLIER_INVOICE_NOT_FOUND",
          "Tagihan pemasok tidak ditemukan.",
        );
      const invoice = rows[0];
      if (number(invoice.paid_amount) > 0)
        throw new AppError(
          409,
          "SUPPLIER_INVOICE_PAID",
          "Tagihan yang telah dibayar sebagian tidak dapat dibatalkan dari Procurement.",
        );
      if (invoice.status_code === "void")
        throw new AppError(
          409,
          "INVALID_INVOICE_TRANSITION",
          "Tagihan sudah dibatalkan.",
        );
      await connection.execute(
        "UPDATE supplier_invoices SET status_code='void',balance_due=0 WHERE id=?",
        [id],
      );
      await this.audit(
        connection,
        actor,
        "supplier_invoice.void",
        "supplier_invoice",
        id,
        invoice.supplier_invoice_number,
        `Membatalkan tagihan pemasok ${invoice.supplier_invoice_number}.`,
        invoice,
        { status_code: "void" },
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
