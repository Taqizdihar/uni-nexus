import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { AuditService } from '../../shared/audit/audit.service';
import { redactAuditDescription, redactAuditValue } from '../../shared/audit/audit-redaction';
import { integrationSecretService } from '../../shared/integrations/integration-secret.service';
import { integrationConnectorRegistry } from '../../shared/integrations/integration-connector.registry';
import { getProvider, isProviderConnectable, listProviders, type ProviderDefinition } from '../../shared/integrations/integration-provider.registry';
import { integrationsAccessService } from './integrations-access.service';
import { integrationsRepository } from './integrations.repository';
import type { IntegrationActor, IntegrationRow, IntegrationScope } from './integrations.types';

type Connection = Awaited<ReturnType<typeof pool.getConnection>>;

const isoNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const toIso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);

const safeJson = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try { return JSON.parse(String(value)); } catch { return {}; }
};

const sanitizeMessage = (message: string | null | undefined) => (message ? redactAuditDescription(message) : null);
const sanitizeMetadata = (metadata: Record<string, unknown> | null | undefined) => (metadata ? (redactAuditValue(metadata) as Record<string, unknown>) : null);

async function withTransaction<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export class IntegrationsService {
  private readonly access = integrationsAccessService;
  private readonly repo = integrationsRepository;
  private readonly secrets = integrationSecretService;

  private async businessUnitCodeMap(organizationId: number): Promise<Map<number, string>> {
    const [rows]: any = await pool.execute(`SELECT id, code FROM business_units WHERE organization_id=? AND code IN ('CRAFT','STUDIO')`, [organizationId]);
    return new Map(rows.map((row: any) => [Number(row.id), String(row.code).toUpperCase()]));
  }

  private scopeFor(businessUnitId: number | null, buCodes: Map<number, string>): IntegrationScope {
    if (businessUnitId === null) return 'organization';
    return (buCodes.get(businessUnitId)?.toLowerCase() as IntegrationScope) || 'organization';
  }

  private async excludedTypesFor(actor: IntegrationActor): Promise<string[]> {
    return this.access.canReadIntegrationType(actor, 'marketplace') ? [] : ['marketplace'];
  }

  private async toView(row: IntegrationRow, buCodes: Map<number, string>) {
    const provider = getProvider(row.provider_name) || null;
    const connectorAvailable = integrationConnectorRegistry.isAvailable(row.integration_type, row.provider_name);
    const credentials = await this.secrets.listMetadata(pool, row.id);
    return {
      id: row.id,
      integration_code: row.integration_code,
      integration_type: row.integration_type,
      provider_code: row.provider_name,
      provider_display_name: provider?.displayName || row.provider_name,
      category: provider?.category || 'other',
      display_name: row.display_name,
      scope: this.scopeFor(row.business_unit_id, buCodes),
      business_unit_id: row.business_unit_id,
      status_code: row.status_code,
      config_json: safeJson(row.config_json),
      credentials,
      capabilities: { test: Boolean(provider?.capabilities.test && connectorAvailable), sync: Boolean(provider?.capabilities.sync && connectorAvailable) },
      connector_available: connectorAvailable,
      last_sync_at: toIso(row.last_sync_at),
      created_by: row.created_by,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    };
  }

  private sanitizeProvider(provider: ProviderDefinition) {
    const connectable = isProviderConnectable(provider.code);
    return { ...provider, capabilities: { test: provider.capabilities.test && connectable, sync: provider.capabilities.sync && connectable } };
  }

  async providers(actor: IntegrationActor) {
    this.access.requireGlobal(actor, 'read');
    return listProviders().map((provider) => this.sanitizeProvider(provider));
  }

  async meta(actor: IntegrationActor) {
    this.access.requireGlobal(actor, 'read');
    return {
      statuses: ['not_connected', 'connected', 'error', 'disabled', 'planned'],
      categories: ['google_workspace', 'messaging', 'marketplace', 'payment', 'api_webhook', 'other'],
      scopes: ['organization', 'craft', 'studio'],
    };
  }

  private async visibleRows(actor: IntegrationActor) {
    const excludeTypes = await this.excludedTypesFor(actor);
    const visibility = await this.access.visibilityClause(actor);
    return this.repo.listForOrganization(actor.organization_id, visibility.clause, visibility.params, excludeTypes);
  }

  async overview(actor: IntegrationActor) {
    this.access.requireGlobal(actor, 'read');
    const rows = await this.visibleRows(actor);
    const kpis = { total: rows.length, connected: 0, error: 0, not_connected: 0, disabled: 0, planned: 0 };
    for (const row of rows) {
      if (row.status_code === 'connected') kpis.connected++;
      else if (row.status_code === 'error') kpis.error++;
      else if (row.status_code === 'disabled') kpis.disabled++;
      else if (row.status_code === 'planned') kpis.planned++;
      else kpis.not_connected++;
    }
    const plannedProviders = listProviders().filter((provider) => provider.availability === 'planned' && !provider.devOnly).length;
    const excludeTypes = await this.excludedTypesFor(actor);
    const visibility = await this.access.visibilityClause(actor, 'i');
    const recentTests = await this.repo.listLogs(actor.organization_id, visibility.clause, visibility.params, excludeTypes, { syncType: 'connection_test' });
    const recentSyncs = await this.repo.listLogs(actor.organization_id, visibility.clause, visibility.params, excludeTypes, {});
    const recentFailures = recentSyncs.filter((log: any) => log.status_code === 'failed').slice(0, 10);
    return {
      kpis: { ...kpis, planned_providers: plannedProviders },
      recent_tests: recentTests.slice(0, 10),
      recent_syncs: recentSyncs.filter((log: any) => log.sync_type !== 'connection_test').slice(0, 10),
      recent_failures: recentFailures,
    };
  }

  async listConnections(actor: IntegrationActor, filters: { search?: string; category?: string; scope?: string; status?: string; capability?: 'test' | 'sync' }) {
    this.access.requireGlobal(actor, 'read');
    const rows = await this.visibleRows(actor);
    const buCodes = await this.businessUnitCodeMap(actor.organization_id);
    let views = await Promise.all(rows.map((row) => this.toView(row, buCodes)));
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      views = views.filter((view) => view.display_name.toLowerCase().includes(needle) || view.provider_display_name.toLowerCase().includes(needle) || view.integration_code.toLowerCase().includes(needle));
    }
    if (filters.category) views = views.filter((view) => view.category === filters.category);
    if (filters.scope) views = views.filter((view) => view.scope === filters.scope);
    if (filters.status) views = views.filter((view) => view.status_code === filters.status);
    if (filters.capability) views = views.filter((view) => view.capabilities[filters.capability!]);
    return views;
  }

  async getConnection(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'read');
    const row = await this.repo.findById(pool, id, actor.organization_id);
    if (!row) throw new NotFoundError('Integrasi tidak ditemukan.');
    const units = await this.access.accessibleBusinessUnits(actor);
    if (row.business_unit_id !== null && !units.some((unit) => unit.id === row.business_unit_id)) throw new NotFoundError('Integrasi tidak ditemukan.');
    this.access.requireDomain(actor, row.integration_type, 'read');
    const buCodes = await this.businessUnitCodeMap(actor.organization_id);
    const view = await this.toView(row, buCodes);
    const logs = await this.repo.listLogs(actor.organization_id, 'i.id=?', [id], [], {});
    return { ...view, history: logs.slice(0, 20) };
  }

  private async lockVisible(connection: Connection, actor: IntegrationActor, id: number): Promise<IntegrationRow> {
    const row = await this.repo.lockById(connection, id, actor.organization_id);
    if (!row) throw new NotFoundError('Integrasi tidak ditemukan.');
    const units = await this.access.accessibleBusinessUnits(actor);
    if (row.business_unit_id !== null && !units.some((unit) => unit.id === row.business_unit_id)) throw new NotFoundError('Integrasi tidak ditemukan.');
    return row;
  }

  private async audit(connection: Connection, actor: IntegrationActor, businessUnitId: number | null, action: string, entityId: number | null, entityCode: string | null, description: string, values?: Record<string, unknown>) {
    await AuditService.write({ organizationId: actor.organization_id, businessUnitId, userId: actor.id, moduleCode: 'integrations', actionCode: action, entityType: 'integration', entityId, entityCode, description, newValues: values }, connection);
  }

  async createConnection(actor: IntegrationActor, data: { provider_code: string; scope: IntegrationScope; display_name: string; config_json: Record<string, unknown> }) {
    this.access.requireGlobal(actor, 'manage');
    const provider = getProvider(data.provider_code);
    if (!provider) throw new AppError(404, 'INTEGRATION_PROVIDER_UNKNOWN', 'Provider integrasi tidak dikenal.');
    if (provider.availability !== 'available' || !integrationConnectorRegistry.isAvailable(provider.integrationType, provider.code)) {
      throw new AppError(409, 'INTEGRATION_PROVIDER_PLANNED', provider.unavailableReason || 'Adapter API belum tersedia / belum dikonfigurasi.');
    }
    if (!provider.allowedScopes.includes(data.scope)) throw new AppError(400, 'INTEGRATION_SCOPE_INVALID', 'Scope tidak didukung untuk provider ini.');
    const missingConfigFields = provider.publicConfigFields.filter((field) => field.required && !String(data.config_json[field.name] ?? '').trim());
    if (missingConfigFields.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Konfigurasi wajib belum lengkap.', { missing_fields: missingConfigFields.map((field) => field.name) });
    }
    this.access.requireDomain(actor, provider.integrationType, 'manage');
    const { businessUnitId } = await this.access.resolveScope(actor, data.scope);

    return withTransaction(async (connection) => {
      const id = await this.repo.insert(connection, {
        organizationId: actor.organization_id, businessUnitId, integrationCode: `TMP-${randomUUID()}`, integrationType: provider.integrationType,
        providerName: provider.code, displayName: data.display_name, statusCode: 'not_connected', configJson: data.config_json, createdBy: actor.id,
      });
      const code = `INT-${String(id).padStart(6, '0')}`;
      await this.repo.updateCode(connection, id, code);
      await this.audit(connection, actor, businessUnitId, 'integration.create', id, code, `Membuat koneksi integrasi ${data.display_name}.`, { provider_code: provider.code, scope: data.scope, config_json: data.config_json });
      return { id, integration_code: code, status_code: 'not_connected' as const };
    });
  }

  async updateConnection(actor: IntegrationActor, id: number, data: { display_name?: string; config_json?: Record<string, unknown>; expected_updated_at?: string }) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      if (data.expected_updated_at && toIso(row.updated_at) !== data.expected_updated_at) {
        throw new AppError(409, 'INTEGRATION_VERSION_CONFLICT', 'Integrasi telah diperbarui oleh pengguna lain. Muat ulang sebelum menyimpan.');
      }
      const fields: Record<string, unknown> = {};
      if (data.display_name !== undefined) fields.display_name = data.display_name;
      if (data.config_json !== undefined) fields.config_json = JSON.stringify(data.config_json);
      if (Object.keys(fields).length) await this.repo.updateFields(connection, id, fields);
      await this.audit(connection, actor, row.business_unit_id, 'integration.update', id, row.integration_code, `Memperbarui koneksi integrasi ${row.display_name}.`, { display_name: data.display_name, config_json: data.config_json });
      return { id };
    });
  }

  async updateCredentials(actor: IntegrationActor, id: number, data: { secrets: Record<string, string>; expected_updated_at?: string }) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      if (data.expected_updated_at && toIso(row.updated_at) !== data.expected_updated_at) {
        throw new AppError(409, 'INTEGRATION_VERSION_CONFLICT', 'Integrasi telah diperbarui oleh pengguna lain. Muat ulang sebelum menyimpan.');
      }
      for (const [secretName, value] of Object.entries(data.secrets)) {
        await this.secrets.setSecret(connection, { organizationId: actor.organization_id, integrationId: id, secretName, value, userId: actor.id });
      }
      await this.audit(connection, actor, row.business_unit_id, 'integration.credentials.update', id, row.integration_code, `Memperbarui kredensial integrasi ${row.display_name}.`, { credential_fields_changed: Object.keys(data.secrets), credential_configured: true });
      return this.secrets.listMetadata(connection, id);
    });
  }

  async deleteCredential(actor: IntegrationActor, id: number, secretName: string) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      const removed = await this.secrets.deleteSecret(connection, id, secretName);
      await this.audit(connection, actor, row.business_unit_id, 'integration.credentials.remove', id, row.integration_code, `Menghapus kredensial "${secretName}" pada integrasi ${row.display_name}.`, { secret_name: secretName, credential_configured: false });
      return { removed };
    });
  }

  async testConnection(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'sync');
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'sync');
      if (row.status_code === 'disabled') throw new AppError(409, 'INTEGRATION_DISABLED', 'Integrasi sedang dinonaktifkan.');
      const connector = integrationConnectorRegistry.get(row.integration_type, row.provider_name);
      if (!connector) throw new AppError(409, 'INTEGRATION_CAPABILITY_UNAVAILABLE', 'Connector belum tersedia untuk provider ini.');

      const startedAt = isoNow();
      const config = safeJson(row.config_json);
      const context = { organizationId: row.organization_id, businessUnitId: row.business_unit_id, integrationId: row.id, config, getSecret: (secretName: string) => this.secrets.getSecret(connection, { organizationId: row.organization_id, integrationId: row.id, secretName }) };

      let outcome: { connected: boolean; message: string; metadata?: Record<string, unknown> };
      try {
        outcome = await connector.testConnection(context);
      } catch (error) {
        outcome = { connected: false, message: error instanceof Error ? error.message : 'Uji koneksi gagal.' };
      }

      const safeMessage = sanitizeMessage(outcome.message);
      const nextStatus = outcome.connected ? 'connected' : 'error';
      await this.repo.updateFields(connection, id, { status_code: nextStatus });
      await this.repo.insertSyncLog(connection, {
        integrationId: id, syncType: 'connection_test', direction: 'outbound', statusCode: outcome.connected ? 'success' : 'failed',
        startedAt, finishedAt: isoNow(), errorMessage: outcome.connected ? null : safeMessage, metadata: sanitizeMetadata(outcome.metadata),
      });
      await this.audit(connection, actor, row.business_unit_id, 'integration.test', id, row.integration_code, `Menguji koneksi integrasi ${row.display_name}.`, { connected: outcome.connected });
      await connection.commit();
      return { connected: outcome.connected, message: safeMessage || outcome.message, status_code: nextStatus };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async syncConnection(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'sync');
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'sync');
      if (row.status_code === 'disabled') throw new AppError(409, 'INTEGRATION_DISABLED', 'Integrasi sedang dinonaktifkan.');
      if (row.status_code !== 'connected') throw new AppError(409, 'INTEGRATION_NOT_CONNECTED', 'Integrasi belum terhubung. Uji koneksi terlebih dahulu.');
      const connector = integrationConnectorRegistry.get(row.integration_type, row.provider_name);
      if (!connector || !connector.sync) throw new AppError(409, 'INTEGRATION_CAPABILITY_UNAVAILABLE', 'Sinkronisasi belum tersedia untuk connector ini.');

      const startedAt = isoNow();
      const config = safeJson(row.config_json);
      const context = { organizationId: row.organization_id, businessUnitId: row.business_unit_id, integrationId: row.id, config, getSecret: (secretName: string) => this.secrets.getSecret(connection, { organizationId: row.organization_id, integrationId: row.id, secretName }) };

      let result: Awaited<ReturnType<NonNullable<typeof connector.sync>>>;
      try {
        result = await connector.sync(context);
      } catch (error) {
        result = { status: 'failed', recordsProcessed: 0, recordsSuccess: 0, recordsFailed: 0, message: error instanceof Error ? error.message : 'Sinkronisasi gagal.' };
      }

      const safeMessage = sanitizeMessage(result.message);
      const succeeded = result.status === 'success' || result.status === 'partial';
      await this.repo.updateFields(connection, id, succeeded ? { status_code: 'connected', last_sync_at: isoNow() } : { status_code: 'error' });
      await this.repo.insertSyncLog(connection, {
        integrationId: id, syncType: 'sync', direction: 'inbound', statusCode: result.status,
        startedAt, finishedAt: isoNow(), recordsProcessed: result.recordsProcessed, recordsSuccess: result.recordsSuccess, recordsFailed: result.recordsFailed,
        errorMessage: succeeded ? null : safeMessage, metadata: sanitizeMetadata(result.metadata),
      });
      await this.audit(connection, actor, row.business_unit_id, 'integration.sync', id, row.integration_code, `Menjalankan sinkronisasi integrasi ${row.display_name}.`, { status: result.status, records_processed: result.recordsProcessed });
      await connection.commit();
      if (!succeeded) throw new AppError(502, 'INTEGRATION_SYNC_FAILED', safeMessage || 'Sinkronisasi gagal.', { records_processed: result.recordsProcessed });
      return { status: result.status, records_processed: result.recordsProcessed, records_success: result.recordsSuccess, records_failed: result.recordsFailed, message: safeMessage || result.message };
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  async enable(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      await this.repo.updateFields(connection, id, { status_code: 'not_connected' });
      await this.audit(connection, actor, row.business_unit_id, 'integration.enable', id, row.integration_code, `Mengaktifkan kembali integrasi ${row.display_name}.`);
      return { id, status_code: 'not_connected' as const };
    });
  }

  async disable(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      await this.repo.updateFields(connection, id, { status_code: 'disabled' });
      await this.audit(connection, actor, row.business_unit_id, 'integration.disable', id, row.integration_code, `Menonaktifkan integrasi ${row.display_name}.`);
      return { id, status_code: 'disabled' as const };
    });
  }

  async disconnect(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'manage');
    return withTransaction(async (connection) => {
      const row = await this.lockVisible(connection, actor, id);
      this.access.requireDomain(actor, row.integration_type, 'manage');
      await this.secrets.deleteAllSecrets(connection, id);
      await this.repo.updateFields(connection, id, { status_code: 'not_connected' });
      await this.audit(connection, actor, row.business_unit_id, 'integration.disconnect', id, row.integration_code, `Memutuskan integrasi ${row.display_name} dan menghapus kredensial.`);
      return { id, status_code: 'not_connected' as const };
    });
  }

  async listLogs(actor: IntegrationActor, filters: { integrationId?: number; status?: string; syncType?: string }) {
    this.access.requireGlobal(actor, 'read');
    const excludeTypes = await this.excludedTypesFor(actor);
    const visibility = await this.access.visibilityClause(actor, 'i');
    return this.repo.listLogs(actor.organization_id, visibility.clause, visibility.params, excludeTypes, filters);
  }

  async getLog(actor: IntegrationActor, id: number) {
    this.access.requireGlobal(actor, 'read');
    const visibility = await this.access.visibilityClause(actor, 'i');
    const row = await this.repo.getLog(id, actor.organization_id, visibility.clause, visibility.params);
    if (!row) throw new NotFoundError('Riwayat integrasi tidak ditemukan.');
    this.access.requireDomain(actor, row.integration_type, 'read');
    return row;
  }
}

export const integrationsService = new IntegrationsService();
