import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const useSsl =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com");
const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const { PLAN_DEFS, LEGACY_PLAN_CODES } = await import("../src/lib/plans");

  function planRow(
    def:
      | typeof PLAN_DEFS.free_trial
      | typeof PLAN_DEFS.paid_monthly
      | typeof PLAN_DEFS.paid_yearly,
    active = true,
  ) {
    return {
      code: def.code,
      name: def.name,
      pricePaise: def.pricePaise,
      intervalMonths: def.intervalMonths,
      maxUsers: def.maxUsers,
      maxContacts: def.maxContacts,
      features: { ...def.features },
      active,
    };
  }

  // Free / trial retired
  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.free_trial.code },
    update: planRow(PLAN_DEFS.free_trial, false),
    create: planRow(PLAN_DEFS.free_trial, false),
  });

  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.paid_monthly.code },
    update: planRow(PLAN_DEFS.paid_monthly),
    create: planRow(PLAN_DEFS.paid_monthly),
  });

  const yearlyPlan = await prisma.plan.upsert({
    where: { code: PLAN_DEFS.paid_yearly.code },
    update: planRow(PLAN_DEFS.paid_yearly),
    create: planRow(PLAN_DEFS.paid_yearly),
  });

  for (const code of LEGACY_PLAN_CODES) {
    await prisma.plan.updateMany({
      where: { code },
      data: { active: false },
    });
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.wpc" },
    update: { isSuperAdmin: true },
    create: {
      name: "Demo Owner",
      email: "owner@demo.wpc",
      phone: "9999999999",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: "demo-salon" },
    update: {},
    create: {
      name: "Demo Salon",
      slug: "demo-salon",
      industry: "salon",
      publicFormSlug: "demo-salon",
      onboardingComplete: true,
      yearlyRevenueGoalPaise: 240_000_000, // ₹24,00,000
      memberships: {
        create: {
          userId: owner.id,
          role: "OWNER",
        },
      },
      subscriptions: {
        create: {
          planId: yearlyPlan.id,
          status: "ACTIVE",
          currentPeriodEnd: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ),
        },
      },
      pipelineStages: {
        create: [
          { name: "New", key: "new", position: 0, color: "#64748b" },
          { name: "Contacted", key: "contacted", position: 1, color: "#0ea5e9" },
          { name: "Quote Sent", key: "quote_sent", position: 2, color: "#a855f7" },
          { name: "Won", key: "won", position: 3, color: "#16a34a", isWon: true },
          { name: "Lost", key: "lost", position: 4, color: "#dc2626", isLost: true },
        ],
      },
      categories: {
        create: [
          { kind: "EXPENSE", name: "Rent" },
          { kind: "EXPENSE", name: "Salaries" },
          { kind: "EXPENSE", name: "Electricity" },
          { kind: "EXPENSE", name: "Marketing/Ads" },
          { kind: "EXPENSE", name: "Inventory" },
          { kind: "INCOME", name: "Services" },
          { kind: "INCOME", name: "Products" },
        ],
      },
      messageTemplates: {
        create: [
          {
            name: "Quote sent",
            category: "sales",
            body: "Hi {{name}}, I've sent your quote. Let me know if you have questions!",
          },
          {
            name: "Payment reminder",
            category: "finance",
            body: "Hi {{name}}, this is a friendly reminder that invoice {{invoice}} is due.",
          },
          {
            name: "Birthday wish",
            category: "engagement",
            body: "Happy Birthday {{name}}! Wishing you a wonderful year ahead.",
          },
        ],
      },
      automations: {
        create: [
          { key: "new_lead_assign", name: "Auto-assign new leads", enabled: true },
          { key: "new_lead_followup", name: "Create follow-up for new leads", enabled: true },
        ],
      },
    },
  });

  // Demo staff for salary module (idempotent-ish)
  const existingStaff = await prisma.staffMember.count({
    where: { businessId: business.id, deletedAt: null },
  });
  if (existingStaff === 0) {
    await prisma.staffMember.createMany({
      data: [
        {
          businessId: business.id,
          userId: owner.id,
          name: "Demo Owner",
          phone: "9999999999",
          jobTitle: "Owner / Manager",
          joiningDate: new Date("2024-04-01"),
          salaryType: "MONTHLY_FIXED",
          basicPaise: 4000000, // ₹40,000
          allowancePaise: 500000,
          overtimeRatePaise: 30000,
          targetBonusPaise: 500000,
          upiId: "owner@upi",
        },
        {
          businessId: business.id,
          name: "Priya Stylist",
          phone: "9888888888",
          jobTitle: "Senior Stylist",
          joiningDate: new Date("2025-01-15"),
          salaryType: "FIXED_PLUS_COMMISSION",
          basicPaise: 1800000,
          allowancePaise: 200000,
          overtimeRatePaise: 20000,
          commissionBasis: "APPOINTMENT_COMPLETED",
          commissionFlatPaise: 20000, // ₹200 / appointment
          targetBonusPaise: 300000,
          upiId: "priya@upi",
        },
        {
          businessId: business.id,
          name: "Ravi Helper",
          phone: "9777777777",
          jobTitle: "Helper",
          joiningDate: new Date("2025-06-01"),
          salaryType: "DAILY_WAGE",
          basicPaise: 70000, // ₹700 / day
          allowancePaise: 0,
          overtimeRatePaise: 10000,
          upiId: "ravi@upi",
        },
      ],
    });
    console.log("Seeded 3 demo staff members");
  }

  const existingSupplies = await prisma.supplyItem.count({
    where: { businessId: business.id, deletedAt: null },
  });
  if (existingSupplies === 0) {
    await prisma.supplyItem.createMany({
      data: [
        {
          businessId: business.id,
          name: "Shampoo 1L",
          sku: "SH-1L",
          unit: "PCS",
          quantity: 24,
          reorderLevel: 8,
          costPaise: 25000,
          sellPaise: 45000,
          vendorName: "Beauty Distro",
          category: "Hair",
        },
        {
          businessId: business.id,
          name: "Hair colour tube",
          sku: "HC-TUBE",
          unit: "PCS",
          quantity: 40,
          reorderLevel: 15,
          costPaise: 18000,
          sellPaise: 35000,
          vendorName: "Beauty Distro",
          category: "Colour",
        },
        {
          businessId: business.id,
          name: "Disposable towels",
          sku: "TW-PACK",
          unit: "PACK",
          quantity: 6,
          reorderLevel: 4,
          costPaise: 12000,
          sellPaise: 0,
          vendorName: "Local store",
          category: "Consumables",
        },
      ],
    });
    console.log("Seeded 3 demo supply items");
  }

  console.log(
    "Seeded plans:",
    PLAN_DEFS.paid_monthly.code,
    PLAN_DEFS.paid_yearly.code,
  );
  console.log("Seeded owner: owner@demo.wpc / password123");
  console.log("Seeded business:", business.slug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
