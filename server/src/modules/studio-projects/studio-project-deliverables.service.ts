import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { displayNameFromKey, storageService } from '../../shared/storage';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { assertSafeExternalUrl, displayFileName, toSqlDateTime } from './studio-projects.helpers';
import { StudioProjectsRepository } from './studio-projects.repository';
import { assertProjectMutable, loadProjectForUpdate, projectRef, publishProjectEvent, withTransaction, writeProjectAudit } from './studio-projects.shared';
import type { DeliverableStatus } from './studio-projects.types';

interface DeliverableInput {
  milestone_id?: number | null;
  title: string;
  description?: string | null;
  due_at?: string | null;
  external_url?: string | null;
}

const DELIVERABLE_TRANSITIONS: Record<string, DeliverableStatus[]> = {
  pending: ['submitted'],
  submitted: ['revision', 'approved'],
  revision: ['submitted'],
  approved: ['delivered', 'revision'],
  delivered: ['revision'],
};

export class StudioProjectDeliverablesService {
  private repository = new StudioProjectsRepository();

  /** A deliverable may only reference a milestone belonging to the same project. */
  async assertMilestoneOwnership(connection: PoolConnection, projectId: number, milestoneId?: number | null) {
    if (!milestoneId) return null;
    const [rows]: any = await connection.execute(
      `SELECT id FROM project_milestones WHERE id = ? AND project_id = ? LIMIT 1`,
      [milestoneId, projectId],
    );
    if (!rows.length) {
      throw new AppError(400, 'MILESTONE_PROJECT_MISMATCH', 'Tahapan yang dipilih bukan milik proyek ini.');
    }
    return Number(milestoneId);
  }

  async insertDeliverable(connection: PoolConnection, projectId: number, input: DeliverableInput) {
    const milestoneId = await this.assertMilestoneOwnership(connection, projectId, input.milestone_id);
    const [result]: any = await connection.execute(
      `INSERT INTO project_deliverables (project_id, milestone_id, title, description, due_at, external_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, milestoneId, input.title.trim(), input.description || null, toSqlDateTime(input.due_at), assertSafeExternalUrl(input.external_url)],
    );
    return Number(result.insertId);
  }

  private async loadDeliverable(connection: PoolConnection, projectId: number, deliverableId: number) {
    const [rows]: any = await connection.execute(
      `SELECT * FROM project_deliverables WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
      [deliverableId, projectId],
    );
    if (!rows.length) throw new NotFoundError('Deliverable proyek tidak ditemukan.');
    return rows[0];
  }

  async createDeliverable(projectId: number, input: DeliverableInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const deliverableId = await this.insertDeliverable(connection, projectId, input);

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_deliverable_create', projectRef(project),
        `Menambahkan deliverable "${input.title.trim()}" pada proyek ${project.project_code}.`,
        undefined, { id: deliverableId, title: input.title, milestone_id: input.milestone_id || null },
      );
      return { id: deliverableId };
    });
  }

  async updateDeliverable(projectId: number, deliverableId: number, input: Partial<DeliverableInput>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadDeliverable(connection, projectId, deliverableId);

      const milestoneId = input.milestone_id === undefined
        ? current.milestone_id
        : await this.assertMilestoneOwnership(connection, projectId, input.milestone_id);
      const next = {
        milestone_id: milestoneId,
        title: input.title === undefined ? current.title : input.title.trim(),
        description: input.description === undefined ? current.description : (input.description || null),
        due_at: input.due_at === undefined ? current.due_at : toSqlDateTime(input.due_at),
        external_url: input.external_url === undefined ? current.external_url : assertSafeExternalUrl(input.external_url),
      };

      await connection.execute(
        `UPDATE project_deliverables SET milestone_id = ?, title = ?, description = ?, due_at = ?, external_url = ?
         WHERE id = ? AND project_id = ?`,
        [next.milestone_id, next.title, next.description, next.due_at, next.external_url, deliverableId, projectId],
      );
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_deliverable_update', projectRef(project),
        `Memperbarui deliverable "${next.title}" pada proyek ${project.project_code}.`,
        { title: current.title, external_url: current.external_url }, { title: next.title, external_url: next.external_url },
      );
      return { id: deliverableId };
    });
  }

  async changeStatus(projectId: number, deliverableId: number, status: DeliverableStatus, reason: string | null, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadDeliverable(connection, projectId, deliverableId);

      if (current.status_code === status) {
        throw new AppError(409, 'DELIVERABLE_STATUS_UNCHANGED', 'Deliverable sudah berada pada status tersebut.');
      }
      const allowed = DELIVERABLE_TRANSITIONS[current.status_code] || [];
      if (!allowed.includes(status)) {
        throw new AppError(409, 'INVALID_DELIVERABLE_TRANSITION', `Deliverable tidak dapat berpindah dari "${current.status_code}" ke "${status}".`);
      }
      if (status === 'submitted' && !current.storage_path && !current.external_url) {
        throw new AppError(409, 'DELIVERABLE_EMPTY', 'Unggah file atau isi tautan hasil kerja sebelum mengirim deliverable untuk ditinjau.');
      }

      // delivered_at is stamped on handover and cleared when the work is reopened.
      const deliveredClause = status === 'delivered' ? 'UTC_TIMESTAMP(3)' : status === 'revision' ? 'NULL' : 'delivered_at';
      await connection.execute(
        `UPDATE project_deliverables SET status_code = ?, delivered_at = ${deliveredClause} WHERE id = ? AND project_id = ?`,
        [status, deliverableId, projectId],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_deliverable_status', projectRef(project),
        `Deliverable "${current.title}" pada proyek ${project.project_code}: ${current.status_code} → ${status}.`,
        { status_code: current.status_code }, { status_code: status, reason: reason || null },
      );
      if (status === 'submitted' || status === 'delivered') {
        await publishProjectEvent(connection, studio, `studio.deliverable.${status}`, projectRef(project), userId, {
          project: { id: Number(project.id), project_code: project.project_code, status_code: project.status_code },
          deliverable: { id: deliverableId, title: current.title, milestone_id: current.milestone_id },
        });
      }
      return { id: deliverableId, status_code: status };
    });
  }

  /**
   * Attaches an uploaded file. The database row is updated first; the previous
   * file is only removed once that succeeded, and a failed update removes the
   * freshly uploaded orphan instead.
   */
  async attachFile(projectId: number, deliverableId: number, file: Express.Multer.File, userId: number, studio: BusinessUnitContext) {
    const [targetRows]: any = await pool.execute(
      `SELECT pd.id FROM project_deliverables pd JOIN studio_projects p ON p.id = pd.project_id
       WHERE pd.id = ? AND pd.project_id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL LIMIT 1`,
      [deliverableId, projectId, studio.id],
    );
    if (!targetRows.length) throw new NotFoundError('Deliverable proyek tidak ditemukan.');
    const saved = await storageService.saveUploadedFile('project_deliverable', file, { projectId });
    const newRelativePath = saved.key;
    let previousPath: string | null = null;
    try {
      const result = await withTransaction(async connection => {
        const project = await loadProjectForUpdate(connection, projectId, studio);
        assertProjectMutable(project);
        const current = await this.loadDeliverable(connection, projectId, deliverableId);
        previousPath = current.storage_path;

        await connection.execute(
          `UPDATE project_deliverables SET storage_path = ? WHERE id = ? AND project_id = ?`,
          [newRelativePath, deliverableId, projectId],
        );
        await writeProjectAudit(
          connection, studio, userId, 'studio.project_deliverable_upload', projectRef(project),
          `Mengunggah file untuk deliverable "${current.title}" pada proyek ${project.project_code}.`,
          { storage_path: current.storage_path }, { storage_path: newRelativePath },
        );
        return { id: deliverableId, file_name: saved.original_name };
      });

      if (previousPath && previousPath !== newRelativePath) await this.removeStoredFile(previousPath);
      return result;
    } catch (error) {
      await storageService.delete(newRelativePath);
      throw error;
    }
  }

  private async removeStoredFile(storagePath: string | null) {
    if (!storagePath) return;
    await storageService.delete(storagePath);
  }

  async getDownloadTarget(projectId: number, deliverableId: number, studio: BusinessUnitContext) {
    const [rows]: any = await pool.execute(
      `SELECT pd.title, pd.storage_path
       FROM project_deliverables pd
       JOIN studio_projects p ON p.id = pd.project_id
       WHERE pd.id = ? AND pd.project_id = ? AND p.business_unit_id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [deliverableId, projectId, studio.id],
    );
    if (!rows.length) throw new NotFoundError('Deliverable proyek tidak ditemukan.');
    if (!rows[0].storage_path) throw new AppError(404, 'DELIVERABLE_FILE_MISSING', 'Deliverable ini belum memiliki file terunggah.');
    if (!await storageService.exists(rows[0].storage_path)) throw new NotFoundError('File deliverable tidak ditemukan pada penyimpanan.');
    return {
      storageKey: rows[0].storage_path,
      fileName: displayNameFromKey(rows[0].storage_path, 'deliverable'),
    };
  }

  /** Destructive delete stays limited to untouched deliverables; everything else keeps its history. */
  async deleteDeliverable(projectId: number, deliverableId: number, userId: number, studio: BusinessUnitContext) {
    let removedPath: string | null = null;
    const result = await withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadDeliverable(connection, projectId, deliverableId);

      if (current.status_code !== 'pending' || current.delivered_at) {
        throw new AppError(409, 'DELIVERABLE_NOT_DELETABLE', 'Hanya deliverable berstatus "Menunggu" yang dapat dihapus. Gunakan alur status untuk menjaga riwayat.');
      }
      removedPath = current.storage_path;

      await connection.execute(`DELETE FROM project_deliverables WHERE id = ? AND project_id = ?`, [deliverableId, projectId]);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_deliverable_update', projectRef(project),
        `Menghapus deliverable "${current.title}" dari proyek ${project.project_code}.`, { id: deliverableId, title: current.title },
      );
      return { id: deliverableId };
    });

    await this.removeStoredFile(removedPath);
    return result;
  }

  list(projectId: number) {
    return this.repository.getDeliverables(projectId);
  }
}

export const studioProjectDeliverablesService = new StudioProjectDeliverablesService();
