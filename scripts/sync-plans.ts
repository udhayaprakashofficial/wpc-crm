import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ALL_FEATURES,
  FREE_TRIAL_FEATURES,
  PLAN_DEFS,
} from "../src/lib/plans";

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
      name: PLAN_DEFS.free_trial.name,
      pricePaise: 0,
      maxContacts: 25,
      features: { ...FREE_TRIAL_FEATURES },
      active: true,
    },
    create: {
      code: PLAN_DEFS.free_trial.code,
      name: PLAN_DEFS.free_trial.name,
      pricePaise: 0,
      intervalMonths: 1,
      maxUsers: 99,
      maxContacts: 25,
      features: { ...FREE_TRIAL_FEATURES },
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: PLAN_DEFS.paid_yearly.code },
    update: {
      name: "Pro",
      pricePaise: 174_900,
      intervalMonths: 12,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
    create: {
      code: PLAN_DEFS.paid_yearly.code,
      name: "Pro",
      pricePaise: 174_900,
      intervalMonths: 12,
      maxUsers: 99,
      maxContacts: 1000,
      features: { ...ALL_FEATURES },
      active: true,
    },
  });

  await prisma.plan.updateMany({
    where: { code: PLAN_DEFS.paid_monthly.code },
    data: { active: false, pricePaise: 174_900 },
  });

  const plans = await prisma.plan.findMany({
    select: {
      code: true,
      name: true,
      pricePaise: true,
      active: true,
      maxContacts: true,
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
