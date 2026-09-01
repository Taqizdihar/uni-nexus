import { MarketplaceConnector } from './MarketplaceConnector';
import { integrationConnectorRegistry } from '../integration-connector.registry';
import type { IntegrationConnector } from '../integration-connector';

const INTEGRATION_TYPE = 'marketplace';

/** Adapts the marketplace-specific contract onto the canonical connector shape. */
function toCanonicalConnector(connector: MarketplaceConnector): IntegrationConnector {
  return {
    providerCode: connector.provider.toUpperCase(),
    integrationType: INTEGRATION_TYPE,
    async testConnection(context) {
      const result = await connector.testConnection({ integrationId: context.integrationId, config: context.config });
      return { connected: result.connected, message: result.message, metadata: result.metadata };
    },
    // pullOrders/pullProducts/pullSettlements are marketplace-specific domain
    // operations with no canonical sync mapping yet — left unmapped on purpose.
  };
}

/**
 * Thin facade over the single canonical connector engine (IntegrationConnectorRegistry),
 * namespaced to integration_type='marketplace'. Preserves the exact get/isAvailable/register
 * surface every Craft Marketplace call site already depends on.
 *
 * Empty by design until an official provider adapter is implemented.
 */
export class MarketplaceConnectorRegistry {
  private readonly connectors = new Map<string, MarketplaceConnector>();

  register(connector: MarketplaceConnector) {
    this.connectors.set(connector.provider.toUpperCase(), connector);
    integrationConnectorRegistry.register(toCanonicalConnector(connector));
  }

  get(provider: string) {
    return this.connectors.get(provider.toUpperCase());
  }

  isAvailable(provider: string) {
    return Boolean(this.get(provider));
  }
}

export const marketplaceConnectorRegistry = new MarketplaceConnectorRegistry();
