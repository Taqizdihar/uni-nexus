import { createReadStream } from 'fs';
import { access, mkdir, rename, stat, unlink, writeFile, copyFile } from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/AppError';
import { PUBLIC_CATEGORIES, STORAGE_PUBLIC_BASE_URL, STORAGE_ROOT } from './storage.config';
import { safeResolveWithinRoot } from './storage-path';
import type { StorageDriver, StorageStat } from './storage.types';

/** Bounded retry for transient Windows file-lock errors (EPERM/EBUSY) during replace/delete. */
async function withLockRetry<T>(operation: () => Promise<T>, attempts = 3, delayMs = 100): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly root: string = STORAGE_ROOT) {}

  absolutePath(key: string): string {
    return safeResolveWithinRoot(this.root, key);
  }

  publicUrl(key: string): string | undefined {
    const category = key.split('/')[0];
    if (!PUBLIC_CATEGORIES.has(category)) return undefined;
    return `${STORAGE_PUBLIC_BASE_URL}/${key}`;
  }

  async finalize(sourceAbsolutePath: string, key: string): Promise<void> {
    const target = this.absolutePath(key);
    try {
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await withLockRetry(() => rename(sourceAbsolutePath, target));
      } catch (error: any) {
        // rename() fails across filesystems/devices (EXDEV) — fall back to copy + remove source.
        if (error?.code !== 'EXDEV') throw error;
        await copyFile(sourceAbsolutePath, target);
        await unlink(sourceAbsolutePath).catch(() => undefined);
      }
    } catch (error) {
      throw new AppError(500, 'STORAGE_WRITE_FAILED', 'Gagal menyimpan file ke penyimpanan lokal.', { cause: (error as Error)?.message });
    }
  }

  async writeBuffer(key: string, data: Buffer): Promise<void> {
    const target = this.absolutePath(key);
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
    } catch (error) {
      throw new AppError(500, 'STORAGE_WRITE_FAILED', 'Gagal menulis file ke penyimpanan lokal.', { cause: (error as Error)?.message });
    }
  }

  createReadStream(key: string): NodeJS.ReadableStream {
    return createReadStream(this.absolutePath(key));
  }

  async exists(key: string): Promise<boolean> {
    // Resolved outside the try: an invalid/traversal key is a real error (400), not "not found".
    const target = this.absolutePath(key);
    try {
      await access(target);
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<StorageStat> {
    const target = this.absolutePath(key);
    try {
      const info = await stat(target);
      return { sizeBytes: info.size, modifiedAt: info.mtime, isFile: info.isFile() };
    } catch (error: any) {
      if (error?.code === 'ENOENT') throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas tidak ditemukan di penyimpanan.');
      throw new AppError(500, 'STORAGE_READ_FAILED', 'Gagal membaca metadata file.', { cause: error?.message });
    }
  }

  /** Idempotent: deleting an already-missing file is not an error. */
  async delete(key: string): Promise<void> {
    const target = this.absolutePath(key);
    try {
      await withLockRetry(() => unlink(target));
    } catch (error: any) {
      if (error?.code === 'ENOENT') return;
      throw new AppError(500, 'STORAGE_DELETE_FAILED', 'Gagal menghapus file dari penyimpanan.', { cause: error?.message });
    }
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const from = this.absolutePath(fromKey);
    const to = this.absolutePath(toKey);
    try {
      await mkdir(path.dirname(to), { recursive: true });
      await withLockRetry(() => rename(from, to));
    } catch (error) {
      throw new AppError(500, 'STORAGE_WRITE_FAILED', 'Gagal memindahkan file di penyimpanan lokal.', { cause: (error as Error)?.message });
    }
  }
}

export const localStorageDriver = new LocalStorageDriver();
