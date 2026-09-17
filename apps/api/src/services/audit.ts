import type { Prisma } from '@prisma/client';

export interface WorkspaceContext { workspaceId: bigint; userId: bigint }
const hidden = /password|token|secret|object_key|bucket_name|storage_provider|config_json/i;
export function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (key, item: unknown) => hidden.test(key) ? undefined : typeof item === 'bigint' ? item.toString() : item)) as Prisma.InputJsonValue;
}
export async function audit(tx: Prisma.TransactionClient, context: WorkspaceContext, action: string, table: string, id: bigint, oldValue?: unknown, newValue?: unknown): Promise<void> {
  await tx.audit_logs.create({ data: { workspace_id: context.workspaceId, user_id: context.userId, action, entity_type: table, entity_id: id,
    ...(oldValue == null ? {} : { old_value_json: safeJson(oldValue) }), ...(newValue == null ? {} : { new_value_json: safeJson(newValue) }) } });
}
