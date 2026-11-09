import { describe, expect, it } from 'vitest';
import { markupSumOf, previewPurchase } from './pricing';

/* The preview in the product form must show exactly what the backend will calculate
   (same cases as server/test/unit/pricing.spec.ts and the purchases e2e test). */
describe('purchase preview (mirrors the backend formulas)', () => {
  it('markup percent → sale price, profit and totals', () => {
    const p = previewPurchase({ quantity: '430', unitCost: '18', cargo: '215', markupSource: 'pct', markupPct: '50', markupSum: '' });
    expect(p.totalPurchase).toBe(7740);
    expect(p.cargoPerUnit).toBe(0.5);
    expect(p.fullUnit).toBe(18.5);
    expect(p.totalCost).toBe(7955);
    expect(p.price).toBe(27.75);
    expect(p.totalProfit).toBe(3977.5);
    expect(p.request).toEqual({ pricingMode: 'MARKUP', markupPercent: '50', salePrice: null });
  });

  it('markup amount → sale price sent to the backend, percent derived', () => {
    const p = previewPurchase({ quantity: '430', unitCost: '18', cargo: '215', markupSource: 'sum', markupPct: '', markupSum: '18.5' });
    expect(p.price).toBe(37);
    expect(p.pct).toBe(100);
    expect(p.request).toEqual({ pricingMode: 'PRICE', markupPercent: null, salePrice: '37' });
  });

  it('rounds half up and keeps the per-unit cost precise', () => {
    // cargo 100 / 3 units = 33.3333…; markup 10 % of 133.3333… = 146.6666… → 146.67
    const p = previewPurchase({ quantity: '3', unitCost: '100', cargo: '100', markupSource: 'pct', markupPct: '10', markupSum: '' });
    expect(p.cargoPerUnit).toBe(33.3333);
    expect(p.price).toBe(146.67);
    expect(p.totalProfit).toBe(40.01); // (146.67 − 133.3333…) × 3 = 40.0100
  });

  it('accepts "12 840,5" style input and flags invalid values', () => {
    expect(previewPurchase({ quantity: '2', unitCost: '12 840,5', cargo: '', markupSource: 'pct', markupPct: '0', markupSum: '' }).totalPurchase).toBe(25681);
    const bad = previewPurchase({ quantity: '1.5', unitCost: '0', cargo: '-1', markupSource: 'pct', markupPct: '-5', markupSum: '' });
    expect([bad.qtyOk, bad.unitOk, bad.cargoOk, bad.markupOk]).toEqual([false, false, false, false]);
  });

  it('restores the markup amount of a lot entered by sale price', () => {
    expect(markupSumOf('37', '18', '215', 430)).toBe('18.5');
  });
});
