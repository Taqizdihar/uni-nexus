import { describe, expect, it } from 'vitest';
import { createPetSchema, updatePetSchema } from './validation.js';

const complete = { code: 'Happy Fox', name: 'Happy Fox', subtitle: 'A friendly pet', description: 'A complete description.' };

describe('Pet metadata validation', () => {
  it.each(['code', 'name', 'subtitle', 'description'])('rejects a missing %s on create', (field) => {
    const input = { ...complete, [field]: undefined };
    expect(() => createPetSchema.parse(input)).toThrow();
  });

  it('rejects whitespace-only required values', () => {
    expect(() => createPetSchema.parse({ ...complete, description: '   ' })).toThrow('Deskripsi Pet wajib diisi.');
  });

  it('normalizes a complete custom Pet code', () => {
    expect(createPetSchema.parse(complete)).toMatchObject({ code: 'HAPPY_FOX', name: 'Happy Fox' });
  });

  it('allows partial nullable edits for built-in records', () => {
    expect(updatePetSchema.parse({ name: 'Azzy Custom' })).toEqual({ name: 'Azzy Custom' });
    expect(updatePetSchema.parse({ code: '   ' })).toEqual({ code: null });
  });
});
