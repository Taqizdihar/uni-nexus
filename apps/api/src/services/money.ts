import { Decimal } from 'decimal.js';
import { AppError } from '../lib/errors.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type DecimalInput = string | number | { toString(): string } | null | undefined;
export const decimal = (value: DecimalInput): Decimal => new Decimal(value == null ? '0' : value.toString());
export const money = (value: DecimalInput): string => decimal(value).toFixed(2);
export const sumMoney = (values: DecimalInput[]): string => money(values.reduce<Decimal>((sum, value) => sum.plus(decimal(value)), new Decimal(0)));
export function nonnegative(value: DecimalInput, label = 'Amount'): Decimal {
  const amount = decimal(value);
  if (!amount.isFinite() || amount.isNegative()) throw new AppError(422, `${label} must be a finite nonnegative amount.`);
  return amount;
}
export function lineTotal(quantity: DecimalInput, unitPrice: DecimalInput): string {
  return nonnegative(quantity, 'Quantity').mul(nonnegative(unitPrice, 'Unit price')).toFixed(2);
}
export function documentTotal(subtotal: DecimalInput, discount: DecimalInput, additional: DecimalInput = '0'): string {
  const total = nonnegative(subtotal, 'Subtotal').minus(nonnegative(discount, 'Discount')).plus(nonnegative(additional, 'Additional cost'));
  if (total.isNegative()) throw new AppError(422, 'Discount cannot exceed the subtotal plus additional cost.');
  return total.toFixed(2);
}
export function estimatePrice(rule: { price_per_gram: DecimalInput; minimum_price: DecimalInput; design_fee: DecimalInput; finishing_fee: DecimalInput }, grams: DecimalInput) {
  const materialPrice = nonnegative(grams, 'Billable grams').mul(nonnegative(rule.price_per_gram, 'Price per gram'));
  const basePrice = Decimal.max(materialPrice, nonnegative(rule.minimum_price, 'Minimum price'));
  const total = basePrice.plus(nonnegative(rule.design_fee, 'Design fee')).plus(nonnegative(rule.finishing_fee, 'Finishing fee'));
  return { materialPrice: money(materialPrice), basePrice: money(basePrice), designFee: money(rule.design_fee), finishingFee: money(rule.finishing_fee), total: money(total) };
}
