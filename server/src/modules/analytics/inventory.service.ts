import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal, ZERO, dec } from '../../common/money/money';
import { SettingsService } from '../settings/settings.service';
import { allocateFifo, FifoAllocation, FifoLot, FifoLotResult, FifoSale } from './fifo';

export interface ProductAllocation extends FifoAllocation {
  productId: string | null;
}

export interface InventorySnapshot {
  lotStats: Map<string, FifoLotResult>;
  allocations: ProductAllocation[];
  /** products that are linked to the online store (their sales data is reliable) */
  linkedProductIds: Set<string>;
  lotProduct: Map<string, string>;
}

export const EMPTY_LOT_STATS: FifoLotResult = { soldQty: 0, revenue: ZERO, cogs: ZERO };

/**
 * Builds the inventory picture from the database: purchase lots + counted store
 * sales, matched with FIFO. Archived lots are included because they are part of
 * the financial history.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async snapshot(): Promise<InventorySnapshot> {
    const [lots, sales, linked, rates] = await Promise.all([
      this.prisma.purchase.findMany({
        select: { id: true, productId: true, quantity: true, unitCostWithCargo: true, fxRateToUzs: true, arrivalDate: true, orderDate: true, createdAt: true },
      }),
      this.prisma.storeSale.findMany({
        where: { counted: true },
        select: {
          externalItemId: true,
          quantity: true,
          unitPrice: true,
          currency: true,
          orderedAt: true,
          storeProduct: { select: { product: { select: { id: true } } } },
        },
      }),
      this.prisma.product.findMany({ where: { storeProductId: { not: null } }, select: { id: true } }),
      this.settings.getRates(),
    ]);

    const saleFx = (currency: string): Decimal =>
      currency === 'USD' ? dec(rates.usdToUzs) : currency === 'CNY' ? dec(rates.usdToUzs).div(dec(rates.usdToCny)) : new Decimal(1);

    const lotsByProduct = new Map<string, FifoLot[]>();
    const lotProduct = new Map<string, string>();
    for (const lot of lots) {
      lotProduct.set(lot.id, lot.productId);
      const list = lotsByProduct.get(lot.productId) ?? [];
      list.push({
        id: lot.id,
        quantity: lot.quantity,
        unitCostUzs: dec(lot.unitCostWithCargo).times(dec(lot.fxRateToUzs)),
        receivedAt: lot.arrivalDate ?? lot.orderDate ?? lot.createdAt,
        createdAt: lot.createdAt,
      });
      lotsByProduct.set(lot.productId, list);
    }

    const salesByProduct = new Map<string | null, FifoSale[]>();
    for (const sale of sales) {
      const productId = sale.storeProduct.product?.id ?? null;
      const list = salesByProduct.get(productId) ?? [];
      list.push({ id: sale.externalItemId, quantity: sale.quantity, unitPriceUzs: dec(sale.unitPrice).times(saleFx(sale.currency)), at: sale.orderedAt });
      salesByProduct.set(productId, list);
    }

    const lotStats = new Map<string, FifoLotResult>();
    const allocations: ProductAllocation[] = [];
    const productIds = new Set<string | null>([...lotsByProduct.keys(), ...salesByProduct.keys()]);
    for (const productId of productIds) {
      const result = allocateFifo(productId ? lotsByProduct.get(productId) ?? [] : [], salesByProduct.get(productId) ?? []);
      result.lots.forEach((value, key) => lotStats.set(key, value));
      for (const a of result.allocations) allocations.push({ ...a, productId });
    }
    return { lotStats, allocations, linkedProductIds: new Set(linked.map((p) => p.id)), lotProduct };
  }
}
