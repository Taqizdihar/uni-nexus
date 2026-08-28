import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { TEMP_DIR, TEMP_FILE_RETENTION_MS } from './storage.config';

/**
 * Sweeps `server/uploads/temp/` for abandoned uploads — files left behind by a crashed request,
 * a client that never completed its POST, or a validation failure that somehow skipped cleanup.
 * Never touches category directories; only ever looks inside `temp/`.
 */
export class StorageCleanupService {
  async cleanupTempFiles(maxAgeMs: number = TEMP_FILE_RETENTION_MS): Promise<{ scanned: number; removed: number; errors: number }> {
    let entries: string[];
    try {
      entries = await readdir(TEMP_DIR);
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { scanned: 0, removed: 0, errors: 0 };
      console.error('StorageCleanupService: failed to read temp directory:', error?.message || error);
      return { scanned: 0, removed: 0, errors: 1 };
    }

    let removed = 0;
    let errors = 0;
    const cutoff = Date.now() - maxAgeMs;

    for (const entry of entries) {
      const fullPath = path.join(TEMP_DIR, entry);
      try {
        const info = await stat(fullPath);
        if (!info.isFile() || info.mtimeMs > cutoff) continue;
        await unlink(fullPath);
        removed += 1;
      } catch (error: any) {
        if (error?.code === 'ENOENT') continue;
        errors += 1;
        console.warn(`StorageCleanupService: could not remove stale temp file "${entry}":`, error?.message || error);
      }
    }
    return { scanned: entries.length, removed, errors };
  }

  /** Runs once at startup, then every few hours; `unref()` so it never blocks process shutdown. */
  schedulePeriodicCleanup(intervalMs: number = 4 * 60 * 60 * 1000): void {
    void this.cleanupTempFiles().then(result => {
      if (result.removed > 0) console.log(`Storage cleanup: removed ${result.removed} stale temp file(s) of ${result.scanned} scanned.`);
    });
    const timer = setInterval(() => {
      void this.cleanupTempFiles().then(result => {
        if (result.removed > 0) console.log(`Storage cleanup: removed ${result.removed} stale temp file(s) of ${result.scanned} scanned.`);
      });
    }, intervalMs);
    timer.unref();
  }
}

export const storageCleanupService = new StorageCleanupService();
