import { mkdtemp, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalStorageService, validateUpload } from './storage.js';

describe('private local storage', () => {
  it('stores generated keys within a workspace and rejects traversal', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'uni-nexus-storage-test-'));
    const service = new LocalStorageService(directory);
    let key: string | undefined;
    try {
      const object = await service.save(17n, Buffer.from('private model'));
      key = object.key;
      expect(object.key).toMatch(/^17\/[a-f0-9-]{36}$/);
      expect(await service.exists(object.key)).toBe(true);
      expect(() => service.absolutePath('../secret')).toThrow('Invalid storage');
      expect(() => service.absolutePath('17/../../secret')).toThrow('Invalid storage');
    } finally {
      if (key) await service.remove(key);
      await rmdir(path.join(directory, '17'));
      await rmdir(directory);
    }
  });
  it('rejects executable formats, mismatched types, and forged image headers', () => {
    const file = { originalname: 'payload.html', mimetype: 'text/html', size: 6, buffer: Buffer.from('<html>') };
    expect(() => validateUpload(file, 1024)).toThrow('Unsupported');
    expect(() => validateUpload({ ...file, originalname: 'photo.png', mimetype: 'image/png' }, 1024)).toThrow('content does not match');
    expect(() => validateUpload({ ...file, originalname: 'notes.txt' }, 1024)).toThrow('MIME');
  });
  it('requires valid size and permits a sanitized PDF download name', () => {
    const file = { originalname: '..\\reference.pdf', mimetype: 'application/pdf', size: 9, buffer: Buffer.from('%PDF-1.7\n') };
    expect(validateUpload(file, 1024).filename).toBe('reference.pdf');
    expect(() => validateUpload(file, 4)).toThrow('exceeds');
    expect(() => validateUpload(file, 1024, true)).toThrow('Unsupported');
  });
  it('validates AVIF using its ISO-BMFF ftyp brand', () => {
    const avif = Buffer.alloc(24);
    avif.writeUInt32BE(24, 0);
    avif.write('ftyp', 4, 'ascii');
    avif.write('avif', 8, 'ascii');
    const file = { originalname: 'pet.avif', mimetype: 'image/avif', size: avif.length, buffer: avif };
    expect(validateUpload(file, 1024, true).mime).toBe('image/avif');
    expect(() => validateUpload({ ...file, buffer: Buffer.alloc(24), size: 24 }, 1024, true)).toThrow('content does not match');
  });
});
