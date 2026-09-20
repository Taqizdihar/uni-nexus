import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { type ResourceDefinition } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { audit } from '../../services/audit.js';
import { beforeWrite, afterWrite } from '../../services/domain.js';
import { cleanRow, repository, scopeFor, verifyReferences, modelFor, type Row, type Database } from './repository.js';
import { identifier, inputSchema, listSchema } from './validation.js';

export interface ResourceContext {workspaceId: bigint; userId: bigint; role?: string}
const printerOperationalFields = new Set(['serial_number', 'location', 'status', 'last_maintenance_at']);
const printerProtectedMessage = 'Hanya CTO yang dapat mengubah data utama printer.';

export function assertPrinterPolicy(resource: ResourceDefinition, data: Row, context: ResourceContext, creating: boolean) {
  if (resource.table !== 'printers') return;
  if (creating) throw new AppError(403, 'Tambahkan unit printer melalui pilihan data printer yang tersedia.', 'PRINTER_CATALOG_REQUIRED');
  if (Object.keys(data).some((field) => !printerOperationalFields.has(field)))
    throw new AppError(403, printerProtectedMessage, 'PRINTER_MASTER_FORBIDDEN');
}

export async function normalizePrinterData(tx: Prisma.TransactionClient, data: Row, context: ResourceContext, id?: bigint) {
  if ('serial_number' in data && typeof data.serial_number === 'string') {
    data.serial_number = data.serial_number.trim() || null;
  }
  if (data.serial_number) {
    const duplicate = await tx.printers.findFirst({
      where: { workspace_id: context.workspaceId, serial_number: String(data.serial_number), ...(id ? { id: { not: id } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new AppError(409, 'Nomor serial tersebut sudah digunakan oleh printer lain.', 'DUPLICATE_PRINTER_SERIAL');
  }
}
export async function list(resource: ResourceDefinition, query: Row, context: ResourceContext) {
  const {page,pageSize,search,sort,direction}=listSchema.parse(query);
  const allowedSort=['id',...resource.fields.filter(field=>field.type!=='json').map(field=>field.name)];
  if(!allowedSort.includes(sort)) throw new AppError(422,'Invalid sort field.');
  const where:Row=scopeFor(resource.table,context.workspaceId,context.userId);
  if(search&&resource.search.length) where.OR=resource.search.map(name=>({[name]:{contains:search}}));
  for(const field of resource.fields) {
    if(query[field.name]===undefined||field.readOnly) continue;
    if(field.type==='relation') where[field.name]=BigInt(identifier.parse(query[field.name]));
    else if(field.type==='select'||field.type==='text') {
      if(typeof query[field.name]!=='string'||String(query[field.name]).length>200) throw new AppError(422,'Invalid filter.');
      where[field.name]=query[field.name];
    } else if(field.type==='boolean') where[field.name]=query[field.name]==='true';
  }
  if(resource.table==='notifications'&&query.unread==='true')where.read_at=null;
  const delegate=repository(prisma,resource.table);
  const [rows,total]=await Promise.all([delegate.findMany({where,skip:(page-1)*pageSize,take:pageSize,orderBy:{[sort]:direction}}),delegate.count({where})]);
  return {data:rows.map(cleanRow),meta:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}};
}
export async function detail(resource: ResourceDefinition, id: bigint, context: ResourceContext, db: Database=prisma) {
  const row=await repository(db,resource.table).findFirst({where:{id,...scopeFor(resource.table,context.workspaceId,context.userId)}});
  if(!row)throw new AppError(404,`${resource.singular} not found.`,'NOT_FOUND');
  return row;
}
async function relationalConsistency(db:Database,resource:ResourceDefinition,data:Row,existing:Row|null) {
  const merged={...existing,...data};
  const links:[string,string,string][]=[];
  if(resource.table==='quotations')links.push(['custom_request_id','custom_requests','customer_id']);
  if(resource.table==='orders')links.push(['custom_request_id','custom_requests','customer_id'],['quotation_id','quotations','customer_id'],['quotation_id','quotations','custom_request_id']);
  if(['quotation_items','order_items'].includes(resource.table))links.push(['product_variant_id','product_variants','product_id']);
  if(resource.table==='design_assets')links.push(['design_task_id','design_tasks','custom_request_id']);
  if(['print_jobs','slicing_results'].includes(resource.table))links.push(['print_profile_id','print_profiles','printer_id']);
  if(resource.table==='print_jobs')links.push(['slicing_result_id','slicing_results','production_job_id']);
  if(resource.table==='qc_inspections')links.push(['print_job_id','print_jobs','production_job_id']);
  for(const [foreign,table,match] of links) {
    if(merged[foreign]==null)continue;
    const related=await repository(db,table).findFirst({where:{id:merged[foreign]}});
    if(related?.[match]!=null && merged[match]!=null && String(related[match])!==String(merged[match]))throw new AppError(422,`${foreign.replaceAll('_',' ')} does not match ${match.replaceAll('_',' ')}.`,'RELATION_MISMATCH');
  }
  if(existing) {
    const fixedParents=['quotation_id','order_id','order_item_id','production_job_id','print_job_id','custom_request_id','product_id','experiment_id','qc_inspection_id','ip_review_id'];
    for(const key of fixedParents)if(data[key]!==undefined&&String(data[key])!==String(existing[key]))throw new AppError(409,'Parent relationships cannot be changed after creation. Create a new record instead.','IMMUTABLE_PARENT');
  }
}
export async function save(resource:ResourceDefinition, body:unknown, context:ResourceContext, id?:bigint) {
  if(resource.readOnly)throw new AppError(403,'This resource is read-only.');
  const parsed=inputSchema(resource, id!==undefined).parse(body) as Row;
  assertPrinterPolicy(resource, parsed, context, id === undefined);
  if(id&&Object.keys(parsed).length===0)throw new AppError(422,'Provide at least one editable field.');
  // SERIALIZABLE protects scope validation, stock, state transitions, and parent totals as one unit.
  for(let attempt=0;attempt<3;attempt++) {
    try {
      return await prisma.$transaction(async tx=>{
        const existing=id?await detail(resource,id,context,tx):null;
        let data={...parsed};
        if(resource.table==='printers') await normalizePrinterData(tx,data,context,id);
        await verifyReferences(tx,resource,data,context.workspaceId,context.userId);
        await relationalConsistency(tx,resource,data,existing);
        const names=modelFor(resource.table).fields.map(field=>field.name);
        if(!id){
          if(names.includes('workspace_id'))data.workspace_id=context.workspaceId;
          for(const field of ['created_by_user_id','uploaded_by_user_id','recorded_by_user_id','reported_by_user_id'])if(names.includes(field))data[field]=context.userId;
          if(resource.table==='request_notes')data.user_id=context.userId;
          const numberField=names.find(name=>['request_number','quotation_number','order_number','job_number','print_job_number','experiment_number'].includes(name));
          if(numberField&&!data[numberField])data[numberField]=`${resource.key.split('-').map(word=>word[0]).join('').toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`;
        }
        if(id&&names.includes('updated_at'))data.updated_at=new Date();
        data=await beforeWrite(tx,resource.table,data,existing,context);
        const row=id?await repository(tx,resource.table).update({where:{id},data}):await repository(tx,resource.table).create({data});
        await afterWrite(tx,resource.table,row,existing,context);
        await audit(tx,context,id?(data.status&&existing?.status!==data.status?'STATUS_CHANGE':'UPDATE'):'CREATE',resource.table,BigInt(String(row.id)),existing??undefined,row);
        return cleanRow(row);
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:20000});
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034'&&attempt<2)continue;
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002' && resource.table==='printers') {
        const target = error.meta?.target;
        const names = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
        if(names.some((name) => name.includes('serial_number')))
          throw new AppError(409,'Nomor serial tersebut sudah digunakan oleh printer lain.','DUPLICATE_PRINTER_SERIAL');
      }
      throw error;
    }
  }
  throw new AppError(409,'This record changed concurrently. Please try again.');
}
