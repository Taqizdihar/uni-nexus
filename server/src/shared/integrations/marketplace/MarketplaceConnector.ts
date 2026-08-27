/**
 * Contract for a real marketplace adapter.  The current application ships no
 * provider implementation: an adapter is only registered after its official
 * API contract and credentials have been configured.
 */
export interface MarketplaceConnectorResult {
  connected: boolean;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceConnector {
  provider: string;
  requiredEnvironmentVariables: string[];
  testConnection(context: { integrationId: number; config: Record<string, unknown> }): Promise<MarketplaceConnectorResult>;
  pullOrders?(context: { integrationId: number; config: Record<string, unknown> }): Promise<unknown[]>;
  pullProducts?(context: { integrationId: number; config: Record<string, unknown> }): Promise<unknown[]>;
  pullSettlements?(context: { integrationId: number; config: Record<string, unknown> }): Promise<unknown[]>;
}
