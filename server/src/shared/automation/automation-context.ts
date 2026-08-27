import type { DomainEventInput } from './domain-event-outbox.service';

const safeObject = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

export const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
};

export const domainEventContext = (event: any): Record<string, any> => {
  const payload = parseJson<Record<string, any>>(event.payload_json, {});
  const context = safeObject(payload.context);
  const normalized: Record<string, any> = {
    event: {
      id: Number(event.id), name: event.event_name, entity_type: event.entity_type,
      entity_id: event.entity_id === null ? null : Number(event.entity_id), entity_code: event.entity_code,
    },
    ...context,
  };
  const entityKey = String(event.entity_type || '').replace(/^craft_/, '').replace(/s$/, '');
  if (entityKey && !normalized[entityKey]) normalized[entityKey] = payload[entityKey] || payload;
  return { ...normalized, ...payload };
};

export const buildAutomationDomainEvent = (input: DomainEventInput, run: { id: number; correlationId?: string | null; chainDepth?: number }, parentEventId?: number | null): DomainEventInput => ({
  ...input,
  correlationId: run.correlationId || input.correlationId || null,
  causationEventId: parentEventId ?? input.causationEventId ?? null,
  sourceAutomationRunId: run.id,
  chainDepth: Math.max(0, Number(run.chainDepth || 0) + 1),
});
