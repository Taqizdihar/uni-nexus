export type IntegrationScope = 'organization' | 'craft' | 'studio';
export type IntegrationStatus = 'not_connected' | 'connected' | 'error' | 'disabled' | 'planned';
export type IntegrationDomainAction = 'read' | 'manage' | 'sync';

export interface IntegrationActor {
  id: number;
  organization_id: number;
  permissions: string[];
}

export interface IntegrationRow {
  id: number;
  organization_id: number;
  business_unit_id: number | null;
  sales_channel_id: number | null;
  integration_code: string;
  integration_type: string;
  provider_name: string;
  display_name: string;
  status_code: IntegrationStatus;
  config_json: string | Record<string, unknown> | null;
  last_sync_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationContext {
  organizationId: number;
  businessUnitId: number | null;
  userId: number;
}
