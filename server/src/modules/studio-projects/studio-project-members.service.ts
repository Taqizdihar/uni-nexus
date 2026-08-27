import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { StudioProjectsRepository } from './studio-projects.repository';
import { assertProjectMutable, loadProjectForUpdate, projectRef, withTransaction, writeProjectAudit } from './studio-projects.shared';

export const PROJECT_MANAGER_ROLE_LABEL = 'Project Manager';

interface MemberInput {
  user_id: number;
  role_label?: string | null;
  allocation_percent?: number | null;
}

/**
 * Internal project team, stored in `studio_project_members`.
 *
 * The table is keyed by (project_id, user_id), so membership is never inserted
 * twice — a returning member reuses their existing row and participation history
 * is preserved by clearing/setting `left_at` instead of deleting.
 */
export class StudioProjectMembersService {
  private repository = new StudioProjectsRepository();

  /** Only active, approved internal users can be assigned. */
  async assertAssignableUser(connection: PoolConnection, userId: number, organizationId: number) {
    const [rows]: any = await connection.execute(
      `SELECT id, full_name FROM users
       WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
         AND status_code = 'active' AND approval_status_code = 'approved'
       LIMIT 1`,
      [userId, organizationId],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_TEAM_MEMBER', 'Pengguna internal tidak ditemukan atau tidak aktif.');
    return rows[0];
  }

  /**
   * Inserts or revives a membership row. Returns whether the row already existed
   * so callers can audit an add versus a rejoin.
   */
  async upsertMember(connection: PoolConnection, projectId: number, input: MemberInput, options: { preserveRoleLabel?: boolean } = {}) {
    const [existing]: any = await connection.execute(
      `SELECT project_id, user_id, role_label, allocation_percent, left_at
       FROM studio_project_members WHERE project_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
      [projectId, input.user_id],
    );

    if (!existing.length) {
      await connection.execute(
        `INSERT INTO studio_project_members (project_id, user_id, role_label, allocation_percent)
         VALUES (?, ?, ?, ?)`,
        [projectId, input.user_id, input.role_label || null, input.allocation_percent ?? null],
      );
      return { created: true, rejoined: false, previous: null };
    }

    const previous = existing[0];
    const roleLabel = options.preserveRoleLabel && previous.role_label ? previous.role_label : (input.role_label ?? previous.role_label ?? null);
    const allocation = input.allocation_percent === undefined ? previous.allocation_percent : input.allocation_percent;
    await connection.execute(
      `UPDATE studio_project_members SET role_label = ?, allocation_percent = ?, left_at = NULL
       WHERE project_id = ? AND user_id = ?`,
      [roleLabel, allocation, projectId, input.user_id],
    );
    return { created: false, rejoined: previous.left_at !== null, previous };
  }

  /**
   * Keeps the canonical Project Manager present on the team without ever creating
   * a duplicate member row.
   */
  async syncProjectManager(connection: PoolConnection, projectId: number, managerUserId: number | null, organizationId: number) {
    if (!managerUserId) return;
    await this.assertAssignableUser(connection, managerUserId, organizationId);
    const [existing]: any = await connection.execute(
      `SELECT role_label FROM studio_project_members WHERE project_id = ? AND user_id = ? LIMIT 1`,
      [projectId, managerUserId],
    );
    await this.upsertMember(
      connection,
      projectId,
      { user_id: managerUserId, role_label: existing.length && existing[0].role_label ? existing[0].role_label : PROJECT_MANAGER_ROLE_LABEL },
    );
  }

  async addMember(projectId: number, input: MemberInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const member = await this.assertAssignableUser(connection, input.user_id, studio.organizationId);
      const result = await this.upsertMember(connection, projectId, input);

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_member_add', projectRef(project),
        `${result.rejoined ? 'Mengaktifkan kembali' : 'Menambahkan'} ${member.full_name} pada tim proyek ${project.project_code}.`,
        undefined, { user_id: input.user_id, role_label: input.role_label || null, allocation_percent: input.allocation_percent ?? null, rejoined: result.rejoined },
      );
      return { user_id: input.user_id, rejoined: result.rejoined };
    });
  }

  async updateMember(projectId: number, memberUserId: number, input: Omit<MemberInput, 'user_id'>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const [rows]: any = await connection.execute(
        `SELECT role_label, allocation_percent, left_at FROM studio_project_members
         WHERE project_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
        [projectId, memberUserId],
      );
      if (!rows.length) throw new NotFoundError('Anggota tim proyek tidak ditemukan.');

      const roleLabel = input.role_label === undefined ? rows[0].role_label : (input.role_label || null);
      const allocation = input.allocation_percent === undefined ? rows[0].allocation_percent : input.allocation_percent;
      await connection.execute(
        `UPDATE studio_project_members SET role_label = ?, allocation_percent = ? WHERE project_id = ? AND user_id = ?`,
        [roleLabel, allocation, projectId, memberUserId],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_member_update', projectRef(project),
        `Memperbarui peran anggota tim pada proyek ${project.project_code}.`,
        { role_label: rows[0].role_label, allocation_percent: rows[0].allocation_percent },
        { role_label: roleLabel, allocation_percent: allocation },
      );
      return { user_id: memberUserId };
    });
  }

  /** Removing a member ends their participation; the history row stays. */
  async endMembership(projectId: number, memberUserId: number, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      const [rows]: any = await connection.execute(
        `SELECT left_at FROM studio_project_members WHERE project_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
        [projectId, memberUserId],
      );
      if (!rows.length) throw new NotFoundError('Anggota tim proyek tidak ditemukan.');
      if (rows[0].left_at) throw new AppError(409, 'MEMBER_ALREADY_LEFT', 'Anggota ini sudah tidak aktif pada proyek.');
      if (Number(project.project_manager_user_id) === memberUserId) {
        throw new AppError(409, 'MEMBER_IS_MANAGER', 'Ganti Project Manager terlebih dahulu sebelum mengeluarkan pengguna ini dari tim.');
      }

      await connection.execute(
        `UPDATE studio_project_members SET left_at = UTC_TIMESTAMP(3) WHERE project_id = ? AND user_id = ?`,
        [projectId, memberUserId],
      );
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_member_leave', projectRef(project),
        `Mengakhiri keanggotaan tim pada proyek ${project.project_code}.`, undefined, { user_id: memberUserId },
      );
      return { user_id: memberUserId };
    });
  }

  list(projectId: number) {
    return this.repository.getMembers(projectId);
  }
}

export const studioProjectMembersService = new StudioProjectMembersService();
