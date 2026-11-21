-- CreateEnum
CREATE TYPE "PortfolioClientStatus" AS ENUM ('CURRENT', 'COMPLETED');

-- CreateTable
CREATE TABLE "PortfolioClient" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessDetails" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "services" TEXT,
    "workHistory" TEXT,
    "achievements" TEXT,
    "status" "PortfolioClientStatus" NOT NULL DEFAULT 'CURRENT',
    "revenuePaise" INTEGER,
    "expensePaise" INTEGER,
    "contactId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PortfolioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "portfolioClientId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "externalCampaignId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "results" INTEGER NOT NULL DEFAULT 0,
    "amountSpentPaise" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "costPerResultPaise" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioClient_businessId_status_idx" ON "PortfolioClient"("businessId", "status");

-- CreateIndex
CREATE INDEX "PortfolioClient_businessId_deletedAt_idx" ON "PortfolioClient"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "PortfolioClient_businessId_name_idx" ON "PortfolioClient"("businessId", "name");

-- CreateIndex
CREATE INDEX "AdCampaign_businessId_portfolioClientId_idx" ON "AdCampaign"("businessId", "portfolioClientId");

-- CreateIndex
CREATE INDEX "AdCampaign_businessId_startDate_endDate_idx" ON "AdCampaign"("businessId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdCampaign_businessId_deletedAt_idx" ON "AdCampaign"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "AdCampaign_portfolioClientId_startDate_idx" ON "AdCampaign"("portfolioClientId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_businessId_dedupeKey_key" ON "AdCampaign"("businessId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "PortfolioClient" ADD CONSTRAINT "PortfolioClient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_portfolioClientId_fkey" FOREIGN KEY ("portfolioClientId") REFERENCES "PortfolioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
