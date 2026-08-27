import { MarketplaceConnector } from './MarketplaceConnector';

/** Empty by design until an official provider adapter is implemented. */
export class MarketplaceConnectorRegistry {
  private readonly connectors = new Map<string, MarketplaceConnector>();

  register(connector: MarketplaceConnector) {
    this.connectors.set(connector.provider.toUpperCase(), connector);
  }

  get(provider: string) {
    return this.connectors.get(provider.toUpperCase());
  }

  isAvailable(provider: string) {
    return Boolean(this.get(provider));
  }
}

export const marketplaceConnectorRegistry = new MarketplaceConnectorRegistry();
