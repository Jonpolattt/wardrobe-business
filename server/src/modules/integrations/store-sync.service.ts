import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal, roundMoney } from '../../common/money/money';
import { ActivityService } from '../activity/activity.service';
import { isCountedSale, StoreClient, StoreClientConfig, StoreOrderDto, StoreProductDto } from './store-client';

export interface SyncCounters {
  productsSeen: number;
  ordersSeen: number;
  salesCreated: number;
  salesUpdated: number;
  productsLinked: number;
}

/**
 * Imports products (stock) and sold order lines from the store.
 * Safe to repeat: rows are upserted by the store's stable ids, so a second run
 * never duplicates sales, and nothing here changes stock in either system.
 */
@Injectable()
export class StoreSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoreSyncService.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}

  get storeConfig(): StoreClientConfig & { currency: 'UZS' | 'USD' | 'CNY'; syncIntervalMinutes: number } {
    return this.config.getOrThrow('store');
  }

  get isConfigured() {
    const c = this.storeConfig;
    return Boolean(c.graphqlUrl && c.login && c.password);
  }

  onModuleInit() {
    const minutes = this.storeConfig.syncIntervalMinutes;
    if (this.isConfigured && minutes > 0) {
      this.timer = setInterval(() => {
        this.sync('SCHEDULE').catch((e) => this.logger.warn(`Scheduled sync failed: ${(e as Error).message}`));
      }, minutes * 60_000);
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return this.prisma.syncRun.findFirst({ orderBy: { startedAt: 'desc' } });
  }

  async sync(trigger: 'MANUAL' | 'SCHEDULE', client?: StoreClient) {
    if (!client && !this.isConfigured) throw new ServiceUnavailableException('STORE_NOT_CONFIGURED');
    if (this.running) throw new ConflictException('SYNC_ALREADY_RUNNING');
    const job = this.run(trigger, client ?? new StoreClient(this.storeConfig));
    this.running = job;
    try {
      return await job;
    } finally {
      this.running = null;
    }
  }

  private async run(trigger: string, client: StoreClient) {
    const run = await this.prisma.syncRun.create({ data: { status: 'RUNNING', trigger } });
    const counters: SyncCounters = { productsSeen: 0, ordersSeen: 0, salesCreated: 0, salesUpdated: 0, productsLinked: 0 };
    try {
      const now = new Date();
      for await (const page of client.products()) {
        await this.saveProducts(page, now);
        counters.productsSeen += page.length;
      }
      for await (const page of client.orders()) {
        await this.saveOrders(page, counters);
        counters.ordersSeen += page.length;
      }
      counters.productsLinked = await this.linkBySku();
      const finished = await this.prisma.syncRun.update({ where: { id: run.id }, data: { status: 'SUCCESS', finishedAt: new Date(), ...counters } });
      // Scheduled runs without changes are not written to the activity feed.
      const changed = counters.salesCreated + counters.salesUpdated + counters.productsLinked > 0;
      if (trigger === 'MANUAL' || changed) {
        await this.activity.log('SYNC_COMPLETED', `${counters.ordersSeen} / ${counters.salesCreated + counters.salesUpdated}`, null, {
          ...counters,
          quantity: counters.salesCreated,
        });
      }
      return finished;
    } catch (error) {
      const message = (error as Error).message.slice(0, 500);
      await this.prisma.syncRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), error: message, ...counters } });
      await this.activity.log('SYNC_FAILED', message, null);
      throw new ServiceUnavailableException(`STORE_SYNC_FAILED: ${message}`);
    }
  }

  private async saveProducts(products: StoreProductDto[], syncedAt: Date) {
    await this.prisma.$transaction(
      products.map((p) =>
        this.prisma.storeProduct.upsert({
          where: { externalId: p.id },
          create: { externalId: p.id, ...this.productData(p, syncedAt) },
          update: this.productData(p, syncedAt),
        }),
      ),
    );
  }

  private productData(p: StoreProductDto, syncedAt: Date) {
    return {
      sku: p.sku,
      title: p.title,
      titleRu: p.titleRu,
      price: roundMoney(new Decimal(p.price)),
      stock: Math.max(0, Math.trunc(p.stock)),
      soldCount: Math.max(0, Math.trunc(p.soldCount)),
      isActive: p.isActive,
      syncedAt,
    };
  }

  private async saveOrders(orders: StoreOrderDto[], counters: SyncCounters) {
    const items = orders.flatMap((order) => order.items.map((item) => ({ order, item })));
    if (items.length === 0) return;
    const existing = await this.prisma.storeSale.findMany({
      where: { externalItemId: { in: items.map((x) => x.item.id) } },
      select: { externalItemId: true },
    });
    const known = new Set(existing.map((e) => e.externalItemId));
    // Order lines can reference products that were deleted in the store: keep a placeholder row.
    const productIds = [...new Set(items.map((x) => x.item.productId))];
    const knownProducts = new Set(
      (await this.prisma.storeProduct.findMany({ where: { externalId: { in: productIds } }, select: { externalId: true } })).map((p) => p.externalId),
    );
    const currency = this.storeConfig.currency;
    await this.prisma.$transaction(async (tx) => {
      for (const { order, item } of items) {
        if (!knownProducts.has(item.productId)) {
          await tx.storeProduct.create({
            data: { externalId: item.productId, sku: `missing-${item.productId}`, title: item.title, price: roundMoney(new Decimal(item.price)), stock: 0, soldCount: 0, isActive: false, syncedAt: new Date() },
          });
          knownProducts.add(item.productId);
        }
        const data = {
          externalOrderId: order.id,
          orderNumber: order.orderNumber,
          storeProductId: item.productId,
          quantity: Math.max(0, Math.trunc(item.quantity)),
          unitPrice: roundMoney(new Decimal(item.price)),
          currency,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          counted: isCountedSale(order),
          orderedAt: new Date(order.createdAt),
        };
        await tx.storeSale.upsert({ where: { externalItemId: item.id }, create: { externalItemId: item.id, ...data }, update: data });
        if (known.has(item.id)) counters.salesUpdated += 1;
        else counters.salesCreated += 1;
      }
    });
  }

  /** Links products that have a SKU but no store link yet (stable external id is stored). */
  private async linkBySku() {
    const unlinked = await this.prisma.product.findMany({ where: { storeProductId: null, sku: { not: null } }, select: { id: true, sku: true } });
    let linked = 0;
    for (const product of unlinked) {
      const match =
        (await this.prisma.storeProduct.findFirst({ where: { sku: product.sku!, product: null } })) ??
        (await this.prisma.storeProduct.findFirst({ where: { externalId: product.sku!, product: null } }));
      if (!match) continue;
      await this.prisma.product.update({ where: { id: product.id }, data: { storeProductId: match.externalId } });
      linked += 1;
    }
    return linked;
  }
}
