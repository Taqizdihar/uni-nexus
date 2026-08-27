import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { domainEvents } from '../../shared/automation/domain-event-outbox.service';
import type { BusinessUnitContext } from '../../shared/utils/business-unit';

export const STUDIO_PROJECTS_MODULE = 'studio_projects';
export const STUDIO_PROJECT_ENTITY = 'studio_project';

export interface ProjectRef {
  id: number;
  project_code: string;
  status_code: string;
}

/**
 * Runs `work` inside a transaction, releasing the connection either way.
 * Every multi-table Studio Project write goes through this so a project can
 * never be left with half-created child records.
 */
export const withTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const writeProjectAudit = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  userId: number | null,
  actionCode: string,
  project: ProjectRef,
  description: string,
  oldValues?: unknown,
  newValues?: unknown,
) => {
  await connection.execute(
    `INSERT INTO audit_logs (organization_id, business_unit_id, user_id, module_code, action_code, entity_type, entity_id, entity_code, description, old_values, new_values)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studio.organizationId, studio.id, userId, STUDIO_PROJECTS_MODULE, actionCode,
      STUDIO_PROJECT_ENTITY, project.id, project.project_code, description.slice(0, 500),
      oldValues === undefined ? null : JSON.stringify(oldValues),
      newValues === undefined ? null : JSON.stringify(newValues),
    ],
  );
};

/**
 * Publishes a Studio domain event to the shared transactional outbox.
 *
 * The worker dispatches events by (business_unit_id, event_name), so STUDIO events
 * can never match a CRAFT automation rule. Publishing is best-effort: a failure
 * here must never make a correct project write fail, and the module works fine
 * with the automation worker stopped.
 */
export const publishProjectEvent = async (
  connection: PoolConnection,
  studio: BusinessUnitContext,
  eventName: string,
  project: ProjectRef,
  userId: number | null,
  payload: Record<string, unknown>,
) => {
  try {
    await domainEvents.publish(connection, {
      eventName,
      moduleCode: STUDIO_PROJECTS_MODULE,
      organizationId: studio.organizationId,
      businessUnitId: studio.id,
      entityType: STUDIO_PROJECT_ENTITY,
      entityId: project.id,
      entityCode: project.project_code,
      actorUserId: userId,
      payload: { context: payload },
    });
  } catch (error) {
    console.error(`Failed to publish Studio domain event ${eventName}:`, error);
  }
};

/** Loads and row-locks a project, scoped to the Studio business unit. */
export const loadProjectForUpdate = async (connection: PoolConnection, projectId: number, studio: BusinessUnitContext) => {
  const [rows]: any = await connection.execute(
    `SELECT * FROM studio_projects
     WHERE id = ? AND business_unit_id = ? AND deleted_at IS NULL
     LIMIT 1 FOR UPDATE`,
    [projectId, studio.id],
  );
  if (!rows.length) throw new NotFoundError('Proyek Studio tidak ditemukan.');
  return rows[0];
};

/** Operational child records stay editable after a project closes, but not after it is cancelled. */
export const assertProjectMutable = (project: { status_code: string }) => {
  if (project.status_code === 'cancelled') {
    throw new AppError(409, 'PROJECT_CANCELLED', 'Proyek yang dibatalkan tidak dapat diubah.');
  }
};

export const projectRef = (project: any): ProjectRef => ({
  id: Number(project.id),
  project_code: project.project_code,
  status_code: project.status_code,
});
