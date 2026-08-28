import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Response } from 'express';
import { AppError, NotFoundError } from '../errors/AppError';
import { validateFile } from './file-validation';
import { LocalStorageDriver } from './local-storage.driver';
import { displayNameFromKey, safeOriginalName } from './storage-path';
import { storagePublicBaseUrl, tempDirectory } from './storage.config';
import { getStoragePolicy } from './storage-policy.registry';
import type { StorageDriver, StoragePolicyName, StorageScope, StoredFile } from './storage.types';

const mimeFor = (extension: string, declared?: string) => declared || ({ '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.csv': 'text/csv; charset=utf-8', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }[extension] || 'application/octet-stream');
const safeHeaderName = (value: string) => safeOriginalName(value).replace(/["\\]/g, '_');

export class StorageService {
  constructor(readonly driver: StorageDriver = new LocalStorageDriver()) {}
  get root() { return this.driver.root; }
  get tempDirectory() { return tempDirectory; }
  async bootstrap() { await this.driver.bootstrap(); }

  getPublicUrl(key: string) {
    this.driver.safeResolve(key);
    if (!key.startsWith('avatars/')) throw new AppError(400, 'FILE_NOT_PUBLIC', 'File ini tidak dapat diakses secara publik.');
    return `${storagePublicBaseUrl}/${key}`;
  }

  private keyFor(policyName: StoragePolicyName, originalName: string, scope: StorageScope) {
    const policy = getStoragePolicy(policyName);
    const name = safeOriginalName(originalName);
    const extension = path.extname(name).toLowerCase();
    const physical = policy.preserveOriginalInKey ? `${randomUUID()}__${name}` : `${randomUUID()}${extension}`;
    return `${policy.destination(scope)}/${physical}`;
  }

  async saveUploadedFile(policyName: StoragePolicyName, file: Express.Multer.File, scope: StorageScope = {}): Promise<StoredFile> {
    if (!file?.path) throw new AppError(400, 'UPLOAD_REQUIRED', 'File unggahan tidak ditemukan.');
    const policy = getStoragePolicy(policyName);
    try {
      const checked = await validateFile(file.path, file.originalname, file.mimetype, policy);
      const key = this.keyFor(policyName, checked.originalName, scope);
      await this.driver.finalize(file.path, key);
      return { key, file_name: path.posix.basename(key), original_name: checked.originalName, extension: checked.extension, mime_type: mimeFor(checked.extension, checked.mimeType), size_bytes: checked.size, checksum_sha256: checked.checksum, ...(policy.visibility === 'public' ? { public_url: `${storagePublicBaseUrl}/${key}` } : {}) };
    } catch (error) {
      await rm(file.path, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  /** Validates a staged upload and always removes it after its short-lived consumer has read it. */
  async consumeStagedUpload(policyName: StoragePolicyName, file: Express.Multer.File): Promise<Buffer> {
    if (!file?.path) throw new AppError(400, 'UPLOAD_REQUIRED', 'File unggahan tidak ditemukan.');
    try {
      await validateFile(file.path, file.originalname, file.mimetype, getStoragePolicy(policyName));
      return await readFile(file.path);
    } finally { await rm(file.path, { force: true }).catch(() => undefined); }
  }

  async writeBuffer(policyName: StoragePolicyName, body: Buffer, originalName: string, scope: StorageScope = {}): Promise<StoredFile> {
    const policy = getStoragePolicy(policyName);
    const safeName = safeOriginalName(originalName);
    const extension = path.extname(safeName).toLowerCase();
    if (!policy.extensions.includes(extension)) throw new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Jenis file tidak didukung untuk penyimpanan ini.');
    if (body.length > policy.maxBytes) throw new AppError(413, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas penyimpanan.');
    const key = this.keyFor(policyName, safeName, scope);
    try {
      await this.driver.writeBuffer(key, body);
      const checksum = await validateFile(this.driver.safeResolve(key), safeName, mimeFor(extension), policy).then(result => result.checksum);
      return { key, file_name: path.posix.basename(key), original_name: safeName, extension, mime_type: mimeFor(extension), size_bytes: body.length, checksum_sha256: checksum, ...(policy.visibility === 'public' ? { public_url: `${storagePublicBaseUrl}/${key}` } : {}) };
    } catch (error) {
      await this.driver.delete(key).catch(() => undefined);
      throw error;
    }
  }

  async exists(key: string) { return this.driver.exists(key); }
  async delete(key: string | null | undefined) { if (key) await this.driver.delete(key); }
  async stat(key: string) { return this.driver.stat(key); }
  safeResolve(key: string) { return this.driver.safeResolve(key); }

  async streamToResponse(res: Response, key: string, options: { filename?: string; mimeType?: string; disposition?: 'inline' | 'attachment'; cacheControl?: string } = {}) {
    try {
      const [stream, info] = await Promise.all([this.driver.createReadStream(key), this.driver.stat(key)]);
      const name = safeHeaderName(options.filename || displayNameFromKey(key));
      const disposition = options.disposition || 'attachment';
      res.setHeader('Content-Type', options.mimeType || mimeFor(path.extname(name).toLowerCase()));
      res.setHeader('Content-Length', String(info.size));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', options.cacheControl || 'private, no-store');
      res.setHeader('Content-Disposition', `${disposition}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
      stream.on('error', error => { if (!res.headersSent) res.destroy(error); else res.destroy(error); });
      stream.pipe(res);
    } catch (error: any) {
      if (error?.code === 'ENOENT') throw new NotFoundError('File tidak ditemukan pada penyimpanan.');
      throw error;
    }
  }

  async stageBuffer(body: Buffer, originalName = 'file.bin') {
    await mkdir(tempDirectory, { recursive: true });
    const extension = path.extname(safeOriginalName(originalName));
    const target = path.join(tempDirectory, `${randomUUID()}${extension}`);
    await writeFile(target, body, { flag: 'wx' });
    return target;
  }

  async cleanupTemp(maxAgeMs = 24 * 60 * 60 * 1000) {
    await mkdir(tempDirectory, { recursive: true });
    let removed = 0;
    for (const entry of await readdir(tempDirectory, { withFileTypes: true })) {
      const target = path.join(tempDirectory, entry.name);
      if (!entry.isFile()) continue;
      const fileStat = await stat(target);
      if (Date.now() - fileStat.mtimeMs > maxAgeMs) { await rm(target, { force: true }); removed += 1; }
    }
    return { removed };
  }
}

export const storageService = new StorageService();
