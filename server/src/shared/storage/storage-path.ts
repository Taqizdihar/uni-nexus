import path from 'node:path';
import { AppError } from '../errors/AppError';

const CONTROL = /[\x00-\x1F\x7F]/;

/** Storage keys are portable database values, never local filesystem paths. */
export const assertStorageKey = (value: string): string => {
  if (!value || typeof value !== 'string' || CONTROL.test(value) || value.includes('\\')) {
    throw new AppError(400, 'INVALID_STORAGE_PATH', 'Lokasi file tidak valid.');
  }
  const key = value;
  if (!key || path.posix.isAbsolute(key) || /^[A-Za-z]:/.test(key) || key.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new AppError(400, 'INVALID_STORAGE_PATH', 'Lokasi file tidak valid.');
  }
  return key;
};

export const safeOriginalName = (value: string | undefined | null, fallback = 'file') => {
  const base = path.basename(String(value || fallback)).replace(CONTROL, '').replace(/[\\/:*?"<>|]+/g, '_').trim();
  return (base || fallback).slice(0, 180);
};

export const extensionOf = (name: string) => path.extname(name).toLowerCase();

export const numericScope = (value: number | undefined, label: string) => {
  if (!Number.isInteger(value) || !value || value < 1) throw new AppError(400, 'INVALID_STORAGE_SCOPE', `${label} tidak valid.`);
  return String(value);
};

export const displayNameFromKey = (key: string, fallback = 'file') => {
  const fileName = path.posix.basename(assertStorageKey(key));
  const preserved = fileName.indexOf('__');
  return safeOriginalName(preserved >= 0 ? fileName.slice(preserved + 2) : fileName, fallback);
};
