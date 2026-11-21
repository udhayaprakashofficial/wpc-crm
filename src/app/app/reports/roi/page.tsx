import Link from "next/link";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import {
  campaignOverlapsRange,
  computePortfolioTotals,
  resolvePortfolioRange,
} from "@/lib/portfolio-analytics";
import { PageHeader } from "@/components/ui/page-header";

export default async function SourceRoiPage() {
  const ctx = await requireTenant();
  const monthStart = startOfMonth(new Date());
  const range = resolvePortfolioRange({ preset: "month" });

  const [leads, wonDeals, financeAdSpend, portfolioClients] = await Promise.all([
    prisma.contact.groupBy({
      by: ["source"],
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        createdAt: { gte: monthStart },
      },
      _count: { _all: true },
    }),
    prisma.deal.findMany({
      where: {
        businessId: ctx.businessId,
        status: "WON",
        deletedAt: null,
        wonAt: { gte: monthStart },
      },
      include: { contact: true },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "EXPENSE",
        deletedAt: null,
        occurredAt: { gte: monthStart },
        category: { name: { contains: "Marketing", mode: "insensitive" } },
      },
      _sum: { amountPaise: true },
    }),
    prisma.portfolioClient.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: {
        campaigns: { where: { deletedAt: null } },
      },
    }),
  ]);

  const scopedCampaigns = portfolioClients.flatMap((c) =>
    c.campaigns.filter((camp) =>
      campaignOverlapsRange(camp.startDate, camp.endDate, range),
    ),
  );

  let portfolioRevenue = 0;
  let portfolioProfitKnown = true;
  let portfolioExpense = 0;
  for (const c of portfolioClients) {
    const camps = c.campaigns.filter((camp) =>
      campaignOverlapsRange(camp.startDate, camp.endDate, range),
    );
    const t = computePortfolioTotals(camps, {
      revenuePerSalePaise: c.revenuePerSalePaise,
      manualSalesCount: c.manualSalesCount,
      revenuePaise: c.revenuePaise,
      expensePaise: c.expensePaise,
    });
    if (!t.profitAvailable) portfolioProfitKnown = false;
    else {
      portfolioRevenue += t.revenuePaise ?? 0;
      portfolioExpense += t.otherExpensePaise;
    }
  }

  const portfolioTotals = computePortfolioTotals(
    scopedCampaigns,
    portfolioProfitKnown
      ? {
          revenuePerSalePaise: null,
          manualSalesCount: null,
          revenuePaise: portfolioRevenue,
          expensePaise: portfolioExpense,
        }
      : {
          revenuePerSalePaise: null,
          manualSalesCount: null,
          revenuePaise: null,
          expensePaise: null,
        },
  );

  const financeAds = financeAdSpend._sum.amountPaise ?? 0;
  // Prefer portfolio campaign spend when present — same source as Portfolio tab.
  const totalAds =
    portfolioTotals.adSpendPaise > 0
      ? portfolioTotals.adSpendPaise
      : financeAds;

  const revenueBySource: Record<string, number> = {};
  const winsBySource: Record<string, number> = {};
  for (const d of wonDeals) {
    const s = d.contact.source;
    revenueBySource[s] = (revenueBySource[s] ?? 0) + d.valuePaise;
    winsBySource[s] = (winsBySource[s] ?? 0) + 1;
  }

  const totalLeads = leads.reduce((a, r) => a + r._count._all, 0) || 1;

  return (
    <div>
      <PageHeader title="Source ROI" />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        This month · listens to Portfolio campaigns, pipeline wins, and
        marketing expenses.
      </p>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Ad spend"
          value={formatINR(totalAds)}
          hint={
            portfolioTotals.adSpendPaise > 0
              ? "From Portfolio campaigns"
              : "From Marketing expenses"
          }
        />
        <Stat
          label="Campaign leads"
          value={String(portfolioTotals.leads)}
          hint="Portfolio · this month"
        />
        <Stat
          label="Campaign sales"
          value={String(portfolioTotals.purchases)}
          hint="Purchases from Portfolio"
        />
        <Stat
          label="Campaign profit"
          value={
            portfolioTotals.profitAvailable && portfolioTotals.profitPaise != null
              ? formatINR(portfolioTotals.profitPaise)
              : "Not mentioned"
          }
          hint={
            portfolioTotals.roiPercent != null
              ? `ROI ${portfolioTotals.roiPercent}%`
              : "Set product price in Portfolio"
          }
        />
      </section>

      <p className="mb-3 text-sm">
        <Link
          href="/app/portfolio?preset=month"
          className="font-medium text-blue-600 hover:underline"
        >
          Open Portfolio →
        </Link>
        {financeAds > 0 && portfolioTotals.adSpendPaise > 0 ? (
          <span className="ml-2 text-zinc-500">
            Finance marketing expenses also logged: {formatINR(financeAds)}
          </span>
        ) : null}
      </p>

      <div className="sp-card sp-shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Leads</th>
              <th className="px-4 py-3 font-semibold">Wins</th>
              <th className="px-4 py-3 font-semibold">Pipeline revenue</th>
              <th className="px-4 py-3 font-semibold">CPL</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No leads this month yet.
                </td>
              </tr>
            ) : (
              leads.map((row) => {
                const count = row._count._all;
                const share = count / totalLeads;
                const cpl = Math.round(
                  (totalAds * share) / Math.max(1, count),
                );
                return (
                  <tr
                    key={row.source}
                    className="border-t border-zinc-100 text-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.source.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">{count}</td>
                    <td className="px-4 py-3">
                      {winsBySource[row.source] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {formatINR(revenueBySource[row.source] ?? 0)}
                    </td>
                    <td className="px-4 py-3">{formatINR(cpl)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="sp-card sp-shadow p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tracking-tight text-zinc-950">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}
