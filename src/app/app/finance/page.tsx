import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  ArrowUpRight,
  Filter,
  ArrowUpDown,
  Download,
  Settings,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import { canViewFinance, canEditFinance } from "@/lib/permissions";
import { getOutstandingTotal } from "@/lib/receivables";
import { createManualIncome } from "@/app/actions/finance-extra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Toolbar, ToolButton } from "@/components/ui/toolbar";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string }>;
}) {
  const { tab, q, status } = await searchParams;
  const activeTab = tab === "payouts" ? "payouts" : "transactions";

  const ctx = await requireTenant();
  if (!canViewFinance(ctx.role)) {
    return (
      <p className="sp-card p-6 text-zinc-600">
        You don&apos;t have access to finance.
      </p>
    );
  }

  const now = new Date();
  const threeMonthsAgo = subDays(now, 90);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevWeekStart = subDays(now, 14);
  const prevWeekEnd = subDays(now, 7);
  const thisWeekStart = subDays(now, 7);

  const [
    income3m,
    incomeWeek,
    incomePrevWeek,
    incomeMonth,
    expenseMonth,
    recent,
    incomeCategories,
    txCount,
    outstandingTotal,
    sparkTx,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: threeMonthsAgo },
      },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: thisWeekStart },
      },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: prevWeekStart, lt: prevWeekEnd },
      },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: monthStart },
      },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "EXPENSE",
        deletedAt: null,
        occurredAt: { gte: monthStart },
      },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        ...(status === "income" ? { type: "INCOME" as const } : {}),
        ...(status === "expense" ? { type: "EXPENSE" as const } : {}),
        ...(q
          ? {
              OR: [
                { note: { contains: q, mode: "insensitive" as const } },
                {
                  contact: {
                    OR: [
                      { name: { contains: q, mode: "insensitive" as const } },
                      { phone: { contains: q } },
                      { email: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        contact: { select: { name: true, phone: true, email: true } },
        invoice: { select: { number: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 28,
    }),
    prisma.category.findMany({
      where: { businessId: ctx.businessId, kind: "INCOME", deletedAt: null },
    }),
    prisma.transaction.count({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
    getOutstandingTotal(ctx.businessId),
    prisma.transaction.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        occurredAt: { gte: threeMonthsAgo },
      },
      select: { type: true, amountPaise: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const earnings = income3m._sum.amountPaise ?? 0;
  const week = incomeWeek._sum.amountPaise ?? 0;
  const monthIncome = incomeMonth._sum.amountPaise ?? 0;
  const monthExpense = expenseMonth._sum.amountPaise ?? 0;
  const monthProfit = monthIncome - monthExpense;
  const prev = incomePrevWeek._sum.amountPaise ?? 0;
  const growth =
    prev > 0 ? Math.round(((week - prev) / prev) * 100) : week > 0 ? 100 : 0;
  const today = new Date().toISOString().slice(0, 10);

  // Real weekly net buckets for sparkline (last 12 weeks)
  const sparkBuckets = Array.from({ length: 12 }, () => 0);
  for (const tx of sparkTx) {
    const weeksAgo = Math.min(
      11,
      Math.floor(
        (now.getTime() - tx.occurredAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
      ),
    );
    const idx = 11 - weeksAgo;
    sparkBuckets[idx] +=
      tx.type === "INCOME" ? tx.amountPaise : -tx.amountPaise;
  }
  const spark = sparkBuckets.map((v) => Math.max(0, v));
  const maxSpark = Math.max(1, ...spark);

  return (
    <div>
      <PageHeader
        title="Payments"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Payment Status: Active
            </span>
            <Link
              href="/app/settings/billing"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="sp-card sp-shadow mb-5 overflow-hidden p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Last 3 months earnings
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
              {formatINR(earnings)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              {growth}% v/s Previous 7 Days
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600">
              All Products
            </span>
            <span className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600">
              Last 3 Months
            </span>
          </div>
        </div>

        <div className="relative h-36 w-full">
          <svg
            viewBox="0 0 400 120"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M0,${120 - (spark[0] / maxSpark) * 100} ${spark
                .map(
                  (v, i) =>
                    `L${(i / (spark.length - 1)) * 400},${120 - (v / maxSpark) * 100}`,
                )
                .join(" ")} L400,120 L0,120 Z`}
              fill="url(#earnFill)"
            />
            <path
              d={`M0,${120 - (spark[0] / maxSpark) * 100} ${spark
                .map(
                  (v, i) =>
                    `L${(i / (spark.length - 1)) * 400},${120 - (v / maxSpark) * 100}`,
                )
                .join(" ")}`}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-1 flex justify-between text-xs text-zinc-400">
            <span>{format(subDays(now, 10), "d MMM")}</span>
            <span>{format(subDays(now, 3), "d MMM")}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 md:grid-cols-4">
          <MiniStat label="Income (month)" value={formatINR(monthIncome)} />
          <MiniStat label="Expense (month)" value={formatINR(monthExpense)} />
          <MiniStat label="Profit (month)" value={formatINR(monthProfit)} />
          <MiniStat
            label="Customers owe"
            value={formatINR(outstandingTotal)}
          />
        </div>
      </div>

      {outstandingTotal > 0 && (
        <Link
          href="/app/finance/invoices?tab=dues"
          className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <span>
            <span className="font-semibold">{formatINR(outstandingTotal)}</span>{" "}
            still unpaid — collect before you forget
          </span>
          <span className="font-semibold">View dues →</span>
        </Link>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { href: "/app/finance/invoices?tab=dues", label: "They owe you" },
          { href: "/app/finance/invoices", label: "Invoices" },
          { href: "/app/finance/invoices/new", label: "+ Invoice" },
          { href: "/app/finance/expense/new", label: "+ Expense" },
          { href: "/app/finance/reports", label: "P&L Reports" },
          { href: "/app/finance/vendors", label: "Vendors" },
          { href: "/app/finance/recurring", label: "Recurring" },
          { href: "/app/finance/budgets", label: "Budgets" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <PillTabs
        items={[
          {
            href: "/app/finance",
            label: "Transactions",
            active: activeTab === "transactions",
          },
          {
            href: "/app/finance?tab=payouts",
            label: "Payouts",
            active: activeTab === "payouts",
          },
        ]}
      />

      {activeTab === "transactions" ? (
        <>
          <Toolbar
            searchDefault={q}
            searchPlaceholder="Search"
            actions={
              <>
                <ToolButton>
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </ToolButton>
                <ToolButton>
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort
                </ToolButton>
                <ToolButton>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </ToolButton>
              </>
            }
          />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Link
                href="/app/finance?status=income"
                className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold ${
                  status === "income"
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                Successful
              </Link>
              <Link
                href="/app/finance?status=expense"
                className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold ${
                  status === "expense"
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                Abandoned
              </Link>
              {status ? (
                <Link
                  href="/app/finance"
                  className="inline-flex h-9 items-center px-2 text-sm font-medium text-zinc-500"
                >
                  Clear
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-zinc-500">{txCount} transactions</p>
          </div>

          <div className="sp-card sp-shadow overflow-hidden">
            <div className="hidden grid-cols-[0.9fr_1.4fr_1.2fr_0.8fr_48px] gap-3 border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid">
              <span>Date</span>
              <span>Customer details</span>
              <span>Product</span>
              <span>Amount</span>
              <span />
            </div>
            <ul>
              {recent.length === 0 ? (
                <li className="px-5 py-8 text-sm text-zinc-500">
                  No transactions yet
                </li>
              ) : (
                recent.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const pending = !isIncome;
                  return (
                    <li
                      key={tx.id}
                      className="grid grid-cols-1 gap-2 border-b border-zinc-100 px-5 py-4 last:border-0 md:grid-cols-[0.9fr_1.4fr_1.2fr_0.8fr_48px] md:items-center md:gap-3"
                    >
                      <p className="text-sm text-zinc-600">
                        {format(tx.occurredAt, "dd MMM, hh:mm a")}
                      </p>
                      <div>
                        <p className="font-medium text-zinc-900">
                          {tx.contact?.name ?? "Walk-in"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {tx.contact?.phone ?? "—"}
                          {tx.contact?.email ? ` · ${tx.contact.email}` : ""}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            tx.invoice
                              ? "bg-violet-100 text-violet-700"
                              : isIncome
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {tx.invoice
                            ? "Invoice"
                            : isIncome
                              ? "Manual income"
                              : "Expense"}
                        </span>
                        <p className="mt-1 truncate text-sm text-zinc-600">
                          {tx.category?.name ??
                            tx.note ??
                            (isIncome ? "Income" : "Expense")}
                        </p>
                      </div>
                      <p
                        className={`flex items-center gap-1.5 text-sm font-semibold ${
                          isIncome ? "text-emerald-600" : "text-zinc-900"
                        }`}
                      >
                        {pending ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                        {isIncome ? "+" : "-"}
                        {formatINR(tx.amountPaise)}
                      </p>
                      <div className="flex justify-end">
                        <Link
                          href={
                            tx.invoiceId
                              ? `/app/finance/invoices/${tx.invoiceId}`
                              : `/app/finance/transactions/${tx.id}`
                          }
                          aria-label="Open payment details"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {canEditFinance(ctx.role) && (
            <form
              action={createManualIncome}
              className="sp-card mt-5 space-y-3 p-5"
            >
              <h3 className="font-semibold text-zinc-900">Quick income</h3>
              <Input
                name="amountRupees"
                type="number"
                required
                placeholder="Amount ₹"
              />
              <Select name="categoryId">
                <option value="">No category</option>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select name="paymentMode" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank</option>
              </Select>
              <Input name="occurredAt" type="date" defaultValue={today} />
              <Input name="note" placeholder="Note" />
              <Button type="submit" className="w-full">
                Save income
              </Button>
            </form>
          )}
        </>
      ) : (
        <div className="sp-card sp-shadow px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">Payouts</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
            Bank payouts will show here once Razorpay settlement is connected.
          </p>
          <Link href="/app/settings/billing" className="mt-5 inline-block">
            <Button>Open billing</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
