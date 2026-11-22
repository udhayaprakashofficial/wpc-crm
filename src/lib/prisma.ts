import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when schema adds fields/models that a hot-reloaded client must pick up. */
const PRISMA_SCHEMA_REV = 12;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaSchemaRev: number | undefined;
};

/**
 * Supabase `db.<ref>.supabase.co` is often IPv6-only. Vercel cannot reach it.
 * Map known projects (and optional SUPABASE_POOLER_HOST) to the IPv4 pooler.
 */
const SUPABASE_POOLER_BY_REF: Record<string, string> = {
  jtrkngxqghzpngwemkwc: "aws-1-ap-southeast-1.pooler.supabase.com",
};

function resolveConnectionString(): string {
  if (process.env.DATABASE_POOL_URL) {
    return process.env.DATABASE_POOL_URL;
  }

  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new Error("DATABASE_URL is not set");
  }

  const onServerless = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FORCE_SUPABASE_POOLER === "1",
  );
  if (!onServerless) return configured;

  try {
    const u = new URL(configured);
    if (u.hostname.includes("pooler.supabase.com")) {
      return configured;
    }

    const refMatch = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!refMatch) return configured;

    const ref = refMatch[1];
    const poolerHost =
      process.env.SUPABASE_POOLER_HOST || SUPABASE_POOLER_BY_REF[ref];
    if (!poolerHost) return configured;

    u.hostname = poolerHost;
    u.port = "6543";
    u.username = `postgres.${ref}`;
    u.searchParams.set("pgbouncer", "true");
    return u.toString();
  } catch {
    return configured;
  }
}

function createPrismaClient() {
  const connectionString = resolveConnectionString();

  const useSsl =
    connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes("prisma.io");

  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  );

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: isServerless ? 10_000 : 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pgPool);
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
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  }

  return client;
}

/**
 * Lazy client — import must not throw during `next build` when DATABASE_URL
 * is unset (route collection). Connection is created on first use at runtime.
 * Always reuse the client/pool on globalThis (including production).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
