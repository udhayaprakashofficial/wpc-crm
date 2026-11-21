import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Toolbar, ToolButton } from "@/components/ui/toolbar";
import { Download, Upload, Package } from "lucide-react";

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string }>;
}) {
  const { q, low } = await searchParams;
  const ctx = await requireTenant();
  const canEdit = canManageSettings(ctx.role);

  const items = await prisma.supplyItem.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { vendorName: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 300,
  });

  const visible =
    low === "1"
      ? items.filter((i) => i.quantity <= i.reorderLevel)
      : items;

  const lowCount = items.filter((i) => i.quantity <= i.reorderLevel).length;
  const stockValue = items.reduce(
    (s, i) => s + Math.round(i.quantity * i.costPaise),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Supplies"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/app/supplies/import">
                <Button variant="secondary">
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
              </Link>
              <a href="/app/supplies/export">
                <Button variant="secondary">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </a>
              <Link href="/app/supplies/new">
                <Button>+ Supply</Button>
              </Link>
            </div>
          ) : (
            <a href="/app/supplies/export">
              <Button variant="secondary">Export</Button>
            </a>
          )
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Track shop supplies & stock. Import/export CSV anytime from Explore
        apps.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="sp-card sp-shadow p-4">
          <p className="text-xs text-zinc-500">Items</p>
          <p className="mt-1 text-xl font-bold">{items.length}</p>
        </div>
        <div className="sp-card sp-shadow p-4">
          <p className="text-xs text-zinc-500">Stock value (cost)</p>
          <p className="mt-1 text-xl font-bold">{formatINR(stockValue)}</p>
        </div>
        <Link
          href={low === "1" ? "/app/supplies" : "/app/supplies?low=1"}
          className={`sp-card sp-shadow p-4 ${
            lowCount > 0 ? "border-amber-200 bg-amber-50" : ""
          }`}
        >
          <p className="text-xs text-zinc-500">Low stock</p>
          <p className="mt-1 text-xl font-bold text-amber-800">{lowCount}</p>
        </Link>
      </div>

      <Toolbar
        searchDefault={q}
        searchPlaceholder="Search name, SKU, vendor"
        hiddenFields={low === "1" ? { low: "1" } : undefined}
        actions={
          <>
            <ToolButton href="/app/supplies/import">
              <Upload className="h-3.5 w-3.5" />
              Import
            </ToolButton>
            <ToolButton href="/app/supplies/export">
              <Download className="h-3.5 w-3.5" />
              Export
            </ToolButton>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No supplies yet"
          description="Add items manually or import a CSV with name, quantity, cost columns."
          action={
            canEdit ? (
              <div className="flex gap-2">
                <Link href="/app/supplies/new">
                  <Button>+ Supply</Button>
                </Link>
                <Link href="/app/supplies/import">
                  <Button variant="secondary">Import CSV</Button>
                </Link>
              </div>
            ) : undefined
          }
        />
      ) : (
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {visible.map((item) => {
            const lowStock = item.quantity <= item.reorderLevel;
            return (
              <li key={item.id}>
                <Link
                  href={`/app/supplies/${item.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      <Package className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{item.name}</p>
                      <p className="text-sm text-zinc-500">
                        {item.sku ? `SKU ${item.sku} · ` : ""}
                        {item.unit}
                        {item.vendorName ? ` · ${item.vendorName}` : ""}
                        {item.category ? ` · ${item.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-semibold ${
                        lowStock ? "text-amber-700" : "text-zinc-900"
                      }`}
                    >
                      {item.quantity} {item.unit.toLowerCase()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Cost {formatINR(item.costPaise)}
                      {lowStock ? " · Reorder" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
