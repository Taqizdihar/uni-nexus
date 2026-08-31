import { createReadStream } from 'node:fs';
import { access, copyFile, lstat, mkdir, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors/AppError';
import { assertStorageKey } from './storage-path';
import { storageRoot, tempDirectory } from './storage.config';
import type { StorageDriver } from './storage.types';

const isInside = (root: string, target: string) => target !== root && target.startsWith(`${root}${path.sep}`);

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
  readonly root = storageRoot;

  async bootstrap() {
    await mkdir(this.root, { recursive: true });
    await mkdir(tempDirectory, { recursive: true });
    // Fail fast if the volume is mounted read-only rather than waiting for the first upload to discover it.
    const probe = path.join(tempDirectory, `.bootstrap-probe-${process.pid}`);
    await writeFile(probe, 'ok');
    await rm(probe, { force: true });
  }

  safeResolve(key: string) {
    const verified = assertStorageKey(key);
    const absolute = path.resolve(this.root, ...verified.split('/'));
    if (!isInside(this.root, absolute)) throw new AppError(400, 'INVALID_STORAGE_PATH', 'Lokasi file tidak valid.');
    return absolute;
  }

  private async assertNoEscapingSymlink(target: string) {
    const root = await realpath(this.root);
    try {
      const resolved = await realpath(target);
      if (!isInside(root, resolved)) throw new AppError(400, 'INVALID_STORAGE_PATH', 'Lokasi file tidak valid.');
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      let cursor = path.dirname(target);
      while (isInside(this.root, cursor)) {
        try {
          const info = await lstat(cursor);
          if (info.isSymbolicLink()) {
            const resolved = await realpath(cursor);
            if (!isInside(root, resolved)) throw new AppError(400, 'INVALID_STORAGE_PATH', 'Lokasi file tidak valid.');
          }
        } catch (inner: any) { if (inner?.code !== 'ENOENT') throw inner; }
        cursor = path.dirname(cursor);
      }
    }
  }

  async finalize(tempPath: string, key: string) {
    const target = this.safeResolve(key);
    await this.assertNoEscapingSymlink(target);
    await mkdir(path.dirname(target), { recursive: true });
    try {
      await withLockRetry(() => rename(tempPath, target));
    } catch (error: any) {
      // rename() fails across filesystems/devices (EXDEV) — fall back to copy + remove source.
      if (error?.code !== 'EXDEV') throw error;
      await copyFile(tempPath, target);
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }

  async writeBuffer(key: string, body: Buffer) {
    const target = this.safeResolve(key);
    await this.assertNoEscapingSymlink(target);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: 'wx' });
  }

  async createReadStream(key: string) {
    const target = this.safeResolve(key);
    await this.assertNoEscapingSymlink(target);
    await access(target);
    return createReadStream(target);
  }

  async exists(key: string) { try { const target = this.safeResolve(key); await this.assertNoEscapingSymlink(target); await access(target); return true; } catch (error: any) { if (error?.code === 'ENOENT') return false; throw error; } }
  async stat(key: string) { const target = this.safeResolve(key); await this.assertNoEscapingSymlink(target); const result = await stat(target); return { size: Number(result.size), mtime: result.mtime }; }

  /** Idempotent: deleting an already-missing file is not an error. Retries transient Windows file locks. */
  async delete(key: string) {
    try {
      const target = this.safeResolve(key);
      await this.assertNoEscapingSymlink(target);
      await withLockRetry(() => unlink(target));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async move(fromKey: string, toKey: string) {
    const from = this.safeResolve(fromKey);
    const to = this.safeResolve(toKey);
    await this.assertNoEscapingSymlink(from);
    await this.assertNoEscapingSymlink(to);
    await mkdir(path.dirname(to), { recursive: true });
    try {
      await withLockRetry(() => rename(from, to));
    } catch (error: any) {
      if (error?.code !== 'EXDEV') throw error;
      await copyFile(from, to);
      await rm(from, { force: true }).catch(() => undefined);
    }
  }
}
