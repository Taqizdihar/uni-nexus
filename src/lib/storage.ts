import { API_URL } from './api';

const PUBLIC_PROFILE_PREFIXES = ['avatars/', 'profile-banners/'];

/** Resolves canonical object-storage keys without making them browser-relative. */
export const resolvePublicStorageUrl = (key?: string | null): string | null => {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  if (!PUBLIC_PROFILE_PREFIXES.some(prefix => key.startsWith(prefix))) return null;
  return `${API_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${key}`;
};
