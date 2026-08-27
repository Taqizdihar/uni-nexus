import type { PoolConnection } from 'mysql2/promise';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';
import { toSqlDate } from './studio-projects.helpers';
import { StudioProjectsRepository } from './studio-projects.repository';
import { assertProjectMutable, loadProjectForUpdate, projectRef, withTransaction, writeProjectAudit } from './studio-projects.shared';
import type { ExternalAssignmentRole } from './studio-projects.types';

interface ExternalAssignmentInput {
  party_id: number;
  assignment_role: ExternalAssignmentRole | string;
  scope_description?: string | null;
  agreed_fee?: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

/**
 * External collaborators (vendors, freelancers, partners, talent) recorded in
 * `project_external_assignments`.
 *
 * `agreed_fee` is a commercial commitment only. It is never posted as an expense,
 * never added to actual cost, and this module deliberately exposes no way to mark
 * an external party as paid — that belongs to Studio Finance.
 */
export class StudioProjectExternalService {
  private repository = new StudioProjectsRepository();

  /** External collaborators are existing Parties; identity is never duplicated. */
  private async assertExternalParty(connection: PoolConnection, partyId: number, studio: BusinessUnitContext) {
    const [rows]: any = await connection.execute(
      `SELECT id, display_name FROM parties
       WHERE id = ? AND organization_id = ? AND deleted_at IS NULL AND status_code = 'active'
       LIMIT 1`,
      [partyId, studio.organizationId],
    );
    if (!rows.length) throw new AppError(400, 'INVALID_EXTERNAL_PARTY', 'Pihak eksternal tidak ditemukan atau tidak aktif.');
    return rows[0];
  }

  private validateDateRange(startDate: string | null, endDate: string | null) {
    if (startDate && endDate && endDate < startDate) {
      throw new AppError(400, 'INVALID_ASSIGNMENT_PERIOD', 'Tanggal selesai tidak boleh mendahului tanggal mulai.');
    }
  }

  async addAssignment(projectId: number, input: ExternalAssignmentInput, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const party = await this.assertExternalParty(connection, input.party_id, studio);

      const startDate = toSqlDate(input.start_date);
      const endDate = toSqlDate(input.end_date);
      this.validateDateRange(startDate, endDate);

      const [result]: any = await connection.execute(
        `INSERT INTO project_external_assignments (project_id, party_id, assignment_role, scope_description, agreed_fee, start_date, end_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, input.party_id, input.assignment_role, input.scope_description || null, input.agreed_fee ?? 0, startDate, endDate, input.notes || null],
      );

      await writeProjectAudit(
        connection, studio, userId, 'studio.project_external_add', projectRef(project),
        `Menambahkan kolaborator eksternal ${party.display_name} pada proyek ${project.project_code}.`,
        undefined, { party_id: input.party_id, assignment_role: input.assignment_role, agreed_fee: input.agreed_fee ?? 0 },
      );
      return { id: Number(result.insertId) };
    });
  }

  async updateAssignment(projectId: number, assignmentId: number, input: Partial<Omit<ExternalAssignmentInput, 'party_id'>>, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      assertProjectMutable(project);
      const [rows]: any = await connection.execute(
        `SELECT * FROM project_external_assignments WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
        [assignmentId, projectId],
      );
      if (!rows.length) throw new NotFoundError('Penugasan eksternal tidak ditemukan.');
      const current = rows[0];

      const next = {
        assignment_role: input.assignment_role === undefined ? current.assignment_role : input.assignment_role,
        scope_description: input.scope_description === undefined ? current.scope_description : (input.scope_description || null),
        agreed_fee: input.agreed_fee === undefined ? current.agreed_fee : input.agreed_fee,
        start_date: input.start_date === undefined ? current.start_date : toSqlDate(input.start_date),
        end_date: input.end_date === undefined ? current.end_date : toSqlDate(input.end_date),
        notes: input.notes === undefined ? current.notes : (input.notes || null),
      };
      this.validateDateRange(
        next.start_date instanceof Date ? next.start_date.toISOString().slice(0, 10) : next.start_date,
        next.end_date instanceof Date ? next.end_date.toISOString().slice(0, 10) : next.end_date,
      );

      await connection.execute(
        `UPDATE project_external_assignments
         SET assignment_role = ?, scope_description = ?, agreed_fee = ?, start_date = ?, end_date = ?, notes = ?
         WHERE id = ? AND project_id = ?`,
        [next.assignment_role, next.scope_description, next.agreed_fee, next.start_date, next.end_date, next.notes, assignmentId, projectId],
      );
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_external_update', projectRef(project),
        `Memperbarui penugasan eksternal pada proyek ${project.project_code}.`,
        { assignment_role: current.assignment_role, agreed_fee: Number(current.agreed_fee) },
        { assignment_role: next.assignment_role, agreed_fee: Number(next.agreed_fee) },
      );
      return { id: assignmentId };
    });
  }

  /** Ending an assignment records when collaboration stopped; the record itself survives. */
  async endAssignment(projectId: number, assignmentId: number, endDate: string | null, userId: number, studio: BusinessUnitContext) {
    return withTransaction(async connection => {
      const project = await loadProjectForUpdate(connection, projectId, studio);
      const [rows]: any = await connection.execute(
        `SELECT * FROM project_external_assignments WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE`,
        [assignmentId, projectId],
      );
      if (!rows.length) throw new NotFoundError('Penugasan eksternal tidak ditemukan.');
      if (rows[0].end_date) throw new AppError(409, 'ASSIGNMENT_ALREADY_ENDED', 'Penugasan eksternal ini sudah berakhir.');

      const resolvedEnd = toSqlDate(endDate) || new Date().toISOString().slice(0, 10);
      await connection.execute(
        `UPDATE project_external_assignments SET end_date = ? WHERE id = ? AND project_id = ?`,
        [resolvedEnd, assignmentId, projectId],
      );
      await writeProjectAudit(
        connection, studio, userId, 'studio.project_external_end', projectRef(project),
        `Mengakhiri penugasan eksternal pada proyek ${project.project_code}.`, undefined, { id: assignmentId, end_date: resolvedEnd },
      );
      return { id: assignmentId, end_date: resolvedEnd };
    });
  }

  list(projectId: number) {
    return this.repository.getExternalAssignments(projectId);
  }
}

export const studioProjectExternalService = new StudioProjectExternalService();
