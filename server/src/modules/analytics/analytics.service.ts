import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ChartRange } from '../../common/enums';
import { Decimal, ZERO, roundMoney, roundPercent } from '../../common/money/money';
import { toUzs } from '../../common/money/pricing';
import { toDateOnly } from '../../common/utils/dates';
import { ActivityService } from '../activity/activity.service';
import { InventoryService, ProductAllocation } from './inventory.service';
import type { DashboardFilterInput } from './models/analytics.models';

const DAY = 86_400_000;

interface Window {
  from: Date;
  to: Date;
}

interface LotRow {
  id: string;
  batchId: string | null;
  totalCost: Decimal;
  expectedProfit: Decimal;
  fxRateToUzs: Decimal;
  orderDate: Date | null;
  createdAt: Date;
  product: { nameRu: string; nameUz: string };
  purchaseTotal: Decimal;
  cargoTotal: Decimal;
  batch: { code: string } | null;
}

/** All dashboard figures are calculated here, on the backend, in UZS. */
@Injectable()
export class AnalyticsService {
  private readonly offsetMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly activityService: ActivityService,
    config: ConfigService,
  ) {
    // Business day boundaries (Asia/Tashkent is UTC+5 without DST).
    this.offsetMs = parseInt(config.get<string>('BUSINESS_UTC_OFFSET_MINUTES') ?? '300', 10) * 60_000;
  }

  async dashboard(filter: DashboardFilterInput) {
    const [snapshot, lots] = await Promise.all([this.inventory.snapshot(), this.loadLots()]);
    const selected = this.selectionSet(filter, lots);
    const now = new Date();
    if (selected) {
      const totals = this.totals(snapshot.allocations, lots, selected, null);
      // A selected batch without purchase lots yet counts with its planned total price (as the batch row shows it).
      totals.expenses = roundMoney(totals.expenses.plus(await this.plannedCostOfEmptyBatches(filter.batchIds ?? [])));
      const first = Math.min(now.getTime() - 30 * DAY, ...lots.filter((l) => selected.has(l.id)).map((l) => this.expenseDate(l).getTime()));
      const sparkWindow = { from: new Date(first), to: now };
      return {
        current: totals,
        previous: null,
        selection: true,
        from: null,
        to: now,
        revenueChangePercent: null,
        salesChangePercent: null,
        expensesChangePercent: null,
        profitChangePercent: null,
        ...this.sparks(snapshot.allocations, lots, selected, sparkWindow),
      };
    }
    const days = filter.periodDays;
    const current: Window = { from: new Date(this.dayStart(now).getTime() - (days - 1) * DAY), to: now };
    const previous: Window = { from: new Date(current.from.getTime() - days * DAY), to: current.from };
    const currentTotals = this.totals(snapshot.allocations, lots, null, current);
    const previousTotals = this.totals(snapshot.allocations, lots, null, previous);
    return {
      current: currentTotals,
      previous: previousTotals,
      revenueChangePercent: this.change(currentTotals.revenue, previousTotals.revenue),
      salesChangePercent: this.change(new Decimal(currentTotals.salesCount), new Decimal(previousTotals.salesCount)),
      expensesChangePercent: this.change(currentTotals.expenses, previousTotals.expenses),
      profitChangePercent: this.change(currentTotals.profit, previousTotals.profit),
      selection: false,
      from: current.from,
      to: now,
      ...this.sparks(snapshot.allocations, lots, null, current),
    };
  }

  async revenueSeries(range: ChartRange) {
    const [snapshot, lots] = await Promise.all([this.inventory.snapshot(), this.loadLots()]);
    const now = new Date();
    const buckets = this.buckets(range, now);
    const span = buckets[buckets.length - 1].to.getTime() - buckets[0].from.getTime();
    const prevWindow = { from: new Date(buckets[0].from.getTime() - span), to: buckets[0].from };
    const points = buckets.map((b) => ({
      date: toDateOnly(new Date(b.from.getTime() + this.offsetMs))!,
      revenue: this.sumRevenue(snapshot.allocations, null, b),
      expenses: this.sumExpenses(lots, null, b),
    }));
    const totalRevenue = roundMoney(points.reduce((a, p) => a.plus(p.revenue), ZERO));
    const totalExpenses = roundMoney(points.reduce((a, p) => a.plus(p.expenses), ZERO));
    const prevRevenue = this.sumRevenue(snapshot.allocations, null, prevWindow);
    const prevExpenses = this.sumExpenses(lots, null, prevWindow);
    return {
      range,
      points,
      totalRevenue,
      totalExpenses,
      revenueChangePercent: this.change(totalRevenue, prevRevenue),
      expensesChangePercent: this.change(totalExpenses, prevExpenses),
    };
  }

  async salesByCategory(periodDays: number) {
    const [snapshot, products, categories] = await Promise.all([
      this.inventory.snapshot(),
      this.prisma.product.findMany({ select: { id: true, category: { select: { key: true } } } }),
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const now = new Date();
    const window: Window = { from: new Date(this.dayStart(now).getTime() - (periodDays - 1) * DAY), to: now };
    const categoryOf = new Map(products.map((p) => [p.id, p.category.key]));
    const acc = new Map<string, { units: number; revenue: Decimal }>();
    for (const a of snapshot.allocations) {
      if (!this.inWindow(a.at, window)) continue;
      const key = (a.productId && categoryOf.get(a.productId)) || 'Other';
      const entry = acc.get(key) ?? { units: 0, revenue: ZERO };
      entry.units += a.quantity;
      entry.revenue = entry.revenue.plus(a.revenue);
      acc.set(key, entry);
    }
    const totalUnits = [...acc.values()].reduce((s, e) => s + e.units, 0);
    const names = new Map(categories.map((c) => [c.key, c]));
    const rows = [...acc.entries()]
      .map(([key, e]) => ({
        key,
        nameRu: names.get(key)?.nameRu ?? key,
        nameUz: names.get(key)?.nameUz ?? key,
        units: e.units,
        revenue: roundMoney(e.revenue),
        sharePercent: totalUnits ? roundPercent(new Decimal(e.units).div(totalUnits).times(100)) : ZERO,
      }))
      .sort((a, b) => b.units - a.units);
    return { totalUnits, categories: rows };
  }

  async expenses(periodDays: number | null) {
    const lots = await this.loadLots();
    const now = new Date();
    const window = periodDays ? { from: new Date(this.dayStart(now).getTime() - (periodDays - 1) * DAY), to: now } : null;
    const rows = [];
    for (const lot of lots) {
      const at = this.expenseDate(lot);
      if (window && !this.inWindow(at, window)) continue;
      const date = toDateOnly(new Date(at.getTime() + this.offsetMs))!;
      const suffix = lot.batch ? ` · ${lot.batch.code}` : '';
      rows.push({
        id: `${lot.id}:inventory`,
        kind: 'Inventory',
        titleRu: `${lot.product.nameRu}${suffix}`,
        titleUz: `${lot.product.nameUz}${suffix}`,
        date,
        amountUzs: toUzs(lot.purchaseTotal, lot.fxRateToUzs),
        purchaseId: lot.id,
      });
      if (lot.cargoTotal.gt(0)) {
        rows.push({
          id: `${lot.id}:logistics`,
          kind: 'Logistics',
          titleRu: `Карго: ${lot.product.nameRu}${suffix}`,
          titleUz: `Kargo: ${lot.product.nameUz}${suffix}`,
          date,
          amountUzs: toUzs(lot.cargoTotal, lot.fxRateToUzs),
          purchaseId: lot.id,
        });
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300);
  }

  async activity(limit: number) {
    const events = await this.activityService.latest(limit);
    return events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      quantity: typeof (e.meta as { quantity?: unknown } | null)?.quantity === 'number' ? (e.meta as { quantity: number }).quantity : null,
      createdAt: e.createdAt,
      actorName: e.user ? `${e.user.firstName} ${e.user.lastName}`.trim() || e.user.email : null,
    }));
  }

  // ---------------------------------------------------------------------------

  private loadLots(): Promise<LotRow[]> {
    return this.prisma.purchase.findMany({
      select: {
        id: true,
        batchId: true,
        totalCost: true,
        expectedProfit: true,
        purchaseTotal: true,
        cargoTotal: true,
        fxRateToUzs: true,
        orderDate: true,
        createdAt: true,
        product: { select: { nameRu: true, nameUz: true } },
        batch: { select: { code: true } },
      },
    });
  }

  private async plannedCostOfEmptyBatches(batchIds: string[]) {
    if (batchIds.length === 0) return ZERO;
    const batches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds }, archivedAt: null, purchases: { none: {} }, plannedCost: { not: null } },
      select: { plannedCost: true, plannedFxRateToUzs: true },
    });
    return batches.reduce(
      (acc, b) => (b.plannedCost && b.plannedFxRateToUzs ? acc.plus(toUzs(b.plannedCost, b.plannedFxRateToUzs)) : acc),
      ZERO,
    );
  }

  private selectionSet(filter: DashboardFilterInput, lots: LotRow[]): Set<string> | null {
    const purchaseIds = filter.purchaseIds ?? [];
    const batchIds = new Set(filter.batchIds ?? []);
    if (purchaseIds.length === 0 && batchIds.size === 0) return null;
    const set = new Set(purchaseIds);
    for (const lot of lots) if (lot.batchId && batchIds.has(lot.batchId)) set.add(lot.id);
    return set;
  }

  private totals(allocations: ProductAllocation[], lots: LotRow[], selected: Set<string> | null, window: Window | null) {
    let revenue = ZERO;
    let profit = ZERO;
    let salesCount = 0;
    let unallocatedUnits = 0;
    for (const a of allocations) {
      if (selected && (!a.lotId || !selected.has(a.lotId))) continue;
      if (window && !this.inWindow(a.at, window)) continue;
      revenue = revenue.plus(a.revenue);
      salesCount += a.quantity;
      if (a.cogs) profit = profit.plus(a.revenue.minus(a.cogs));
      else unallocatedUnits += a.quantity;
    }
    let expectedProfit = ZERO;
    for (const lot of lots) {
      if (selected && !selected.has(lot.id)) continue;
      if (window && !this.inWindow(this.expenseDate(lot), window)) continue;
      expectedProfit = expectedProfit.plus(toUzs(lot.expectedProfit, lot.fxRateToUzs));
    }
    return {
      revenue: roundMoney(revenue),
      salesCount,
      expenses: this.sumExpenses(lots, selected, window),
      profit: roundMoney(profit),
      expectedProfit: roundMoney(expectedProfit),
      unallocatedUnits,
    };
  }

  private sumRevenue(allocations: ProductAllocation[], selected: Set<string> | null, window: Window | null) {
    let total = ZERO;
    for (const a of allocations) {
      if (selected && (!a.lotId || !selected.has(a.lotId))) continue;
      if (window && !this.inWindow(a.at, window)) continue;
      total = total.plus(a.revenue);
    }
    return roundMoney(total);
  }

  private sumExpenses(lots: LotRow[], selected: Set<string> | null, window: Window | null) {
    let total = ZERO;
    for (const lot of lots) {
      if (selected && !selected.has(lot.id)) continue;
      if (window && !this.inWindow(this.expenseDate(lot), window)) continue;
      total = total.plus(toUzs(lot.totalCost, lot.fxRateToUzs));
    }
    return roundMoney(total);
  }

  private sparks(allocations: ProductAllocation[], lots: LotRow[], selected: Set<string> | null, window: Window) {
    const n = 10;
    const step = Math.max(window.to.getTime() - window.from.getTime(), DAY) / n;
    const revenue = new Array(n).fill(0);
    const sales = new Array(n).fill(0);
    const expenses = new Array(n).fill(0);
    const profit = new Array(n).fill(0);
    const index = (d: Date) => Math.min(n - 1, Math.max(0, Math.floor((d.getTime() - window.from.getTime()) / step)));
    for (const a of allocations) {
      if (selected && (!a.lotId || !selected.has(a.lotId))) continue;
      if (!this.inWindow(a.at, window)) continue;
      const i = index(a.at);
      revenue[i] += a.revenue.toNumber();
      sales[i] += a.quantity;
      if (a.cogs) profit[i] += a.revenue.minus(a.cogs).toNumber();
    }
    for (const lot of lots) {
      if (selected && !selected.has(lot.id)) continue;
      const at = this.expenseDate(lot);
      if (!this.inWindow(at, window)) continue;
      expenses[index(at)] += toUzs(lot.totalCost, lot.fxRateToUzs).toNumber();
    }
    const cumulative = (values: number[]) => values.map((_, i) => values.slice(0, i + 1).reduce((s, v) => s + v, 0));
    return { revenueSpark: cumulative(revenue), salesSpark: cumulative(sales), expensesSpark: cumulative(expenses), profitSpark: cumulative(profit) };
  }

  private buckets(range: ChartRange, now: Date): Window[] {
    if (range === ChartRange.YEAR) {
      const local = new Date(now.getTime() + this.offsetMs);
      const result: Window[] = [];
      for (let i = 11; i >= 0; i -= 1) {
        const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1) - this.offsetMs;
        const end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i + 1, 1) - this.offsetMs;
        result.push({ from: new Date(start), to: new Date(Math.min(end, now.getTime() + 1)) });
      }
      return result;
    }
    const days = range === ChartRange.WEEK ? 7 : 30;
    const today = this.dayStart(now).getTime();
    return Array.from({ length: days }, (_, i) => {
      const from = today - (days - 1 - i) * DAY;
      return { from: new Date(from), to: new Date(Math.min(from + DAY, now.getTime() + 1)) };
    });
  }

  private change(current: Decimal, previous: Decimal) {
    if (previous.isZero()) return null;
    return roundPercent(current.minus(previous).div(previous.abs()).times(100));
  }

  private expenseDate(lot: Pick<LotRow, 'orderDate' | 'createdAt'>) {
    return lot.orderDate ?? lot.createdAt;
  }

  /** Start of the business day (local midnight) as a UTC instant. */
  private dayStart(date: Date) {
    const local = date.getTime() + this.offsetMs;
    return new Date(local - (local % DAY) - this.offsetMs);
  }

  private inWindow(date: Date, window: Window) {
    const t = date.getTime();
    return t >= window.from.getTime() && t <= window.to.getTime();
  }
}
