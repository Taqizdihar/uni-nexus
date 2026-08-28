import path from 'path';
import { env } from '../../config/env';
import { SERVER_ROOT } from './storage-path';

if (env.STORAGE_DRIVER !== 'local') {
  // Only the local driver exists today; fail fast rather than silently falling back.
  console.error(`Unsupported STORAGE_DRIVER "${env.STORAGE_DRIVER}". Only "local" is implemented.`);
  process.exit(1);
}

/** Absolute path to the canonical local storage root: <repo>/server/uploads. */
export const STORAGE_ROOT = path.resolve(SERVER_ROOT, env.STORAGE_DIR);
export const TEMP_STORAGE_KEY = 'temp';
export const TEMP_DIR = path.join(STORAGE_ROOT, TEMP_STORAGE_KEY);

/** Categories served publicly (no auth) through a narrow, explicitly-whitelisted static mount. */
export const PUBLIC_CATEGORIES = new Set<string>(['avatars']);

export const STORAGE_PUBLIC_BASE_URL = env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, '');

/** Temp files older than this are considered abandoned uploads and safe to remove. */
export const TEMP_FILE_RETENTION_MS = 24 * 60 * 60 * 1000;
