-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "dodoProductId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "dodoSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "dodoCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "dodoCheckoutSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Subscription_dodoSubscriptionId_idx" ON "Subscription"("dodoSubscriptionId");
