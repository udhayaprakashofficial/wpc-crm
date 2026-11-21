CREATE TYPE "SupplyUnit" AS ENUM ('PCS', 'BOX', 'KG', 'LITRE', 'ML', 'PACK', 'SET', 'OTHER');

CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" "SupplyUnit" NOT NULL DEFAULT 'PCS',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPaise" INTEGER NOT NULL DEFAULT 0,
    "sellPaise" INTEGER NOT NULL DEFAULT 0,
    "vendorName" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplyItem_businessId_sku_key" ON "SupplyItem"("businessId", "sku");
CREATE INDEX "SupplyItem_businessId_name_idx" ON "SupplyItem"("businessId", "name");
CREATE INDEX "SupplyItem_businessId_deletedAt_idx" ON "SupplyItem"("businessId", "deletedAt");
CREATE INDEX "SupplyItem_businessId_quantity_idx" ON "SupplyItem"("businessId", "quantity");

ALTER TABLE "SupplyItem" ADD CONSTRAINT "SupplyItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
