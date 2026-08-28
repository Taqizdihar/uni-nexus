import { storageService } from './storage.service';

/** Temp cleanup is deliberately limited to staging files; it never deletes domain data. */
export const cleanupStorageTemp = (maxAgeMs?: number) => storageService.cleanupTemp(maxAgeMs);
