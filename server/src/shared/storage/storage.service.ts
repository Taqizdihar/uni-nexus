import { createHash, randomUUID } from 'crypto';
import { open, stat as statFile, unlink } from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/AppError';
import { sanitizeOriginalName, validateAgainstPolicy } from './file-validation';
import { LocalStorageDriver, localStorageDriver } from './local-storage.driver';
import { TEMP_STORAGE_KEY } from './storage.config';
import { toStorageKey } from './storage-path';
import type { StorageDriver, StoragePolicy, StoredFileResult } from './storage.types';

const HEAD_BUFFER_SIZE = 4100;

async function readHead(filePath: string, length: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function sha256File(filePath: string): Promise<string> {
  const handle = await open(filePath, 'r');
  try {
    const hash = createHash('sha256');
    const stream = handle.createReadStream();
    for await (const chunk of stream) hash.update(chunk as Buffer);
    return hash.digest('hex');
  } finally {
    await handle.close();
  }
}

export interface SaveUploadedFileInput {
  /** Absolute path of the Multer temp-staged file (`req.file.path`). */
  tempFilePath: string;
  originalName: string;
  mimeType: string | null | undefined;
  policy: StoragePolicy;
  /** Final storage key this file will live at once validated. Build with `storageService.buildKey`. */
  key: string;
  computeChecksum?: boolean;
}

/**
 * The only entry point business modules should use for file I/O. Wraps a `StorageDriver` (local
 * disk today; an R2/S3/MinIO driver implementing the same `StorageDriver` interface tomorrow)
 * with policy validation, safe key generation, and atomic writes — no module should touch `fs`
 * or resolve its own upload directory directly.
 */
export class StorageService {
  constructor(private readonly driver: StorageDriver = localStorageDriver) {}

  /** `category/segment1/segment2/<uuid>.<ext>` — always POSIX-style, never client-controlled. */
  buildKey(category: string, extension: string, ...folderSegments: Array<string | number>): string {
    const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
    return toStorageKey(category, ...folderSegments.map(String), `${randomUUID()}${safeExtension}`);
  }

  /**
   * Validates a temp-staged upload against `policy` (extension, MIME, size, magic-byte signature)
   * and finalizes it into place. On validation failure the temp file is removed and the error is
   * rethrown — callers never need their own cleanup for this path.
   */
  async saveUploadedFile(input: SaveUploadedFileInput): Promise<StoredFileResult> {
    let sizeBytes: number;
    try {
      const stat = await this.driverStatOfAbsolute(input.tempFilePath);
      sizeBytes = stat.sizeBytes;
      const headBuffer = await readHead(input.tempFilePath, HEAD_BUFFER_SIZE);
      validateAgainstPolicy(input.policy, {
        originalName: input.originalName, mimeType: input.mimeType, sizeBytes, headBuffer,
      });
    } catch (error) {
      await unlink(input.tempFilePath).catch(() => undefined);
      throw error;
    }

    const checksumSha256 = input.computeChecksum ? await sha256File(input.tempFilePath) : undefined;
    await this.driver.finalize(input.tempFilePath, input.key);

    return {
      key: input.key,
      fileName: path.posix.basename(input.key),
      originalName: sanitizeOriginalName(input.originalName),
      extension: path.extname(input.key).toLowerCase(),
      mimeType: input.mimeType || null,
      sizeBytes,
      checksumSha256,
      publicUrl: this.driver.publicUrl(input.key),
    };
  }

  /** Best-effort temp cleanup for a caller-side validation failure before `saveUploadedFile` runs. */
  async discardTempFile(tempFilePath: string | null | undefined): Promise<void> {
    if (!tempFilePath) return;
    await unlink(tempFilePath).catch(() => undefined);
  }

  /**
   * Atomically writes a server-generated buffer (a rendered PDF, a report export) by staging it
   * under `temp/` first and finalizing with a rename — a crash mid-write can never leave a
   * truncated file at the official key.
   */
  async finalizeBuffer(key: string, data: Buffer): Promise<StoredFileResult> {
    const stagingKey = toStorageKey(TEMP_STORAGE_KEY, `${randomUUID()}.tmp`);
    await this.driver.writeBuffer(stagingKey, data);
    const stagingAbsolutePath = this.driver.absolutePath(stagingKey);
    await this.driver.finalize(stagingAbsolutePath, key);
    return {
      key, fileName: path.posix.basename(key), originalName: path.posix.basename(key),
      extension: path.extname(key).toLowerCase(), mimeType: null, sizeBytes: data.length, publicUrl: this.driver.publicUrl(key),
    };
  }

  createReadStream(key: string): NodeJS.ReadableStream {
    return this.driver.createReadStream(key);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  stat(key: string) {
    return this.driver.stat(key);
  }

  /** For `res.sendFile`/`res.download` only — never return this value to the frontend. */
  absolutePath(key: string): string {
    return this.driver.absolutePath(key);
  }

  getPublicUrl(key: string): string | undefined {
    return this.driver.publicUrl(key);
  }

  /** Strict delete: rethrows on anything other than a missing file. */
  delete(key: string | null | undefined): Promise<void> {
    if (!key) return Promise.resolve();
    return this.driver.delete(key);
  }

  /** For best-effort cleanup (e.g. removing the previous file after a replace already committed). */
  async deleteQuietly(key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await this.driver.delete(key);
    } catch (error) {
      console.warn(`StorageService: could not delete "${key}":`, (error as Error)?.message || error);
    }
  }

  move(fromKey: string, toKey: string): Promise<void> {
    return this.driver.move(fromKey, toKey);
  }

  private async driverStatOfAbsolute(absolutePath: string) {
    // Temp files are addressed by absolute path (Multer gives us one directly), not by key.
    const info = await statFile(absolutePath).catch(() => {
      throw new AppError(400, 'FILE_REQUIRED', 'File yang diunggah tidak ditemukan.');
    });
    return { sizeBytes: info.size };
  }
}

export const storageService = new StorageService();
export { LocalStorageDriver };
