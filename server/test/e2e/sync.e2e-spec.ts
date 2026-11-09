import { createTestApp, gql, login, TestContext, USERS } from '../support/app';
import { FakeStore } from '../support/fake-store';

const SYNC = `mutation { syncStore { status ordersSeen salesCreated salesUpdated productsLinked } }`;

const order = (n: number, status: string, paymentStatus: string, items: [string, number, number][]) => ({
  id: `order-${n}`,
  orderNumber: `WS-${1000 + n}`,
  status,
  paymentStatus,
  createdAt: new Date(Date.now() - (10 - n) * 3_600_000).toISOString(),
  items: items.map(([productId, quantity, price], i) => ({ id: `item-${n}-${i}`, productId, title: productId, quantity, price })),
});

describe('online store synchronisation', () => {
  const store = new FakeStore();
  let ctx: TestContext;
  let token: string;

  beforeAll(async () => {
    await store.start();
    ctx = await createTestApp({ STORE_GRAPHQL_URL: store.url, STORE_LOGIN: 'admin@store.test', STORE_PASSWORD: 'store-secret', STORE_PAGE_SIZE: '2' });
    token = (await login(ctx.app, USERS.one)).token;
    // One lot of the product that the store sells with SKU TS-001 (100 units, cost 20 000 UZS each incl. cargo).
    const res = await gql(
      ctx.app,
      `mutation($input: PurchaseInput!) { createPurchase(input: $input) { id } }`,
      { input: { product: { name: 'Хлопковая футболка', categoryKey: 'T-shirts', sku: 'TS-001' }, currency: 'UZS', unitCost: '19000', quantity: 100, cargoTotal: '100000', pricingMode: 'MARKUP', markupPercent: '50' } },
      { token },
    );
    expect(res.errors).toBeUndefined();
    store.orders = [
      order(1, 'DELIVERED', 'PAID', [['sp-1', 3, 30000]]),
      order(2, 'PROCESSING', 'PAID', [['sp-1', 2, 30000], ['sp-2', 1, 50000]]),
      order(3, 'PENDING', 'PENDING', [['sp-1', 5, 30000]]), // not paid → not a sale
      order(4, 'CANCELLED', 'PENDING', [['sp-1', 4, 30000]]), // cancelled → not a sale
    ];
  });

  afterAll(async () => {
    await ctx.close();
    await store.stop();
  });

  const dashboard = async () =>
    (await gql<{ dashboard: { current: Record<string, any> } }>(ctx.app, `{ dashboard(filter: { periodDays: 7 }) { current { revenue salesCount profit unallocatedUnits } } }`, {}, { token })).data!.dashboard.current;

  it('imports sales and links products by SKU (stable external id is stored)', async () => {
    const res = await gql<{ syncStore: Record<string, number | string> }>(ctx.app, SYNC, {}, { token });
    expect(res.errors).toBeUndefined();
    expect(res.data!.syncStore).toMatchObject({ status: 'SUCCESS', ordersSeen: 4, salesCreated: 5, salesUpdated: 0 });
    const product = await ctx.prisma.product.findFirstOrThrow({ where: { sku: 'TS-001' } });
    expect(product.storeProductId).toBe('sp-1');
    expect(await ctx.prisma.storeSale.count({ where: { counted: true } })).toBe(3);
  });

  it('calculates revenue from counted sales and profit from FIFO cost', async () => {
    const totals = await dashboard();
    // counted: 3 + 2 units of sp-1 at 30 000, 1 unit of sp-2 at 50 000
    expect(totals.revenue).toBe('200000');
    expect(totals.salesCount).toBe(6);
    // sp-1: 5 × (30 000 − 20 000) = 50 000; sp-2 has no purchase lot → unknown cost, excluded
    expect(totals.profit).toBe('50000');
    expect(totals.unallocatedUnits).toBe(1);
    const lots = await gql<{ purchases: Record<string, any>[] }>(ctx.app, `{ purchases { soldQty remainingQty actualProfitUzs hasSalesData product { storeProduct { stock } } } }`, {}, { token });
    expect(lots.data!.purchases[0]).toMatchObject({ soldQty: 5, remainingQty: 95, actualProfitUzs: '50000', hasSalesData: true });
    expect(lots.data!.purchases[0].product.storeProduct.stock).toBe(70);
  });

  it('does not duplicate anything when the sync is repeated', async () => {
    const res = await gql<{ syncStore: Record<string, number> }>(ctx.app, SYNC, {}, { token });
    expect(res.data!.syncStore).toMatchObject({ salesCreated: 0, salesUpdated: 5 });
    expect(await ctx.prisma.storeSale.count()).toBe(5);
    expect((await dashboard()).revenue).toBe('200000');
  });

  it('reverses a sale when the store cancels the order and picks up new orders', async () => {
    store.orders[1] = { ...store.orders[1], status: 'CANCELLED', paymentStatus: 'PENDING' };
    store.orders.push(order(5, 'SHIPPED', 'PAID', [['sp-1', 1, 31000]]));
    const res = await gql<{ syncStore: Record<string, number> }>(ctx.app, SYNC, {}, { token });
    expect(res.data!.syncStore).toMatchObject({ salesCreated: 1, salesUpdated: 5 });
    const totals = await dashboard();
    expect(totals.revenue).toBe('121000'); // 3 × 30 000 + 1 × 31 000
    expect(totals.salesCount).toBe(4);
    expect(totals.unallocatedUnits).toBe(0);
  });

  it('does not allow reducing a lot below the units already sold', async () => {
    const lot = await ctx.prisma.purchase.findFirstOrThrow();
    const input = { product: { name: 'Хлопковая футболка', categoryKey: 'T-shirts', sku: 'TS-001' }, currency: 'UZS', unitCost: '19000', quantity: 3, cargoTotal: '100000', pricingMode: 'MARKUP', markupPercent: '50' };
    const res = await gql(ctx.app, `mutation($id: ID!, $input: PurchaseInput!) { updatePurchase(id: $id, input: $input) { id } }`, { id: lot.id, input }, { token });
    expect(res.errors?.[0].message).toBe('QUANTITY_BELOW_SOLD'); // 4 units are already sold
  });

  it('archives instead of deleting a lot that has sales history', async () => {
    const lot = await ctx.prisma.purchase.findFirstOrThrow();
    const res = await gql<{ deletePurchase: { archived: boolean } }>(
      ctx.app,
      `mutation($id: ID!, $password: String!) { deletePurchase(id: $id, password: $password) { archived } }`,
      { id: lot.id, password: USERS.one.password },
      { token },
    );
    expect(res.data!.deletePurchase.archived).toBe(true);
    expect((await dashboard()).profit).toBe('41000'); // history (and FIFO cost) is preserved
    const visible = await gql<{ purchases: unknown[] }>(ctx.app, `{ purchases { id } }`, {}, { token });
    expect(visible.data!.purchases).toHaveLength(0);
  });

  it('links a product entered with the store product ID instead of the SKU', async () => {
    const res = await gql<{ createPurchase: { product: { storeProduct: { externalId: string } | null } } }>(
      ctx.app,
      `mutation($input: PurchaseInput!) { createPurchase(input: $input) { product { storeProduct { externalId } } } }`,
      { input: { product: { name: 'Рубашка', categoryKey: 'Shirts', sku: 'sp-2' }, currency: 'UZS', unitCost: '300000', quantity: 3, pricingMode: 'MARKUP', markupPercent: '40' } },
      { token },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data!.createPurchase.product.storeProduct?.externalId).toBe('sp-2');
  });

  it('records a failed run with a clear error when the store rejects the credentials', async () => {
    const { StoreSyncService } = await import('../../src/modules/integrations/store-sync.service');
    const { StoreClient } = await import('../../src/modules/integrations/store-client');
    const sync = ctx.app.get(StoreSyncService);
    const badClient = new StoreClient({ graphqlUrl: store.url, login: 'admin@store.test', password: 'wrong', pageSize: 10, timeoutMs: 5000 });
    await expect(sync.sync('MANUAL', badClient)).rejects.toThrow(/Store login failed/);
    const last = await ctx.prisma.syncRun.findFirstOrThrow({ orderBy: { startedAt: 'desc' } });
    expect(last.status).toBe('FAILED');
  });
});
