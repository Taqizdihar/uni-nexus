import { createReadStream } from 'node:fs';
import { access, lstat, mkdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors/AppError';
import { assertStorageKey } from './storage-path';
import { storageRoot, tempDirectory } from './storage.config';
import type { StorageDriver } from './storage.types';

const isInside = (root: string, target: string) => target !== root && target.startsWith(`${root}${path.sep}`);

export class LocalStorageDriver implements StorageDriver {
  readonly root = storageRoot;

  async bootstrap() { await mkdir(this.root, { recursive: true }); await mkdir(tempDirectory, { recursive: true }); }

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
    await rename(tempPath, target);
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
  async delete(key: string) { try { const target = this.safeResolve(key); await this.assertNoEscapingSymlink(target); await rm(target, { force: true }); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; } }
  async move(fromKey: string, toKey: string) { const from = this.safeResolve(fromKey); const to = this.safeResolve(toKey); await this.assertNoEscapingSymlink(from); await this.assertNoEscapingSymlink(to); await mkdir(path.dirname(to), { recursive: true }); await rename(from, to); }
}
