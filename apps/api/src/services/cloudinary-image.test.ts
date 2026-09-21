import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  config: vi.fn(),
  uploader: {
    upload_stream: vi.fn(),
    destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
  },
  url: vi.fn().mockReturnValue('https://signed.example.test/private-image'),
}));
vi.mock('cloudinary', () => ({ v2: sdk }));

import { CloudinaryImageService } from './storage.js';

describe('CloudinaryImageService', () => {
  it('uses stable-ID asset folders and persists the Cloudinary identity returned by the SDK', async () => {
    sdk.uploader.upload_stream.mockImplementation((_options: unknown, callback: (error: null, value: Record<string, unknown>) => void) => ({
      end: () => callback(null, { public_id: 'generated-id', asset_id: 'asset-id', bytes: 21, secure_url: 'https://cdn.example.test/image', asset_folder: 'uni-nexus/pets/pet-5/states/idle', resource_type: 'image', format: 'avif', version: 7, width: 80, height: 80 }),
    }));
    const service = new CloudinaryImageService({ cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret', folderRoot: 'uni-nexus' });
    const image = await service.upload({ bytes: Buffer.from('image'), assetFolder: 'pets/pet-5/states/idle' });
    expect(sdk.uploader.upload_stream).toHaveBeenCalledWith(expect.objectContaining({ asset_folder: 'uni-nexus/pets/pet-5/states/idle', resource_type: 'image', overwrite: false }), expect.any(Function));
    expect(image).toMatchObject({ provider: 'CLOUDINARY', key: 'generated-id', assetId: 'asset-id', publicUrl: 'https://cdn.example.test/image' });
    await service.remove('generated-id');
    expect(sdk.uploader.destroy).toHaveBeenCalledWith('generated-id', expect.objectContaining({ invalidate: true }));
  });
});
