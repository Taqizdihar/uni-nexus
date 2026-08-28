import path from 'path';
import { realpathSync } from 'fs';
import { AppError } from '../errors/AppError';

/**
 * This file always lives at `server/src/shared/storage/storage-path.ts` (and mirrors to
 * `server/dist/shared/storage/storage-path.js`), so walking up three directories from here
 * reaches `server/` the same way whether we run under tsx, compiled dist, or a one-off script.
 * Do NOT resolve storage paths from `process.cwd()` elsewhere — it changes depending on how the
 * process was launched (repo root vs `server/`) and silently splits storage across two roots.
 */
export const SERVER_ROOT = path.resolve(__dirname, '..', '..', '..');

const FORBIDDEN_KEY_PATTERN = /\.\.|\0|^[a-zA-Z]:|^[\\/]{2}/;

/**
 * Validates a storage key is a safe, relative, POSIX-style path with no traversal, no absolute
 * roots, no drive letters, no UNC prefixes, and no NUL bytes — on either Windows or POSIX input.
 */
export function assertSafeStorageKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new AppError(400, 'STORAGE_PATH_INVALID', 'Kunci penyimpanan tidak valid.');
  }
  const normalized = key.replace(/\\/g, '/').trim();
  if (
    !normalized ||
    normalized.startsWith('/') ||
    FORBIDDEN_KEY_PATTERN.test(normalized) ||
    normalized.split('/').some(segment => segment === '..' || segment === '.')
  ) {
    throw new AppError(400, 'STORAGE_PATH_INVALID', 'Kunci penyimpanan tidak valid.');
  }
  return normalized;
}

/** Always POSIX-style, even when constructed from Windows path segments. */
export function toStorageKey(...segments: string[]): string {
  return segments.map(segment => segment.replace(/\\/g, '/')).join('/').replace(/\/+/g, '/');
}

/** Strips path separators/control characters and caps length for embedding in a physical filename. */
export function safeOriginalNameSegment(originalName: string): string {
  return path.basename(originalName).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120) || 'file';
}

/**
 * For domains whose schema has no separate original-filename column, the display name rides
 * along in the physical filename as `<uuid>__<safe-original-name>`. This recovers it for display
 * and download headers; keys without the `__` marker (e.g. plain `<uuid>.ext`) fall back as-is.
 */
export function displayNameFromKey(key: string, fallback = 'file'): string {
  const fileName = path.posix.basename(key);
  const separator = fileName.indexOf('__');
  return (separator === -1 ? fileName : fileName.slice(separator + 2)) || fallback;
}

/**
 * Resolves a storage key to an absolute path strictly inside `root`, rejecting traversal and
 * refusing to follow a symlink that would escape the root (checked via the parent directory's
 * real path, since the target file itself may not exist yet on a write).
 */
export function safeResolveWithinRoot(root: string, key: string): string {
  const safeKey = assertSafeStorageKey(key);
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, safeKey);
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    throw new AppError(400, 'STORAGE_PATH_INVALID', 'Lokasi file berada di luar direktori penyimpanan.');
  }

  let checkDir = path.dirname(target);
  while (checkDir.length >= resolvedRoot.length) {
    try {
      const real = realpathSync(checkDir);
      if (real !== checkDir && !real.startsWith(resolvedRoot + path.sep) && real !== resolvedRoot) {
        throw new AppError(400, 'STORAGE_PATH_INVALID', 'Lokasi file melewati tautan simbolik yang tidak diizinkan.');
      }
      break;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        const parent = path.dirname(checkDir);
        if (parent === checkDir) break;
        checkDir = parent;
        continue;
      }
      throw error;
    }
  }
  return target;
}
