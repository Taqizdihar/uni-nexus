import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { AppError } from '../errors/AppError';
import { extensionOf, safeOriginalName } from './storage-path';
import type { StoragePolicy } from './storage.types';

const hasPrefix = (body: Buffer, values: number[]) => values.every((value, index) => body[index] === value);
const isWebp = (body: Buffer) => body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP';
const isZip = (body: Buffer) => hasPrefix(body, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(body, [0x50, 0x4b, 0x05, 0x06]) || hasPrefix(body, [0x50, 0x4b, 0x07, 0x08]);

const matchesSignature = (extension: string, body: Buffer) => {
  if (extension === '.jpg' || extension === '.jpeg') return hasPrefix(body, [0xff, 0xd8, 0xff]);
  if (extension === '.png') return hasPrefix(body, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === '.webp') return isWebp(body);
  if (extension === '.pdf') return body.subarray(0, 5).toString('ascii') === '%PDF-';
  if (['.zip', '.docx', '.xlsx', '.pptx', '.3mf'].includes(extension)) return isZip(body);
  return true;
};

export interface ValidatedUpload {
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  checksum: string;
}

export const validateFile = async (filePath: string, originalName: string, declaredMime: string | undefined, policy: StoragePolicy): Promise<ValidatedUpload> => {
  const safeName = safeOriginalName(originalName);
  const extension = extensionOf(safeName);
  if (!policy.extensions.includes(extension)) throw new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Jenis file tidak didukung untuk unggahan ini.');
  const fileStat = await stat(filePath);
  if (fileStat.size > policy.maxBytes) throw new AppError(413, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas unggahan.');
  const declaredBaseMime = declaredMime?.split(';', 1)[0].trim().toLowerCase();
  if (declaredBaseMime && declaredBaseMime !== 'application/octet-stream' && !policy.mimeTypes.includes(declaredBaseMime)) {
    throw new AppError(400, 'UNSUPPORTED_FILE_MIME', 'Tipe konten file tidak didukung.');
  }
  const body = await readFile(filePath);
  if (policy.signatureExtensions?.includes(extension) && !matchesSignature(extension, body.subarray(0, 32))) {
    throw new AppError(400, 'INVALID_FILE_CONTENT', 'Isi file tidak cocok dengan format yang dipilih.');
  }
  return { originalName: safeName, extension, mimeType: declaredMime || 'application/octet-stream', size: Number(fileStat.size), checksum: createHash('sha256').update(body).digest('hex') };
};
