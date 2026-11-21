/**
 * Capture clean product screenshots for landing/auth (no trial/subscribe banners).
 * Ensures demo business has an ACTIVE yearly subscription before shooting.
 */
import "dotenv/config";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const base = process.env.APP_URL || "http://localhost:3000";
const email = process.env.CAPTURE_EMAIL || "owner@demo.wpc";
const password = process.env.CAPTURE_PASSWORD || "password123";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const useSsl =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com");
const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function ensurePaidDemo() {
  const yearly = await prisma.plan.findUnique({
    where: { code: "paid_yearly" },
  });
  if (!yearly) throw new Error("paid_yearly plan missing — run scripts/sync-plans.ts");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User ${email} not found`);

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new Error("No membership for capture user");

  const existing = await prisma.subscription.findFirst({
    where: { businessId: membership.businessId },
    orderBy: { createdAt: "desc" },
  });

  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: yearly.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        businessId: membership.businessId,
        planId: yearly.id,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
    });
  }
  console.log("Demo subscription → ACTIVE yearly (no banners)");
}

const shots = [
  ["/app", "public/brand/dashboard-preview.png"],
  ["/app/portfolio", "public/brand/shot-portfolio.png"],
  ["/app/contacts", "public/brand/shot-leads.png"],
  ["/app/pipeline", "public/brand/shot-pipeline.png"],
  ["/app/tasks", "public/brand/shot-followups.png"],
  ["/app/finance", "public/brand/shot-finance.png"],
];

async function main() {
  await ensurePaidDemo();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${base}/signin`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL(/\/(app|onboarding|settings)/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);

  // Hide floating help FAB so shots stay clean
  await page.addStyleTag({
    content: `
      [aria-label="Quick add"],
      .fixed.bottom-20, .fixed.bottom-8 { display: none !important; }
    `,
  });

  for (const [url, out] of shots) {
    await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    // Fail if trial/subscribe banners sneak in
    const banner = await page.locator("text=Pro trial").count();
    const subBanner = await page.locator("text=Subscribe to unlock").count();
    if (banner > 0 || subBanner > 0) {
      throw new Error(`Banner still visible on ${url}`);
    }
    const shell = page.locator("div.flex.h-dvh").first();
    await shell.screenshot({ path: path.join(root, out), type: "png" });
    console.log("ok", out);
  }

  await browser.close();
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
