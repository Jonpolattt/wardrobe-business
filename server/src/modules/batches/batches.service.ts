import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal, ZERO, dec, roundMoney, roundPercent } from '../../common/money/money';
import { toUzs } from '../../common/money/pricing';
import { fromDateOnly, toDateOnly } from '../../common/utils/dates';
import { ActivityService } from '../activity/activity.service';
import { EMPTY_LOT_STATS, InventoryService, InventorySnapshot } from '../analytics/inventory.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { Batch, Prisma, Purchase } from '../../generated/prisma/client';
import type { BatchInput } from './dto/batch.input';

type BatchWithLots = Batch & { purchases: Purchase[] };

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly settings: SettingsService,
    private readonly users: UsersService,
    private readonly activity: ActivityService,
  ) {}

  async list(includeArchived = false) {
    const [batches, snapshot] = await Promise.all([
      this.prisma.batch.findMany({
        where: includeArchived ? {} : { archivedAt: null },
        include: { purchases: true },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.inventory.snapshot(),
    ]);
    return batches.map((b) => this.toView(b, snapshot));
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id }, include: { purchases: true } });
    if (!batch) throw new NotFoundException('BATCH_NOT_FOUND');
    return this.toView(batch, await this.inventory.snapshot());
  }

  async create(input: BatchInput, userId: string) {
    const id = await this.prisma.$transaction(async (tx) => {
      const code = await this.nextCode(tx);
      const created = await tx.batch.create({ data: { code, ...(await this.data(input, tx)) } });
      await this.activity.log('BATCH_CREATED', created.nameRu, userId, { batchId: created.id }, tx);
      return created.id;
    });
    return this.findOne(id);
  }

  async update(id: string, input: BatchInput, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.batch.findUnique({ where: { id } });
      if (!existing || existing.archivedAt) throw new NotFoundException('BATCH_NOT_FOUND');
      const updated = await tx.batch.update({ where: { id }, data: await this.data(input, tx) });
      await this.activity.log('BATCH_UPDATED', updated.nameRu, userId, { batchId: id }, tx);
    });
    return this.findOne(id);
  }

  /**
   * Removes a batch after the password confirmation. Its purchase lots are kept
   * (they stay in the product list without a batch). A batch that has lots is
   * archived so that the grouping stays in the financial history; an empty
   * batch is deleted.
   */
  async remove(id: string, password: string, userId: string) {
    await this.users.assertPassword(userId, password);
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id } });
      if (!batch || batch.archivedAt) throw new NotFoundException('BATCH_NOT_FOUND');
      const remaining = await tx.purchase.count({ where: { batchId: id } });
      if (remaining > 0) {
        await tx.batch.update({ where: { id }, data: { archivedAt: new Date() } });
        await this.activity.log('BATCH_ARCHIVED', batch.nameRu, userId, { batchId: id }, tx);
        return { id, archived: true };
      }
      await tx.batch.delete({ where: { id } });
      await this.activity.log('BATCH_DELETED', batch.nameRu, userId, { batchId: id }, tx);
      return { id, archived: false };
    });
  }

  toView(batch: BatchWithLots, snapshot: InventorySnapshot) {
    const lots = batch.purchases;
    const active = lots.filter((l) => !l.archivedAt);
    let totalCost = ZERO;
    let expectedRevenue = ZERO;
    let expectedProfit = ZERO;
    let revenue = ZERO;
    let cogs = ZERO;
    let soldQty = 0;
    let quantity = 0;
    let linked = false;
    for (const lot of lots) {
      const stats = snapshot.lotStats.get(lot.id) ?? EMPTY_LOT_STATS;
      totalCost = totalCost.plus(toUzs(lot.totalCost, lot.fxRateToUzs));
      expectedRevenue = expectedRevenue.plus(toUzs(lot.expectedRevenue, lot.fxRateToUzs));
      expectedProfit = expectedProfit.plus(toUzs(lot.expectedProfit, lot.fxRateToUzs));
      revenue = revenue.plus(stats.revenue);
      cogs = cogs.plus(stats.cogs);
      soldQty += stats.soldQty;
      quantity += lot.quantity;
      if (snapshot.linkedProductIds.has(lot.productId)) linked = true;
    }
    if (lots.length === 0) {
      quantity = batch.plannedUnits ?? 0;
      if (batch.plannedCost && batch.plannedFxRateToUzs) totalCost = toUzs(batch.plannedCost, batch.plannedFxRateToUzs);
    }
    const date = batch.arrivalDate ?? batch.orderDate ?? batch.createdAt;
    return {
      ...batch,
      orderDate: toDateOnly(batch.orderDate),
      arrivalDate: toDateOnly(batch.arrivalDate),
      date: toDateOnly(date)!,
      archived: batch.archivedAt !== null,
      lotsCount: active.length,
      quantity,
      totalCostUzs: roundMoney(totalCost),
      expectedRevenueUzs: roundMoney(expectedRevenue),
      expectedProfitUzs: roundMoney(expectedProfit),
      expectedProfitPercent: totalCost.gt(0) ? roundPercent(expectedProfit.div(totalCost).times(100)) : new Decimal(0),
      soldQty,
      revenueUzs: roundMoney(revenue),
      cogsUzs: roundMoney(cogs),
      actualProfitUzs: linked ? roundMoney(revenue.minus(cogs)) : null,
      netProfitUzs: roundMoney(revenue.minus(totalCost)),
      netProfitPercent: totalCost.gt(0) ? roundPercent(revenue.minus(totalCost).div(totalCost).times(100)) : new Decimal(0),
    };
  }

  private async data(input: BatchInput, tx: Prisma.TransactionClient) {
    let orderDate: Date | null;
    let arrivalDate: Date | null;
    try {
      orderDate = fromDateOnly(input.orderDate);
      arrivalDate = fromDateOnly(input.arrivalDate);
    } catch {
      throw new BadRequestException('DATE_INVALID');
    }
    if (orderDate && arrivalDate && arrivalDate < orderDate) throw new BadRequestException('ARRIVAL_BEFORE_ORDER');
    const plannedCost = input.plannedCost ? roundMoney(input.plannedCost) : null;
    if (plannedCost && plannedCost.lt(0)) throw new BadRequestException('PLANNED_COST_INVALID');
    const plannedCurrency = plannedCost ? input.plannedCurrency ?? 'USD' : null;
    return {
      nameRu: input.name,
      nameUz: input.nameUz?.trim() || input.name,
      originRu: input.origin?.trim() ?? '',
      originUz: input.originUz?.trim() || input.origin?.trim() || '',
      status: input.status ?? 'PREPARING',
      orderDate,
      arrivalDate,
      plannedUnits: input.plannedUnits ?? null,
      plannedCost,
      plannedCurrency,
      plannedFxRateToUzs: plannedCurrency ? dec(await this.settings.fxToUzs(plannedCurrency, tx)) : null,
    };
  }

  private async nextCode(tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING("code" FROM 4) AS INTEGER)) AS max FROM "batches" WHERE "code" ~ '^BT-[0-9]+$'`;
    return `BT-${String((rows[0]?.max ?? 0) + 1).padStart(3, '0')}`;
  }
}
