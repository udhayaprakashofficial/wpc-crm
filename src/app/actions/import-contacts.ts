"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { getBusinessPlanLimits } from "@/lib/plan-limits";

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile"));
  const emailIdx = headers.findIndex((h) => h.includes("email"));

  if (nameIdx < 0 || phoneIdx < 0) {
    throw new Error("CSV must include name and phone columns");
  }

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return {
      name: cols[nameIdx]?.trim() || "",
      phone: (cols[phoneIdx] || "").replace(/[\s\-]/g, ""),
      email: emailIdx >= 0 ? cols[emailIdx]?.trim() || "" : "",
    };
  });
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function importContactsCsv(formData: FormData) {
  const ctx = await requireTenant();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a CSV file" };
  }

  const text = await file.text();
  let rows: { name: string; phone: string; email: string }[] = [];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid CSV" };
  }

  const stage = await prisma.pipelineStage.findFirst({
    where: { businessId: ctx.businessId },
    orderBy: { position: "asc" },
  });

  const limits = await getBusinessPlanLimits(ctx.businessId);

  let existingCount = await prisma.contact.count({
    where: { businessId: ctx.businessId, deletedAt: null },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name || !row.phone) {
      skipped++;
      continue;
    }
    if (existingCount >= limits.maxContacts) {
      skipped++;
      continue;
    }
    const dup = await prisma.contact.findFirst({
      where: {
        businessId: ctx.businessId,
        phone: row.phone,
        deletedAt: null,
      },
    });
    if (dup) {
      skipped++;
      continue;
    }

    try {
      await prisma.contact.create({
        data: {
          businessId: ctx.businessId,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          source: "OTHER",
          assignedToId: ctx.user.id,
          ...(stage
            ? {
                deals: {
                  create: {
                    businessId: ctx.businessId,
                    stageId: stage.id,
                    title: `${row.name} — opportunity`,
                    assignedToId: ctx.user.id,
                  },
                },
              }
            : {}),
        },
      });
      created++;
      existingCount++;
    } catch {
      errors.push(row.phone);
    }
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "ContactImport",
    entityId: ctx.businessId,
    after: { created, skipped, errors: errors.length },
  });

  revalidatePath("/app/contacts");
  return { ok: true, created, skipped, errorCount: errors.length };
}
