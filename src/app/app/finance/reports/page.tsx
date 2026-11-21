import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canViewFinance } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { getFyBounds } from "@/lib/fy";
import { getOutstandingInvoices } from "@/lib/receivables";
import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

export default async function FinanceReportsPage() {
  const ctx = await requireTenant();
  if (!canViewFinance(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const { start: fyStart, end: fyEnd } = getFyBounds(
    business.fyStartMonth,
    now,
  );

  const [
    todayIncome,
    todayExpense,
    monthIncome,
    monthExpense,
    fyIncome,
    fyExpense,
    byCategory,
    receivables,
  ] = await Promise.all([
    sumTx(ctx.businessId, "INCOME", todayStart, todayEnd),
    sumTx(ctx.businessId, "EXPENSE", todayStart, todayEnd),
    sumTx(ctx.businessId, "INCOME", monthStart, now),
    sumTx(ctx.businessId, "EXPENSE", monthStart, now),
    sumTx(ctx.businessId, "INCOME", fyStart, fyEnd),
    sumTx(ctx.businessId, "EXPENSE", fyStart, fyEnd),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        businessId: ctx.businessId,
        type: "EXPENSE",
        deletedAt: null,
        occurredAt: { gte: monthStart },
      },
      _sum: { amountPaise: true },
    }),
    getOutstandingInvoices(ctx.businessId, 30),
  ]);

  const categories = await prisma.category.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
  });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const monthProfit = monthIncome - monthExpense;
  const duesTotal = receivables.reduce((s, i) => s + i.balancePaise, 0);

  return (
    <div>
      <PageHeader title="P&L reports" />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        See if you made a profit — income and expenses in one place.
      </p>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card
          title="Today closing"
          value={formatINR(todayIncome - todayExpense)}
          sub={`In ${formatINR(todayIncome)} · Out ${formatINR(todayExpense)}`}
        />
        <Card
          title="Month profit"
          value={formatINR(monthProfit)}
          sub={`In ${formatINR(monthIncome)} · Out ${formatINR(monthExpense)}`}
          highlight={monthProfit >= 0}
        />
        <Card
          title="FY P&L"
          value={formatINR(fyIncome - fyExpense)}
          sub={`In ${formatINR(fyIncome)} · Out ${formatINR(fyExpense)}`}
        />
      </section>

      <section className="sp-card sp-shadow mb-5 p-5">
        <h3 className="font-semibold text-zinc-900">
          Expense by category (month)
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {byCategory.length === 0 && (
            <li className="text-zinc-500">No expenses</li>
          )}
          {byCategory.map((row) => (
            <li
              key={row.categoryId ?? "none"}
              className="flex justify-between"
            >
              <span>
                {row.categoryId
                  ? (catMap[row.categoryId] ?? "Uncategorized")
                  : "Uncategorized"}
              </span>
              <span className="font-medium">
                {formatINR(row._sum.amountPaise ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sp-card sp-shadow p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-zinc-900">
            Receivables · {formatINR(duesTotal)}
          </h3>
          <Link
            href="/app/finance/invoices?tab=dues"
            className="text-sm font-medium text-blue-600"
          >
            See all
          </Link>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {receivables.length === 0 && (
            <li className="text-zinc-500">None outstanding</li>
          )}
          {receivables.map((inv) => (
            <li key={inv.id} className="flex justify-between gap-3">
              <Link
                href={`/app/finance/invoices/${inv.id}`}
                className="min-w-0 truncate font-medium text-zinc-900 hover:underline"
              >
                {inv.number} · {inv.contact.name}
                {inv.dueDate
                  ? ` · due ${format(inv.dueDate, "dd MMM")}`
                  : ""}
              </Link>
              <span
                className={`shrink-0 font-semibold ${
                  inv.status === "OVERDUE"
                    ? "text-red-600"
                    : "text-amber-700"
                }`}
              >
                {formatINR(inv.balancePaise)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function sumTx(
  businessId: string,
  type: "INCOME" | "EXPENSE",
  from: Date,
  to: Date,
) {
  const res = await prisma.transaction.aggregate({
    where: {
      businessId,
      type,
      deletedAt: null,
      occurredAt: { gte: from, lte: to },
    },
    _sum: { amountPaise: true },
  });
  return res._sum.amountPaise ?? 0;
}

function Card({
  title,
  value,
  sub,
  highlight,
}: {
  title: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`sp-card sp-shadow p-4 ${
        highlight ? "border-emerald-200" : ""
      }`}
    >
      <p className="text-xs text-zinc-500">{title}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          highlight ? "text-emerald-700" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
