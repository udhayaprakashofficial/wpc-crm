import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when schema adds fields/models that a hot-reloaded client must pick up. */
const PRISMA_SCHEMA_REV = 11;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaSchemaRev: number | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const useSsl =
    connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com");

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function clientHasModelField(
  client: PrismaClient,
  model: string,
  field: string,
) {
  const runtime = client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: { name: string }[] }>;
    };
  };
  const fields = runtime._runtimeDataModel?.models?.[model]?.fields;
  if (!fields?.length) return false;
  return fields.some((f) => f.name === field);
}

function getClient() {
  let client = globalForPrisma.prisma;
  const staleRev = globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV;
  const missingDelegates =
    !client ||
    typeof (client as unknown as { staffMember?: { findMany?: unknown } })
      .staffMember?.findMany !== "function" ||
    typeof (client as unknown as { supplyItem?: { findMany?: unknown } })
      .supplyItem?.findMany !== "function" ||
    typeof (client as unknown as { portfolioClient?: { findMany?: unknown } })
      .portfolioClient?.findMany !== "function" ||
    typeof (client as unknown as { adCampaign?: { findMany?: unknown } })
      .adCampaign?.findMany !== "function";
  const missingSchemaFields =
    !client ||
    !clientHasModelField(client, "Business", "waEnabled") ||
    !clientHasModelField(client, "AdCampaign", "productPricePaise");

  if (!client || staleRev || missingDelegates || missingSchemaFields) {
    client = createPrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  }

  return client;
}

export const prisma = getClient();
