import { describe, expect, it } from 'vitest';
import { assetUrl } from './api';

describe('assetUrl', () => {
  it('keeps a Cloudinary HTTPS URL unchanged', () => {
    expect(assetUrl('https://res.cloudinary.com/demo/image/upload/profile.webp')).toBe('https://res.cloudinary.com/demo/image/upload/profile.webp');
  });
  it('only resolves API-relative media paths', () => {
    expect(assetUrl('/api/v1/profile/assets/7/PROFILE_PHOTO')).toMatch(/\/api\/v1\/profile\/assets\/7\/PROFILE_PHOTO$/);
  });
  it.each(['04bce1ef-f055-4c90-a999-000000000000', 'pets/pet-1/states/idle/frame'])('rejects bare storage identities', (value) => {
    expect(assetUrl(value)).toBeUndefined();
  });
});
