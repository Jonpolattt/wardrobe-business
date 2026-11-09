import Decimal from 'decimal.js';

/*
 * Preliminary preview of the purchase calculation for the product form.
 * Mirrors the backend formulas and rounding (ROUND_HALF_UP; money — 2 dp,
 * per-unit cost — 4 dp, markup — 2 dp). The saved values always come from the
 * backend, which recalculates everything itself.
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const money = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const unit = (v: Decimal) => v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
const percent = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** "12 840,5" → Decimal; null for an empty or invalid value. */
export function parseAmount(raw: string): Decimal | null {
  const normalized = String(raw).replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return new D(normalized);
}

export interface PricingPreviewInput {
  quantity: string;
  unitCost: string;
  cargo: string;
  markupSource: 'pct' | 'sum';
  markupPct: string;
  markupSum: string;
}

export interface PricingPreview {
  qty: number;
  qtyOk: boolean;
  unitOk: boolean;
  cargoOk: boolean;
  markupOk: boolean;
  totalPurchase: number;
  cargoPerUnit: number;
  fullUnit: number;
  totalCost: number;
  pct: number;
  sum: number;
  price: number;
  unitProfit: number;
  totalProfit: number;
  /** what is sent to the backend */
  request: { pricingMode: 'MARKUP' | 'PRICE'; markupPercent: string | null; salePrice: string | null } | null;
}

export function previewPurchase(input: PricingPreviewInput): PricingPreview {
  const qtyDec = parseAmount(input.quantity);
  const qty = qtyDec ? qtyDec.toNumber() : NaN;
  const qtyOk = Number.isInteger(qty) && qty > 0;
  const unitCost = parseAmount(input.unitCost);
  const unitOk = !!unitCost && unitCost.gt(0);
  const cargo = input.cargo.trim() === '' ? new D(0) : parseAmount(input.cargo);
  const cargoOk = !!cargo && cargo.gte(0);

  const unitCostR = unitOk ? money(unitCost!) : new D(0);
  const cargoR = cargoOk ? money(cargo!) : new D(0);
  const q = new D(qtyOk ? qty : 0);
  const totalPurchase = qtyOk && unitOk ? money(unitCostR.times(q)) : new D(0);
  const cargoPerUnitExact = qtyOk ? cargoR.div(q) : new D(0);
  const fullUnitExact = unitCostR.plus(cargoPerUnitExact);
  const totalCost = money(totalPurchase.plus(cargoOk ? cargoR : 0));

  let pct = new D(0);
  let price = new D(0);
  let request: PricingPreview['request'] = null;
  let markupOk = false;
  if (input.markupSource === 'pct') {
    const m = parseAmount(input.markupPct);
    markupOk = !!m && m.gte(0);
    if (markupOk) {
      pct = percent(m!);
      price = money(fullUnitExact.times(pct.div(100).plus(1)));
      request = { pricingMode: 'MARKUP', markupPercent: pct.toString(), salePrice: null };
    }
  } else {
    const s = parseAmount(input.markupSum);
    markupOk = !!s && s.gte(0);
    if (markupOk) {
      price = money(fullUnitExact.plus(s!));
      pct = fullUnitExact.gt(0) ? percent(price.div(fullUnitExact).minus(1).times(100)) : new D(0);
      request = { pricingMode: 'PRICE', markupPercent: null, salePrice: price.toString() };
    }
  }
  const unitProfitExact = price.minus(fullUnitExact);
  return {
    qty,
    qtyOk,
    unitOk,
    cargoOk,
    markupOk,
    totalPurchase: totalPurchase.toNumber(),
    cargoPerUnit: unit(cargoPerUnitExact).toNumber(),
    fullUnit: unit(fullUnitExact).toNumber(),
    totalCost: totalCost.toNumber(),
    pct: pct.toNumber(),
    sum: money(unitProfitExact).toNumber(),
    price: price.toNumber(),
    unitProfit: money(unitProfitExact).toNumber(),
    totalProfit: qtyOk ? money(unitProfitExact.times(q)).toNumber() : 0,
    request,
  };
}

/** Markup in money for an existing lot: sale price − (unit cost + cargo / qty), exact. */
export function markupSumOf(salePrice: string, unitCost: string, cargoTotal: string, quantity: number): string {
  const v = new D(salePrice).minus(new D(unitCost)).minus(new D(cargoTotal).div(quantity));
  return v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toString();
}
