export type FieldType = 'text' | 'textarea' | 'decimal' | 'integer' | 'boolean' | 'date' | 'datetime' | 'select' | 'relation' | 'json';
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  options?: string[];
  reference?: string;
  default?: unknown;
  readOnly?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}
export interface ResourceDefinition {
  key: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  group: string;
  permission: string;
  fields: FieldDefinition[];
  columns: string[];
  search: string[];
  readOnly?: boolean;
  relations?: {resource: string; foreignKey: string; label: string}[];
}
export interface Pagination {page: number; pageSize: number; total: number; totalPages: number}
export interface ApiList<T> {data: T[]; meta: Pagination}
export interface ApiResponse<T> {data: T}
