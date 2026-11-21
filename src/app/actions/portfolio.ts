"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { rupeesToPaise } from "@/lib/money";
import { parseCampaignWorkbook } from "@/lib/portfolio-import";
import { revalidatePortfolioGraph } from "@/lib/revalidate-crm";
import {
  assertFeature,
  assertPortfolioImport,
  assertPortfolioWrite,
} from "@/lib/plan-limits";
import type { PortfolioClientStatus } from "@/generated/prisma/client";

async function requirePortfolioClient(businessId: string, id: string) {
  const client = await prisma.portfolioClient.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!client) throw new Error("Client not found");
  return client;
}

export async function upsertPortfolioClient(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");
  await assertFeature(ctx.businessId, "portfolio");
  await assertPortfolioWrite(ctx.businessId);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Client name is required");

  const status = String(formData.get("status") || "CURRENT") as PortfolioClientStatus;
  const perSaleRaw = String(formData.get("revenuePerSaleRupees") || "").trim();
  const salesRaw = String(formData.get("manualSalesCount") || "").trim();
  const expenseRaw = String(formData.get("expenseRupees") || "").trim();

  const data = {
    name,
    businessDetails: String(formData.get("businessDetails") || "").trim() || null,
    industry: String(formData.get("industry") || "").trim() || null,
    website: String(formData.get("website") || "").trim() || null,
    services: String(formData.get("services") || "").trim() || null,
    workHistory: String(formData.get("workHistory") || "").trim() || null,
    achievements: String(formData.get("achievements") || "").trim() || null,
    status: status === "COMPLETED" ? "COMPLETED" as const : "CURRENT" as const,
    revenuePerSalePaise: perSaleRaw === "" ? null : rupeesToPaise(perSaleRaw),
    manualSalesCount:
      salesRaw === "" ? null : Math.max(0, Math.round(Number(salesRaw) || 0)),
    revenuePaise: null as number | null,
    expensePaise: expenseRaw === "" ? null : rupeesToPaise(expenseRaw),
    startedAt: formData.get("startedAt")
      ? new Date(String(formData.get("startedAt")))
      : null,
    completedAt:
      status === "COMPLETED" && formData.get("completedAt")
        ? new Date(String(formData.get("completedAt")))
        : status === "COMPLETED"
          ? new Date()
          : null,
  };

  if (id) {
    await requirePortfolioClient(ctx.businessId, id);
    await prisma.portfolioClient.update({
      where: { id },
      data,
    });
    await writeAudit({
      businessId: ctx.businessId,
      userId: ctx.user.id,
      action: "UPDATE",
      entityType: "PortfolioClient",
      entityId: id,
      after: data,
    });
    revalidatePortfolioGraph({ clientId: id });
    redirect(`/app/portfolio?clientId=${id}`);
  }

  const created = await prisma.portfolioClient.create({
    data: { businessId: ctx.businessId, ...data },
  });
  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "PortfolioClient",
    entityId: created.id,
    after: data,
  });
  revalidatePortfolioGraph({ clientId: created.id });
  redirect(`/app/portfolio?clientId=${created.id}`);
}

export async function softDeletePortfolioClient(clientId: string) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "MANAGER") {
    throw new Error("No permission");
  }
  await assertPortfolioWrite(ctx.businessId);
  await requirePortfolioClient(ctx.businessId, clientId);
  await prisma.portfolioClient.update({
    where: { id: clientId },
    data: { deletedAt: new Date() },
  });
  await prisma.adCampaign.updateMany({
    where: { portfolioClientId: clientId, businessId: ctx.businessId },
    data: { deletedAt: new Date() },
  });
  revalidatePortfolioGraph({ clientId });
  redirect("/app/portfolio");
}

export async function updateClientFinancials(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");
  await assertPortfolioWrite(ctx.businessId);

  const clientId = String(formData.get("clientId") || "");
  await requirePortfolioClient(ctx.businessId, clientId);

  const perSaleRaw = String(formData.get("revenuePerSaleRupees") || "").trim();
  const salesRaw = String(formData.get("manualSalesCount") || "").trim();
  const expenseRaw = String(formData.get("expenseRupees") || "").trim();

  await prisma.portfolioClient.update({
    where: { id: clientId },
    data: {
      revenuePerSalePaise: perSaleRaw === "" ? null : rupeesToPaise(perSaleRaw),
      manualSalesCount:
        salesRaw === "" ? null : Math.max(0, Math.round(Number(salesRaw) || 0)),
      expensePaise: expenseRaw === "" ? null : rupeesToPaise(expenseRaw),
    },
  });

  revalidatePortfolioGraph({ clientId });
}

/** Update campaign purchases and/or product price — recalculates portfolio totals on next render. */
export async function updateCampaignMetrics(input: {
  campaignId: string;
  purchases?: number;
  productPriceRupees?: string | null;
}) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") {
    return { error: "No permission" };
  }
  try {
    await assertPortfolioWrite(ctx.businessId);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Portfolio edits require an active subscription",
    };
  }

  const campaign = await prisma.adCampaign.findFirst({
    where: {
      id: input.campaignId,
      businessId: ctx.businessId,
      deletedAt: null,
    },
  });
  if (!campaign) return { error: "Campaign not found" };

  const data: {
    purchases?: number;
    results?: number;
    productPricePaise?: number | null;
  } = {};

  if (input.purchases !== undefined) {
    const purchases = Math.max(0, Math.round(Number(input.purchases) || 0));
    data.purchases = purchases;
    data.results = campaign.leads + purchases;
  }

  if (input.productPriceRupees !== undefined) {
    const raw = String(input.productPriceRupees ?? "").trim();
    data.productPricePaise = raw === "" ? null : rupeesToPaise(raw);
  }

  if (Object.keys(data).length === 0) {
    return { error: "Nothing to update" };
  }

  try {
    const updated = await prisma.adCampaign.update({
      where: { id: campaign.id },
      data,
    });

    await writeAudit({
      businessId: ctx.businessId,
      userId: ctx.user.id,
      action: "UPDATE",
      entityType: "AdCampaign",
      entityId: campaign.id,
      before: {
        purchases: campaign.purchases,
        productPricePaise: campaign.productPricePaise,
      },
      after: {
        purchases: updated.purchases,
        productPricePaise: updated.productPricePaise,
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not update campaign";
    // Surface a short message — avoid dumping full Prisma validation dumps to the UI.
    const short =
      message.includes("Unknown argument") ||
      message.includes("Unknown arg") ||
      message.includes("productPricePaise")
        ? "Campaign schema is out of date. Restart the app and try again."
        : "Could not save campaign changes. Try again.";
    return { error: short };
  }

  revalidatePortfolioGraph({ clientId: campaign.portfolioClientId });
  return { ok: true as const };
}

export async function importCampaignReport(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");
  try {
    await assertPortfolioImport(ctx.businessId);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Campaign import requires an active subscription",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a CSV or Excel file" };
  }

  const name = file.name.toLowerCase();
  if (
    !name.endsWith(".csv") &&
    !name.endsWith(".xlsx") &&
    !name.endsWith(".xls")
  ) {
    return { error: "Upload a .csv, .xlsx, or .xls file" };
  }

  const defaultClientId = String(formData.get("clientId") || "") || null;
  let defaultClientName: string | undefined;
  if (defaultClientId) {
    const c = await requirePortfolioClient(ctx.businessId, defaultClientId);
    defaultClientName = c.name;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  try {
    rows = parseCampaignWorkbook(buffer, defaultClientName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read file" };
  }

  if (rows.length === 0) {
    return { error: "No campaign rows found in the file" };
  }

  const existingClients = await prisma.portfolioClient.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
    select: { id: true, name: true },
  });
  const byName = new Map(
    existingClients.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  let createdClients = 0;
  let upserted = 0;

  for (const row of rows) {
    const key = row.clientName.trim().toLowerCase();
    let client = byName.get(key);
    if (!client) {
      const created = await prisma.portfolioClient.create({
        data: {
          businessId: ctx.businessId,
          name: row.clientName.trim(),
          status: "CURRENT",
        },
      });
      client = { id: created.id, name: created.name };
      byName.set(key, client);
      createdClients++;
    }

    await prisma.adCampaign.upsert({
      where: {
        businessId_dedupeKey: {
          businessId: ctx.businessId,
          dedupeKey: row.dedupeKey,
        },
      },
      create: {
        businessId: ctx.businessId,
        portfolioClientId: client.id,
        dedupeKey: row.dedupeKey,
        name: row.campaignName,
        platform: row.platform,
        externalCampaignId: row.externalCampaignId,
        startDate: row.startDate,
        endDate: row.endDate,
        leads: row.leads,
        purchases: row.purchases,
        results: row.results,
        amountSpentPaise: row.amountSpentPaise,
        impressions: row.impressions,
        reach: row.reach,
        costPerResultPaise: row.costPerResultPaise,
      },
      update: {
        portfolioClientId: client.id,
        name: row.campaignName,
        platform: row.platform,
        externalCampaignId: row.externalCampaignId,
        startDate: row.startDate,
        endDate: row.endDate,
        leads: row.leads,
        purchases: row.purchases,
        results: row.results,
        amountSpentPaise: row.amountSpentPaise,
        impressions: row.impressions,
        reach: row.reach,
        costPerResultPaise: row.costPerResultPaise,
        deletedAt: null,
      },
    });
    upserted++;
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "AdCampaignImport",
    entityId: ctx.businessId,
    after: { upserted, createdClients, fileName: file.name },
  });

  revalidatePortfolioGraph();
  return { ok: true as const, upserted, createdClients };
}
