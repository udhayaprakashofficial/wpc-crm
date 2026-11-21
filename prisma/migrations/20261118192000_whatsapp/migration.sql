-- AlterTable
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "waEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "waPhoneNumberId" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "waAccessToken" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "waVerifyToken" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "waDefaultCountryCode" TEXT NOT NULL DEFAULT '91';

CREATE INDEX IF NOT EXISTS "Business_waPhoneNumberId_idx" ON "Business"("waPhoneNumberId");
