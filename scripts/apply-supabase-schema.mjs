#!/usr/bin/env node
/**
 * Applies prisma/migrations/20261118180000_init/migration.sql to DATABASE_URL.
 * Usage: node --env-file=.env scripts/apply-supabase-schema.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error(
    "Set DATABASE_URL to your Supabase Postgres URI first.\n" +
      "Dashboard → Project Settings → Database → Connection string (URI).",
  );
  process.exit(1);
}

const sqlPath = resolve(
  process.cwd(),
  "prisma/migrations/20261118180000_init/migration.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const useSsl =
  url.includes("supabase.co") || url.includes("pooler.supabase.com");

const client = new pg.Client({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Supabase schema applied successfully.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Failed to apply schema:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
