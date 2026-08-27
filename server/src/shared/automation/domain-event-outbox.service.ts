import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';

export const MAX_AUTOMATION_CHAIN_DEPTH = 8;

export interface DomainEventInput {
  eventName: string;
  moduleCode: string;
  organizationId: number;
  businessUnitId?: number | null;
  entityType?: string | null;
  entityId?: number | null;
  entityCode?: string | null;
  actorUserId?: number | null;
  correlationId?: string | null;
  causationEventId?: number | null;
  sourceAutomationRunId?: number | null;
  chainDepth?: number;
  eventKey?: string;
  payload?: Record<string, unknown>;
  availableAt?: Date | string | null;
}

/** Persistent transactional outbox. Call this before the source transaction commits. */
export class DomainEventOutboxService {
  async publish(connection: PoolConnection, input: DomainEventInput) {
    const chainDepth = Math.max(0, Number(input.chainDepth || 0));
    const eventKey = input.eventKey || randomUUID();
    const [result]: any = await connection.execute(
      `INSERT INTO domain_events (
        organization_id, business_unit_id, event_key, event_name, module_code,
        entity_type, entity_id, entity_code, actor_user_id, correlation_id,
        causation_event_id, source_automation_run_id, chain_depth, payload_json, available_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, UTC_TIMESTAMP(3)))`,
      [
        input.organizationId, input.businessUnitId ?? null, eventKey, input.eventName, input.moduleCode,
        input.entityType ?? null, input.entityId ?? null, input.entityCode ?? null,
        input.actorUserId ?? null, input.correlationId || randomUUID(), input.causationEventId ?? null,
        input.sourceAutomationRunId ?? null, chainDepth, JSON.stringify(input.payload || {}), input.availableAt ?? null,
      ],
    );
    return { id: Number(result.insertId), eventKey, correlationId: input.correlationId || null, chainDepth };
  }
}

export const domainEvents = new DomainEventOutboxService();
