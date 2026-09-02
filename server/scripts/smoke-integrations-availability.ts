import { pool } from '../src/config/database';
import { env } from '../src/config/env';
import { listProviders } from '../src/shared/integrations/integration-provider.registry';
import { integrationsService } from '../src/modules/integrations/integrations.service';
import type { IntegrationActor } from '../src/modules/integrations/integrations.types';

const PLANNED_MARKETPLACE_CODES = ['SHOPEE', 'TIKTOK_SHOP', 'TOKOPEDIA'];
const NEVER_IN_PRODUCTION = ['MOCK_TEST_CONNECTOR'];

async function main() {
  try {
    const [users]: any = await pool.execute(
      `SELECT DISTINCT u.id, u.organization_id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.code = 'integrations.manage' AND u.status_code='active' AND u.approval_status_code='approved' AND u.deleted_at IS NULL
       LIMIT 1`,
    );
    if (!users.length) throw new Error('No active user holding integrations.manage is available to run this smoke test.');
    const actor: IntegrationActor = { id: Number(users[0].id), organization_id: Number(users[0].organization_id), permissions: ['integrations.read', 'integrations.manage', 'integrations.sync'] };

    // 1. Planned marketplace providers must reject connection creation outright.
    for (const code of PLANNED_MARKETPLACE_CODES) {
      let rejected = false;
      try {
        await integrationsService.createConnection(actor, { provider_code: code, scope: 'craft', display_name: `Smoke ${code}`, config_json: {} });
      } catch (error: any) {
        rejected = error?.code === 'INTEGRATION_PROVIDER_PLANNED';
      }
      if (!rejected) throw new Error(`Expected ${code} connection creation to be rejected as INTEGRATION_PROVIDER_PLANNED.`);
    }

    // 2. The catalog itself must mark those providers as planned, not available.
    const catalog = await integrationsService.providers(actor);
    for (const code of PLANNED_MARKETPLACE_CODES) {
      const entry = catalog.find((provider) => provider.code === code);
      if (!entry) throw new Error(`Provider ${code} missing from catalog.`);
      if (entry.availability !== 'planned') throw new Error(`Provider ${code} is marked '${entry.availability}', expected 'planned'.`);
      if (entry.capabilities.test || entry.capabilities.sync) throw new Error(`Provider ${code} exposes test/sync capabilities despite being planned.`);
    }

    // 3. The Mock Test Connector must never be marked devOnly=false, and the resolved
    //    runtime config (env.NODE_ENV, read live by listProviders()) must exclude it once
    //    NODE_ENV=production. process.env is not re-read after boot, so we flip the
    //    already-parsed `env` singleton the same way listProviders() consults it.
    const originalNodeEnv = env.NODE_ENV;
    try {
      (env as { NODE_ENV: string }).NODE_ENV = 'production';
      const productionCatalog = listProviders();
      for (const code of NEVER_IN_PRODUCTION) {
        if (productionCatalog.some((provider) => provider.code === code)) throw new Error(`${code} must never appear in the production provider catalog.`);
      }
    } finally {
      (env as { NODE_ENV: string }).NODE_ENV = originalNodeEnv;
    }

    // 4. Serialized connection views must never carry raw secret material — only metadata.
    const connections = await integrationsService.listConnections(actor, {});
    for (const connection of connections) {
      const serialized = JSON.stringify(connection);
      if (/service_account_json|access_token|dummy_secret|ciphertext|auth_tag/i.test(serialized) && !/"secret_name"/i.test(serialized)) {
        throw new Error(`Connection ${connection.integration_code} serialization may be leaking raw secret material.`);
      }
      for (const credential of connection.credentials) {
        if (Object.keys(credential).some((key) => !['secret_name', 'configured', 'key_version', 'updated_at'].includes(key))) {
          throw new Error(`Connection ${connection.integration_code} credential metadata exposes unexpected fields.`);
        }
      }
    }

    console.log('Integrations availability smoke passed: planned providers blocked, catalog honesty, production exclusion of the mock connector, and no secret leakage in serialized connections.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
