import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('API URL configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it.each([
    [undefined, ''],
    ['', ''],
    ['/', ''],
    ['/api', ''],
    ['/api/', ''],
    ['/api/v1', ''],
    [' /api/v1/// ', ''],
    ['https://nexus.uniinside.net', 'https://nexus.uniinside.net'],
    ['https://nexus.uniinside.net/', 'https://nexus.uniinside.net'],
    ['https://nexus.uniinside.net/api', 'https://nexus.uniinside.net'],
    [' https://nexus.uniinside.net/api/v1/ ', 'https://nexus.uniinside.net'],
    ['https://api-nexus.uniinside.net/api', 'https://api-nexus.uniinside.net'],
  ])('requests auth and resolves media without duplicating the API prefix for %j', async (configured, origin) => {
    vi.stubEnv('VITE_API_URL', configured);
    vi.resetModules();
    const { api, assetUrl } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: { allowPublicSignup: false } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/auth/config')).resolves.toEqual({ data: { allowPublicSignup: false } });
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/api/v1/auth/config`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(assetUrl('/api/v1/profile/assets/7/PROFILE_PHOTO')).toBe(
      `${origin}/api/v1/profile/assets/7/PROFILE_PHOTO`,
    );
  });
});
