import { AppError } from '../../lib/errors.js';
import {
  decimal,
  estimatePrice,
  money,
  nonnegative,
  type DecimalInput,
} from '../../services/money.js';

type PricingRule = {
  id: bigint | string | number;
  name: string;
  rule_type: string;
  material_id: bigint | string | number | null;
  price_per_gram: DecimalInput;
  minimum_price: DecimalInput;
  design_fee: DecimalInput;
  finishing_fee: DecimalInput;
  additional_config_json?: unknown;
};

type PricingInput = {
  materialId?: bigint | string | number | null;
  billableWeightGram?: DecimalInput;
  manualUnitPrice?: DecimalInput;
  calculatedAt?: Date;
};

function fixedPrice(rule: PricingRule): string {
  const config = rule.additional_config_json;
  const configured =
    config && typeof config === 'object' && !Array.isArray(config)
      ? ((config as Record<string, unknown>).fixed_price ??
        (config as Record<string, unknown>).fixedPrice)
      : undefined;
  if (configured != null) return nonnegative(configured as DecimalInput, 'Fixed price').toFixed(2);
  if (rule.minimum_price != null) return nonnegative(rule.minimum_price, 'Fixed price').toFixed(2);
  throw new AppError(
    422,
    'Aturan harga FIXED memerlukan fixed_price pada konfigurasi atau harga minimum.',
    'PRICING_RULE_INCOMPLETE',
  );
}

function snapshot(
  rule: PricingRule,
  input: PricingInput,
  unitPrice: string,
  breakdown: Record<string, unknown>,
) {
  const calculatedAt = input.calculatedAt ?? new Date();
  return {
    pricing_rule_id: rule.id,
    material_id: input.materialId ?? null,
    billable_weight_gram:
      input.billableWeightGram == null
        ? null
        : nonnegative(input.billableWeightGram, 'Billable grams').toFixed(3),
    pricing_rule_name_snapshot: rule.name,
    pricing_rule_type_snapshot: rule.rule_type,
    price_per_gram_snapshot:
      rule.price_per_gram == null
        ? null
        : nonnegative(rule.price_per_gram, 'Price per gram').toFixed(4),
    minimum_price_snapshot:
      rule.minimum_price == null
        ? null
        : nonnegative(rule.minimum_price, 'Minimum price').toFixed(2),
    design_fee_snapshot: nonnegative(rule.design_fee, 'Design fee').toFixed(2),
    finishing_fee_snapshot: nonnegative(rule.finishing_fee, 'Finishing fee').toFixed(2),
    pricing_breakdown_json: { ...breakdown, unit_price: unitPrice },
    pricing_calculated_at: calculatedAt,
    unit_price: unitPrice,
  };
}

/**
 * The only quote-item pricing calculation. PER_GRAM delegates to the established
 * estimator; FIXED is explicitly configured; CUSTOM always requires a manual price.
 */
export function calculateQuotationItemPricing(rule: PricingRule, input: PricingInput) {
  const type = String(rule.rule_type).toUpperCase();
  if (rule.material_id != null && input.materialId == null) {
    throw new AppError(
      422,
      'Pilih material yang sesuai dengan aturan harga ini.',
      'PRICING_MATERIAL_REQUIRED',
    );
  }
  if (
    rule.material_id != null &&
    input.materialId != null &&
    String(rule.material_id) !== String(input.materialId)
  ) {
    throw new AppError(
      422,
      'Material yang dipilih tidak sesuai dengan aturan harga ini.',
      'PRICING_MATERIAL_MISMATCH',
    );
  }

  if (type === 'PER_GRAM') {
    if (input.materialId == null)
      throw new AppError(
        422,
        'Pilih material untuk aturan harga per gram.',
        'PRICING_MATERIAL_REQUIRED',
      );
    if (input.billableWeightGram == null)
      throw new AppError(422, 'Masukkan berat yang ditagihkan.', 'BILLABLE_WEIGHT_REQUIRED');
    if (rule.price_per_gram == null)
      throw new AppError(
        422,
        'Aturan harga per gram belum memiliki tarif per gram.',
        'PRICING_RULE_INCOMPLETE',
      );
    const grams = nonnegative(input.billableWeightGram, 'Billable grams');
    const estimate = estimatePrice(rule, grams);
    return snapshot(rule, input, estimate.total, {
      version: 1,
      rule_type: type,
      material_price: estimate.materialPrice,
      base_price: estimate.basePrice,
      design_fee: estimate.designFee,
      finishing_fee: estimate.finishingFee,
      billable_weight_gram: grams.toFixed(3),
      lines: [
        { key: 'MATERIAL', label: 'Biaya material', amount: estimate.materialPrice },
        { key: 'BASE', label: 'Harga dasar setelah minimum', amount: estimate.basePrice },
        { key: 'DESIGN', label: 'Biaya desain', amount: estimate.designFee },
        { key: 'FINISHING', label: 'Biaya finishing', amount: estimate.finishingFee },
      ],
    });
  }

  if (type === 'FIXED') {
    const base = decimal(fixedPrice(rule));
    const designFee = nonnegative(rule.design_fee, 'Design fee');
    const finishingFee = nonnegative(rule.finishing_fee, 'Finishing fee');
    const total = money(base.plus(designFee).plus(finishingFee));
    return snapshot(rule, input, total, {
      version: 1,
      rule_type: type,
      fixed_price: money(base),
      design_fee: money(designFee),
      finishing_fee: money(finishingFee),
      lines: [
        { key: 'FIXED', label: 'Harga tetap', amount: money(base) },
        { key: 'DESIGN', label: 'Biaya desain', amount: money(designFee) },
        { key: 'FINISHING', label: 'Biaya finishing', amount: money(finishingFee) },
      ],
    });
  }

  if (type === 'CUSTOM') {
    if (input.manualUnitPrice == null || String(input.manualUnitPrice).trim() === '') {
      throw new AppError(
        422,
        'Aturan harga CUSTOM memerlukan harga per unit yang diisi secara manual.',
        'CUSTOM_PRICE_REQUIRED',
      );
    }
    const total = nonnegative(input.manualUnitPrice, 'Custom unit price').toFixed(2);
    return snapshot(rule, input, total, {
      version: 1,
      rule_type: type,
      custom_unit_price: total,
      lines: [{ key: 'CUSTOM', label: 'Harga kustom', amount: total }],
    });
  }

  throw new AppError(422, 'Jenis aturan harga tidak didukung.', 'PRICING_RULE_UNSUPPORTED');
}
