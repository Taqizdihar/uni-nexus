import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('uni-nexus'),
  JWT_SECRET: z.string().default('change-this-development-secret'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // UPLOAD_DIR remains a deprecated alias while existing local deployments move
  // to STORAGE_DIR.  Shared storage is the only code allowed to consume it.
  UPLOAD_DIR: z.string().default('uploads'),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_DIR: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().default('/uploads'),
  BOOTSTRAP_CTO_EMAIL: z.string().email().optional(),
  // Base64-encoded 32-byte AES-256-GCM key for the Integration credential vault.
  // Intentionally optional here so the server still boots without it; the vault
  // itself fails closed with INTEGRATION_SECRET_KEY_NOT_CONFIGURED if a secret
  // operation is attempted while this is unset or malformed.
  INTEGRATION_SECRET_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
