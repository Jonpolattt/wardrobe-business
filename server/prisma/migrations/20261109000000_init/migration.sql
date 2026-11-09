-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('UZS', 'USD', 'CNY');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('MARKUP', 'PRICE');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED');

-- CreateEnum
CREATE TYPE "GarmentKind" AS ENUM ('shirt', 'coat', 'pants', 'knit');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "photoUrl" TEXT,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "replacedById" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "sku" TEXT,
    "categoryId" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#a8a698',
    "kind" "GarmentKind" NOT NULL DEFAULT 'shirt',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "storeProductId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "originRu" TEXT NOT NULL DEFAULT '',
    "originUz" TEXT NOT NULL DEFAULT '',
    "status" "BatchStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "orderDate" DATE,
    "arrivalDate" DATE,
    "plannedUnits" INTEGER,
    "plannedCost" DECIMAL(18,2),
    "plannedCurrency" "Currency",
    "plannedFxRateToUzs" DECIMAL(18,6),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "currency" "Currency" NOT NULL,
    "fxRateToUzs" DECIMAL(18,6) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cargoTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pricingMode" "PricingMode" NOT NULL DEFAULT 'MARKUP',
    "markupPercent" DECIMAL(9,2) NOT NULL,
    "salePrice" DECIMAL(18,2) NOT NULL,
    "purchaseTotal" DECIMAL(18,2) NOT NULL,
    "cargoPerUnit" DECIMAL(18,4) NOT NULL,
    "unitCostWithCargo" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "expectedRevenue" DECIMAL(18,2) NOT NULL,
    "expectedProfit" DECIMAL(18,2) NOT NULL,
    "orderDate" DATE,
    "arrivalDate" DATE,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "externalId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleRu" TEXT,
    "price" DECIMAL(18,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("externalId")
);

-- CreateTable
CREATE TABLE "store_sales" (
    "externalItemId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "orderStatus" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "counted" BOOLEAN NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_sales_pkey" PRIMARY KEY ("externalItemId")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "trigger" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "productsSeen" INTEGER NOT NULL DEFAULT 0,
    "ordersSeen" INTEGER NOT NULL DEFAULT 0,
    "salesCreated" INTEGER NOT NULL DEFAULT 0,
    "salesUpdated" INTEGER NOT NULL DEFAULT 0,
    "productsLinked" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "usdToUzs" DECIMAL(18,6) NOT NULL,
    "usdToCny" DECIMAL(18,6) NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meta" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_slot_key" ON "users"("slot");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_familyId_idx" ON "sessions"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_storeProductId_key" ON "products"("storeProductId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_code_key" ON "batches"("code");

-- CreateIndex
CREATE INDEX "purchases_productId_idx" ON "purchases"("productId");

-- CreateIndex
CREATE INDEX "purchases_batchId_idx" ON "purchases"("batchId");

-- CreateIndex
CREATE INDEX "store_products_sku_idx" ON "store_products"("sku");

-- CreateIndex
CREATE INDEX "store_sales_storeProductId_idx" ON "store_sales"("storeProductId");

-- CreateIndex
CREATE INDEX "store_sales_orderedAt_idx" ON "store_sales"("orderedAt");

-- CreateIndex
CREATE INDEX "store_sales_externalOrderId_idx" ON "store_sales"("externalOrderId");

-- CreateIndex
CREATE INDEX "sync_runs_startedAt_idx" ON "sync_runs"("startedAt");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("externalId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity rules that Prisma schema cannot express ------------------------
-- The application is closed: only two accounts may exist (slot 1 and slot 2).
ALTER TABLE "users" ADD CONSTRAINT "users_slot_check" CHECK ("slot" IN (1, 2));
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));

-- Purchases: positive quantities and prices, no division by zero later on.
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_unit_cost_check" CHECK ("unitCost" > 0);
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cargo_check" CHECK ("cargoTotal" >= 0);
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_sale_price_check" CHECK ("salePrice" > 0);
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_fx_check" CHECK ("fxRateToUzs" > 0);

-- Settings are a single row with positive exchange rates.
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_singleton_check" CHECK ("id" = 1);
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_rates_check" CHECK ("usdToUzs" > 0 AND "usdToCny" > 0);
ALTER TABLE "batches" ADD CONSTRAINT "batches_planned_check" CHECK (("plannedUnits" IS NULL OR "plannedUnits" > 0) AND ("plannedCost" IS NULL OR "plannedCost" >= 0));
