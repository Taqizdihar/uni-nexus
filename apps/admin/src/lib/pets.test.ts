import { describe, expect, it } from 'vitest';
import { PET_BUILTIN_ASSETS, displayPetName, resolvePetImage } from './pets';

describe('built-in Pet Idle assets', () => {
  it.each([
    ['UNI_INU', 'Uni-Inu/Idle/Uni-Inu.avif'],
    ['AZZY', 'Azzy/Idle/Azzy.avif'],
    ['CIPHER', 'Cipher/Idle/Cipher.avif'],
    ['CRAFTY_CAT', 'Crafty Cat/Idle/Crafty Cat.avif'],
    ['DESSY', 'Dessy/Idle/Dessy.avif'],
  ])('%s resolves to an AVIF Idle asset', (code, expected) => {
    expect(decodeURIComponent(PET_BUILTIN_ASSETS[code]!)).toContain(expected);
    expect(PET_BUILTIN_ASSETS[code]!).not.toMatch(/\.png$/);
  });

  it('falls back safely when metadata is nullable', () => {
    expect(displayPetName({ builtin_key: null, code: 'TEST_PET', name: null })).toBe('Test Pet');
    expect(displayPetName({ builtin_key: 'AZZY', code: null, name: null })).toBe('Azzy');
  });

  it('resolves built-in artwork by builtin_key and gives uploaded artwork priority', () => {
    const pet = { builtin_key: 'AZZY', code: 'RENAMED', name: null, image_storage_provider: 'LOCAL', image_url: null };
    expect(decodeURIComponent(resolvePetImage(pet)!)).toContain('Azzy/Idle/Azzy.avif');
    expect(resolvePetImage({ ...pet, image_url: 'https://cdn.example.test/azzy.avif' })).toBe('https://cdn.example.test/azzy.avif');
  });
});
