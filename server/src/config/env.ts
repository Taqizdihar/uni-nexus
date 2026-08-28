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
  // UPLOAD_DIR is deprecated in favor of STORAGE_DIR; kept so existing local .env files keep working.
  UPLOAD_DIR: z.string().default('uploads'),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_DIR: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().default('/uploads'),
  BOOTSTRAP_CTO_EMAIL: z.string().email().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables', _env.error.format());
  process.exit(1);
}

export const env = {
  ..._env.data,
  // STORAGE_DIR wins when set; otherwise fall back to the legacy UPLOAD_DIR value.
  STORAGE_DIR: _env.data.STORAGE_DIR || _env.data.UPLOAD_DIR,
};
