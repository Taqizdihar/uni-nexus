import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import type { IntegrationRow } from './integrations.types';

type Executor = Pick<PoolConnection, 'execute'>;

export class IntegrationsRepository {
  async listForOrganization(organizationId: number, visibilityClause: string, visibilityParams: any[], excludeTypes: string[] = []): Promise<IntegrationRow[]> {
    const clauses = ['organization_id=?', visibilityClause];
    const params: any[] = [organizationId, ...visibilityParams];
    if (excludeTypes.length) {
      clauses.push(`integration_type NOT IN (${excludeTypes.map(() => '?').join(',')})`);
      params.push(...excludeTypes);
    }
    const [rows]: any = await pool.execute(`SELECT * FROM integrations WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`, params);
    return rows;
  }

  async findById(connection: Executor, id: number, organizationId: number): Promise<IntegrationRow | null> {
    const [rows]: any = await connection.execute(`SELECT * FROM integrations WHERE id=? AND organization_id=?`, [id, organizationId]);
    return rows.length ? rows[0] : null;
  }

  async lockById(connection: Executor, id: number, organizationId: number): Promise<IntegrationRow | null> {
    const [rows]: any = await connection.execute(`SELECT * FROM integrations WHERE id=? AND organization_id=? FOR UPDATE`, [id, organizationId]);
    return rows.length ? rows[0] : null;
  }

  async insert(connection: Executor, params: {
    organizationId: number; businessUnitId: number | null; integrationCode: string; integrationType: string;
    providerName: string; displayName: string; statusCode: string; configJson: Record<string, unknown>; createdBy: number;
  }): Promise<number> {
    const [result]: any = await connection.execute(
      `INSERT INTO integrations (organization_id,business_unit_id,integration_code,integration_type,provider_name,display_name,status_code,config_json,created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [params.organizationId, params.businessUnitId, params.integrationCode, params.integrationType, params.providerName, params.displayName, params.statusCode, JSON.stringify(params.configJson), params.createdBy],
    );
    return Number(result.insertId);
  }

  async updateCode(connection: Executor, id: number, integrationCode: string): Promise<void> {
    await connection.execute(`UPDATE integrations SET integration_code=? WHERE id=?`, [integrationCode, id]);
  }

  /** Optimistic-concurrency update keyed by updated_at. Returns false on a stale write (row exists but updated_at no longer matches). */
  async updateFields(connection: Executor, id: number, fields: Record<string, unknown>, expectedUpdatedAt?: string | null): Promise<boolean> {
    const keys = Object.keys(fields);
    if (!keys.length) return true;
    const assignments = keys.map((key) => `${key}=?`).join(',');
    const values: any[] = keys.map((key) => fields[key]);
    const where = expectedUpdatedAt ? 'id=? AND updated_at=?' : 'id=?';
    const params: any[] = expectedUpdatedAt ? [...values, id, expectedUpdatedAt] : [...values, id];
    const [result]: any = await connection.execute(`UPDATE integrations SET ${assignments} WHERE ${where}`, params);
    return result.affectedRows > 0;
  }

  async listLogs(organizationId: number, visibilityClause: string, visibilityParams: any[], excludeTypes: string[], filters: { integrationId?: number; status?: string; syncType?: string }) {
    const clauses = ['i.organization_id=?', visibilityClause];
    const params: any[] = [organizationId, ...visibilityParams];
    if (excludeTypes.length) {
      clauses.push(`i.integration_type NOT IN (${excludeTypes.map(() => '?').join(',')})`);
      params.push(...excludeTypes);
    }
    if (filters.integrationId) { clauses.push('l.integration_id=?'); params.push(filters.integrationId); }
    if (filters.status) { clauses.push('l.status_code=?'); params.push(filters.status); }
    if (filters.syncType) { clauses.push('l.sync_type=?'); params.push(filters.syncType); }
    const [rows]: any = await pool.execute(
      `SELECT l.*, i.display_name AS integration_name, i.provider_name, i.integration_type, i.business_unit_id
       FROM integration_sync_logs l JOIN integrations i ON i.id=l.integration_id
       WHERE ${clauses.join(' AND ')} ORDER BY l.started_at DESC LIMIT 200`,
      params,
    );
    return rows;
  }

  async getLog(id: number, organizationId: number, visibilityClause: string, visibilityParams: any[]) {
    const [rows]: any = await pool.execute(
      `SELECT l.*, i.display_name AS integration_name, i.provider_name, i.integration_type, i.business_unit_id
       FROM integration_sync_logs l JOIN integrations i ON i.id=l.integration_id
       WHERE l.id=? AND i.organization_id=? AND ${visibilityClause}`,
      [id, organizationId, ...visibilityParams],
    );
    return rows.length ? rows[0] : null;
  }

  async insertSyncLog(connection: Executor, params: {
    integrationId: number; syncType: string; direction: string; statusCode: string; startedAt: string;
    finishedAt?: string | null; recordsProcessed?: number; recordsSuccess?: number; recordsFailed?: number;
    errorMessage?: string | null; metadata?: Record<string, unknown> | null;
  }): Promise<number> {
    const [result]: any = await connection.execute(
      `INSERT INTO integration_sync_logs (integration_id,sync_type,direction,status_code,started_at,finished_at,records_processed,records_success,records_failed,error_message,metadata)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        params.integrationId, params.syncType, params.direction, params.statusCode, params.startedAt,
        params.finishedAt ?? null, params.recordsProcessed ?? 0, params.recordsSuccess ?? 0, params.recordsFailed ?? 0,
        params.errorMessage ?? null, params.metadata ? JSON.stringify(params.metadata) : null,
      ],
    );
    return Number(result.insertId);
  }
}

export const integrationsRepository = new IntegrationsRepository();
