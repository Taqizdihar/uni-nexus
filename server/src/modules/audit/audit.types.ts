export type AuditWorkspace = 'all' | 'global' | 'craft' | 'studio';
export type AuditActionGroup = 'authentication' | 'account' | 'create' | 'update' | 'delete' | 'approval' | 'finance' | 'automation' | 'export' | 'other';

export type AuditFilters = {
  workspace: AuditWorkspace;
  module?: string;
  action?: string;
  action_group?: AuditActionGroup;
  user_id?: number;
  entity_type?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type AuditActor = { id: number; organization_id: number };

