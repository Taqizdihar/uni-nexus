import { describe, expect, it } from 'vitest';
import { calculateQuotationItemPricing } from './pricing.js';

const perGram = {
  id: 1n,
  name: 'Harga Basic PLA Rp500/gram',
  rule_type: 'PER_GRAM',
  material_id: 2n,
  price_per_gram: '500.0000',
  minimum_price: '10000.00',
  design_fee: '0.00',
  finishing_fee: '0.00',
};

describe('quotation pricing snapshots', () => {
  it('calculates a per-gram quote and preserves every input snapshot', () => {
    const result = calculateQuotationItemPricing(perGram, {
      materialId: 2n,
      billableWeightGram: '40.000',
      calculatedAt: new Date('2026-09-20T00:00:00Z'),
    });
    expect(result.unit_price).toBe('20000.00');
    expect(result.pricing_rule_id).toBe(1n);
    expect(result.material_id).toBe(2n);
    expect(result.billable_weight_gram).toBe('40.000');
    expect(result.price_per_gram_snapshot).toBe('500.0000');
    expect(result.pricing_rule_name_snapshot).toBe('Harga Basic PLA Rp500/gram');
    expect(result.pricing_breakdown_json).toMatchObject({
      material_price: '20000.00',
      unit_price: '20000.00',
    });
  });

  it('applies the configured minimum and does not retroactively alter an old snapshot', () => {
    const historical = calculateQuotationItemPricing(perGram, {
      materialId: 2n,
      billableWeightGram: '10.000',
    });
    const changedRule = { ...perGram, price_per_gram: '600.0000' };
    const future = calculateQuotationItemPricing(changedRule, {
      materialId: 2n,
      billableWeightGram: '40.000',
    });
    expect(historical.unit_price).toBe('10000.00');
    expect(historical.price_per_gram_snapshot).toBe('500.0000');
    expect(future.unit_price).toBe('24000.00');
  });

  it('keeps fixed and custom pricing explicit', () => {
    const fixed = calculateQuotationItemPricing(
      {
        ...perGram,
        id: 3n,
        rule_type: 'FIXED',
        price_per_gram: null,
        minimum_price: null,
        design_fee: '1000',
        finishing_fee: '500',
        additional_config_json: { fixed_price: '12000' },
      },
      { materialId: 2n },
    );
    const custom = calculateQuotationItemPricing(
      { ...perGram, id: 4n, rule_type: 'CUSTOM', price_per_gram: null, minimum_price: null },
      { materialId: 2n, manualUnitPrice: '17500' },
    );
    expect(fixed.unit_price).toBe('13500.00');
    expect(custom.unit_price).toBe('17500.00');
    expect(custom.pricing_breakdown_json).toMatchObject({ rule_type: 'CUSTOM' });
  });

  it('requires a matching material when the rule is material-specific', () => {
    expect(() => calculateQuotationItemPricing(perGram, { billableWeightGram: '40.000' })).toThrow(
      'Pilih material',
    );
    expect(() =>
      calculateQuotationItemPricing(perGram, { materialId: 8n, billableWeightGram: '40.000' }),
    ).toThrow('tidak sesuai');
  });
});
