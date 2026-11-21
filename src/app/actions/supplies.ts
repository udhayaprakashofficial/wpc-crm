"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";

const UNITS = new Set([
  "PCS",
  "BOX",
  "KG",
  "LITRE",
  "ML",
  "PACK",
  "SET",
  "OTHER",
]);

function parseUnit(raw: string) {
  const u = raw.trim().toUpperCase();
  return (UNITS.has(u) ? u : "PCS") as
    | "PCS"
    | "BOX"
    | "KG"
    | "LITRE"
    | "ML"
    | "PACK"
    | "SET"
    | "OTHER";
}

export async function createSupply(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");

  const sku = String(formData.get("sku") || "").trim() || null;

  await prisma.supplyItem.create({
    data: {
      businessId: ctx.businessId,
      name,
      sku,
      unit: parseUnit(String(formData.get("unit") || "PCS")),
      quantity: Number(formData.get("quantity") || 0),
      reorderLevel: Number(formData.get("reorderLevel") || 0),
      costPaise: rupeesToPaise(Number(formData.get("costRupees") || 0)),
      sellPaise: rupeesToPaise(Number(formData.get("sellRupees") || 0)),
      vendorName: String(formData.get("vendorName") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });

  revalidatePath("/app/supplies");
  redirect("/app/supplies");
}

export async function updateSupply(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const id = String(formData.get("id") || "");
  const item = await prisma.supplyItem.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
  });
  if (!item) throw new Error("Not found");

  await prisma.supplyItem.update({
    where: { id: item.id },
    data: {
      name: String(formData.get("name") || item.name).trim(),
      sku: String(formData.get("sku") || "").trim() || null,
      unit: parseUnit(String(formData.get("unit") || item.unit)),
      quantity: Number(formData.get("quantity") ?? item.quantity),
      reorderLevel: Number(formData.get("reorderLevel") ?? item.reorderLevel),
      costPaise: rupeesToPaise(
        Number(formData.get("costRupees") ?? item.costPaise / 100),
      ),
      sellPaise: rupeesToPaise(
        Number(formData.get("sellRupees") ?? item.sellPaise / 100),
      ),
      vendorName: String(formData.get("vendorName") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });

  revalidatePath("/app/supplies");
  revalidatePath(`/app/supplies/${id}`);
}

export async function deleteSupply(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const id = String(formData.get("id") || "");
  // Free the SKU so the same code can be re-imported after soft-delete
  await prisma.supplyItem.updateMany({
    where: { id, businessId: ctx.businessId, deletedAt: null },
    data: { deletedAt: new Date(), sku: null },
  });

  revalidatePath("/app/supplies");
  redirect("/app/supplies");
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

export async function importSuppliesCsv(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return { error: "No permission" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file" };

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { error: "CSV needs a header and rows" };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = (aliases: string[]) =>
    headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const nameIdx = idx(["name", "item", "product", "supply"]);
  const skuIdx = idx(["sku", "code", "barcode"]);
  const qtyIdx = idx(["quantity", "qty", "stock"]);
  const unitIdx = idx(["unit"]);
  const reorderIdx = idx(["reorder", "min"]);
  const costIdx = idx(["cost", "purchase", "buy"]);
  const sellIdx = idx(["sell", "price", "mrp"]);
  const vendorIdx = idx(["vendor", "supplier"]);
  const categoryIdx = idx(["category", "type"]);
  const notesIdx = idx(["notes", "note"]);

  if (nameIdx < 0) return { error: "CSV must include a name column" };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const name = (cols[nameIdx] || "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    const sku = (skuIdx >= 0 ? cols[skuIdx] : "")?.trim() || null;
    const quantity = qtyIdx >= 0 ? Number(cols[qtyIdx] || 0) : 0;
    const unit = parseUnit(unitIdx >= 0 ? cols[unitIdx] || "PCS" : "PCS");
    const reorderLevel = reorderIdx >= 0 ? Number(cols[reorderIdx] || 0) : 0;
    const costPaise = rupeesToPaise(
      costIdx >= 0 ? Number(cols[costIdx] || 0) : 0,
    );
    const sellPaise = rupeesToPaise(
      sellIdx >= 0 ? Number(cols[sellIdx] || 0) : 0,
    );
    const vendorName =
      (vendorIdx >= 0 ? cols[vendorIdx] : "")?.trim() || null;
    const category =
      (categoryIdx >= 0 ? cols[categoryIdx] : "")?.trim() || null;
    const notes = (notesIdx >= 0 ? cols[notesIdx] : "")?.trim() || null;

    const existing = sku
      ? await prisma.supplyItem.findFirst({
          where: {
            businessId: ctx.businessId,
            sku,
            deletedAt: null,
          },
        })
      : await prisma.supplyItem.findFirst({
          where: {
            businessId: ctx.businessId,
            name: { equals: name, mode: "insensitive" },
            sku: null,
            deletedAt: null,
          },
        });

    if (existing) {
      await prisma.supplyItem.update({
        where: { id: existing.id },
        data: {
          name,
          unit,
          quantity,
          reorderLevel,
          costPaise,
          sellPaise,
          vendorName,
          category,
          notes,
        },
      });
      updated += 1;
    } else {
      await prisma.supplyItem.create({
        data: {
          businessId: ctx.businessId,
          name,
          sku,
          unit,
          quantity,
          reorderLevel,
          costPaise,
          sellPaise,
          vendorName,
          category,
          notes,
        },
      });
      created += 1;
    }
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "SupplyImport",
    entityId: ctx.businessId,
    after: { created, updated, skipped },
  });

  revalidatePath("/app/supplies");
  return { ok: true as const, created, updated, skipped };
}
