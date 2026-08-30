import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../config/database';
import { parseAndRedactAuditJson, redactAuditDescription, redactAuditValue } from './audit-redaction';

type AuditExecutor = Pick<PoolConnection, 'execute'>;

export type AuditWriteInput = {
  organizationId: number;
  businessUnitId?: number | null;
  userId?: number | null;
  moduleCode: string;
  actionCode: string;
  entityType?: string | null;
  entityId?: number | null;
  entityCode?: string | null;
  description?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const text = (value: unknown, max: number) => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result.slice(0, max) : null;
};
const json = (value: unknown) => value === undefined ? null : JSON.stringify(redactAuditValue(value));

/**
 * Canonical append-only writer.  It accepts a caller-owned transaction
 * connection so audit data commits (or rolls back) with the source mutation.
 */
export class AuditService {
  static async write(input: AuditWriteInput, connection: AuditExecutor = pool): Promise<number | null> {
    const [result]: any = await connection.execute(
      `INSERT INTO audit_logs
       (organization_id,business_unit_id,user_id,module_code,action_code,entity_type,entity_id,entity_code,description,old_values,new_values,ip_address,user_agent,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`,
      [
        Number(input.organizationId), input.businessUnitId == null ? null : Number(input.businessUnitId), input.userId == null ? null : Number(input.userId),
        text(input.moduleCode, 80) || 'system', text(input.actionCode, 80) || 'unknown', text(input.entityType, 80),
        input.entityId == null ? null : Number(input.entityId), text(input.entityCode, 120), redactAuditDescription(text(input.description, 500)),
        json(input.oldValues), json(input.newValues), text(input.ipAddress, 45), text(input.userAgent, 1_000),
      ],
    );
    return result?.insertId == null ? null : Number(result.insertId);
  }

  static readValues(raw: unknown) { return parseAndRedactAuditJson(raw); }
}

