import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError';
import { getStoragePolicy } from './storage-policy.registry';
import { extensionOf } from './storage-path';
import { storageService } from './storage.service';
import type { StoragePolicyName } from './storage.types';

/** Every user upload is staged in uploads/temp; domains finalize only after ownership checks. */
export const createUpload = (policyName: StoragePolicyName) => {
  const policy = getStoragePolicy(policyName);
  return multer({
    storage: multer.diskStorage({
      destination: storageService.tempDirectory,
      filename: (_req, file, callback) => callback(null, `${randomUUID()}${extensionOf(file.originalname)}`),
    }),
    limits: { fileSize: policy.maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!policy.extensions.includes(extensionOf(file.originalname))) {
        callback(new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Jenis file tidak didukung untuk unggahan ini.'));
        return;
      }
      if (file.mimetype && file.mimetype !== 'application/octet-stream' && !policy.mimeTypes.includes(file.mimetype.toLowerCase())) {
        callback(new AppError(400, 'UNSUPPORTED_FILE_MIME', 'Tipe konten file tidak didukung.'));
        return;
      }
      callback(null, true);
    },
  });
};
