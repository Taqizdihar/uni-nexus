import { Prisma } from '@prisma/client';
import { resources, type ResourceDefinition } from '@uni-nexus/shared';
import { AppError } from '../../lib/errors.js';

export type Row = Record<string, unknown>;
export type Database = Prisma.TransactionClient;
const sensitiveTables = new Set(['users', 'workspace_members', 'roles', 'system_bootstrap', 'account_deactivation_requests']);
interface Delegate {
  findMany(args: Row): Promise<Row[]>;
  findFirst(args: Row): Promise<Row | null>;
  count(args: Row): Promise<number>;
  create(args: Row): Promise<Row>;
  update(args: Row): Promise<Row>;
  updateMany(args: Row): Promise<{count: number}>;
}
// This is the single dynamic boundary. Only the reviewed resource registry can choose a model.
export function repository(db: Database, table: string): Delegate {
  if (sensitiveTables.has(table)) throw new AppError(403, 'Use the dedicated account API.', 'FORBIDDEN');
  if (!resources.some(resource => resource.table === table)) throw new AppError(404, 'Unknown resource.');
  return (db as unknown as Record<string, Delegate>)[table]!;
}
export function definition(key: string): ResourceDefinition {
  const found = resources.find(resource => resource.key === key);
  if (!found) throw new AppError(404, 'Resource not found.', 'NOT_FOUND');
  if (sensitiveTables.has(found.table)) throw new AppError(403, 'Use the dedicated account API.', 'FORBIDDEN');
  return found;
}
export function modelFor(table: string) {
  const model = Prisma.dmmf.datamodel.models.find(model => model.name === table);
  if (!model) throw new AppError(500, 'Schema metadata is unavailable.');
  return model;
}
const parentKeys: Record<string, string> = {
  product_variants: 'product_id', product_images: 'product_id', product_assets: 'product_id',
  product_sales_channels: 'product_id', request_files: 'custom_request_id', request_notes: 'custom_request_id',
  quotation_items: 'quotation_id', order_items: 'order_id', experiment_measurements: 'experiment_id',
  qc_check_items: 'qc_inspection_id', ip_review_checklists: 'ip_review_id',
};
export function scopeFor(table: string, workspaceId: bigint, userId: bigint): Row {
  const model = modelFor(table);
  if (model.fields.some(field => field.name === 'workspace_id')) {
    return {workspace_id: workspaceId, ...(table === 'notifications' ? {recipient_user_id: userId} : {})};
  }
  if (table === 'customers') return {}; // Existing schema intentionally uses a company-wide directory.
  const parentKey = parentKeys[table];
  const parent = model.fields.find(field => field.kind === 'object' && field.relationFromFields?.includes(parentKey!));
  if (!parent) throw new AppError(403, 'This resource has no authorized workspace scope.');
  return {[parent.name]: scopeFor(parent.type, workspaceId, userId)};
}
export async function verifyReferences(db: Database, resource: ResourceDefinition, data: Row, workspaceId: bigint, userId: bigint) {
  for (const field of resource.fields.filter(field => field.type === 'relation')) {
    const value = data[field.name];
    if (value === undefined || value === null) continue;
    const id = BigInt(String(value));
    if (field.reference === 'users') {
      const member = await db.workspace_members.findFirst({where:{workspace_id: workspaceId,user_id:id,membership_status:'ACTIVE',users:{is_active:true,account_status:'ACTIVE'}}});
      if (!member) throw new AppError(422, `${field.label} must be an active member of this workspace.`, 'INVALID_REFERENCE');
      continue;
    }
    const target = resources.find(resource => resource.key === field.reference);
    if (!target) throw new AppError(422, `${field.label} cannot be assigned through this API.`, 'INVALID_REFERENCE');
    const found = await repository(db,target.table).findFirst({where:{id,...scopeFor(target.table,workspaceId,userId)}});
    if (!found) throw new AppError(422, `${field.label} does not exist in this workspace.`, 'INVALID_REFERENCE');
  }
}
export function cleanRow(row: Row): Row {
  const hidden = new Set(['object_key','bucket_name','storage_provider','password_hash','token_hash','uploaded_by_customer_account_id','customer_account_id','photo_object_key','photo_bucket_name','photo_storage_provider','photo_original_file_name','photo_mime_type','photo_file_size_bytes']);
  const clean = Object.fromEntries(Object.entries(row).filter(([key])=>!hidden.has(key)));
  if (row.photo_public_url || (row.photo_storage_provider === 'LOCAL' && row.id))
    clean.photo_url = row.photo_public_url ?? `/api/v1/printers/${String(row.id)}/photo`;
  return clean;
}
