import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

type SecretExecutor = Pick<PoolConnection, 'execute'>;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const CURRENT_KEY_VERSION = 1;

/** Resolves and validates the vault master key. Never logs or returns the key material. */
function resolveKey(): Buffer {
  const raw = env.INTEGRATION_SECRET_KEY;
  if (!raw) throw new AppError(503, 'INTEGRATION_SECRET_KEY_NOT_CONFIGURED', 'Kunci enkripsi kredensial integrasi belum dikonfigurasi.');
  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new AppError(503, 'INTEGRATION_SECRET_KEY_NOT_CONFIGURED', 'Kunci enkripsi kredensial integrasi tidak valid.');
  }
  if (key.length !== 32) throw new AppError(503, 'INTEGRATION_SECRET_KEY_NOT_CONFIGURED', 'Kunci enkripsi kredensial integrasi harus 32 byte setelah decode base64.');
  return key;
}

/** Binds ciphertext to its owning row so it cannot be swapped between integrations/secrets. */
function buildAad(organizationId: number, integrationId: number, secretName: string, keyVersion: number): Buffer {
  return Buffer.from(`${organizationId}:${integrationId}:${secretName}:${keyVersion}`, 'utf8');
}

export interface IntegrationSecretMetadata {
  secret_name: string;
  configured: true;
  key_version: number;
  updated_at: string;
}

/**
 * Sole owner of the integration_secrets vault. AES-256-GCM with a random 12-byte
 * IV per write and AAD binding to (organization, integration, secret name, key
 * version). No controller may decrypt secrets directly — only this service does,
 * and only for internal use (never returned through an API response).
 */
export class IntegrationSecretService {
  async setSecret(
    connection: SecretExecutor,
    params: { organizationId: number; integrationId: number; secretName: string; value: string; userId: number | null },
  ): Promise<void> {
    const key = resolveKey();
    const iv = randomBytes(IV_LENGTH);
    const aad = buildAad(params.organizationId, params.integrationId, params.secretName, CURRENT_KEY_VERSION);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(params.value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    await connection.execute(
      `INSERT INTO integration_secrets (integration_id, secret_name, key_version, ciphertext, iv, auth_tag, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE key_version=VALUES(key_version), ciphertext=VALUES(ciphertext), iv=VALUES(iv), auth_tag=VALUES(auth_tag), updated_by=VALUES(updated_by)`,
      [params.integrationId, params.secretName, CURRENT_KEY_VERSION, ciphertext, iv, authTag, params.userId, params.userId],
    );
  }

  /** Internal use only (connectors). Never expose the return value through an API response, Audit, or a log. */
  async getSecret(connection: SecretExecutor, params: { organizationId: number; integrationId: number; secretName: string }): Promise<string | null> {
    const [rows]: any = await connection.execute(
      `SELECT ciphertext, iv, auth_tag, key_version FROM integration_secrets WHERE integration_id=? AND secret_name=? LIMIT 1`,
      [params.integrationId, params.secretName],
    );
    if (!rows.length) return null;
    const row = rows[0];
    const key = resolveKey();
    const aad = buildAad(params.organizationId, params.integrationId, params.secretName, Number(row.key_version));
    const decipher = createDecipheriv(ALGORITHM, key, row.iv as Buffer);
    decipher.setAAD(aad);
    decipher.setAuthTag(row.auth_tag as Buffer);
    try {
      const plaintext = Buffer.concat([decipher.update(row.ciphertext as Buffer), decipher.final()]);
      return plaintext.toString('utf8');
    } catch {
      // Auth-tag failure must never fall back to returning unauthenticated plaintext.
      throw new AppError(500, 'INTEGRATION_SECRET_DECRYPT_FAILED', 'Kredensial integrasi tidak dapat didekripsi.');
    }
  }

  async hasSecret(connection: SecretExecutor, integrationId: number, secretName: string): Promise<boolean> {
    const [rows]: any = await connection.execute(`SELECT id FROM integration_secrets WHERE integration_id=? AND secret_name=? LIMIT 1`, [integrationId, secretName]);
    return rows.length > 0;
  }

  async listMetadata(connection: SecretExecutor, integrationId: number): Promise<IntegrationSecretMetadata[]> {
    const [rows]: any = await connection.execute(`SELECT secret_name, key_version, updated_at FROM integration_secrets WHERE integration_id=? ORDER BY secret_name`, [integrationId]);
    return rows.map((row: any) => ({ secret_name: row.secret_name, configured: true as const, key_version: Number(row.key_version), updated_at: row.updated_at }));
  }

  async deleteSecret(connection: SecretExecutor, integrationId: number, secretName: string): Promise<boolean> {
    const [result]: any = await connection.execute(`DELETE FROM integration_secrets WHERE integration_id=? AND secret_name=?`, [integrationId, secretName]);
    return result.affectedRows > 0;
  }

  async deleteAllSecrets(connection: SecretExecutor, integrationId: number): Promise<number> {
    const [result]: any = await connection.execute(`DELETE FROM integration_secrets WHERE integration_id=?`, [integrationId]);
    return result.affectedRows;
  }
}

export const integrationSecretService = new IntegrationSecretService();
