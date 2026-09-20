import { describe, expect, it } from 'vitest';
import { filamentSegmentCount } from './special-resource-grids.js';

describe('filament spool segment calculation', () => {
  it.each([[1000, 1000, 4], [1000, 750, 3], [1000, 500, 2], [1000, 250, 1], [1000, 1, 1], [1000, 0, 0], [1000, 1200, 4], [0, 100, 0]])('maps %s/%s to %s segments', (initial, remaining, expected) => {
    expect(filamentSegmentCount(initial, remaining)).toBe(expected);
  });
});
