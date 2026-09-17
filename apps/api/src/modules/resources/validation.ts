import { z } from 'zod';
import type { FieldDefinition, ResourceDefinition } from '@uni-nexus/shared';

export const identifier = z.string().regex(/^[1-9]\d{0,19}$/, 'A positive record ID is required.').refine(value=>BigInt(value)<=18446744073709551615n,'Record ID is too large.');
function fieldSchema(field: FieldDefinition): z.ZodType {
  let schema: z.ZodType;
  switch(field.type) {
    case 'relation': schema = identifier.transform(value=>BigInt(value)); break;
    case 'boolean': schema = z.boolean(); break;
    case 'integer': schema = z.union([z.number(),z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().min(0).max(2147483647)); break;
    case 'decimal': {
      const precision=field.precision??14, scale=field.scale??4;
      schema=z.string().regex(new RegExp(`^\\d{1,${precision-scale}}(?:\\.\\d{1,${scale}})?$`),`Use a nonnegative decimal with up to ${scale} decimal places.`);
      break;
    }
    case 'date': schema = z.iso.date().transform(value=>new Date(`${value}T00:00:00.000Z`)); break;
    case 'datetime': schema = z.string().refine(value=>/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value)),'Enter a valid date and time.').transform(value=>new Date(value)); break;
    case 'select': schema = z.enum(field.options as [string,...string[]]); break;
    case 'json': schema = z.json(); break;
    default: {
      let string = z.string().trim().max(field.maxLength??20000);
      if(field.required) string=string.min(1,'This field is required.');
      if(field.name==='email') string=string.email();
      schema=string;
      if(/(?:url)$/.test(field.name)) schema=string.refine(value=>{try{return ['https:','http:'].includes(new URL(value).protocol);}catch{return false;}},'Use an http or https URL.');
    }
  }
  if(field.nullable) schema=schema.nullable();
  return schema;
}
export function inputSchema(resource: ResourceDefinition, partial: boolean) {
  const shape: Record<string,z.ZodType>={};
  for(const field of resource.fields) {
    if(field.readOnly) continue;
    const schema=fieldSchema(field);
    shape[field.name]=partial||!field.required?schema.optional():schema;
  }
  return z.object(shape).strict();
}
export const listSchema=z.object({
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
  search:z.string().trim().max(150).optional(),
  sort:z.string().max(60).default('id'),
  direction:z.enum(['asc','desc']).default('desc'),
});
