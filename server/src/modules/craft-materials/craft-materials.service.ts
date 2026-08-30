import { randomUUID } from "crypto";
import { pool } from "../../config/database";
import { AppError, NotFoundError } from "../../shared/errors/AppError";
import { domainEvents } from "../../shared/automation/domain-event-outbox.service";
import { AuditService } from '../../shared/audit/audit.service';
import { CraftMaterialsRepository } from "./craft-materials.repository";
import {
  applyFilamentBatchQuantityDelta,
  changeSpoolWeight,
} from "./material-spools.service";
import type {
  DbConnection,
  MaterialActor,
  MaterialFilters,
  MaterialInput,
  ReceiveStockInput,
  SpoolUpdateInput,
  StockAdjustmentInput,
  WasteInput,
} from "./craft-materials.types";

const optional = (value: string | null | undefined) => value?.trim() || null;
const mysqlDate = (value: string | null | undefined) =>
  value ? value.replace("T", " ").replace("Z", "") : null;
const padCode = (prefix: string, id: number) =>
  `${prefix}-${id.toString().padStart(6, "0")}`;
const value = (candidate: unknown, fallback = 0) =>
  Number.isFinite(Number(candidate)) ? Number(candidate) : fallback;

export class CraftMaterialsService {
  readonly repository = new CraftMaterialsRepository();

  async getMaterials(actor: MaterialActor, filters: MaterialFilters) {
    return this.repository.listMaterials(actor.businessUnitId, filters);
  }
  async getMaterialDetail(id: number, actor: MaterialActor) {
    const detail = await this.repository.getMaterialDetail(
      id,
      actor.businessUnitId,
    );
    if (!detail) throw new NotFoundError("Material tidak ditemukan.");
    return detail;
  }
  async getCategories(actor: MaterialActor) {
    return this.repository.listCategories(actor.businessUnitId);
  }
  async getUnits() {
    return this.repository.listUnits();
  }
  async getSuppliers(actor: MaterialActor) {
    return this.repository.listSuppliers(
      actor.organizationId,
      actor.businessUnitId,
    );
  }
  async getSpools(actor: MaterialActor, materialId?: number) {
    return this.repository.listSpools(actor.businessUnitId, materialId);
  }
  async getMovements(actor: MaterialActor, materialId?: number) {
    return this.repository.listMovements(actor.businessUnitId, materialId);
  }
  async getLowStock(actor: MaterialActor) {
    return this.repository.listLowStock(actor.businessUnitId);
  }
  async getWaste(actor: MaterialActor) {
    return this.repository.listWaste(actor.businessUnitId);
  }

  private async assertCategory(
    connection: DbConnection,
    categoryId: number,
    businessUnitId: number,
  ) {
    const [rows]: any = await connection.execute(
      "SELECT id, category_type FROM material_categories WHERE id = ? AND business_unit_id = ? LIMIT 1",
      [categoryId, businessUnitId],
    );
    if (!rows.length)
      throw new AppError(
        400,
        "INVALID_MATERIAL_CATEGORY",
        "Kategori material tidak valid.",
      );
    return rows[0] as { id: number; category_type: string };
  }

  private async assertUnit(connection: DbConnection, unitId: number) {
    const [rows]: any = await connection.execute(
      "SELECT id, code FROM units_of_measure WHERE id = ? AND is_active = 1 LIMIT 1",
      [unitId],
    );
    if (!rows.length)
      throw new AppError(
        400,
        "INVALID_UNIT",
        "Satuan dasar material tidak valid.",
      );
    return rows[0] as { id: number; code: string };
  }

  private async assertSupplier(
    connection: DbConnection,
    supplierId: number | null | undefined,
    organizationId: number,
  ) {
    if (!supplierId) return;
    const [rows]: any = await connection.execute(
      `SELECT p.id FROM parties p
       JOIN party_roles pr ON pr.party_id = p.id
       JOIN business_units bu ON bu.id = pr.business_unit_id AND bu.code = 'CRAFT' AND bu.is_active = 1
       WHERE p.id = ? AND p.organization_id = ? AND p.status_code = 'active' AND p.deleted_at IS NULL
         AND pr.role_code = 'supplier' AND pr.is_active = 1
         AND (pr.valid_from IS NULL OR pr.valid_from <= UTC_DATE())
         AND (pr.valid_until IS NULL OR pr.valid_until >= UTC_DATE()) LIMIT 1`,
      [supplierId, organizationId],
    );
    if (!rows.length)
      throw new AppError(
        400,
        "INVALID_SUPPLIER",
        "Pemasok tidak valid atau tidak aktif.",
      );
  }

  private async audit(
    connection: DbConnection,
    actor: MaterialActor,
    action: string,
    entityType: string,
    entityId: number,
    entityCode: string | null,
    description: string,
    oldValues?: unknown,
    newValues?: unknown,
  ) {
    await AuditService.write({ organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, userId: actor.id, moduleCode: 'craft_materials', actionCode: action, entityType, entityId, entityCode, description, oldValues, newValues }, connection);
  }

  private async insertMovement(
    connection: DbConnection,
    actor: MaterialActor,
    data: {
      materialId: number;
      batchId: number | null;
      type: string;
      quantity: number;
      unitId: number;
      unitCost: number | null;
      referenceType?: string;
      referenceId?: number | null;
      referenceCode?: string | null;
      notes: string;
    },
  ) {
    await connection.execute(
      `INSERT INTO inventory_movements (business_unit_id, material_id, material_batch_id, movement_type,
        quantity, unit_id, unit_cost, total_cost, reference_type, reference_id, reference_code, notes, occurred_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), ?)`,
      [
        actor.businessUnitId,
        data.materialId,
        data.batchId,
        data.type,
        data.quantity,
        data.unitId,
        data.unitCost,
        data.unitCost === null ? null : data.quantity * data.unitCost,
        data.referenceType || "material_module",
        data.referenceId || null,
        data.referenceCode || null,
        data.notes,
        actor.id,
      ],
    );
  }

  private duplicate(error: unknown) {
    if ((error as any)?.code === "ER_DUP_ENTRY")
      return new AppError(
        409,
        "MATERIAL_SKU_EXISTS",
        "SKU material tersebut sudah digunakan.",
      );
    return error;
  }

  private async publishStockEvent(
    connection: DbConnection, actor: MaterialActor, materialId: number, eventName: string,
    previousAvailable: number | null, extra: Record<string, unknown> = {},
  ) {
    const [rows]: any = await connection.execute(
      `SELECT m.sku,m.name,m.low_stock_threshold,COALESCE(SUM(mb.current_qty),0) available_qty
       FROM materials m LEFT JOIN material_batches mb ON mb.material_id=m.id AND mb.status_code='available'
       WHERE m.id=? AND m.business_unit_id=? AND m.deleted_at IS NULL GROUP BY m.id`,
      [materialId, actor.businessUnitId],
    );
    if (!rows.length) return;
    const material = rows[0]; const availableQty = value(material.available_qty); const threshold = value(material.low_stock_threshold);
    const context = { material: { id: materialId, material_code: material.sku, name: material.name, available_qty: availableQty, reorder_point: threshold, ...extra } };
    const publish = (name: string) => domainEvents.publish(connection as any, { eventKey: `${name}:${materialId}:${randomUUID()}`, eventName: name, moduleCode: 'craft_materials', organizationId: actor.organizationId, businessUnitId: actor.businessUnitId, entityType: 'material', entityId: materialId, entityCode: material.sku, actorUserId: actor.id, payload: { context } });
    await publish(eventName);
    if (previousAvailable !== null && previousAvailable > threshold && availableQty <= threshold) await publish('material.low_stock');
    if (previousAvailable !== null && previousAvailable > 0 && availableQty <= 0) await publish('material.out_of_stock');
  }

  async createMaterial(input: MaterialInput, actor: MaterialActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await this.assertCategory(
        connection,
        input.category_id,
        actor.businessUnitId,
      );
      await this.assertUnit(connection, input.base_unit_id);
      await this.assertSupplier(
        connection,
        input.preferred_supplier_id,
        actor.organizationId,
      );
      if (input.sku) {
        const [duplicates]: any = await connection.execute(
          "SELECT id FROM materials WHERE business_unit_id = ? AND sku = ? LIMIT 1",
          [actor.businessUnitId, input.sku.trim()],
        );
        if (duplicates.length)
          throw new AppError(
            409,
            "MATERIAL_SKU_EXISTS",
            "SKU material tersebut sudah digunakan.",
          );
      }
      const temporarySku = input.sku?.trim() || `TMP-${randomUUID()}`;
      const [result]: any = await connection.execute(
        `INSERT INTO materials (business_unit_id, category_id, sku, name, brand, material_type, color_name, color_hex,
          base_unit_id, default_unit_cost, low_stock_threshold, reorder_qty, preferred_supplier_id, notes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actor.businessUnitId,
          input.category_id,
          temporarySku,
          input.name.trim(),
          optional(input.brand),
          optional(input.material_type),
          optional(input.color_name),
          input.color_hex ? input.color_hex.toUpperCase() : null,
          input.base_unit_id,
          input.default_unit_cost ?? 0,
          input.low_stock_threshold ?? 0,
          input.reorder_qty ?? 0,
          input.preferred_supplier_id ?? null,
          optional(input.notes),
          input.is_active === false ? 0 : 1,
        ],
      );
      const id = Number(result.insertId);
      const sku = input.sku?.trim() || padCode("MAT", id);
      if (!input.sku)
        await connection.execute("UPDATE materials SET sku = ? WHERE id = ?", [
          sku,
          id,
        ]);
      await this.audit(
        connection,
        actor,
        "material.create",
        "material",
        id,
        sku,
        `Material ${sku} dibuat.`,
        undefined,
        { name: input.name, category_id: input.category_id },
      );
      await connection.commit();
      return { id, sku };
    } catch (error) {
      await connection.rollback();
      throw this.duplicate(error);
    } finally {
      connection.release();
    }
  }

  async updateMaterial(
    id: number,
    input: Partial<MaterialInput>,
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        "SELECT * FROM materials WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE",
        [id, actor.businessUnitId],
      );
      if (!rows.length) throw new NotFoundError("Material tidak ditemukan.");
      const previous = rows[0];
      if (input.category_id !== undefined)
        await this.assertCategory(
          connection,
          input.category_id,
          actor.businessUnitId,
        );
      if (input.base_unit_id !== undefined)
        await this.assertUnit(connection, input.base_unit_id);
      if (input.preferred_supplier_id !== undefined)
        await this.assertSupplier(
          connection,
          input.preferred_supplier_id,
          actor.organizationId,
        );
      if (
        input.sku !== undefined &&
        input.sku !== null &&
        input.sku.trim() !== previous.sku
      ) {
        const [duplicates]: any = await connection.execute(
          "SELECT id FROM materials WHERE business_unit_id = ? AND sku = ? AND id <> ? LIMIT 1",
          [actor.businessUnitId, input.sku.trim(), id],
        );
        if (duplicates.length)
          throw new AppError(
            409,
            "MATERIAL_SKU_EXISTS",
            "SKU material tersebut sudah digunakan.",
          );
      }
      const columns: Array<[string, unknown]> = [];
      const accepted: Record<string, string> = {
        category_id: "category_id",
        sku: "sku",
        name: "name",
        brand: "brand",
        material_type: "material_type",
        color_name: "color_name",
        color_hex: "color_hex",
        base_unit_id: "base_unit_id",
        default_unit_cost: "default_unit_cost",
        low_stock_threshold: "low_stock_threshold",
        reorder_qty: "reorder_qty",
        preferred_supplier_id: "preferred_supplier_id",
        notes: "notes",
        is_active: "is_active",
      };
      for (const [key, column] of Object.entries(accepted)) {
        if ((input as any)[key] === undefined) continue;
        let next = (input as any)[key];
        if (
          [
            "sku",
            "name",
            "brand",
            "material_type",
            "color_name",
            "notes",
          ].includes(key)
        )
          next = typeof next === "string" ? optional(next) : next;
        if (key === "name" && !next)
          throw new AppError(
            400,
            "VALIDATION_ERROR",
            "Nama material wajib diisi.",
          );
        if (key === "color_hex" && next) next = String(next).toUpperCase();
        if (key === "is_active") next = next ? 1 : 0;
        columns.push([column, next]);
      }
      if (!columns.length) return this.getMaterialDetail(id, actor);
      await connection.execute(
        `UPDATE materials SET ${columns.map(([column]) => `${column} = ?`).join(", ")} WHERE id = ?`,
        [...columns.map(([, next]) => next), id] as any[],
      );
      await this.audit(
        connection,
        actor,
        "material.update",
        "material",
        id,
        previous.sku,
        `Material ${previous.sku} diperbarui.`,
        previous,
        input,
      );
      await connection.commit();
      return this.getMaterialDetail(id, actor);
    } catch (error) {
      await connection.rollback();
      throw this.duplicate(error);
    } finally {
      connection.release();
    }
  }

  async archiveMaterial(id: number, actor: MaterialActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        "SELECT sku, is_active FROM materials WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL FOR UPDATE",
        [id, actor.businessUnitId],
      );
      if (!rows.length) throw new NotFoundError("Material tidak ditemukan.");
      await connection.execute(
        "UPDATE materials SET is_active = 0, deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
        [id],
      );
      await this.audit(
        connection,
        actor,
        "material.archive",
        "material",
        id,
        rows[0].sku,
        `Material ${rows[0].sku} diarsipkan.`,
        { is_active: rows[0].is_active },
        { is_active: false },
      );
      await connection.commit();
      return { message: "Material diarsipkan." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async reactivateMaterial(id: number, actor: MaterialActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        "SELECT sku FROM materials WHERE id = ? AND business_unit_id = ? FOR UPDATE",
        [id, actor.businessUnitId],
      );
      if (!rows.length) throw new NotFoundError("Material tidak ditemukan.");
      await connection.execute(
        "UPDATE materials SET is_active = 1, deleted_at = NULL WHERE id = ?",
        [id],
      );
      await this.audit(
        connection,
        actor,
        "material.reactivate",
        "material",
        id,
        rows[0].sku,
        `Material ${rows[0].sku} diaktifkan kembali.`,
      );
      await connection.commit();
      return { message: "Material diaktifkan kembali." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createCategory(
    input: {
      code?: string | null;
      name: string;
      category_type: string;
      is_active?: boolean;
    },
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const requestedCode = input.code?.trim().toUpperCase();
      if (requestedCode) {
        const [duplicates]: any = await connection.execute(
          "SELECT id FROM material_categories WHERE business_unit_id = ? AND code = ? LIMIT 1",
          [actor.businessUnitId, requestedCode],
        );
        if (duplicates.length)
          throw new AppError(
            409,
            "MATERIAL_CATEGORY_CODE_EXISTS",
            "Kode kategori sudah digunakan.",
          );
      }
      const [result]: any = await connection.execute(
        "INSERT INTO material_categories (business_unit_id, code, name, category_type, is_active) VALUES (?, ?, ?, ?, ?)",
        [
          actor.businessUnitId,
          requestedCode || `TMP-${randomUUID()}`,
          input.name.trim(),
          input.category_type,
          input.is_active === false ? 0 : 1,
        ],
      );
      const id = Number(result.insertId);
      const code = requestedCode || padCode("MATCAT", id);
      if (!requestedCode)
        await connection.execute(
          "UPDATE material_categories SET code = ? WHERE id = ?",
          [code, id],
        );
      await this.audit(
        connection,
        actor,
        "material.category_create",
        "material_category",
        id,
        code,
        `Kategori ${code} dibuat.`,
      );
      await connection.commit();
      return { id, code };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCategory(
    id: number,
    input: { code?: string | null; name?: string; is_active?: boolean },
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        "SELECT * FROM material_categories WHERE id = ? AND business_unit_id = ? FOR UPDATE",
        [id, actor.businessUnitId],
      );
      if (!rows.length)
        throw new NotFoundError("Kategori material tidak ditemukan.");
      const previous = rows[0];
      if (input.code && input.code.trim().toUpperCase() !== previous.code) {
        const [duplicates]: any = await connection.execute(
          "SELECT id FROM material_categories WHERE business_unit_id = ? AND code = ? AND id <> ? LIMIT 1",
          [actor.businessUnitId, input.code.trim().toUpperCase(), id],
        );
        if (duplicates.length)
          throw new AppError(
            409,
            "MATERIAL_CATEGORY_CODE_EXISTS",
            "Kode kategori sudah digunakan.",
          );
      }
      const fields: Array<[string, unknown]> = [];
      if (input.code !== undefined)
        fields.push(["code", input.code?.trim().toUpperCase()]);
      if (input.name !== undefined) fields.push(["name", input.name.trim()]);
      if (input.is_active !== undefined)
        fields.push(["is_active", input.is_active ? 1 : 0]);
      if (fields.length)
        await connection.execute(
          `UPDATE material_categories SET ${fields.map(([name]) => `${name} = ?`).join(", ")} WHERE id = ?`,
          [...fields.map(([, next]) => next), id] as any[],
        );
      await this.audit(
        connection,
        actor,
        "material.category_update",
        "material_category",
        id,
        previous.code,
        `Kategori ${previous.code} diperbarui.`,
        previous,
        input,
      );
      await connection.commit();
      return { id, message: "Kategori diperbarui." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async lockedBatch(
    connection: DbConnection,
    materialId: number,
    batchId: number,
    businessUnitId: number,
  ) {
    const [rows]: any = await connection.execute(
      `SELECT mb.*, m.id AS material_id, m.sku AS material_sku, m.name AS material_name, m.base_unit_id,
              mc.category_type, u.code AS unit_code
         FROM material_batches mb
         JOIN materials m ON m.id = mb.material_id AND m.business_unit_id = ? AND m.deleted_at IS NULL
         JOIN material_categories mc ON mc.id = m.category_id
         JOIN units_of_measure u ON u.id = m.base_unit_id
        WHERE mb.id = ? AND mb.material_id = ? FOR UPDATE`,
      [businessUnitId, batchId, materialId],
    );
    if (!rows.length)
      throw new AppError(
        404,
        "MATERIAL_BATCH_NOT_FOUND",
        "Batch material tidak ditemukan.",
      );
    return rows[0];
  }

  async receiveStock(
    materialId: number,
    input: ReceiveStockInput,
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [materials]: any = await connection.execute(
        `SELECT m.id, m.sku, m.base_unit_id, m.default_unit_cost, mc.category_type, u.code AS unit_code
           FROM materials m JOIN material_categories mc ON mc.id = m.category_id JOIN units_of_measure u ON u.id = m.base_unit_id
          WHERE m.id = ? AND m.business_unit_id = ? AND m.deleted_at IS NULL FOR UPDATE`,
        [materialId, actor.businessUnitId],
      );
      if (!materials.length)
        throw new NotFoundError("Material tidak ditemukan.");
      const material = materials[0];
      await this.assertSupplier(
        connection,
        input.supplier_id,
        actor.organizationId,
      );
      const batchCode = input.batch_code?.trim() || `TMP-${randomUUID()}`;
      const unitCost = input.unit_cost ?? value(material.default_unit_cost);
      const [result]: any = await connection.execute(
        `INSERT INTO material_batches (material_id, batch_code, supplier_id, received_at, initial_qty, current_qty,
          unit_cost, expiry_date, location_code, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [
          materialId,
          batchCode,
          input.supplier_id ?? null,
          mysqlDate(input.received_at),
          input.quantity,
          input.quantity,
          unitCost,
          input.expiry_date || null,
          optional(input.location_code),
        ],
      );
      const batchId = Number(result.insertId);
      const finalBatchCode =
        input.batch_code?.trim() || padCode("BAT", batchId);
      if (!input.batch_code)
        await connection.execute(
          "UPDATE material_batches SET batch_code = ? WHERE id = ?",
          [finalBatchCode, batchId],
        );
      let spoolId: number | null = null;
      if (
        material.category_type === "filament" &&
        input.create_spool !== false
      ) {
        const unitCode = String(material.unit_code).toUpperCase();
        if (!["G", "KG"].includes(unitCode))
          throw new AppError(
            400,
            "SPOOL_UNIT_UNSUPPORTED",
            "Filament harus menggunakan satuan Gram atau Kilogram untuk membuat spool.",
          );
        const receivedGrams =
          unitCode === "G" ? input.quantity : input.quantity * 1000;
        const [spool]: any = await connection.execute(
          `INSERT INTO filament_spools (material_batch_id, spool_code, diameter_mm, nominal_net_weight_g, tare_weight_g,
            current_net_weight_g, storage_location, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            input.spool_code?.trim() || `TMP-${randomUUID()}`,
            input.diameter_mm ?? 1.75,
            input.nominal_net_weight_g ?? receivedGrams,
            input.tare_weight_g ?? null,
            receivedGrams,
            optional(input.storage_location) || optional(input.location_code),
            optional(input.notes),
          ],
        );
        spoolId = Number(spool.insertId);
        const spoolCode = input.spool_code?.trim() || padCode("SPL", spoolId);
        if (!input.spool_code)
          await connection.execute(
            "UPDATE filament_spools SET spool_code = ? WHERE id = ?",
            [spoolCode, spoolId],
          );
      }
      await this.insertMovement(connection, actor, {
        materialId,
        batchId,
        type: "stock_in",
        quantity: input.quantity,
        unitId: Number(material.base_unit_id),
        unitCost,
        referenceType: "material_receipt",
        referenceId: batchId,
        referenceCode: finalBatchCode,
        notes:
          input.notes?.trim() || `Penerimaan stok batch ${finalBatchCode}.`,
      });
      await this.audit(
        connection,
        actor,
        "material.stock_receive",
        "material_batch",
        batchId,
        finalBatchCode,
        `Stok ${material.sku} diterima sebanyak ${input.quantity} ${material.unit_code}.`,
        undefined,
        { material_id: materialId, spool_id: spoolId },
      );
      await this.publishStockEvent(connection, actor, materialId, "material.stock_received", null, { batch_code: finalBatchCode, quantity: input.quantity });
      await connection.commit();
      return {
        batch_id: batchId,
        batch_code: finalBatchCode,
        spool_id: spoolId,
      };
    } catch (error) {
      await connection.rollback();
      throw this.duplicate(error);
    } finally {
      connection.release();
    }
  }

  async adjustStock(
    materialId: number,
    input: StockAdjustmentInput,
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const batch = await this.lockedBatch(
        connection,
        materialId,
        input.material_batch_id,
        actor.businessUnitId,
      );
      const [beforeRows]: any = await connection.execute(
        `SELECT COALESCE(SUM(mb.current_qty),0) available_qty FROM material_batches mb
         JOIN materials m ON m.id=mb.material_id WHERE m.id=? AND m.business_unit_id=? AND mb.status_code='available'`,
        [materialId, actor.businessUnitId],
      );
      const previousAvailable = value(beforeRows[0]?.available_qty);
      const delta = input.direction === "in" ? input.quantity : -input.quantity;
      const nextQuantity = value(batch.current_qty) + delta;
      if (
        nextQuantity < -0.0001 ||
        nextQuantity + 0.0001 < value(batch.reserved_qty)
      ) {
        throw new AppError(
          409,
          "RESERVED_STOCK_PROTECTED",
          "Penyesuaian tidak boleh membuat stok fisik lebih kecil dari stok yang direservasi.",
        );
      }
      const unitCode = String(batch.unit_code).toUpperCase();
      const deltaGrams =
        unitCode === "G" ? delta : unitCode === "KG" ? delta * 1000 : null;
      if (input.spool_id) {
        if (deltaGrams === null)
          throw new AppError(
            400,
            "SPOOL_UNIT_UNSUPPORTED",
            "Spool hanya mendukung material berbasis berat.",
          );
        const [spools]: any = await connection.execute(
          "SELECT id, current_net_weight_g FROM filament_spools WHERE id = ? AND material_batch_id = ? FOR UPDATE",
          [input.spool_id, input.material_batch_id],
        );
        if (!spools.length)
          throw new AppError(
            404,
            "SPOOL_NOT_FOUND",
            "Spool tidak ditemukan pada batch ini.",
          );
        if (
          spools[0].current_net_weight_g === null ||
          value(spools[0].current_net_weight_g) + deltaGrams < -0.0001
        ) {
          throw new AppError(
            409,
            "SPOOL_STOCK_INSUFFICIENT",
            "Berat spool tidak mencukupi untuk penyesuaian ini.",
          );
        }
        await connection.execute(
          "UPDATE filament_spools SET current_net_weight_g = current_net_weight_g + ? WHERE id = ?",
          [deltaGrams, input.spool_id],
        );
      } else {
        await applyFilamentBatchQuantityDelta(
          connection,
          input.material_batch_id,
          delta,
          unitCode,
        );
      }
      await connection.execute(
        "UPDATE material_batches SET current_qty = ? WHERE id = ?",
        [Math.max(0, nextQuantity), input.material_batch_id],
      );
      const movementType =
        input.direction === "in" ? "adjustment_in" : "adjustment_out";
      await this.insertMovement(connection, actor, {
        materialId,
        batchId: input.material_batch_id,
        type: movementType,
        quantity: input.quantity,
        unitId: Number(batch.base_unit_id),
        unitCost: value(batch.unit_cost),
        referenceType: "material_adjustment",
        referenceId: input.material_batch_id,
        referenceCode: batch.batch_code,
        notes: input.notes,
      });
      await this.audit(
        connection,
        actor,
        `material.stock_adjust_${input.direction}`,
        "material_batch",
        input.material_batch_id,
        batch.batch_code,
        `Stok ${batch.material_sku} disesuaikan ${input.direction === "in" ? "masuk" : "keluar"} ${input.quantity} ${batch.unit_code}.`,
      );
      await this.publishStockEvent(connection, actor, materialId, "material.stock_changed", previousAvailable, { direction: input.direction, quantity: input.quantity });
      await connection.commit();
      return { message: "Penyesuaian stok berhasil dicatat." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateSpool(
    spoolId: number,
    input: SpoolUpdateInput,
    actor: MaterialActor,
  ) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute(
        `SELECT fs.*, mb.material_id, mb.batch_code, mb.unit_cost, m.sku AS material_sku, m.base_unit_id, u.code AS unit_code
           FROM filament_spools fs JOIN material_batches mb ON mb.id = fs.material_batch_id
           JOIN materials m ON m.id = mb.material_id AND m.business_unit_id = ? JOIN units_of_measure u ON u.id = m.base_unit_id
          WHERE fs.id = ? FOR UPDATE`,
        [actor.businessUnitId, spoolId],
      );
      if (!rows.length)
        throw new NotFoundError("Spool filament tidak ditemukan.");
      const spool = rows[0];
      let weightChange: { deltaQuantity: number; currentQty: number } | null =
        null;
      if (
        input.current_net_weight_g !== undefined &&
        input.current_net_weight_g !== null
      ) {
        weightChange = await changeSpoolWeight(
          connection,
          spoolId,
          input.current_net_weight_g,
          actor.businessUnitId,
        );
        if (Math.abs(weightChange.deltaQuantity) > 0.00001) {
          await this.insertMovement(connection, actor, {
            materialId: Number(spool.material_id),
            batchId: Number(spool.material_batch_id),
            type:
              weightChange.deltaQuantity > 0
                ? "adjustment_in"
                : "adjustment_out",
            quantity: Math.abs(weightChange.deltaQuantity),
            unitId: Number(spool.base_unit_id),
            unitCost: value(spool.unit_cost),
            referenceType: "spool_reweigh",
            referenceId: spoolId,
            referenceCode: spool.spool_code,
            notes: "Penimbangan ulang spool fisik.",
          });
        }
      }
      const fields: Array<[string, unknown]> = [];
      if (input.storage_location !== undefined)
        fields.push(["storage_location", optional(input.storage_location)]);
      if (input.notes !== undefined)
        fields.push(["notes", optional(input.notes)]);
      if (input.opened) fields.push(["opened_at", new Date()]);
      if (input.dried) fields.push(["dried_at", new Date()]);
      if (fields.length)
        await connection.execute(
          `UPDATE filament_spools SET ${fields.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`,
          [...fields.map(([, next]) => next), spoolId] as any[],
        );
      const action =
        input.current_net_weight_g !== undefined
          ? "material.spool_weight_update"
          : input.storage_location !== undefined
            ? "material.spool_location_update"
            : input.opened
              ? "material.spool_open"
              : "material.spool_dry";
      await this.audit(
        connection,
        actor,
        action,
        "filament_spool",
        spoolId,
        spool.spool_code,
        `Spool ${spool.spool_code} diperbarui.`,
        undefined,
        { ...input, batch_current_qty: weightChange?.currentQty },
      );
      await connection.commit();
      return { message: "Spool diperbarui." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordWaste(input: WasteInput, actor: MaterialActor) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const batch = await this.lockedBatch(
        connection,
        input.material_id,
        input.material_batch_id,
        actor.businessUnitId,
      );
      const [beforeRows]: any = await connection.execute(
        `SELECT COALESCE(SUM(mb.current_qty),0) available_qty FROM material_batches mb
         JOIN materials m ON m.id=mb.material_id WHERE m.id=? AND m.business_unit_id=? AND mb.status_code='available'`,
        [input.material_id, actor.businessUnitId],
      );
      const previousAvailable = value(beforeRows[0]?.available_qty);
      const nextQuantity = value(batch.current_qty) - input.quantity;
      if (
        nextQuantity < -0.0001 ||
        nextQuantity + 0.0001 < value(batch.reserved_qty)
      ) {
        throw new AppError(
          409,
          "RESERVED_STOCK_PROTECTED",
          "Limbah tidak boleh membuat stok fisik lebih kecil dari stok yang direservasi.",
        );
      }
      await connection.execute(
        "UPDATE material_batches SET current_qty = ? WHERE id = ?",
        [Math.max(0, nextQuantity), input.material_batch_id],
      );
      await applyFilamentBatchQuantityDelta(
        connection,
        input.material_batch_id,
        -input.quantity,
        String(batch.unit_code),
      );
      const [result]: any = await connection.execute(
        `INSERT INTO material_waste (material_id, material_batch_id, quantity, unit_id, waste_reason, notes, occurred_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), ?)`,
        [
          input.material_id,
          input.material_batch_id,
          input.quantity,
          batch.base_unit_id,
          input.waste_reason,
          optional(input.notes),
          actor.id,
        ],
      );
      const wasteId = Number(result.insertId);
      await this.insertMovement(connection, actor, {
        materialId: input.material_id,
        batchId: input.material_batch_id,
        type: "waste",
        quantity: input.quantity,
        unitId: Number(batch.base_unit_id),
        unitCost: value(batch.unit_cost),
        referenceType: "material_waste",
        referenceId: wasteId,
        referenceCode: batch.batch_code,
        notes: input.notes?.trim() || `Limbah material: ${input.waste_reason}.`,
      });
      await this.audit(
        connection,
        actor,
        "material.waste_manual",
        "material_waste",
        wasteId,
        batch.batch_code,
        `Limbah ${batch.material_sku} dicatat sebanyak ${input.quantity} ${batch.unit_code}.`,
        undefined,
        { waste_reason: input.waste_reason },
      );
      await this.publishStockEvent(connection, actor, input.material_id, "material.waste_recorded", previousAvailable, { quantity: input.quantity, waste_reason: input.waste_reason });
      await connection.commit();
      return { id: wasteId, message: "Limbah material berhasil dicatat." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
