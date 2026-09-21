import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const apiRoot = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });
dotenv.config({ path: path.resolve(apiRoot, '../../.env'), quiet: true });

const boolean = z.enum(['true', 'false']).transform((value) => value === 'true');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('mysql://'), 'Use a mysql:// connection URL'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(s|m|h|d)?$/)
    .default('8h'),
  COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('uni_nexus_session'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  ALLOW_PUBLIC_SIGNUP: boolean.optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default(path.join(apiRoot, 'uploads')),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  CLOUDINARY_FOLDER_ROOT: z.string().trim().default('uni-nexus'),
  MAX_UPLOAD_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024)
    .default(25 * 1024 * 1024),
});

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // Do not print connection strings or other values when configuration is invalid.
    throw new Error(
      `Invalid environment configuration: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }
  const value = parsed.data;
  const production = value.NODE_ENV === 'production';
  if (production && !value.JWT_SECRET)
    throw new Error('JWT_SECRET is required in production (at least 32 characters).');
  if (value.STORAGE_DRIVER === 'cloudinary') {
    const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
      .filter((key) => !value[key as keyof typeof value]);
    if (missing.length) throw new Error(`Invalid Cloudinary configuration: ${missing.join(', ')} must be set.`);
  }
  const origins = (value.CORS_ORIGINS ?? value.FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain explicit HTTP(S) origins.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== origin ||
      (production && url.protocol !== 'https:')
    ) {
      throw new Error(
        'CORS_ORIGINS must contain explicit origins without paths; production requires HTTPS.',
      );
    }
  }
  if (origins.length === 0) throw new Error('At least one explicit CORS origin is required.');
  if (!production && value.COOKIE_SAME_SITE === 'none')
    throw new Error('SameSite=None requires production HTTPS.');
  if (production && new URL(value.FRONTEND_URL).protocol !== 'https:')
    throw new Error('FRONTEND_URL must use HTTPS in production.');
  const match = /^(\d+)(s|m|h|d)?$/.exec(value.JWT_EXPIRES_IN)!;
  const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? 's'] ?? 1);
  if (!Number.isSafeInteger(seconds) || seconds < 60 || seconds > 7 * 86400)
    throw new Error('JWT_EXPIRES_IN must be between 60 seconds and 7 days.');
  return {
    ...value,
    JWT_SECRET: value.JWT_SECRET ?? randomBytes(48).toString('hex'),
    JWT_EXPIRES_IN: seconds,
    CORS_ORIGINS: origins,
    ALLOW_PUBLIC_SIGNUP: value.ALLOW_PUBLIC_SIGNUP ?? !production,
    LOCAL_STORAGE_PATH: path.resolve(apiRoot, value.LOCAL_STORAGE_PATH),
  };
}

export const env = parseEnvironment(process.env);
