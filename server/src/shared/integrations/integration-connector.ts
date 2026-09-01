/**
 * Canonical connector contract shared by every real provider adapter (Google,
 * WhatsApp, and — through the MarketplaceConnectorRegistry facade — future
 * marketplace adapters). Connection tests must be side-effect free.
 */
export interface IntegrationConnectorTestResult {
  connected: boolean;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConnectorSyncResult {
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConnectorContext {
  organizationId: number;
  businessUnitId: number | null;
  integrationId: number;
  config: Record<string, unknown>;
  /** Internal-only secret read. Never forward the resolved value to a response, Audit entry, or log. */
  getSecret: (secretName: string) => Promise<string | null>;
}

export interface IntegrationConnector {
  providerCode: string;
  integrationType: string;
  testConnection(context: IntegrationConnectorContext): Promise<IntegrationConnectorTestResult>;
  sync?(context: IntegrationConnectorContext): Promise<IntegrationConnectorSyncResult>;
}
