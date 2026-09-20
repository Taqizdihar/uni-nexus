import { describe, expect, it } from 'vitest';
import { paginationRange, rowNumber } from './pagination.js';

describe('Pesanan pagination helpers', () => {
  it('keeps row numbers continuous across pages', () => {
    expect(rowNumber(1, 10, 0)).toBe(1);
    expect(rowNumber(2, 10, 0)).toBe(11);
    expect(rowNumber(9, 10, 6)).toBe(87);
  });

  it('calculates compact page ranges', () => {
    expect(paginationRange(1, 38)).toEqual([1, 2, 3, 'ellipsis', 38]);
    expect(paginationRange(19, 38)).toEqual([1, 'ellipsis', 17, 18, 19, 20, 21, 'ellipsis', 38]);
    expect(paginationRange(38, 38)).toEqual([1, 'ellipsis', 36, 37, 38]);
  });
});
