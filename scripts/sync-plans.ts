import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_FEATURES, PLAN_DEFS } from "../src/lib/plans";

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
  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.free_trial.code },
    update: {
      name: "Free",
      pricePaise: 0,
      active: false,
      maxContacts: 0,
    },
    create: {
      code: PLAN_DEFS.free_trial.code,
      name: "Free",
      pricePaise: 0,
      intervalMonths: 1,
      maxUsers: 1,
      maxContacts: 0,
      features: {},
      active: false,
    },
  });

  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.paid_monthly.code },
    update: {
      name: "Monthly",
      pricePaise: PLAN_DEFS.paid_monthly.pricePaise,
      intervalMonths: 1,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
    create: {
      code: PLAN_DEFS.paid_monthly.code,
      name: "Monthly",
      pricePaise: PLAN_DEFS.paid_monthly.pricePaise,
      intervalMonths: 1,
      maxUsers: 99,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.paid_yearly.code },
    update: {
      name: "Yearly",
      pricePaise: PLAN_DEFS.paid_yearly.pricePaise,
      intervalMonths: 12,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
    create: {
      code: PLAN_DEFS.paid_yearly.code,
      name: "Yearly",
      pricePaise: PLAN_DEFS.paid_yearly.pricePaise,
      intervalMonths: 12,
      maxUsers: 99,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
  });

  const plans = await prisma.plan.findMany({
    select: {
      code: true,
      name: true,
      pricePaise: true,
      active: true,
      intervalMonths: true,
    },
    orderBy: { code: "asc" },
  });
  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
