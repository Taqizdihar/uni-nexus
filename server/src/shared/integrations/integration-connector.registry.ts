import type { IntegrationConnector } from './integration-connector';

const key = (integrationType: string, providerCode: string) => `${integrationType.toUpperCase()}:${providerCode.toUpperCase()}`;

/**
 * Single canonical connector engine for the whole platform. Every real adapter —
 * Google, WhatsApp, and (via the MarketplaceConnectorRegistry facade) future
 * marketplace adapters — registers here, namespaced by integration_type.
 */
export class IntegrationConnectorRegistry {
  private readonly connectors = new Map<string, IntegrationConnector>();

  register(connector: IntegrationConnector) {
    this.connectors.set(key(connector.integrationType, connector.providerCode), connector);
  }

  get(integrationType: string, providerCode: string): IntegrationConnector | undefined {
    return this.connectors.get(key(integrationType, providerCode));
  }

  isAvailable(integrationType: string, providerCode: string): boolean {
    return Boolean(this.get(integrationType, providerCode));
  }
}

export const integrationConnectorRegistry = new IntegrationConnectorRegistry();
