import { describe, expect, it } from 'vitest';
import { documentTotal, estimatePrice, lineTotal, sumMoney } from './money.js';

describe('precise costing', () => {
  it('does not lose cents with fractional quantities or large totals', () => {
    expect(lineTotal('0.1', '0.2')).toBe('0.02');
    expect(lineTotal('3.333', '100.01')).toBe('333.33');
    expect(sumMoney(['99999999999.99', '0.01'])).toBe('100000000000.00');
    expect(documentTotal('100000.10', '0.09', '0.01')).toBe('100000.02');
  });
  it('uses a database rule, applies the minimum before configured fees', () => {
    const rule = { price_per_gram: '225.1234', minimum_price: '10000.00', design_fee: '750.00', finishing_fee: '250.50' };
    expect(estimatePrice(rule, '20.123')).toEqual({ materialPrice: '4530.16', basePrice: '10000.00', designFee: '750.00', finishingFee: '250.50', total: '11000.50' });
    expect(estimatePrice(rule, '100').total).toBe('23512.84');
  });
  it('rejects over-discounts and negative consumption', () => {
    expect(() => documentTotal('100', '100.01')).toThrow('Discount cannot exceed');
    expect(() => lineTotal('-1', '100')).toThrow('nonnegative');
  });
});
