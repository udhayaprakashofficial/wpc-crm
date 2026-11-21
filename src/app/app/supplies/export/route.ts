import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";

export async function GET() {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const items = await prisma.supplyItem.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const header = [
    "name",
    "sku",
    "unit",
    "quantity",
    "reorderLevel",
    "cost",
    "sell",
    "vendor",
    "category",
    "notes",
  ];

  const rows = items.map((item) =>
    [
      item.name,
      item.sku ?? "",
      item.unit,
      item.quantity,
      item.reorderLevel,
      (item.costPaise / 100).toFixed(2),
      (item.sellPaise / 100).toFixed(2),
      item.vendorName ?? "",
      item.category ?? "",
      (item.notes ?? "").replaceAll("\n", " "),
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supplies.csv"',
      "Cache-Control": "no-store",
    },
  });
}
