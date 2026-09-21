import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export interface StoredObject { key: string; size: number }
export interface StorageService { save(workspaceId: bigint, bytes: Buffer): Promise<StoredObject>; absolutePath(key: string): string; remove(key: string): Promise<void>; exists(key: string): Promise<boolean> }

export type StoredImage = {
  provider: 'LOCAL' | 'CLOUDINARY'; key: string; size: number; publicUrl: string | null;
  assetId: string | null; assetFolder: string | null; resourceType: string | null;
  format: string | null; version: number | null; width: number | null; height: number | null;
};

/** Image storage deliberately has no filesystem operations: Cloudinary identities are not paths. */
export interface ImageStorageService {
  upload(input: { bytes: Buffer; assetFolder: string; private?: boolean; localScope?: bigint }): Promise<StoredImage>;
  remove(key: string): Promise<void>;
  authenticatedUrl(key: string): string | null;
}
export class LocalStorageService implements StorageService {
  private readonly root: string;
  constructor(root: string) { this.root = path.resolve(root); }
  absolutePath(key: string): string {
    if (!/^\d+\/[a-f0-9-]{36}$/.test(key)) throw new AppError(400, 'Invalid storage reference.');
    const fullPath = path.resolve(this.root, ...key.split('/'));
    if (!fullPath.startsWith(`${this.root}${path.sep}`)) throw new AppError(400, 'Invalid storage reference.');
    return fullPath;
  }
  async save(workspaceId: bigint, bytes: Buffer): Promise<StoredObject> {
    const key = `${workspaceId.toString()}/${randomUUID()}`;
    const target = this.absolutePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    return { key, size: bytes.length };
  }
  async remove(key: string): Promise<void> { await unlink(this.absolutePath(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
  async exists(key: string): Promise<boolean> { return stat(this.absolutePath(key)).then((result) => result.isFile(), () => false); }
}

class LocalImageStorageService implements ImageStorageService {
  constructor(private readonly storage: LocalStorageService) {}
  async upload(input: { bytes: Buffer; assetFolder: string; private?: boolean; localScope?: bigint }): Promise<StoredImage> {
    const saved = await this.storage.save(input.localScope ?? 0n, input.bytes);
    return { provider: 'LOCAL', key: saved.key, size: saved.size, publicUrl: null, assetId: null, assetFolder: null, resourceType: 'image', format: null, version: null, width: null, height: null };
  }
  remove(key: string) { return this.storage.remove(key); }
  authenticatedUrl() { return null; }
}

export class CloudinaryImageService implements ImageStorageService {
  constructor(private readonly configuration: { cloudName: string; apiKey: string; apiSecret: string; folderRoot: string }) {
    cloudinary.config({ cloud_name: configuration.cloudName, api_key: configuration.apiKey, api_secret: configuration.apiSecret, secure: true });
  }
  async upload(input: { bytes: Buffer; assetFolder: string; private?: boolean; localScope?: bigint }): Promise<StoredImage> {
    const assetFolder = `${this.configuration.folderRoot.replace(/^\/+|\/+$/g, '')}/${input.assetFolder.replace(/^\/+|\/+$/g, '')}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        resource_type: 'image', type: input.private ? 'authenticated' : 'upload', asset_folder: assetFolder, public_id: randomUUID(),
        overwrite: false, unique_filename: false, use_filename: false,
      }, (error, upload) => error || !upload ? reject(error ?? new Error('Cloudinary did not return an upload result.')) : resolve(upload));
      stream.end(input.bytes);
    });
    return {
      provider: 'CLOUDINARY', key: result.public_id, size: result.bytes, publicUrl: result.secure_url,
      assetId: result.asset_id, assetFolder: result.asset_folder ?? assetFolder,
      resourceType: result.resource_type, format: result.format, version: result.version,
      width: result.width ?? null, height: result.height ?? null,
    };
  }
  async remove(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true });
  }
  authenticatedUrl(key: string): string | null {
    return cloudinary.url(key, { resource_type: 'image', type: 'authenticated', secure: true, sign_url: true });
  }
}

let imageStorage: ImageStorageService | undefined;
export function createImageStorageService(): ImageStorageService {
  if (imageStorage) return imageStorage;
  imageStorage = env.STORAGE_DRIVER === 'cloudinary'
    ? new CloudinaryImageService({ cloudName: env.CLOUDINARY_CLOUD_NAME!, apiKey: env.CLOUDINARY_API_KEY!, apiSecret: env.CLOUDINARY_API_SECRET!, folderRoot: env.CLOUDINARY_FOLDER_ROOT })
    : new LocalImageStorageService(new LocalStorageService(env.LOCAL_STORAGE_PATH ?? 'uploads'));
  return imageStorage;
}

const allowedTypes: Record<string, string[]> = {
  '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.webp': ['image/webp'], '.gif': ['image/gif'], '.avif': ['image/avif'], '.pdf': ['application/pdf'],
  '.stl': ['model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream'], '.3mf': ['model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml', 'application/zip', 'application/octet-stream'],
  '.obj': ['model/obj', 'text/plain', 'application/octet-stream'], '.blend': ['application/x-blender', 'application/octet-stream'],
  '.gcode': ['text/plain', 'text/x-gcode', 'application/octet-stream'], '.txt': ['text/plain'], '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
};
export const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

function hasAvifSignature(bytes: Buffer): boolean {
  if (bytes.length < 16 || bytes.subarray(4, 8).toString() !== 'ftyp') return false;
  const boxSize = bytes.readUInt32BE(0);
  const end = boxSize >= 16 && boxSize <= bytes.length ? boxSize : bytes.length;
  if (bytes.subarray(8, 12).toString() === 'avif' || bytes.subarray(8, 12).toString() === 'avis') return true;
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    const brand = bytes.subarray(offset, offset + 4).toString();
    if (brand === 'avif' || brand === 'avis') return true;
  }
  return false;
}
export function validateUpload(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }, maxSize: number, imageOnly = false): { filename: string; mime: string; extension: string } {
  // eslint-disable-next-line no-control-regex -- intentionally stripping control characters from user-supplied filenames
  const filename = file.originalname.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) ?? '';
  const extension = path.extname(filename).toLowerCase();
  const accepted = allowedTypes[extension];
  if (!filename || !accepted || (imageOnly && !imageExtensions.has(extension))) throw new AppError(422, 'Unsupported file extension. Use a supported image, PDF, STL, 3MF, OBJ, BLEND, G-code, or text file.');
  if (file.size <= 0 || file.size > maxSize || file.buffer.length !== file.size) throw new AppError(413, 'File is empty or exceeds the configured upload limit.');
  if (!accepted.includes(file.mimetype.toLowerCase())) throw new AppError(422, 'The MIME type does not match the file extension.');
  const bytes = file.buffer;
  const prefix = bytes.subarray(0, 16);
  let valid = true;
  if (extension === '.png') valid = prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === '.jpg' || extension === '.jpeg') valid = prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255;
  if (extension === '.gif') valid = ['GIF87a', 'GIF89a'].includes(prefix.subarray(0, 6).toString());
  if (extension === '.webp') valid = prefix.subarray(0, 4).toString() === 'RIFF' && prefix.subarray(8, 12).toString() === 'WEBP';
  if (extension === '.avif') valid = hasAvifSignature(bytes);
  if (extension === '.pdf') valid = prefix.subarray(0, 5).toString() === '%PDF-';
  if (extension === '.3mf') valid = prefix[0] === 80 && prefix[1] === 75 && prefix[2] === 3 && prefix[3] === 4;
  if (extension === '.blend') valid = prefix.subarray(0, 7).toString() === 'BLENDER';
  if (extension === '.stl') valid = bytes.subarray(0, 80).toString().trimStart().startsWith('solid') || (bytes.length >= 84 && bytes.readUInt32LE(80) * 50 + 84 === bytes.length);
  if (['.obj', '.gcode', '.txt', '.csv'].includes(extension)) valid = !bytes.subarray(0, Math.min(bytes.length, 8192)).includes(0);
  if (!valid) throw new AppError(422, 'The file content does not match the declared file format.');
  return { filename, mime: accepted[0]!, extension };
}
