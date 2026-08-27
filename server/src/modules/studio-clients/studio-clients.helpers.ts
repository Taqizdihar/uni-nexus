export { getStudioBusinessUnit, getStudioBusinessUnitId, STUDIO_LOCAL_DATE_SQL, parseNumericId } from '../studio-projects/studio-projects.helpers';
export type { BusinessUnitContext } from '../../shared/utils/business-unit';
export { STUDIO_CLIENT_ROLE, StudioClientService, studioClientService } from '../../shared/party/studio-client.service';

/** Project statuses that count as active execution work for a client relationship. */
export const ACTIVE_CLIENT_PROJECT_STATUSES = ['approved', 'in_progress', 'review'] as const;

/** Statuses whose contract_value counts toward a client's committed (non-pipeline) value. */
export const COMMITTED_CLIENT_PROJECT_STATUSES = ['approved', 'in_progress', 'review', 'completed', 'paid'] as const;

export const toNumber = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
