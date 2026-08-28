import { API_URL } from './api';

/** Backend origin, derived from the configured API URL (e.g. `http://localhost:3001`). */
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Builds the public URL for a stored avatar. The database only ever stores a storage key
 * (e.g. `avatars/<uuid>.webp`), never a full URL — the frontend constructs it here so the
 * backend origin can change (or the driver can move to object storage) without touching data.
 */
export function getAvatarUrl(avatarKey?: string | null): string | undefined {
  if (!avatarKey) return undefined;
  if (/^https?:\/\//i.test(avatarKey)) return avatarKey;
  return `${API_ORIGIN}/uploads/${avatarKey.replace(/^\/+/, '')}`;
}
