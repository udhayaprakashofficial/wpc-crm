-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'LEFT');
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY_FIXED', 'DAILY_WAGE', 'HOURLY', 'COMMISSION', 'FIXED_PLUS_COMMISSION');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY');
CREATE TYPE "CommissionBasis" AS ENUM ('NONE', 'DEAL_WON', 'APPOINTMENT_COMPLETED');
CREATE TYPE "AdvanceStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');
CREATE TYPE "PayrollLineStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "joiningDate" DATE NOT NULL,
    "leftAt" DATE,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "salaryType" "SalaryType" NOT NULL DEFAULT 'MONTHLY_FIXED',
    "basicPaise" INTEGER NOT NULL DEFAULT 0,
    "allowancePaise" INTEGER NOT NULL DEFAULT 0,
    "overtimeRatePaise" INTEGER NOT NULL DEFAULT 0,
    "commissionBasis" "CommissionBasis" NOT NULL DEFAULT 'NONE',
    "commissionBps" INTEGER NOT NULL DEFAULT 0,
    "commissionFlatPaise" INTEGER NOT NULL DEFAULT 0,
    "targetBonusPaise" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upiId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffDocument" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "remainingPaise" INTEGER NOT NULL,
    "monthsTotal" INTEGER NOT NULL DEFAULT 1,
    "monthsPaid" INTEGER NOT NULL DEFAULT 0,
    "monthlyDeductionPaise" INTEGER NOT NULL,
    "note" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 1,
    "finalizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "PayrollLineStatus" NOT NULL DEFAULT 'DRAFT',
    "presentDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "halfDays" INTEGER NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "holidayDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "basePaise" INTEGER NOT NULL DEFAULT 0,
    "allowancePaise" INTEGER NOT NULL DEFAULT 0,
    "overtimePaise" INTEGER NOT NULL DEFAULT 0,
    "commissionPaise" INTEGER NOT NULL DEFAULT 0,
    "incentivePaise" INTEGER NOT NULL DEFAULT 0,
    "bonusPaise" INTEGER NOT NULL DEFAULT 0,
    "absenceDeductionPaise" INTEGER NOT NULL DEFAULT 0,
    "advanceDeductionPaise" INTEGER NOT NULL DEFAULT 0,
    "otherDeductionPaise" INTEGER NOT NULL DEFAULT 0,
    "netPaise" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode",
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffMember_businessId_status_idx" ON "StaffMember"("businessId", "status");
CREATE INDEX "StaffMember_businessId_deletedAt_idx" ON "StaffMember"("businessId", "deletedAt");
CREATE INDEX "StaffMember_userId_idx" ON "StaffMember"("userId");
CREATE INDEX "StaffDocument_staffId_idx" ON "StaffDocument"("staffId");
CREATE UNIQUE INDEX "Attendance_staffId_date_key" ON "Attendance"("staffId", "date");
CREATE INDEX "Attendance_businessId_date_idx" ON "Attendance"("businessId", "date");
CREATE INDEX "Attendance_staffId_date_idx" ON "Attendance"("staffId", "date");
CREATE INDEX "SalaryAdvance_businessId_status_idx" ON "SalaryAdvance"("businessId", "status");
CREATE INDEX "SalaryAdvance_staffId_status_idx" ON "SalaryAdvance"("staffId", "status");
CREATE UNIQUE INDEX "PayrollRun_businessId_year_month_key" ON "PayrollRun"("businessId", "year", "month");
CREATE INDEX "PayrollRun_businessId_status_idx" ON "PayrollRun"("businessId", "status");
CREATE UNIQUE INDEX "PayrollLine_payrollRunId_staffId_key" ON "PayrollLine"("payrollRunId", "staffId");
CREATE INDEX "PayrollLine_staffId_idx" ON "PayrollLine"("staffId");
CREATE INDEX "PayrollLine_status_idx" ON "PayrollLine"("status");

ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
