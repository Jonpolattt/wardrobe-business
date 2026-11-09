import { Decimal } from '../../src/common/money/money';
import { allocateFifo } from '../../src/modules/analytics/fifo';

const d = (s: string) => new Date(`${s}T10:00:00Z`);

describe('FIFO allocation', () => {
  const lots = [
    { id: 'new', quantity: 10, unitCostUzs: new Decimal(150), receivedAt: d('2026-03-01'), createdAt: d('2026-03-01') },
    { id: 'old', quantity: 5, unitCostUzs: new Decimal(100), receivedAt: d('2026-01-01'), createdAt: d('2026-01-01') },
  ];

  it('takes units from the oldest lot first', () => {
    const r = allocateFifo(lots, [{ id: 's1', quantity: 7, unitPriceUzs: new Decimal(300), at: d('2026-04-01') }]);
    expect(r.lots.get('old')).toMatchObject({ soldQty: 5 });
    expect(r.lots.get('new')).toMatchObject({ soldQty: 2 });
    expect(r.lots.get('old')!.cogs.toFixed(2)).toBe('500.00');
    expect(r.lots.get('new')!.cogs.toFixed(2)).toBe('300.00');
    expect(r.unallocatedQty).toBe(0);
  });

  it('marks units sold beyond all lots as unallocated (unknown cost)', () => {
    const r = allocateFifo(lots, [{ id: 's1', quantity: 20, unitPriceUzs: new Decimal(300), at: d('2026-04-01') }]);
    expect(r.unallocatedQty).toBe(5);
    const unknown = r.allocations.find((a) => a.lotId === null)!;
    expect(unknown.cogs).toBeNull();
    expect(unknown.revenue.toFixed(2)).toBe('1500.00');
  });

  it('processes sales chronologically regardless of input order', () => {
    const r = allocateFifo(lots, [
      { id: 'late', quantity: 5, unitPriceUzs: new Decimal(400), at: d('2026-05-01') },
      { id: 'early', quantity: 5, unitPriceUzs: new Decimal(200), at: d('2026-04-01') },
    ]);
    const early = r.allocations.find((a) => a.saleId === 'early')!;
    expect(early.lotId).toBe('old');
    expect(r.lots.get('new')!.revenue.toFixed(2)).toBe('2000.00');
  });
});
