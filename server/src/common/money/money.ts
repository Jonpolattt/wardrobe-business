import { Decimal } from '@prisma/client/runtime/client';

export { Decimal };
export type DecimalInput = Decimal | string | number;

/**
 * Rounding policy (applies to every money value in the application):
 *  - mode: ROUND_HALF_UP ("commercial" rounding, 0.005 → 0.01);
 *  - money amounts: 2 decimal places;
 *  - per-unit cost including cargo: 4 decimal places (kept more precise so that
 *    totals derived from it do not accumulate rounding error);
 *  - markup percent: 2 decimal places.
 * Final values are always derived from the unrounded intermediate values.
 */
export const ROUNDING = Decimal.ROUND_HALF_UP;
export const MONEY_DP = 2;
export const UNIT_DP = 4;
export const PERCENT_DP = 2;

export const ZERO = new Decimal(0);

export const dec = (value: DecimalInput): Decimal => (value instanceof Decimal ? value : new Decimal(value));
export const roundMoney = (value: DecimalInput): Decimal => dec(value).toDecimalPlaces(MONEY_DP, ROUNDING);
export const roundUnit = (value: DecimalInput): Decimal => dec(value).toDecimalPlaces(UNIT_DP, ROUNDING);
export const roundPercent = (value: DecimalInput): Decimal => dec(value).toDecimalPlaces(PERCENT_DP, ROUNDING);
export const sum = (values: DecimalInput[]): Decimal => values.reduce<Decimal>((acc, v) => acc.plus(dec(v)), ZERO);

/** Parses user input such as "12 840,5" into a Decimal; returns null for invalid input. */
export function parseDecimal(raw: unknown): Decimal | null {
  if (raw instanceof Decimal) return raw;
  if (typeof raw === 'number') return Number.isFinite(raw) ? new Decimal(raw) : null;
  if (typeof raw !== 'string') return null;
  const normalized = raw.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return new Decimal(normalized);
}
