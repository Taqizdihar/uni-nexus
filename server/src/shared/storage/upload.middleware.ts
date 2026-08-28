import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { TEMP_DIR } from './storage.config';
import type { StoragePolicy } from './storage.types';

mkdirSync(TEMP_DIR, { recursive: true });

function extnameOf(fileName: string): string {
  const match = /\.[^./\\]+$/.exec(fileName);
  return match ? match[0].toLowerCase() : '';
}

/**
 * One shared Multer configuration, staged under `server/uploads/temp/`. Every domain upload route
 * uses this instead of its own `multer.diskStorage`, so temp-file naming, size limits, and the
 * coarse extension/MIME reject all come from a single, server-controlled `StoragePolicy` — the
 * client can never request a different destination or looser limit.
 */
function tempUpload(policy: StoragePolicy) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, TEMP_DIR),
      filename: (_req, file, callback) => callback(null, `${randomUUID()}${extnameOf(file.originalname)}`),
    }),
    limits: { fileSize: policy.maxSizeBytes },
    fileFilter: (_req, file, callback) => {
      const extension = extnameOf(file.originalname);
      if (!policy.allowedExtensions.includes(extension)) {
        callback(new AppError(415, 'FILE_TYPE_NOT_ALLOWED', `Ekstensi file tidak didukung. Gunakan: ${policy.allowedExtensions.join(', ')}.`));
        return;
      }
      if (policy.allowedMimeTypes.length && file.mimetype && !policy.allowedMimeTypes.includes(file.mimetype)) {
        callback(new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Tipe MIME file tidak sesuai dengan ekstensinya.'));
        return;
      }
      callback(null, true);
    },
  });
}

function toAppError(error: unknown): unknown {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new AppError(413, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas maksimum.');
    return new AppError(400, 'FILE_REQUIRED', 'Gagal memproses unggahan file.', { multerCode: error.code });
  }
  return error;
}

/** Express middleware: stages a single multipart field into temp storage under `policy`'s limits. */
export function singleFileUpload(policy: StoragePolicy, fieldName: string) {
  const middleware = tempUpload(policy).single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error: unknown) => {
      if (error) { next(toAppError(error)); return; }
      next();
    });
  };
}
