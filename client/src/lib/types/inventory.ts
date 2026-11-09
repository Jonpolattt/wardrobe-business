import type { BatchData, BatchStatusApi, GarmentKind, PurchaseData } from './api';

export type BatchStatusKey = 'Delivered' | 'In transit' | 'Preparing';

export const BATCH_STATUS: Record<BatchStatusApi, BatchStatusKey> = {
  DELIVERED: 'Delivered',
  IN_TRANSIT: 'In transit',
  PREPARING: 'Preparing',
};

/**
 * A purchase lot as the interface shows it (a "товар" row). All money values
 * are UZS numbers calculated by the backend; the interface only formats them.
 */
export interface UiProduct {
  id: string;
  code: string;
  productId: string;
  name: { ru: string; uz: string };
  category: string;
  batchId: string | null;
  sku: string | null;
  photos: string[];
  color: string;
  kind: GarmentKind;
  quantity: number;
  sold: number;
  stock: number;
  price: number;
  unitCost: number;
  cargoPerUnit: number;
  fullCost: number;
  unitProfit: number;
  markupPercent: number;
  expectedRevenue: number;
  totalCost: number;
  revenue: number;
  actualProfit: number | null;
  remainingProfit: number;
  orderDate: string | null;
  arrivalDate: string | null;
  addedAt: string;
  syncedAt: string | null;
  storeLinked: boolean;
  raw: PurchaseData;
}

export interface UiBatch {
  id: string;
  code: string;
  name: { ru: string; uz: string };
  origin: { ru: string; uz: string };
  status: BatchStatusKey;
  date: string;
  units: number;
  cost: number;
  turnover: number;
  profit: number;
  percent: number;
  lotsCount: number;
  raw: BatchData;
}

const num = (value: string | null | undefined) => (value === null || value === undefined ? 0 : Number(value));

export function toUiProduct(p: PurchaseData): UiProduct {
  return {
    id: p.id,
    code: p.product.code,
    productId: p.product.id,
    name: { ru: p.product.nameRu, uz: p.product.nameUz },
    category: p.product.category.key,
    batchId: p.batch?.id ?? null,
    sku: p.product.sku,
    photos: p.product.photos,
    color: p.product.color,
    kind: p.product.kind,
    quantity: p.quantity,
    sold: p.soldQty,
    stock: p.remainingQty,
    price: num(p.salePriceUzs),
    unitCost: num(p.unitCostUzs),
    cargoPerUnit: num(p.cargoPerUnitUzs),
    fullCost: num(p.unitCostWithCargoUzs),
    unitProfit: num(p.unitProfitUzs),
    markupPercent: num(p.markupPercent),
    expectedRevenue: num(p.expectedRevenueUzs),
    totalCost: num(p.totalCostUzs),
    revenue: num(p.revenueUzs),
    actualProfit: p.actualProfitUzs === null ? null : num(p.actualProfitUzs),
    remainingProfit: num(p.remainingProfitUzs),
    orderDate: p.orderDate,
    arrivalDate: p.arrivalDate,
    addedAt: p.arrivalDate ?? p.orderDate ?? p.createdAt.slice(0, 10),
    syncedAt: p.product.storeProduct?.syncedAt ?? null,
    storeLinked: p.product.storeProduct !== null,
    raw: p,
  };
}

export function toUiBatch(b: BatchData): UiBatch {
  return {
    id: b.id,
    code: b.code,
    name: { ru: b.nameRu, uz: b.nameUz },
    origin: { ru: b.originRu, uz: b.originUz },
    status: BATCH_STATUS[b.status],
    date: b.date,
    units: b.quantity,
    cost: num(b.totalCostUzs),
    turnover: num(b.revenueUzs),
    profit: num(b.netProfitUzs),
    percent: Math.round(num(b.netProfitPercent)),
    lotsCount: b.lotsCount,
    raw: b,
  };
}
