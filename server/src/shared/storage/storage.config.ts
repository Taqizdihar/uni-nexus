import path from 'node:path';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

/**
 * __dirname is stable for both tsx (server/src/shared/storage) and compiled
 * JavaScript (server/dist/shared/storage).  Moving three levels always reaches
 * server/, unlike process.cwd() which varies for scripts and npm prefixes.
 */
export const serverRoot = path.resolve(__dirname, '../../..');

const requestedDirectory = env.STORAGE_DIR || env.UPLOAD_DIR || 'uploads';
if (path.isAbsolute(requestedDirectory) || requestedDirectory.split(/[\\/]+/).includes('..') || requestedDirectory.replace(/[\\/]+/g, '/') !== 'uploads') {
  throw new AppError(500, 'INVALID_STORAGE_DIR', 'STORAGE_DIR harus bernilai "uploads" agar seluruh file berada di bawah server/uploads.');
}

export const storageRoot = path.resolve(serverRoot, requestedDirectory);
if (storageRoot !== serverRoot && !storageRoot.startsWith(`${serverRoot}${path.sep}`)) {
  throw new AppError(500, 'INVALID_STORAGE_DIR', 'STORAGE_DIR berada di luar direktori server.');
}

export const tempDirectory = path.join(storageRoot, 'temp');
export const storagePublicBaseUrl = env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, '') || '/uploads';
