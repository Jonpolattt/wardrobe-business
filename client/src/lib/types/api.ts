/* Shapes of the GraphQL responses used by the interface. Decimal values arrive as strings. */
import type { Currency } from '../utils/labels';

export type DecimalString = string;
export type BatchStatusApi = 'DELIVERED' | 'IN_TRANSIT' | 'PREPARING';
export type GarmentKind = 'shirt' | 'coat' | 'pants' | 'knit';
export type PricingMode = 'MARKUP' | 'PRICE';

export interface CategoryData {
  id: string;
  key: string;
  nameRu: string;
  nameUz: string;
}

export interface StoreLinkData {
  externalId: string;
  sku: string;
  title: string;
  stock: number;
  soldCount: number;
  isActive: boolean;
  syncedAt: string;
}

export interface ProductData {
  id: string;
  code: string;
  nameRu: string;
  nameUz: string;
  sku: string | null;
  color: string;
  kind: GarmentKind;
  photos: string[];
  category: CategoryData;
  storeProduct: StoreLinkData | null;
}

export interface PurchaseData {
  id: string;
  currency: Currency;
  fxRateToUzs: DecimalString;
  unitCost: DecimalString;
  quantity: number;
  cargoTotal: DecimalString;
  pricingMode: PricingMode;
  markupPercent: DecimalString;
  salePrice: DecimalString;
  purchaseTotal: DecimalString;
  cargoPerUnit: DecimalString;
  unitCostWithCargo: DecimalString;
  totalCost: DecimalString;
  expectedRevenue: DecimalString;
  expectedProfit: DecimalString;
  unitCostUzs: DecimalString;
  unitCostWithCargoUzs: DecimalString;
  cargoTotalUzs: DecimalString;
  cargoPerUnitUzs: DecimalString;
  salePriceUzs: DecimalString;
  totalCostUzs: DecimalString;
  expectedRevenueUzs: DecimalString;
  expectedProfitUzs: DecimalString;
  unitProfitUzs: DecimalString;
  remainingProfitUzs: DecimalString;
  soldQty: number;
  remainingQty: number;
  revenueUzs: DecimalString;
  cogsUzs: DecimalString;
  actualProfitUzs: DecimalString | null;
  hasSalesData: boolean;
  orderDate: string | null;
  arrivalDate: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  batch: { id: string; code: string; nameRu: string; nameUz: string; status: BatchStatusApi } | null;
  product: ProductData;
}

export interface BatchData {
  id: string;
  code: string;
  nameRu: string;
  nameUz: string;
  originRu: string;
  originUz: string;
  status: BatchStatusApi;
  orderDate: string | null;
  arrivalDate: string | null;
  date: string;
  plannedUnits: number | null;
  plannedCost: DecimalString | null;
  plannedCurrency: Currency | null;
  lotsCount: number;
  quantity: number;
  totalCostUzs: DecimalString;
  expectedRevenueUzs: DecimalString;
  expectedProfitUzs: DecimalString;
  expectedProfitPercent: DecimalString;
  soldQty: number;
  revenueUzs: DecimalString;
  cogsUzs: DecimalString;
  actualProfitUzs: DecimalString | null;
  netProfitUzs: DecimalString;
  netProfitPercent: DecimalString;
  archived: boolean;
  createdAt: string;
}

export interface InventoryData {
  purchases: PurchaseData[];
  batches: BatchData[];
  categories: CategoryData[];
}

export interface ExchangeRatesData {
  exchangeRates: { usdToUzs: DecimalString; usdToCny: DecimalString; updatedAt: string };
}

export interface DashboardTotalsData {
  revenue: DecimalString;
  salesCount: number;
  expenses: DecimalString;
  profit: DecimalString;
  expectedProfit?: DecimalString;
  unallocatedUnits?: number;
}

export interface DashboardData {
  dashboard: {
    selection: boolean;
    from: string | null;
    to: string;
    revenueSpark: number[];
    salesSpark: number[];
    expensesSpark: number[];
    profitSpark: number[];
    revenueChangePercent: DecimalString | null;
    salesChangePercent: DecimalString | null;
    expensesChangePercent: DecimalString | null;
    profitChangePercent: DecimalString | null;
    current: DashboardTotalsData;
    previous: DashboardTotalsData | null;
  };
}

export interface RevenueSeriesData {
  revenueSeries: {
    range: 'WEEK' | 'MONTH' | 'YEAR';
    totalRevenue: DecimalString;
    totalExpenses: DecimalString;
    revenueChangePercent: DecimalString | null;
    expensesChangePercent: DecimalString | null;
    points: { date: string; revenue: DecimalString; expenses: DecimalString }[];
  };
}

export interface SalesByCategoryData {
  salesByCategory: {
    totalUnits: number;
    categories: { key: string; nameRu: string; nameUz: string; units: number; revenue: DecimalString; sharePercent: DecimalString }[];
  };
}

export interface ExpensesData {
  expenses: { id: string; kind: string; titleRu: string; titleUz: string; date: string; amountUzs: DecimalString; purchaseId: string }[];
}

export interface ActivityData {
  activity: { id: string; type: string; title: string; actorName: string | null; quantity: number | null; createdAt: string }[];
}

export interface SessionData {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
}

export interface MeData {
  me: UserData;
  mySessions: SessionData[];
}

export interface StoreSyncStatusData {
  storeSyncStatus: {
    configured: boolean;
    lastRun: { id: string; status: 'RUNNING' | 'SUCCESS' | 'FAILED'; startedAt: string; finishedAt: string | null; ordersSeen: number; salesCreated: number; salesUpdated: number; error: string | null } | null;
  };
}
