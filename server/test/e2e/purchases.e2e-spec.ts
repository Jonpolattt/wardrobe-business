import { NestExpressApplication } from '@nestjs/platform-express';
import { createTestApp, gql, login, TestContext, USERS } from '../support/app';

const PURCHASE_FIELDS = `id quantity currency unitCost cargoTotal pricingMode markupPercent salePrice purchaseTotal cargoPerUnit unitCostWithCargo
  totalCost expectedRevenue expectedProfit totalCostUzs expectedProfitUzs salePriceUzs soldQty remainingQty actualProfitUzs hasSalesData archived
  orderDate arrivalDate product { id code nameRu sku category { key } } batch { id code }`;
const CREATE = `mutation($input: PurchaseInput!) { createPurchase(input: $input) { ${PURCHASE_FIELDS} } }`;
const UPDATE = `mutation($id: ID!, $input: PurchaseInput!) { updatePurchase(id: $id, input: $input) { ${PURCHASE_FIELDS} } }`;

type Purchase = Record<string, any>;

const baseInput = (patch: Record<string, unknown> = {}) => ({
  product: { name: 'Базовая хлопковая футболка', categoryKey: 'T-shirts', sku: 'TS-001' },
  currency: 'USD',
  unitCost: '18',
  quantity: 430,
  cargoTotal: '215',
  pricingMode: 'MARKUP',
  markupPercent: '50',
  orderDate: '2026-10-01',
  arrivalDate: '2026-10-20',
  ...patch,
});

describe('purchases, batches and analytics', () => {
  let ctx: TestContext;
  let token: string;
  beforeAll(async () => {
    ctx = await createTestApp();
    token = (await login(ctx.app, USERS.one)).token;
  });
  afterAll(async () => ctx.close());

  let batchId: string;
  let purchase: Purchase;

  it('creates a batch with a generated code', async () => {
    const res = await gql<{ createBatch: Record<string, any> }>(
      ctx.app,
      `mutation($input: BatchInput!) { createBatch(input: $input) { id code nameRu status quantity totalCostUzs lotsCount } }`,
      { input: { name: 'Весенняя база', origin: 'Стамбул, Турция', status: 'IN_TRANSIT', plannedUnits: 450, plannedCost: '9800', plannedCurrency: 'USD' } },
      { token },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data!.createBatch.code).toBe('BT-001');
    expect(res.data!.createBatch.quantity).toBe(450); // planned until purchases are added
    expect(res.data!.createBatch.totalCostUzs).toBe('125832000'); // 9800 × 12840
    batchId = res.data!.createBatch.id;
  });

  it('calculates the purchase on the backend', async () => {
    const res = await gql<{ createPurchase: Purchase }>(ctx.app, CREATE, { input: baseInput({ batchId }) }, { token });
    expect(res.errors).toBeUndefined();
    purchase = res.data!.createPurchase;
    expect(purchase.product.code).toBe('WR-001');
    expect(purchase.purchaseTotal).toBe('7740'); // 18 × 430
    expect(purchase.cargoPerUnit).toBe('0.5'); // 215 / 430
    expect(purchase.unitCostWithCargo).toBe('18.5');
    expect(purchase.salePrice).toBe('27.75'); // 18.5 × 1.5
    expect(purchase.expectedProfit).toBe('3977.5'); // (27.75 − 18.5) × 430
    expect(purchase.totalCostUzs).toBe('102142200'); // 7955 × 12840
    expect(purchase.actualProfitUzs).toBeNull(); // no reliable sales data yet
    expect(purchase.remainingQty).toBe(430);
  });

  it('derives the markup when the sale price is entered', async () => {
    const res = await gql<{ updatePurchase: Purchase }>(
      ctx.app,
      UPDATE,
      { id: purchase.id, input: baseInput({ batchId, pricingMode: 'PRICE', markupPercent: null, salePrice: '37' }) },
      { token },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data!.updatePurchase.markupPercent).toBe('100'); // 37 / 18.5 − 1
    expect(res.data!.updatePurchase.expectedProfit).toBe('7955');
  });

  it('validates quantities, prices and dates', async () => {
    const bad = async (patch: Record<string, unknown>) => (await gql(ctx.app, CREATE, { input: baseInput(patch) }, { token })).errors?.[0].message;
    expect(await bad({ quantity: 0 })).toMatch(/QUANTITY_INVALID|Bad Request/);
    expect(await bad({ unitCost: '0' })).toBe('UNIT_COST_INVALID');
    expect(await bad({ markupPercent: '-100' })).toBe('MARKUP_INVALID');
    expect(await bad({ arrivalDate: '2026-09-01' })).toBe('ARRIVAL_BEFORE_ORDER');
    expect(await bad({ product: { name: 'X', categoryKey: 'Nope' } })).toBe('CATEGORY_NOT_FOUND');
    expect(await bad({ unitCost: 'abc' })).toBeTruthy();
  });

  it('purchases an existing product again at a different price', async () => {
    const res = await gql<{ createPurchase: Purchase }>(
      ctx.app,
      CREATE,
      { input: baseInput({ product: { productId: purchase.product.id, name: 'Базовая хлопковая футболка', categoryKey: 'T-shirts', sku: 'TS-001' }, unitCost: '20', quantity: 100, cargoTotal: '0', currency: 'UZS' }) },
      { token },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data!.createPurchase.product.id).toBe(purchase.product.id);
    expect(await ctx.prisma.product.count()).toBe(1);
    expect(await ctx.prisma.purchase.count()).toBe(2);
  });

  it('rejects a duplicate SKU on another product', async () => {
    const res = await gql(ctx.app, CREATE, { input: baseInput({ product: { name: 'Other', categoryKey: 'Shirts', sku: 'TS-001' } }) }, { token });
    expect(res.errors?.[0].message).toBe('UNIQUE_CONSTRAINT');
  });

  it('shows batch totals derived from its lots', async () => {
    const res = await gql<{ batch: Record<string, any> }>(
      ctx.app,
      `query($id: ID!) { batch(id: $id) { quantity lotsCount totalCostUzs expectedProfitUzs expectedProfitPercent actualProfitUzs netProfitUzs netProfitPercent } }`,
      { id: batchId },
      { token },
    );
    expect(res.data!.batch.quantity).toBe(430);
    expect(res.data!.batch.lotsCount).toBe(1);
    expect(res.data!.batch.totalCostUzs).toBe('102142200');
    expect(res.data!.batch.expectedProfitUzs).toBe('102142200'); // 7955 USD × 12840
    expect(res.data!.batch.expectedProfitPercent).toBe('100');
    // Net result = revenue − total cost: nothing sold yet
    expect(res.data!.batch.netProfitUzs).toBe('-102142200');
    expect(res.data!.batch.netProfitPercent).toBe('-100');
  });

  it('returns per-unit figures of a lot in UZS', async () => {
    const res = await gql<{ purchase: Record<string, any> }>(
      ctx.app,
      `query($id: ID!) { purchase(id: $id) { expectedRevenueUzs cargoPerUnitUzs unitProfitUzs remainingProfitUzs } }`,
      { id: purchase.id },
      { token },
    );
    expect(res.errors).toBeUndefined();
    expect(res.data!.purchase).toEqual({
      expectedRevenueUzs: '204284400', // 37 × 430 × 12840
      cargoPerUnitUzs: '6420', // 0.5 × 12840
      unitProfitUzs: '237540', // (37 − 18.5) × 12840
      remainingProfitUzs: '102142200', // 430 × 18.5 × 12840
    });
  });

  it('reports expenses for the period and the selection', async () => {
    const all = await gql<{ dashboard: Record<string, any> }>(
      ctx.app,
      `{ dashboard(filter: { periodDays: 90 }) { selection current { revenue salesCount expenses profit } previous { expenses } } }`,
      {},
      { token },
    );
    expect(all.errors).toBeUndefined();
    // 102 142 200 (USD lot) + 2 000 (UZS lot)
    expect(all.data!.dashboard.current.expenses).toBe('102144200');
    expect(all.data!.dashboard.current.revenue).toBe('0');
    const selected = await gql<{ dashboard: Record<string, any> }>(
      ctx.app,
      `query($ids: [ID!]) { dashboard(filter: { periodDays: 30, purchaseIds: $ids }) { selection previous { revenue } current { expenses } } }`,
      { ids: [purchase.id] },
      { token },
    );
    expect(selected.data!.dashboard.selection).toBe(true);
    expect(selected.data!.dashboard.previous).toBeNull();
    expect(selected.data!.dashboard.current.expenses).toBe('102142200');
    // A batch without lots is counted with its planned total price
    const planned = await gql<{ createBatch: { id: string } }>(
      ctx.app,
      `mutation { createBatch(input: { name: "План", plannedUnits: 10, plannedCost: "100", plannedCurrency: USD }) { id } }`,
      {},
      { token },
    );
    const byBatch = await gql<{ dashboard: Record<string, any> }>(
      ctx.app,
      `query($ids: [ID!]) { dashboard(filter: { periodDays: 30, batchIds: $ids }) { current { expenses revenue } } }`,
      { ids: [planned.data!.createBatch.id] },
      { token },
    );
    expect(byBatch.data!.dashboard.current.expenses).toBe('1284000'); // 100 × 12840
    await ctx.prisma.batch.delete({ where: { id: planned.data!.createBatch.id } });
  });

  it('deletes a batch but keeps its lots in the product list', async () => {
    const DELETE = `mutation($id: ID!, $password: String!) { deleteBatch(id: $id, password: $password) { id archived } }`;
    const wrong = await gql(ctx.app, DELETE, { id: batchId, password: 'wrong-password' }, { token });
    expect(wrong.errors?.[0].message).toBe('PASSWORD_INCORRECT');
    const res = await gql<{ deleteBatch: { archived: boolean } }>(ctx.app, DELETE, { id: batchId, password: USERS.one.password }, { token });
    expect(res.errors).toBeUndefined();
    expect(res.data!.deleteBatch.archived).toBe(true); // the batch had lots → archived, not erased
    const after = await gql<{ batches: unknown[]; purchases: Purchase[] }>(ctx.app, `{ batches { id } purchases { id batch { id } } }`, {}, { token });
    expect(after.data!.batches).toHaveLength(0);
    expect(after.data!.purchases).toHaveLength(2);
    expect(after.data!.purchases.every((p) => p.batch === null)).toBe(true);
    // An empty batch is deleted for real
    const empty = await gql<{ createBatch: { id: string } }>(ctx.app, `mutation { createBatch(input: { name: "Пустая" }) { id } }`, {}, { token });
    const removed = await gql<{ deleteBatch: { archived: boolean } }>(ctx.app, DELETE, { id: empty.data!.createBatch.id, password: USERS.one.password }, { token });
    expect(removed.data!.deleteBatch.archived).toBe(false);
    expect(await ctx.prisma.batch.count({ where: { id: empty.data!.createBatch.id } })).toBe(0);
  });

  it('requires the password to delete and deletes lots without history', async () => {
    const DELETE = `mutation($id: ID!, $password: String!) { deletePurchase(id: $id, password: $password) { id archived } }`;
    const wrong = await gql(ctx.app, DELETE, { id: purchase.id, password: 'wrong-password' }, { token });
    expect(wrong.errors?.[0].message).toBe('PASSWORD_INCORRECT');
    const ok = await gql<{ deletePurchase: { archived: boolean } }>(ctx.app, DELETE, { id: purchase.id, password: USERS.one.password }, { token });
    expect(ok.data!.deletePurchase.archived).toBe(false);
    expect(await ctx.prisma.purchase.count()).toBe(1);
  });

  it('keeps data after an application restart', async () => {
    const again = await createTestAppKeepingData();
    const t = (await login(again.app, USERS.one)).token;
    const res = await gql<{ purchases: Purchase[] }>(again.app, `{ purchases { id unitCost } }`, {}, { token: t });
    expect(res.data!.purchases).toHaveLength(1);
    await again.app.close();
  });
});

/** Boots a second application instance on the same database without wiping it. */
async function createTestAppKeepingData() {
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../../src/app.module');
  const { configureApp } = await import('../../src/bootstrap');
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule, { logger: false }));
  await app.init();
  return { app };
}
