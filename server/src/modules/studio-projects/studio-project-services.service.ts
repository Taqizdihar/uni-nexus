import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { roundMoney, toNumber } from './studio-projects.helpers';
import { StudioProjectsRepository } from './studio-projects.repository';
import { studioProjectCommercialService } from './studio-project-commercial.service';
import { assertProjectMutable, loadProjectForUpdate, projectRef, withTransaction, writeProjectAudit } from './studio-projects.shared';

interface ServiceLineInput {
  service_id?: number | null;
  package_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
}

/**
 * Project scope lines in `studio_project_services`.
 *
 * A line may point at a catalog service, a package, or neither — Studio can sell
 * work before the Services catalog exists. Prices are a historical snapshot: they
 * are copied in at the moment of selection and never re-read from the catalog.
 */
export class StudioProjectServicesService {
  private repository = new StudioProjectsRepository();

  /** Validates catalog references belong to Studio and are still active. */
  async assertReferences(connection: PoolConnection, input: { service_id?: number | null; package_id?: number | null }, studio: BusinessUnitContext) {
    if (input.service_id) {
      const [rows]: any = await connection.execute(
        `SELECT id FROM studio_services WHERE id = ? AND business_unit_id = ? AND is_active = 1 LIMIT 1`,
        [input.service_id, studio.id],
      );
      if (!rows.length) throw new AppError(400, 'INVALID_SERVICE', 'Layanan Studio tidak ditemukan atau tidak aktif.');
    }
    if (input.package_id) {
      const [rows]: any = await connection.execute(
        `SELECT id FROM service_packages WHERE id = ? AND business_unit_id = ? AND is_active = 1 LIMIT 1`,
        [input.package_id, studio.id],
      );
      if (!rows.length) throw new AppError(400, 'INVALID_SERVICE_PACKAGE', 'Paket layanan tidak ditemukan atau tidak aktif.');
    }
  }

  /** line_total is always recomputed on the server; the client value is ignored. */
  async insertLine(connection: PoolConnection, projectId: number, input: ServiceLineInput, studio: BusinessUnitContext) {
    await this.assertReferences(connection, input, studio);
    const quantity = Number(input.quantity);
    const unitPrice = Number(input.unit_price);
    if (!(quantity > 0)) throw new AppError(400, 'INVALID_QUANTITY', 'Jumlah layanan harus lebih besar dari 0.');
    if (unitPrice < 0) throw new AppError(400, 'INVALID_UNIT_PRICE', 'Harga satuan layanan tidak boleh negatif.');

    const lineTotal = roundMoney(quantity * unitPrice);
    const [result]: any = await connection.execute(
      `INSERT INTO studio_project_services (project_id, service_id, package_id, description, quantity, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, input.service_id || null, input.package_id || null, input.description.trim(), quantity, unitPrice, lineTotal],
    );
    return { id: Number(result.insertId), line_total: lineTotal };
  }

  async getSubtotal(connection: PoolConnection, projectId: number) {
    const [rows]: any = await connection.execute(
      `SELECT COALESCE(SUM(line_total), 0) AS subtotal FROM studio_project_services WHERE project_id = ?`,
      [projectId],
    );
    return roundMoney(toNumber(rows[0]?.subtotal));
  }

  async addService(projectId: number, input: ServiceLineInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);

      const line = await this.insertLine(connection, projectId, input, studio);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_service_add', projectRef(project),
        `Menambahkan layanan "${input.description.trim()}" pada proyek ${project.project_code}.`,
        undefined, { id: line.id, description: input.description, quantity: input.quantity, unit_price: input.unit_price, line_total: line.line_total },
      );
      return { id: line.id, subtotal: await this.getSubtotal(connection, projectId) };
    });
  }

  async updateService(projectId: number, lineId: number, input: Partial<ServiceLineInput>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);

      const [rows]: any = await connection.execute(
        `SELECT * FROM studio_project_services WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
        [lineId, projectId],
      );
      if (!rows.length) throw new NotFoundError('Baris layanan proyek tidak ditemukan.');
      const current = rows[0];

      const next = {
        service_id: input.service_id === undefined ? current.service_id : (input.service_id || null),
        package_id: input.package_id === undefined ? current.package_id : (input.package_id || null),
        description: input.description === undefined ? current.description : input.description.trim(),
        quantity: input.quantity === undefined ? toNumber(current.quantity) : Number(input.quantity),
        unit_price: input.unit_price === undefined ? toNumber(current.unit_price) : Number(input.unit_price),
      };
      if (!(next.quantity > 0)) throw new AppError(400, 'INVALID_QUANTITY', 'Jumlah layanan harus lebih besar dari 0.');
      if (next.unit_price < 0) throw new AppError(400, 'INVALID_UNIT_PRICE', 'Harga satuan layanan tidak boleh negatif.');
      await this.assertReferences(connection, next, studio);

      const lineTotal = roundMoney(next.quantity * next.unit_price);
      await connection.execute(
        `UPDATE studio_project_services SET service_id = ?, package_id = ?, description = ?, quantity = ?, unit_price = ?, line_total = ?
         WHERE id = ? AND project_id = ?`,
        [next.service_id, next.package_id, next.description, next.quantity, next.unit_price, lineTotal, lineId, projectId],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_service_update', projectRef(project),
        `Memperbarui layanan "${next.description}" pada proyek ${project.project_code}.`,
        { description: current.description, quantity: toNumber(current.quantity), unit_price: toNumber(current.unit_price), line_total: toNumber(current.line_total) },
        { ...next, line_total: lineTotal },
      );
      return { id: lineId, subtotal: await this.getSubtotal(connection, projectId) };
    });
  }

  async removeService(projectId: number, lineId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);

      const [rows]: any = await connection.execute(
        `SELECT * FROM studio_project_services WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
        [lineId, projectId],
      );
      if (!rows.length) throw new NotFoundError('Baris layanan proyek tidak ditemukan.');

      await connection.execute(`DELETE FROM studio_project_services WHERE id = ? AND project_id = ?`, [lineId, projectId]);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_service_remove', projectRef(project),
        `Menghapus layanan "${rows[0].description}" dari proyek ${project.project_code}.`,
        { description: rows[0].description, quantity: toNumber(rows[0].quantity), unit_price: toNumber(rows[0].unit_price), line_total: toNumber(rows[0].line_total) },
      );
      return { id: lineId, subtotal: await this.getSubtotal(connection, projectId) };
    });
  }

  /**
   * Explicit opt-in realignment of the negotiated contract value with the scope
   * subtotal. Editing scope lines never does this silently.
   */
  async syncContractValue(projectId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      await studioProjectCommercialService.assertCommercialUnlocked(connection, projectId, studio.organizationId);

      const subtotal = await this.getSubtotal(connection, projectId);
      await connection.execute(`UPDATE studio_projects SET contract_value = ? WHERE id = ?`, [subtotal, projectId]);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_update', projectRef(project),
        `Menyamakan nilai kontrak proyek ${project.project_code} dengan subtotal layanan.`,
        { contract_value: toNumber(project.contract_value) }, { contract_value: subtotal },
      );
      return { contract_value: subtotal };
    });
  }

  list(projectId: number) {
    return this.repository.getServices(projectId);
  }
}

export const studioProjectServicesService = new StudioProjectServicesService();
