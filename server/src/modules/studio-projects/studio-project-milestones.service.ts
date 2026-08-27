import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { toSqlDateTime } from './studio-projects.helpers';
import { StudioProjectsRepository } from './studio-projects.repository';
import { assertProjectMutable, loadProjectForUpdate, projectRef, publishProjectEvent, withTransaction, writeProjectAudit } from './studio-projects.shared';
import type { MilestoneBoardFilters } from './studio-projects.types';

interface MilestoneInput {
  title: string;
  description?: string | null;
  due_at?: string | null;
  sort_order?: number;
}

type MilestoneTargetStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Allowed milestone transitions. `late` is never written — lateness is derived
 * from `due_at` on read so a page load has no side effects.
 */
const MILESTONE_TRANSITIONS: Record<string, MilestoneTargetStatus[]> = {
  pending: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  late: ['in_progress', 'completed', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['pending'],
};

export class StudioProjectMilestonesService {
  private repository = new StudioProjectsRepository();

  async insertMilestone(connection: PoolConnection, projectId: number, input: MilestoneInput, sortOrder: number) {
    const [result]: any = await connection.execute(
      `INSERT INTO project_milestones (project_id, title, description, due_at, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, input.title.trim(), input.description || null, toSqlDateTime(input.due_at), input.sort_order ?? sortOrder],
    );
    return Number(result.insertId);
  }

  private async nextSortOrder(connection: PoolConnection, projectId: number) {
    const [rows]: any = await connection.execute(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM project_milestones WHERE project_id = ?`,
      [projectId],
    );
    return Number(rows[0].next);
  }

  private async loadMilestone(connection: PoolConnection, projectId: number, milestoneId: number) {
    const [rows]: any = await connection.execute(
      `SELECT * FROM project_milestones WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
      [milestoneId, projectId],
    );
    if (!rows.length) throw new NotFoundError('Tahapan proyek tidak ditemukan.');
    return rows[0];
  }

  async createMilestone(projectId: number, input: MilestoneInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const milestoneId = await this.insertMilestone(connection, projectId, input, await this.nextSortOrder(connection, projectId));

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_milestone_create', projectRef(project),
        `Menambahkan tahapan "${input.title.trim()}" pada proyek ${project.project_code}.`,
        undefined, { id: milestoneId, title: input.title, due_at: input.due_at || null },
      );
      return { id: milestoneId };
    });
  }

  async updateMilestone(projectId: number, milestoneId: number, input: Partial<MilestoneInput>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadMilestone(connection, projectId, milestoneId);

      const next = {
        title: input.title === undefined ? current.title : input.title.trim(),
        description: input.description === undefined ? current.description : (input.description || null),
        due_at: input.due_at === undefined ? current.due_at : toSqlDateTime(input.due_at),
        sort_order: input.sort_order === undefined ? current.sort_order : input.sort_order,
      };
      await connection.execute(
        `UPDATE project_milestones SET title = ?, description = ?, due_at = ?, sort_order = ? WHERE id = ? AND project_id = ?`,
        [next.title, next.description, next.due_at, next.sort_order, milestoneId, projectId],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_milestone_update', projectRef(project),
        `Memperbarui tahapan "${next.title}" pada proyek ${project.project_code}.`,
        { title: current.title, due_at: current.due_at }, { title: next.title, due_at: next.due_at },
      );
      return { id: milestoneId };
    });
  }

  /**
   * Completing stamps `completed_at`; reopening a completed milestone clears it
   * and requires a reason so the rework is traceable.
   */
  async changeStatus(projectId: number, milestoneId: number, status: MilestoneTargetStatus, reason: string | null, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadMilestone(connection, projectId, milestoneId);

      if (current.status_code === status) {
        throw new AppError(409, 'MILESTONE_STATUS_UNCHANGED', 'Tahapan sudah berada pada status tersebut.');
      }
      const allowed = MILESTONE_TRANSITIONS[current.status_code] || [];
      if (!allowed.includes(status)) {
        throw new AppError(409, 'INVALID_MILESTONE_TRANSITION', `Tahapan tidak dapat berpindah dari "${current.status_code}" ke "${status}".`);
      }
      if (current.status_code === 'completed' && status === 'in_progress' && !reason?.trim()) {
        throw new AppError(400, 'MILESTONE_REASON_REQUIRED', 'Alasan wajib diisi saat membuka kembali tahapan yang sudah selesai.');
      }

      const completedClause = status === 'completed' ? 'UTC_TIMESTAMP(3)' : 'NULL';
      await connection.execute(
        `UPDATE project_milestones SET status_code = ?, completed_at = ${completedClause} WHERE id = ? AND project_id = ?`,
        [status, milestoneId, projectId],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_milestone_status', projectRef(project),
        `Tahapan "${current.title}" pada proyek ${project.project_code}: ${current.status_code} → ${status}.`,
        { status_code: current.status_code }, { status_code: status, reason: reason || null },
      );
      if (status === 'completed') {
        await publishProjectEvent(connection, studio, 'studio.milestone.completed', projectRef(project), userId, {
          project: { id: Number(project.id), project_code: project.project_code, status_code: project.status_code },
          milestone: { id: milestoneId, title: current.title, due_at: current.due_at },
        });
      }
      return { id: milestoneId, status_code: status };
    });
  }

  /** Reorders using the existing `sort_order` column — no extra schema, no drag library needed. */
  async reorder(projectId: number, milestoneIds: number[], userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);

      const [rows]: any = await connection.execute(
        `SELECT id FROM project_milestones WHERE project_id = ? ORDER BY sort_order ASC, id ASC FOR UPDATE`,
        [projectId],
      );
      const existing = (rows as any[]).map(row => Number(row.id));
      const requested = [...new Set(milestoneIds)];
      if (requested.length !== existing.length || requested.some(id => !existing.includes(id))) {
        throw new AppError(400, 'INVALID_MILESTONE_ORDER', 'Urutan tahapan harus memuat seluruh tahapan proyek ini tepat satu kali.');
      }

      for (let index = 0; index < requested.length; index += 1) {
        await connection.execute(`UPDATE project_milestones SET sort_order = ? WHERE id = ? AND project_id = ?`, [index, requested[index], projectId]);
      }
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_milestone_reorder', projectRef(project),
        `Mengurutkan ulang tahapan proyek ${project.project_code}.`, { order: existing }, { order: requested },
      );
      return { order: requested };
    });
  }

  /** Only untouched milestones may be destroyed; anything with history is cancelled instead. */
  async deleteMilestone(projectId: number, milestoneId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const current = await this.loadMilestone(connection, projectId, milestoneId);

      if (current.status_code !== 'pending' || current.completed_at) {
        throw new AppError(409, 'MILESTONE_NOT_DELETABLE', 'Hanya tahapan berstatus "Menunggu" yang dapat dihapus. Gunakan status "Dibatalkan" untuk menjaga riwayat.');
      }
      const [deliverables]: any = await connection.execute(
        `SELECT COUNT(*) AS count FROM project_deliverables WHERE milestone_id = ?`,
        [milestoneId],
      );
      if (Number(deliverables[0].count) > 0) {
        throw new AppError(409, 'MILESTONE_HAS_DELIVERABLES', 'Tahapan ini masih memiliki deliverable terkait. Lepaskan deliverable terlebih dahulu.');
      }

      await connection.execute(`DELETE FROM project_milestones WHERE id = ? AND project_id = ?`, [milestoneId, projectId]);
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_milestone_delete', projectRef(project),
        `Menghapus tahapan "${current.title}" dari proyek ${project.project_code}.`, { id: milestoneId, title: current.title },
      );
      return { id: milestoneId };
    });
  }

  list(projectId: number) {
    return this.repository.getMilestones(projectId);
  }

  /** Cross-project board grouped into the operational buckets the page renders. */
  async board(filters: MilestoneBoardFilters, studio: BusinessUnitContext) {
    const rows = await this.repository.getMilestoneBoard(filters, studio.id);
    const open = (row: any) => !['completed', 'cancelled'].includes(row.status_code);
    return {
      items: rows,
      groups: {
        overdue: rows.filter(row => row.is_overdue),
        due_soon: rows.filter(row => !row.is_overdue && row.is_due_soon && open(row)),
        in_progress: rows.filter(row => row.status_code === 'in_progress' && !row.is_overdue && !row.is_due_soon),
        upcoming: rows.filter(row => open(row) && !row.is_overdue && !row.is_due_soon && row.status_code !== 'in_progress'),
        completed: rows.filter(row => row.status_code === 'completed'),
      },
    };
  }
}

export const studioProjectMilestonesService = new StudioProjectMilestonesService();
