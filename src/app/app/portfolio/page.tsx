import Link from "next/link";
import { format } from "date-fns";
import { Suspense } from "react";
import { BriefcaseBusiness, Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR, paiseToRupees } from "@/lib/money";
import {
  campaignOverlapsRange,
  campaignRevenuePaise,
  computePortfolioTotals,
  lastNDaysBuckets,
  resolvePortfolioRange,
} from "@/lib/portfolio-analytics";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PortfolioFilters } from "@/components/portfolio/portfolio-filters";
import {
  CampaignCompareChart,
  ClientCompareChart,
  LeadsOverTimeChart,
  RevenueProfitChart,
  SpendOverTimeChart,
} from "@/components/portfolio/portfolio-charts";
import { PdfExportButton } from "@/components/portfolio/pdf-export-button";
import { InfoTip } from "@/components/portfolio/info-tip";
import { CampaignsTable } from "@/components/portfolio/campaigns-table";
import { updateClientFinancials } from "@/app/actions/portfolio";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  getBusinessPlanLimits,
  hasFeature,
} from "@/lib/plan-limits";

const FINANCE_INFO =
  "Revenue and profit need a product price (on the campaign or client). Leave blank if you don’t know — we never invent numbers.";

function clientFinance(c: {
  revenuePerSalePaise: number | null;
  manualSalesCount: number | null;
  revenuePaise: number | null;
  expensePaise: number | null;
}) {
  return {
    revenuePerSalePaise: c.revenuePerSalePaise,
    manualSalesCount: c.manualSalesCount,
    revenuePaise: c.revenuePaise,
    expensePaise: c.expensePaise,
  };
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    preset?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
      <PortfolioContent params={params} />
    </Suspense>
  );
}

async function PortfolioContent({
  params,
}: {
  params: {
    clientId?: string;
    preset?: string;
    from?: string;
    to?: string;
    status?: string;
  };
}) {
  const ctx = await requireTenant();
  const [business, limits] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { name: true },
    }),
    getBusinessPlanLimits(ctx.businessId),
  ]);
  const canWrite = hasFeature(limits, "portfolioWrite");
  const canImport = hasFeature(limits, "portfolioImport");

  const range = resolvePortfolioRange({
    preset: params.preset,
    from: params.from,
    to: params.to,
  });
  const statusFilter = params.status === "CURRENT" || params.status === "COMPLETED"
    ? params.status
    : null;
  const selectedClientId = params.clientId || "";

  const clients = await prisma.portfolioClient.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...(statusFilter && !selectedClientId ? { status: statusFilter } : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      campaigns: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
      },
    },
  });

  const selected = selectedClientId
    ? clients.find((c) => c.id === selectedClientId) ?? null
    : null;

  const scopedClients = selected ? [selected] : clients;

  const scopedCampaigns = scopedClients.flatMap((c) =>
    c.campaigns
      .filter((camp) =>
        campaignOverlapsRange(camp.startDate, camp.endDate, range),
      )
      .map((camp) => ({ ...camp, clientName: c.name, clientId: c.id })),
  );

  let totals;
  if (selected) {
    totals = computePortfolioTotals(
      scopedCampaigns,
      clientFinance(selected),
    );
  } else {
    let revenue = 0;
    let expense = 0;
    let allKnown = scopedClients.length > 0;
    for (const c of scopedClients) {
      const camps = c.campaigns.filter((camp) =>
        campaignOverlapsRange(camp.startDate, camp.endDate, range),
      );
      const t = computePortfolioTotals(camps, clientFinance(c));
      if (!t.profitAvailable) {
        allKnown = false;
        break;
      }
      revenue += t.revenuePaise ?? 0;
      expense += t.otherExpensePaise;
    }
    if (allKnown) {
      totals = computePortfolioTotals(scopedCampaigns, {
        revenuePerSalePaise: null,
        manualSalesCount: null,
        revenuePaise: revenue,
        expensePaise: expense,
      });
    } else {
      totals = computePortfolioTotals(scopedCampaigns, {
        revenuePerSalePaise: null,
        manualSalesCount: null,
        revenuePaise: null,
        expensePaise: null,
      });
    }
  }

  const dayBuckets = lastNDaysBuckets(14);
  const leadsSeries = dayBuckets.map((b) => ({
    label: format(b.from, "dd MMM"),
    value: scopedCampaigns
      .filter((c) => c.startDate <= b.to && c.endDate >= b.from)
      .reduce((s, c) => s + c.leads, 0),
  }));
  const spendSeries = dayBuckets.map((b) => ({
    label: format(b.from, "dd MMM"),
    value: Math.round(
      paiseToRupees(
        scopedCampaigns
          .filter((c) => c.startDate <= b.to && c.endDate >= b.from)
          .reduce((s, c) => s + c.amountSpentPaise, 0),
      ),
    ),
  }));

  const clientPriceById = new Map(
    scopedClients.map((c) => [c.id, c.revenuePerSalePaise] as const),
  );

  const campaignCompare = scopedCampaigns.slice(0, 8).map((c) => {
    const rev = campaignRevenuePaise(
      c,
      clientPriceById.get(c.clientId) ?? null,
    );
    return {
      label: c.name.slice(0, 18),
      spend: Math.round(paiseToRupees(c.amountSpentPaise)),
      leads: c.leads,
      revenue: rev != null ? Math.round(paiseToRupees(rev)) : 0,
    };
  });

  const clientKeys = scopedClients.map((c) => c.name);
  const clientCompareData = dayBuckets.map((b) => {
    const row: { label: string; [k: string]: string | number } = {
      label: format(b.from, "dd MMM"),
    };
    for (const client of scopedClients) {
      row[client.name] = client.campaigns
        .filter(
          (c) =>
            campaignOverlapsRange(c.startDate, c.endDate, range) &&
            c.startDate <= b.to &&
            c.endDate >= b.from,
        )
        .reduce((s, c) => s + c.leads, 0);
    }
    return row;
  });

  const revenueProfitSeries = scopedClients.map((c) => {
    const camps = c.campaigns.filter((camp) =>
      campaignOverlapsRange(camp.startDate, camp.endDate, range),
    );
    const t = computePortfolioTotals(camps, clientFinance(c));
    return {
      label: c.name.slice(0, 14),
      revenue:
        t.revenuePaise != null ? Math.round(paiseToRupees(t.revenuePaise)) : null,
      profit:
        t.profitPaise != null ? Math.round(paiseToRupees(t.profitPaise)) : null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Portfolio"
        actions={
          <div className="flex flex-wrap gap-2">
            {canImport ? (
              <Link href="/app/portfolio/import">
                <Button type="button" variant="secondary">
                  <Upload className="h-4 w-4" />
                  Import campaigns
                </Button>
              </Link>
            ) : null}
            {canWrite ? (
              <Link href="/app/portfolio/clients/new">
                <Button type="button">
                  <Plus className="h-4 w-4" />
                  Add client
                </Button>
              </Link>
            ) : (
              <Link href="/pay">
                <Button type="button" variant="secondary">
                  Choose a plan
                </Button>
              </Link>
            )}
            {selected && (
              <PdfExportButton
                payload={{
                  agencyName: business.name,
                  client: {
                    name: selected.name,
                    businessDetails: selected.businessDetails,
                    industry: selected.industry,
                    website: selected.website,
                    services: selected.services,
                    workHistory: selected.workHistory,
                    achievements: selected.achievements,
                    status: selected.status,
                  },
                  periodLabel: range.label,
                  totals,
                  campaigns: scopedCampaigns.map((c) => ({
                    name: c.name,
                    startDate: format(c.startDate, "dd MMM yyyy"),
                    endDate: format(c.endDate, "dd MMM yyyy"),
                    leads: c.leads,
                    purchases: c.purchases,
                    amountSpentPaise: c.amountSpentPaise,
                  })),
                }}
              />
            )}
          </div>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Client portfolios, campaign performance, and results — filter by date
        or client.
      </p>

      <PortfolioFilters
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
        }))}
        selectedClientId={selectedClientId}
        preset={params.preset || "month"}
        from={params.from || ""}
        to={params.to || ""}
        statusFilter={params.status || "all"}
      />

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ad spend" value={formatINR(totals.adSpendPaise)} />
        <Stat label="Leads" value={String(totals.leads)} />
        <Stat
          label="Sales"
          value={String(totals.purchases)}
          hint={
            selected?.manualSalesCount != null
              ? "Using your manual sales count"
              : "From campaign purchases (override on client)"
          }
        />
        <Stat
          label="Cost / lead"
          value={
            totals.costPerLeadPaise != null
              ? formatINR(totals.costPerLeadPaise)
              : "—"
          }
        />
        <Stat
          label="Cost / sale"
          value={
            totals.costPerPurchasePaise != null
              ? formatINR(totals.costPerPurchasePaise)
              : "—"
          }
        />
        <Stat
          label="Revenue"
          value={
            totals.profitAvailable && totals.revenuePaise != null
              ? formatINR(totals.revenuePaise)
              : "Not mentioned"
          }
          muted={!totals.profitAvailable}
          info={!totals.profitAvailable ? FINANCE_INFO : undefined}
        />
        <Stat
          label="Profit"
          value={
            totals.profitAvailable && totals.profitPaise != null
              ? formatINR(totals.profitPaise)
              : "Not mentioned"
          }
          muted={!totals.profitAvailable}
          info={!totals.profitAvailable ? FINANCE_INFO : undefined}
        />
        <Stat
          label="ROI"
          value={
            totals.roiPercent != null ? `${totals.roiPercent}%` : "Not mentioned"
          }
          muted={totals.roiPercent == null}
          info={totals.roiPercent == null ? FINANCE_INFO : undefined}
        />
      </div>

      {selected && (
        <section className="sp-card sp-shadow mb-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {selected.status === "CURRENT" ? "Current client" : "Completed"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-zinc-950">
                {selected.name}
              </h2>
              {selected.industry && (
                <p className="text-sm text-zinc-500">{selected.industry}</p>
              )}
              {selected.businessDetails && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                  {selected.businessDetails}
                </p>
              )}
              {selected.services && (
                <p className="mt-2 text-sm text-zinc-700">
                  <span className="font-medium">Services:</span>{" "}
                  {selected.services}
                </p>
              )}
              {selected.workHistory && (
                <p className="mt-1 text-sm text-zinc-700">
                  <span className="font-medium">Work history:</span>{" "}
                  {selected.workHistory}
                </p>
              )}
              {selected.achievements && (
                <p className="mt-1 text-sm text-emerald-700">
                  <span className="font-medium">Results:</span>{" "}
                  {selected.achievements}
                </p>
              )}
            </div>
            {canWrite ? (
              <Link href={`/app/portfolio/clients/${selected.id}/edit`}>
                <Button type="button" variant="secondary">
                  Edit client
                </Button>
              </Link>
            ) : null}
          </div>

          {canWrite ? (
            <>
              <form
                action={updateClientFinancials}
                className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="clientId" value={selected.id} />
                <label className="text-sm font-medium text-zinc-700">
                  Per sale / product cost (₹)
                  <Input
                    name="revenuePerSaleRupees"
                    type="number"
                    min={0}
                    className="mt-1.5"
                    defaultValue={
                      selected.revenuePerSalePaise != null
                        ? String(selected.revenuePerSalePaise / 100)
                        : ""
                    }
                    placeholder="Leave blank if unknown"
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Sales count
                  <Input
                    name="manualSalesCount"
                    type="number"
                    min={0}
                    className="mt-1.5"
                    defaultValue={
                      selected.manualSalesCount != null
                        ? String(selected.manualSalesCount)
                        : ""
                    }
                    placeholder={`Campaign: ${totals.campaignPurchases}`}
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Other expenses (₹)
                  <Input
                    name="expenseRupees"
                    type="number"
                    min={0}
                    className="mt-1.5"
                    defaultValue={
                      selected.expensePaise != null
                        ? String(selected.expensePaise / 100)
                        : ""
                    }
                  />
                </label>
                <div className="flex items-end">
                  <SubmitButton className="w-full">Update profit</SubmitButton>
                </div>
              </form>
              <p className="mt-2 text-xs text-zinc-500">
                Revenue = purchases × product price (campaign price, or this
                per-sale default). Clear prices to keep revenue and profit as
                “Not mentioned”.
              </p>
            </>
          ) : (
            <p className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
              Portfolio edits need an active subscription.{" "}
              <Link
                href="/pay"
                className="font-semibold text-indigo-700 underline"
              >
                Choose a plan
              </Link>
            </p>
          )}
        </section>
      )}

      {clients.length === 0 ? (
        <div className="sp-card sp-shadow flex flex-col items-center px-6 py-14 text-center">
          <BriefcaseBusiness className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="font-semibold text-zinc-900">No portfolio clients yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            {canWrite
              ? "Add a client or import a campaign report to start tracking performance."
              : "Portfolio edits require an active subscription."}
          </p>
          <div className="mt-5 flex gap-2">
            {canWrite ? (
              <>
                <Link href="/app/portfolio/clients/new">
                  <Button type="button">Add client</Button>
                </Link>
                {canImport ? (
                  <Link href="/app/portfolio/import">
                    <Button type="button" variant="secondary">
                      Import campaigns
                    </Button>
                  </Link>
                ) : null}
              </>
            ) : (
              <Link href="/pay">
                <Button type="button">Choose a plan</Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <LeadsOverTimeChart data={leadsSeries} />
            <SpendOverTimeChart data={spendSeries} />
            <RevenueProfitChart data={revenueProfitSeries} />
            <CampaignCompareChart data={campaignCompare} />
          </div>

          {!selected && clientKeys.length > 0 && (
            <div className="mb-5">
              <ClientCompareChart
                data={clientCompareData}
                clientKeys={clientKeys}
              />
            </div>
          )}

          <section className="sp-card sp-shadow overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="font-semibold text-zinc-900">
                Campaigns · {range.label}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {canWrite
                  ? "Edit purchases (pencil) or product price — sales, cost/sale, revenue, profit and ROI update automatically."
                  : "View only — upgrade to Pro to edit purchases or product prices."}
              </p>
            </div>
            {scopedCampaigns.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                No campaigns in this period.
                {canImport ? " Import a report to populate results." : ""}
              </p>
            ) : (
              <CampaignsTable
                showClient={!selected}
                readOnly={!canWrite}
                campaigns={scopedCampaigns.map((c) => {
                  const client = scopedClients.find((x) => x.id === c.clientId);
                  return {
                    id: c.id,
                    name: c.name,
                    clientName: c.clientName,
                    clientId: c.clientId,
                    dateLabel: `${format(c.startDate, "dd MMM")} – ${format(c.endDate, "dd MMM yy")}`,
                    leads: c.leads,
                    purchases: c.purchases,
                    amountSpentPaise: c.amountSpentPaise,
                    productPricePaise: c.productPricePaise,
                    clientProductPricePaise:
                      client?.revenuePerSalePaise ?? null,
                  };
                })}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
  info,
  hint,
}: {
  label: string;
  value: string;
  muted?: boolean;
  info?: string;
  hint?: string;
}) {
  return (
    <div className="sp-card sp-shadow p-4">
      <p className="flex items-center text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {info ? <InfoTip text={info} /> : null}
      </p>
      <p
        className={`mt-1 text-lg font-bold tracking-tight ${
          muted ? "text-zinc-400" : "text-zinc-950"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}
