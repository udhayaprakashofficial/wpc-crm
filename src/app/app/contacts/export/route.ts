import { prisma } from "@/lib/prisma";
import { requireTenant, contactVisibilityFilter } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireTenant();
  const contacts = await prisma.contact.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...contactVisibilityFilter(ctx),
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const header = [
    "name",
    "phone",
    "email",
    "type",
    "source",
    "assignee",
    "lastActivityAt",
    "notes",
  ];
  const rows = contacts.map((c) =>
    [
      c.name,
      c.phone,
      c.email ?? "",
      c.type,
      c.source,
      c.assignedTo?.name ?? "",
      c.lastActivityAt?.toISOString() ?? "",
      (c.notes ?? "").replaceAll("\n", " "),
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contacts-business-owned.csv"',
    },
  });
}
