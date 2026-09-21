import { describe, expect, it } from 'vitest';
import { carouselOffset, nextCarouselIndex } from './team.js';

describe('team carousel indices', () => {
  it('centers the only member and does not move it', () => { expect(carouselOffset(0, 0, 1)).toBe(0); expect(nextCarouselIndex(0, 1, 1)).toBe(0); });
  it('supports two members without a duplicate third position', () => { expect(carouselOffset(0, 0, 2)).toBe(0); expect(carouselOffset(1, 0, 2)).toBe(1); });
  it('wraps backward from the first member and forward from the last member', () => { expect(nextCarouselIndex(0, 3, -1)).toBe(2); expect(nextCarouselIndex(2, 3, 1)).toBe(0); });
  it('keeps offsets adjacent for a three-member circular carousel', () => { expect(carouselOffset(2, 0, 3)).toBe(-1); expect(carouselOffset(0, 2, 3)).toBe(1); });
});
