import { describe, expect, it } from 'vitest';
import { PET_BUILTIN_ASSETS, displayPetName } from './pets';

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
    expect(displayPetName({ code: 'TEST_PET', name: null })).toBe('Test Pet');
    expect(displayPetName({ code: 'AZZY', name: null })).toBe('Azzy');
  });
});
