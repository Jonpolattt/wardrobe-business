import { calculatePurchase, PricingError, toUzs } from '../../src/common/money/pricing';
import { parseDecimal } from '../../src/common/money/money';

describe('purchase calculations', () => {
  it('derives every value from cost, quantity, cargo and markup', () => {
    const p = calculatePurchase({ unitCost: '10', quantity: 100, cargoTotal: '250', mode: 'MARKUP', markupPercent: '40' });
    expect(p.purchaseTotal.toFixed(2)).toBe('1000.00'); // 10 × 100
    expect(p.cargoPerUnit.toFixed(4)).toBe('2.5000'); // 250 / 100
    expect(p.unitCostWithCargo.toFixed(4)).toBe('12.5000'); // 10 + 2.5
    expect(p.totalCost.toFixed(2)).toBe('1250.00');
    expect(p.salePrice.toFixed(2)).toBe('17.50'); // 12.5 × 1.4
    expect(p.expectedRevenue.toFixed(2)).toBe('1750.00');
    expect(p.expectedProfit.toFixed(2)).toBe('500.00'); // (17.5 − 12.5) × 100
    expect(p.unitProfit.toFixed(2)).toBe('5.00');
  });

  it('derives the markup from an entered sale price (markup, not margin)', () => {
    const p = calculatePurchase({ unitCost: '18', quantity: 430, cargoTotal: '0', mode: 'PRICE', salePrice: '29' });
    // markup = (29 / 18 − 1) × 100 = 61.11 %; margin would be 37.93 %
    expect(p.markupPercent.toFixed(2)).toBe('61.11');
    expect(p.expectedProfit.toFixed(2)).toBe('4730.00'); // 11 × 430
  });

  it('round-trips markup → price → markup without drift', () => {
    const a = calculatePurchase({ unitCost: '7.33', quantity: 3, cargoTotal: '1', mode: 'MARKUP', markupPercent: '25' });
    const b = calculatePurchase({ unitCost: '7.33', quantity: 3, cargoTotal: '1', mode: 'PRICE', salePrice: a.salePrice });
    expect(b.salePrice.toFixed(2)).toBe(a.salePrice.toFixed(2));
    expect(Math.abs(b.markupPercent.minus(a.markupPercent).toNumber())).toBeLessThanOrEqual(0.05);
  });

  it('rounds half up to 2 decimals and keeps unit cost with cargo at 4 decimals', () => {
    const p = calculatePurchase({ unitCost: '0.005', quantity: 3, cargoTotal: '1', mode: 'MARKUP', markupPercent: '0' });
    expect(p.unitCost.toFixed(2)).toBe('0.01'); // 0.005 → 0.01 (half up)
    expect(p.cargoPerUnit.toFixed(4)).toBe('0.3333');
    expect(p.unitCostWithCargo.toFixed(4)).toBe('0.3433');
    expect(p.salePrice.toFixed(2)).toBe('0.34');
    // totals come from unrounded intermediates: 0.34 × 3 − (0.03 + 1)
    expect(p.expectedProfit.toFixed(2)).toBe('-0.01');
  });

  it('uses exact decimal arithmetic (no float errors)', () => {
    const p = calculatePurchase({ unitCost: '0.1', quantity: 3, cargoTotal: '0.2', mode: 'MARKUP', markupPercent: '0' });
    expect(p.purchaseTotal.toString()).toBe('0.3');
    expect(p.totalCost.toString()).toBe('0.5');
  });

  it.each([
    [{ quantity: 0 }, 'QUANTITY_INVALID'],
    [{ quantity: 1.5 }, 'QUANTITY_INVALID'],
    [{ unitCost: '0' }, 'UNIT_COST_INVALID'],
    [{ cargoTotal: '-1' }, 'CARGO_INVALID'],
    [{ markupPercent: '-100' }, 'MARKUP_INVALID'],
    [{ markupPercent: null }, 'MARKUP_REQUIRED'],
  ])('rejects invalid input %j', (patch, code) => {
    const input = { unitCost: '10', quantity: 5, cargoTotal: '0', mode: 'MARKUP' as const, markupPercent: '20', ...patch };
    expect(() => calculatePurchase(input)).toThrow(new PricingError(code as never));
  });

  it('rejects a missing or non-positive sale price in PRICE mode', () => {
    expect(() => calculatePurchase({ unitCost: '10', quantity: 1, mode: 'PRICE' })).toThrow('SALE_PRICE_REQUIRED');
    expect(() => calculatePurchase({ unitCost: '10', quantity: 1, mode: 'PRICE', salePrice: '0' })).toThrow('SALE_PRICE_INVALID');
  });

  it('converts to UZS with the stored rate snapshot', () => {
    expect(toUzs('12.5', '12840').toFixed(2)).toBe('160500.00');
  });

  it('parses user formatted numbers', () => {
    expect(parseDecimal('12 840,5')?.toString()).toBe('12840.5');
    expect(parseDecimal('1e5')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});
