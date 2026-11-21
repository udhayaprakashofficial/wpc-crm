import Link from "next/link";
import { Suspense } from "react";
import {
  endOfDay,
  startOfDay,
  startOfWeek,
  subDays,
  format,
  differenceInCalendarDays,
} from "date-fns";
import {
  AlertTriangle,
  BriefcaseBusiness,
  IndianRupee,
  RefreshCw,
  Shield,
  Target,
  Bell,
  UserCog,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  requireTenant,
  assigneeFilter,
  contactVisibilityFilter,
} from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import { getFyBounds } from "@/lib/fy";
import {
  getOutstandingInvoices,
  getOutstandingTotal,
} from "@/lib/receivables";
import { inactiveCustomerWhere } from "@/lib/winback";
import {
  campaignOverlapsRange,
  computePortfolioTotals,
  resolvePortfolioRange,
} from "@/lib/portfolio-analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { completeTask } from "@/app/actions/tasks";

async function HomeContent() {
  const ctx = await requireTenant();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quoteStaleBefore = subDays(now, 7);

  const staffFilter = assigneeFilter(ctx);
  const contactFilter = contactVisibilityFilter(ctx);
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: { fyStartMonth: true, yearlyRevenueGoalPaise: true },
  });
  const { start: fyStart, end: fyEnd, fyYear } = getFyBounds(
    business.fyStartMonth,
    now,
  );

  const [
    overdueTasks,
    todayTasks,
    incomeMonth,
    expenseMonth,
    incomeFy,
    contactCount,
    goal,
    outstandingTotal,
    outstanding,
    inactiveCustomers,
    staleQuotes,
    leadsThisWeek,
    activeStaff,
    openPayroll,
    portfolioClients,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        businessId: ctx.businessId,
        status: "OPEN",
        deletedAt: null,
        dueAt: { lt: todayStart },
        ...staffFilter,
      },
      include: { contact: true },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    prisma.task.findMany({
      where: {
        businessId: ctx.businessId,
        status: "OPEN",
        deletedAt: null,
        dueAt: { gte: todayStart, lte: todayEnd },
        ...staffFilter,
      },
      include: { contact: true },
      orderBy: { dueAt: "asc" },
      take: 6,
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
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: fyStart, lt: fyEnd },
      },
      _sum: { amountPaise: true },
    }),
    prisma.contact.count({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
    prisma.goal.findFirst({
      where: {
        businessId: ctx.businessId,
        type: "REVENUE",
        period: "YEAR",
        deletedAt: null,
      },
    }),
    getOutstandingTotal(ctx.businessId),
    getOutstandingInvoices(ctx.businessId, 5),
    prisma.contact.findMany({
      where: inactiveCustomerWhere(ctx.businessId, staffFilter, now),
      orderBy: { lastActivityAt: "asc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        notes: "Quote",
        status: { in: ["SENT", "PARTIAL"] },
        issueDate: { lt: quoteStaleBefore },
      },
      include: { contact: { select: { name: true, phone: true } } },
      orderBy: { issueDate: "asc" },
      take: 5,
    }),
    prisma.contact.count({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        createdAt: { gte: weekStart },
        ...contactFilter,
      },
    }),
    prisma.staffMember.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { basicPaise: true, allowancePaise: true },
    }),
    prisma.payrollRun.findFirst({
      where: {
        businessId: ctx.businessId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        status: { in: ["DRAFT", "FINALIZED"] },
      },
    }),
    prisma.portfolioClient.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { campaigns: { where: { deletedAt: null } } },
    }),
  ]);

  const portfolioRange = resolvePortfolioRange({ preset: "month" });
  let portfolioRevenue = 0;
  let portfolioExpenseExtra = 0;
  let portfolioKnown = portfolioClients.length > 0;
  const monthCampaigns = [];
  for (const c of portfolioClients) {
    const camps = c.campaigns.filter((camp) =>
      campaignOverlapsRange(camp.startDate, camp.endDate, portfolioRange),
    );
    monthCampaigns.push(...camps);
    const t = computePortfolioTotals(camps, {
      revenuePerSalePaise: c.revenuePerSalePaise,
      manualSalesCount: c.manualSalesCount,
      revenuePaise: c.revenuePaise,
      expensePaise: c.expensePaise,
    });
    if (!t.profitAvailable) portfolioKnown = false;
    else {
      portfolioRevenue += t.revenuePaise ?? 0;
      portfolioExpenseExtra += t.otherExpensePaise;
    }
  }
  const portfolioMonth = computePortfolioTotals(
    monthCampaigns,
    portfolioKnown
      ? {
          revenuePerSalePaise: null,
          manualSalesCount: null,
          revenuePaise: portfolioRevenue,
          expensePaise: portfolioExpenseExtra,
        }
      : {
          revenuePerSalePaise: null,
          manualSalesCount: null,
          revenuePaise: null,
          expensePaise: null,
        },
  );

  const salaryDueEstimate = activeStaff.reduce(
    (s, m) => s + m.basicPaise + m.allowancePaise,
    0,
  );

  const income = incomeMonth._sum.amountPaise ?? 0;
  const expense = expenseMonth._sum.amountPaise ?? 0;
  const profit = income - expense;
  const fyIncome = incomeFy._sum.amountPaise ?? 0;
  const goalTarget =
    goal?.targetPaise ?? business.yearlyRevenueGoalPaise ?? 0;
  const goalPct =
    goalTarget > 0
      ? Math.min(100, Math.round((fyIncome / goalTarget) * 100))
      : 0;

  // Will I hit? Project FY income at current pace
  const fyDaysTotal = Math.max(
    1,
    differenceInCalendarDays(fyEnd, fyStart),
  );
  const fyDaysElapsed = Math.max(
    1,
    Math.min(fyDaysTotal, differenceInCalendarDays(now, fyStart) + 1),
  );
  const projected = Math.round((fyIncome / fyDaysElapsed) * fyDaysTotal);
  const willHit = goalTarget === 0 ? null : projected >= goalTarget;
  const greeting =
    now.getHours() < 12
      ? "morning"
      : now.getHours() < 17
        ? "afternoon"
        : "evening";

  return (
    <div>
      <PageHeader title={`Good ${greeting}`} />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Money owed, profit, follow-ups, and goals — so nothing slips.
      </p>

      {contactCount === 0 && (
        <div className="mb-5">
          <EmptyState
            title="Own your customer list"
            description="Add leads here — not on personal phones. Staff can leave; your contacts stay with the business."
            action={
              <Link href="/app/contacts/new">
                <Button>+ Lead</Button>
              </Link>
            }
          />
        </div>
      )}

      {/* Pain strip */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <PainStat
          href="/app/finance/invoices?tab=dues"
          icon={AlertTriangle}
          label="Customers owe"
          value={formatINR(outstandingTotal)}
          hint={
            outstanding.length
              ? `${outstanding.length}+ unpaid invoices`
              : "All clear"
          }
          tone={outstandingTotal > 0 ? "warn" : "ok"}
        />
        <PainStat
          href="/app/finance/reports"
          icon={IndianRupee}
          label="Profit this month"
          value={formatINR(profit)}
          hint={`In ${formatINR(income)} · Out ${formatINR(expense)}`}
          tone={profit >= 0 ? "ok" : "danger"}
        />
        <PainStat
          href="/app/goals"
          icon={Target}
          label="Goal pace"
          value={goalTarget ? `${goalPct}%` : "Set goal"}
          hint={
            willHit === null
              ? "No yearly target"
              : willHit
                ? "On track to hit"
                : `Projected ${formatINR(projected)}`
          }
          tone={
            willHit === null ? "neutral" : willHit ? "ok" : "warn"
          }
        />
        <PainStat
          href="/app/tasks"
          icon={Bell}
          label="Follow-ups due"
          value={String(overdueTasks.length + todayTasks.length)}
          hint={`${overdueTasks.length} overdue · ${todayTasks.length} today`}
          tone={overdueTasks.length > 0 ? "danger" : "neutral"}
        />
        <PainStat
          href="/app/portfolio?preset=month"
          icon={BriefcaseBusiness}
          label="Portfolio ads"
          value={formatINR(portfolioMonth.adSpendPaise)}
          hint={
            portfolioMonth.profitAvailable && portfolioMonth.profitPaise != null
              ? `${portfolioMonth.leads} leads · profit ${formatINR(portfolioMonth.profitPaise)}`
              : `${portfolioMonth.leads} leads · ${portfolioMonth.purchases} sales`
          }
          tone="neutral"
        />
      </section>

      {goalTarget > 0 && (
        <div className="sp-card sp-shadow mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-zinc-700">
              FY {fyYear}–{fyYear + 1} revenue goal
            </span>
            <span className="text-zinc-500">
              {formatINR(fyIncome)} / {formatINR(goalTarget)}
              {willHit !== null ? (
                <span
                  className={`ml-2 font-semibold ${
                    willHit ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {willHit ? "On track" : "Behind pace"}
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            At current pace you&apos;d finish at {formatINR(projected)}.{" "}
            <Link href="/app/goals" className="font-medium text-blue-600">
              Adjust goal
            </Link>
          </p>
        </div>
      )}

      {/* 1. Pending payments */}
      <section className="mb-6">
        <SectionHead
          title="Money customers owe"
          href="/app/finance/invoices?tab=dues"
          icon={AlertTriangle}
        />
        {outstanding.length === 0 ? (
          <p className="sp-card px-4 py-3 text-sm text-zinc-500">
            No outstanding invoices. Nice.
          </p>
        ) : (
          <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
            {outstanding.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/app/finance/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {inv.contact.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {inv.number}
                      {inv.dueDate
                        ? ` · due ${format(inv.dueDate, "dd MMM")}`
                        : ""}
                      {inv.status === "OVERDUE" ? " · Overdue" : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-amber-700">
                    {formatINR(inv.balancePaise)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 6. Quotes needing follow-up */}
      <section className="mb-6">
        <SectionHead
          title="Quotes waiting for a reply"
          href="/app/finance/invoices?tab=quotes"
          icon={Bell}
        />
        {staleQuotes.length === 0 ? (
          <p className="sp-card px-4 py-3 text-sm text-zinc-500">
            No stale quotes older than 7 days.
          </p>
        ) : (
          <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
            {staleQuotes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/app/finance/invoices/${q.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {q.contact.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {q.number} · sent {format(q.issueDate, "dd MMM")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-violet-700">
                    {formatINR(q.totalPaise)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Inactive customers */}
      <section className="mb-6">
        <SectionHead
          title="Customers who stopped coming"
          href="/app/contacts?tab=contacts&segment=inactive"
          icon={RefreshCw}
        />
        {inactiveCustomers.length === 0 ? (
          <p className="sp-card px-4 py-3 text-sm text-zinc-500">
            All customers active in the last 60 days.
          </p>
        ) : (
          <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
            {inactiveCustomers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/contacts/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{c.name}</p>
                    <p className="text-sm text-zinc-500">
                      {c.phone}
                      {c.lastActivityAt
                        ? ` · last ${format(c.lastActivityAt, "dd MMM yyyy")}`
                        : " · no recent activity"}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Win back
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Salary due reminder */}
      {activeStaff.length > 0 && (
        <Link
          href="/app/staff/payroll"
          className="sp-card mb-6 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 hover:bg-amber-100"
        >
          <UserCog className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold text-zinc-900">
              Salaries due on the 1st:{" "}
              {formatINR(openPayroll?.totalPaise ?? salaryDueEstimate)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {activeStaff.length} active staff
              {openPayroll
                ? ` · ${openPayroll.status.toLowerCase()} payroll ready`
                : " · generate this month's payroll"}
            </p>
          </div>
        </Link>
      )}

      {/* 4. Ownership reminder */}
      <div className="sp-card mb-6 flex items-start gap-3 border-blue-100 bg-blue-50/60 p-4">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold text-zinc-900">
            Your customer list stays with the business
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {contactCount} contacts stored securely — not on staff phones.{" "}
            <Link
              href="/app/contacts/export"
              className="font-medium text-blue-600"
            >
              Export backup
            </Link>
            {" · "}
            <Link href="/app/settings/team" className="font-medium text-blue-600">
              Manage team access
            </Link>
          </p>
        </div>
      </div>

      <div className="mb-4 text-xs text-zinc-400">
        {leadsThisWeek} new leads this week
      </div>

      <TaskSection title="Overdue follow-ups" tasks={overdueTasks} tone="danger" />
      <TaskSection title="Today" tasks={todayTasks} />
    </div>
  );
}

function PainStat({
  href,
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const ring =
    tone === "danger"
      ? "border-red-200"
      : tone === "warn"
        ? "border-amber-200"
        : tone === "ok"
          ? "border-emerald-200"
          : "border-zinc-200";
  return (
    <Link
      href={href}
      className={`sp-shadow rounded-2xl border bg-white p-4 transition hover:bg-zinc-50 ${ring}`}
    >
      <div className="mb-2 flex items-center gap-2 text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>
    </Link>
  );
}

function SectionHead({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href: string;
  icon: typeof AlertTriangle;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <Link href={href} className="text-sm font-medium text-blue-600">
        See all
      </Link>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  tone,
}: {
  title: string;
  tasks: {
    id: string;
    title: string;
    dueAt: Date;
    contact: { name: string; phone: string } | null;
  }[];
  tone?: "danger";
}) {
  return (
    <section className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className={`text-sm font-semibold uppercase tracking-wide ${
            tone === "danger" ? "text-red-600" : "text-zinc-500"
          }`}
        >
          {title}
        </h3>
        <Link href="/app/tasks" className="text-sm font-medium text-blue-600">
          See all
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="sp-card px-4 py-3 text-sm text-zinc-500">
          Nothing here. Nice work.
        </p>
      ) : (
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {tasks.map((task) => (
            <li key={task.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{task.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {task.contact
                      ? `${task.contact.name} · ${task.contact.phone}`
                      : "No contact"}
                  </p>
                </div>
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Done
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AppHomePage() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-2xl bg-white" />}
    >
      <HomeContent />
    </Suspense>
  );
}
