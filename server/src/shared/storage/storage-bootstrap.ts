import { access, constants, mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';
import { STORAGE_CATEGORIES } from './storage.types';
import { STORAGE_ROOT, TEMP_DIR } from './storage.config';
import { storageCleanupService } from './storage-cleanup.service';

/**
 * Runs once at process start. Category subdirectories are created lazily on first use (per the
 * canonical layout, only `.gitkeep` is tracked in git) — this only guarantees the root and the
 * `temp/` staging directory exist and are actually writable, and fails fast with a clear message
 * instead of waiting for the first customer upload to discover a misconfigured volume.
 */
export async function bootstrapStorage(): Promise<void> {
  if (env.STORAGE_DRIVER !== 'local') {
    console.error(`Fatal storage configuration error: unsupported STORAGE_DRIVER "${env.STORAGE_DRIVER}".`);
    process.exit(1);
  }

  try {
    await mkdir(STORAGE_ROOT, { recursive: true });
    await mkdir(TEMP_DIR, { recursive: true });
    const probe = path.join(TEMP_DIR, `.bootstrap-probe-${process.pid}`);
    await writeFile(probe, 'ok');
    await access(probe, constants.W_OK);
    await unlink(probe);
  } catch (error) {
    console.error('Fatal storage configuration error: local storage root is not writable.', (error as Error)?.message || error);
    process.exit(1);
  }

  storageCleanupService.schedulePeriodicCleanup();

  const relativeRoot = path.relative(path.resolve(STORAGE_ROOT, '..'), STORAGE_ROOT);
  console.log(`Storage: local | Root: ./${relativeRoot} | Writable: yes | Categories: ${STORAGE_CATEGORIES.length}`);
}
