import type { IntegrationConnector } from '../integration-connector';

/**
 * Development/test-only connector so smoke and browser acceptance tests never
 * depend on live Google/Meta reachability. Registered only outside production
 * (see connectors/index.ts) and never exposed in the production provider catalog.
 */
export const mockTestConnector: IntegrationConnector = {
  providerCode: 'MOCK_TEST_CONNECTOR',
  integrationType: 'other',

  async testConnection(context) {
    if (context.config.simulate === 'fail') {
      return { connected: false, message: 'Simulasi kegagalan koneksi (mock, hanya development).' };
    }
    return { connected: true, message: 'Koneksi mock berhasil diverifikasi (hanya development).', metadata: { mock: true } };
  },

  async sync(context) {
    if (context.config.simulate === 'fail') {
      return { status: 'failed', recordsProcessed: 0, recordsSuccess: 0, recordsFailed: 0, message: 'Simulasi kegagalan sinkronisasi (mock, hanya development).' };
    }
    return { status: 'success', recordsProcessed: 3, recordsSuccess: 3, recordsFailed: 0, message: 'Sinkronisasi mock berhasil (hanya development).' };
  },
};
