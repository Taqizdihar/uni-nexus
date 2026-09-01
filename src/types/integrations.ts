export type IntegrationStatus = 'not_connected' | 'connected' | 'error' | 'disabled' | 'planned';
export type IntegrationScope = 'organization' | 'craft' | 'studio';
export type ProviderCategory = 'google_workspace' | 'messaging' | 'marketplace' | 'payment' | 'api_webhook' | 'other';
export type ProviderAvailability = 'available' | 'planned';

export interface ProviderConfigField {
  name: string;
  label: string;
  type: 'text' | 'url' | 'select';
  required?: boolean;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface ProviderSecretField {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  helpText?: string;
}

export interface ProviderDefinition {
  code: string;
  displayName: string;
  integrationType: string;
  description: string;
  category: ProviderCategory;
  availability: ProviderAvailability;
  allowedScopes: IntegrationScope[];
  capabilities: { test: boolean; sync: boolean };
  publicConfigFields: ProviderConfigField[];
  secretFields: ProviderSecretField[];
  authMode: 'service_account' | 'access_token' | 'none';
  unavailableReason?: string;
  devOnly?: boolean;
}

export interface IntegrationCredentialMeta {
  secret_name: string;
  configured: true;
  key_version: number;
  updated_at: string;
}

export interface IntegrationConnection {
  id: number;
  integration_code: string;
  integration_type: string;
  provider_code: string;
  provider_display_name: string;
  category: ProviderCategory;
  display_name: string;
  scope: IntegrationScope;
  business_unit_id: number | null;
  status_code: IntegrationStatus;
  config_json: Record<string, unknown>;
  credentials: IntegrationCredentialMeta[];
  capabilities: { test: boolean; sync: boolean };
  connector_available: boolean;
  last_sync_at: string | null;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IntegrationSyncLog {
  id: number;
  integration_id: number;
  integration_name: string;
  provider_name: string;
  integration_type: string;
  sync_type: string;
  direction: string;
  status_code: string;
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  records_success: number;
  records_failed: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IntegrationConnectionDetail extends IntegrationConnection {
  history: IntegrationSyncLog[];
}

export interface IntegrationOverview {
  kpis: {
    total: number;
    connected: number;
    error: number;
    not_connected: number;
    disabled: number;
    planned: number;
    planned_providers: number;
  };
  recent_tests: IntegrationSyncLog[];
  recent_syncs: IntegrationSyncLog[];
  recent_failures: IntegrationSyncLog[];
}

export interface IntegrationMeta {
  statuses: IntegrationStatus[];
  categories: ProviderCategory[];
  scopes: IntegrationScope[];
}
