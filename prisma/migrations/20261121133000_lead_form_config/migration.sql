-- AlterTable
ALTER TABLE "Business" ADD COLUMN "leadFormEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Business" ADD COLUMN "leadFormTitle" TEXT;
ALTER TABLE "Business" ADD COLUMN "leadFormSubtitle" TEXT;
ALTER TABLE "Business" ADD COLUMN "leadFormConfig" JSONB;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "formResponses" JSONB;
