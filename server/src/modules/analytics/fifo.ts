import { Decimal, ZERO, roundMoney } from '../../common/money/money';

/**
 * FIFO cost allocation.
 *
 * Store sales are known per product, purchase costs per lot. To compute the
 * actual profit each sold unit is matched with the oldest lot that still has
 * units left (first in — first out). Units sold beyond all known lots have no
 * reliable cost: they are reported as `unallocated` and excluded from profit.
 */
export interface FifoLot {
  id: string;
  quantity: number;
  /** cost of one unit including cargo, in UZS */
  unitCostUzs: Decimal;
  /** arrival date, falls back to order date / creation date */
  receivedAt: Date;
  createdAt: Date;
}

export interface FifoSale {
  id: string;
  quantity: number;
  unitPriceUzs: Decimal;
  at: Date;
}

export interface FifoAllocation {
  saleId: string;
  lotId: string | null;
  quantity: number;
  at: Date;
  revenue: Decimal;
  /** null when the cost of these units is unknown */
  cogs: Decimal | null;
}

export interface FifoLotResult {
  soldQty: number;
  revenue: Decimal;
  cogs: Decimal;
}

export interface FifoResult {
  allocations: FifoAllocation[];
  lots: Map<string, FifoLotResult>;
  unallocatedQty: number;
}

export function allocateFifo(lots: FifoLot[], sales: FifoSale[]): FifoResult {
  const orderedLots = [...lots].sort(
    (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  const orderedSales = [...sales].sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
  const remaining = new Map(orderedLots.map((l) => [l.id, l.quantity]));
  const lotResults = new Map<string, FifoLotResult>(orderedLots.map((l) => [l.id, { soldQty: 0, revenue: ZERO, cogs: ZERO }]));
  const allocations: FifoAllocation[] = [];
  let unallocatedQty = 0;
  let lotIndex = 0;

  for (const sale of orderedSales) {
    let left = sale.quantity;
    while (left > 0 && lotIndex < orderedLots.length) {
      const lot = orderedLots[lotIndex];
      const available = remaining.get(lot.id) ?? 0;
      if (available <= 0) {
        lotIndex += 1;
        continue;
      }
      const take = Math.min(available, left);
      remaining.set(lot.id, available - take);
      left -= take;
      const revenue = roundMoney(sale.unitPriceUzs.times(take));
      const cogs = roundMoney(lot.unitCostUzs.times(take));
      allocations.push({ saleId: sale.id, lotId: lot.id, quantity: take, at: sale.at, revenue, cogs });
      const r = lotResults.get(lot.id)!;
      r.soldQty += take;
      r.revenue = r.revenue.plus(revenue);
      r.cogs = r.cogs.plus(cogs);
    }
    if (left > 0) {
      unallocatedQty += left;
      allocations.push({ saleId: sale.id, lotId: null, quantity: left, at: sale.at, revenue: roundMoney(sale.unitPriceUzs.times(left)), cogs: null });
    }
  }
  return { allocations, lots: lotResults, unallocatedQty };
}
