import { env } from '../../../config/env';
import { integrationConnectorRegistry } from '../integration-connector.registry';
import { googleDriveConnector } from './google-drive.connector';
import { googleSheetsConnector } from './google-sheets.connector';
import { googleCalendarConnector } from './google-calendar.connector';
import { whatsappCloudApiConnector } from './whatsapp-cloud-api.connector';
import { mockTestConnector } from './mock-test.connector';

/** Registers every real built-in connector. Imported once at module-load time by the integrations module. */
integrationConnectorRegistry.register(googleDriveConnector);
integrationConnectorRegistry.register(googleSheetsConnector);
integrationConnectorRegistry.register(googleCalendarConnector);
integrationConnectorRegistry.register(whatsappCloudApiConnector);

// Never registered in production — see mock-test.connector.ts.
if (env.NODE_ENV !== 'production') {
  integrationConnectorRegistry.register(mockTestConnector);
}
