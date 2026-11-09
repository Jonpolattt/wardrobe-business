import { Decimal, DecimalInput, dec, roundMoney, roundPercent, roundUnit } from './money';

export type PricingMode = 'MARKUP' | 'PRICE';

export interface PurchasePricingInput {
  unitCost: DecimalInput;
  quantity: number;
  cargoTotal?: DecimalInput | null;
  mode: PricingMode;
  markupPercent?: DecimalInput | null;
  salePrice?: DecimalInput | null;
}

export interface PurchasePricing {
  unitCost: Decimal;
  quantity: number;
  cargoTotal: Decimal;
  /** unitCost × quantity */
  purchaseTotal: Decimal;
  /** cargoTotal / quantity */
  cargoPerUnit: Decimal;
  /** unitCost + cargoPerUnit — the real cost of one unit */
  unitCostWithCargo: Decimal;
  /** purchaseTotal + cargoTotal */
  totalCost: Decimal;
  /** (salePrice / unitCostWithCargo − 1) × 100 — markup, NOT margin */
  markupPercent: Decimal;
  /** unitCostWithCargo × (1 + markup / 100) */
  salePrice: Decimal;
  /** salePrice × quantity */
  expectedRevenue: Decimal;
  /** (salePrice − unitCostWithCargo) × quantity */
  expectedProfit: Decimal;
  /** salePrice − unitCostWithCargo */
  unitProfit: Decimal;
}

export type PricingErrorCode =
  | 'QUANTITY_INVALID'
  | 'UNIT_COST_INVALID'
  | 'CARGO_INVALID'
  | 'MARKUP_REQUIRED'
  | 'MARKUP_INVALID'
  | 'SALE_PRICE_REQUIRED'
  | 'SALE_PRICE_INVALID';

export class PricingError extends Error {
  constructor(public readonly code: PricingErrorCode) {
    super(code);
  }
}

/** Upper bound for amounts so that DECIMAL(18,2) can never overflow. */
const MAX_AMOUNT = new Decimal('1e14');

/**
 * Purchase calculations. Used by the backend as the single source of truth;
 * the frontend only shows a preliminary preview with the same formulas.
 */
export function calculatePurchase(input: PurchasePricingInput): PurchasePricing {
  const { quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000_000) {
    throw new PricingError('QUANTITY_INVALID');
  }
  const unitCost = roundMoney(input.unitCost);
  if (unitCost.lte(0) || unitCost.gte(MAX_AMOUNT)) throw new PricingError('UNIT_COST_INVALID');
  const cargoTotal = roundMoney(input.cargoTotal ?? 0);
  if (cargoTotal.lt(0) || cargoTotal.gte(MAX_AMOUNT)) throw new PricingError('CARGO_INVALID');

  const qty = new Decimal(quantity);
  const purchaseTotal = roundMoney(unitCost.times(qty));
  const cargoPerUnitExact = cargoTotal.div(qty);
  const unitCostWithCargoExact = unitCost.plus(cargoPerUnitExact); // > 0 because unitCost > 0

  let markupPercent: Decimal;
  let salePrice: Decimal;
  if (input.mode === 'MARKUP') {
    if (input.markupPercent === null || input.markupPercent === undefined) throw new PricingError('MARKUP_REQUIRED');
    markupPercent = roundPercent(input.markupPercent);
    if (markupPercent.lte(-100) || markupPercent.gt(100_000)) throw new PricingError('MARKUP_INVALID');
    salePrice = roundMoney(unitCostWithCargoExact.times(markupPercent.div(100).plus(1)));
    if (salePrice.lte(0)) throw new PricingError('SALE_PRICE_INVALID');
  } else {
    if (input.salePrice === null || input.salePrice === undefined) throw new PricingError('SALE_PRICE_REQUIRED');
    salePrice = roundMoney(input.salePrice);
    if (salePrice.lte(0) || salePrice.gte(MAX_AMOUNT)) throw new PricingError('SALE_PRICE_INVALID');
    markupPercent = roundPercent(salePrice.div(unitCostWithCargoExact).minus(1).times(100));
  }

  const unitProfitExact = salePrice.minus(unitCostWithCargoExact);
  return {
    unitCost,
    quantity,
    cargoTotal,
    purchaseTotal,
    cargoPerUnit: roundUnit(cargoPerUnitExact),
    unitCostWithCargo: roundUnit(unitCostWithCargoExact),
    totalCost: roundMoney(purchaseTotal.plus(cargoTotal)),
    markupPercent,
    salePrice,
    expectedRevenue: roundMoney(salePrice.times(qty)),
    expectedProfit: roundMoney(unitProfitExact.times(qty)),
    unitProfit: roundMoney(unitProfitExact),
  };
}

/** Converts an amount in `currency` to UZS using the stored rate snapshot. */
export const toUzs = (amount: DecimalInput, fxRateToUzs: DecimalInput): Decimal =>
  roundMoney(dec(amount).times(dec(fxRateToUzs)));
