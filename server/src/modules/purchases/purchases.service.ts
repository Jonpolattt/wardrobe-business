import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculatePurchase, toUzs } from '../../common/money/pricing';
import { dec, roundMoney } from '../../common/money/money';
import { fromDateOnly, toDateOnly } from '../../common/utils/dates';
import { ActivityService } from '../activity/activity.service';
import { EMPTY_LOT_STATS, InventoryService, InventorySnapshot } from '../analytics/inventory.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService, productInclude } from '../products/products.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { Prisma } from '../../generated/prisma/client';
import type { PurchaseFilterInput, PurchaseInput, PurchaseProductInput } from './dto/purchase.input';

export const purchaseInclude = {
  product: { include: productInclude },
  batch: { select: { id: true, code: true, nameRu: true, nameUz: true, status: true, archivedAt: true } },
} satisfies Prisma.PurchaseInclude;

type PurchaseRow = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly settings: SettingsService,
    private readonly categories: CategoriesService,
    private readonly products: ProductsService,
    private readonly users: UsersService,
    private readonly activity: ActivityService,
  ) {}

  async list(filter: PurchaseFilterInput = {}) {
    const search = filter.search?.trim();
    const rows = await this.prisma.purchase.findMany({
      where: {
        ...(filter.includeArchived ? {} : { archivedAt: null }),
        ...(filter.batchId ? { batchId: filter.batchId } : {}),
        ...(filter.categoryKey ? { product: { category: { key: filter.categoryKey } } } : {}),
        ...(search
          ? {
              OR: [
                { product: { nameRu: { contains: search, mode: 'insensitive' } } },
                { product: { nameUz: { contains: search, mode: 'insensitive' } } },
                { product: { code: { contains: search, mode: 'insensitive' } } },
                { product: { sku: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: purchaseInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
    const snapshot = await this.inventory.snapshot();
    return rows.map((row) => this.toView(row, snapshot));
  }

  async findOne(id: string) {
    const row = await this.prisma.purchase.findUnique({ where: { id }, include: purchaseInclude });
    if (!row) throw new NotFoundException('PURCHASE_NOT_FOUND');
    return this.toView(row, await this.inventory.snapshot());
  }

  async create(input: PurchaseInput, userId: string) {
    const dates = this.parseDates(input);
    const pricing = this.pricingData(input); // validated before anything is written
    const id = await this.prisma.$transaction(async (tx) => {
      const product = await this.saveProduct(input.product, tx);
      await this.assertBatch(input.batchId, tx);
      const fxRateToUzs = await this.settings.fxToUzs(input.currency, tx);
      const created = await tx.purchase.create({
        data: {
          productId: product.id,
          batchId: input.batchId || null,
          currency: input.currency,
          fxRateToUzs,
          ...pricing,
          ...dates,
          createdById: userId,
        },
      });
      await this.activity.log('PURCHASE_CREATED', product.nameRu, userId, { purchaseId: created.id, quantity: input.quantity }, tx);
      return created.id;
    });
    return this.findOne(id);
  }

  async update(id: string, input: PurchaseInput, userId: string) {
    const dates = this.parseDates(input);
    const pricing = this.pricingData(input);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({ where: { id } });
      if (!existing || existing.archivedAt) throw new NotFoundException('PURCHASE_NOT_FOUND');
      // Units that were already sold from this lot cannot disappear from it.
      const sold = (await this.inventory.snapshot()).lotStats.get(id)?.soldQty ?? 0;
      if (input.quantity < sold) throw new BadRequestException('QUANTITY_BELOW_SOLD');
      const product = await this.saveProduct({ ...input.product, productId: existing.productId }, tx);
      await this.assertBatch(input.batchId, tx);
      // The rate snapshot is kept unless the currency itself changes.
      const fxRateToUzs = existing.currency === input.currency ? existing.fxRateToUzs : await this.settings.fxToUzs(input.currency, tx);
      await tx.purchase.update({
        where: { id },
        data: { batchId: input.batchId || null, currency: input.currency, fxRateToUzs, ...pricing, ...dates },
      });
      await this.activity.log('PURCHASE_UPDATED', product.nameRu, userId, { purchaseId: id }, tx);
    });
    return this.findOne(id);
  }

  /**
   * Deletes a lot after the password confirmation. A lot that already has sold
   * units is part of the financial history: it is archived instead of deleted.
   */
  async remove(id: string, password: string, userId: string) {
    await this.users.assertPassword(userId, password);
    const snapshot = await this.inventory.snapshot();
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.purchase.findUnique({ where: { id }, include: { product: true } });
      if (!lot || lot.archivedAt) throw new NotFoundException('PURCHASE_NOT_FOUND');
      const result = await this.removeLot(lot.id, lot.productId, snapshot, tx);
      await this.activity.log(result.archived ? 'PURCHASE_ARCHIVED' : 'PURCHASE_DELETED', lot.product.nameRu, userId, { purchaseId: id }, tx);
      return result;
    });
  }

  /** Shared with batch deletion. */
  async removeLot(lotId: string, productId: string, snapshot: InventorySnapshot, tx: Prisma.TransactionClient) {
    const sold = snapshot.lotStats.get(lotId)?.soldQty ?? 0;
    if (sold > 0) {
      await tx.purchase.update({ where: { id: lotId }, data: { archivedAt: new Date() } });
      return { id: lotId, archived: true };
    }
    await tx.purchase.delete({ where: { id: lotId } });
    const left = await tx.purchase.count({ where: { productId } });
    if (left === 0) await tx.product.delete({ where: { id: productId } });
    return { id: lotId, archived: false };
  }

  toView(row: PurchaseRow, snapshot: InventorySnapshot) {
    const stats = snapshot.lotStats.get(row.id) ?? EMPTY_LOT_STATS;
    const linked = snapshot.linkedProductIds.has(row.productId);
    const fx = row.fxRateToUzs;
    const remainingQty = Math.max(row.quantity - stats.soldQty, 0);
    // Exact per-unit profit (sale price − unit cost − cargo share), converted and rounded once.
    const unitProfitExact = dec(row.salePrice).minus(dec(row.unitCost)).minus(dec(row.cargoTotal).div(row.quantity));
    return {
      ...row,
      // An archived (deleted) batch is no longer shown: its lots stay in the product list without a batch.
      batch: row.batch && !row.batch.archivedAt ? row.batch : null,
      orderDate: toDateOnly(row.orderDate),
      arrivalDate: toDateOnly(row.arrivalDate),
      archived: row.archivedAt !== null,
      unitCostUzs: toUzs(row.unitCost, fx),
      unitCostWithCargoUzs: toUzs(row.unitCostWithCargo, fx),
      cargoTotalUzs: toUzs(row.cargoTotal, fx),
      salePriceUzs: toUzs(row.salePrice, fx),
      totalCostUzs: toUzs(row.totalCost, fx),
      expectedProfitUzs: toUzs(row.expectedProfit, fx),
      expectedRevenueUzs: toUzs(row.expectedRevenue, fx),
      cargoPerUnitUzs: toUzs(dec(row.cargoTotal).div(row.quantity), fx),
      unitProfitUzs: toUzs(unitProfitExact, fx),
      remainingProfitUzs: toUzs(unitProfitExact.times(remainingQty), fx),
      soldQty: stats.soldQty,
      remainingQty,
      revenueUzs: roundMoney(stats.revenue),
      cogsUzs: roundMoney(stats.cogs),
      actualProfitUzs: linked ? roundMoney(stats.revenue.minus(stats.cogs)) : null,
      hasSalesData: linked,
    };
  }

  private pricingData(input: PurchaseInput) {
    const p = calculatePurchase({
      unitCost: input.unitCost,
      quantity: input.quantity,
      cargoTotal: input.cargoTotal ?? '0',
      mode: input.pricingMode,
      markupPercent: input.markupPercent,
      salePrice: input.salePrice,
    });
    return {
      unitCost: p.unitCost,
      quantity: p.quantity,
      cargoTotal: p.cargoTotal,
      pricingMode: input.pricingMode,
      markupPercent: p.markupPercent,
      salePrice: p.salePrice,
      purchaseTotal: p.purchaseTotal,
      cargoPerUnit: p.cargoPerUnit,
      unitCostWithCargo: p.unitCostWithCargo,
      totalCost: p.totalCost,
      expectedRevenue: p.expectedRevenue,
      expectedProfit: p.expectedProfit,
    };
  }

  private parseDates(input: Pick<PurchaseInput, 'orderDate' | 'arrivalDate'>) {
    let orderDate: Date | null;
    let arrivalDate: Date | null;
    try {
      orderDate = fromDateOnly(input.orderDate);
      arrivalDate = fromDateOnly(input.arrivalDate);
    } catch {
      throw new BadRequestException('DATE_INVALID');
    }
    if (orderDate && arrivalDate && arrivalDate < orderDate) throw new BadRequestException('ARRIVAL_BEFORE_ORDER');
    return { orderDate, arrivalDate };
  }

  private async assertBatch(batchId: string | null | undefined, tx: Prisma.TransactionClient) {
    if (!batchId) return;
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.archivedAt) throw new BadRequestException('BATCH_NOT_FOUND');
  }

  private async saveProduct(input: PurchaseProductInput, tx: Prisma.TransactionClient) {
    const category = await this.categories.getByKey(input.categoryKey, tx);
    const sku = input.sku?.trim() || null;
    const data = {
      nameRu: input.name,
      nameUz: input.nameUz?.trim() || input.name,
      categoryId: category.id,
      sku,
      ...(input.color ? { color: input.color.toLowerCase() } : {}),
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.photos ? { photos: input.photos } : {}),
    };
    let product;
    if (input.productId) {
      const existing = await tx.product.findUnique({ where: { id: input.productId } });
      if (!existing || existing.archivedAt) throw new BadRequestException('PRODUCT_NOT_FOUND');
      product = await tx.product.update({ where: { id: existing.id }, data });
    } else {
      product = await tx.product.create({ data: { ...data, code: await this.products.nextCode(tx) } });
    }
    await this.products.linkBySku(product.id, sku, tx);
    return product;
  }
}

