import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { formatINR } from "@/lib/money";

export type DatePreset = "all" | "day" | "week" | "month" | "custom";

export type DateRange = {
  from: Date | null;
  to: Date | null;
  label: string;
};

export function resolvePortfolioRange(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  ref?: Date;
}): DateRange {
  const ref = input.ref ?? new Date();
  const preset = (input.preset || "month") as DatePreset;

  if (preset === "all") {
    return { from: null, to: null, label: "All time" };
  }
  if (preset === "day") {
    return {
      from: startOfDay(ref),
      to: endOfDay(ref),
      label: "Today",
    };
  }
  if (preset === "week") {
    return {
      from: startOfWeek(ref, { weekStartsOn: 1 }),
      to: endOfWeek(ref, { weekStartsOn: 1 }),
      label: "This week",
    };
  }
  if (preset === "custom" && input.from && input.to) {
    return {
      from: startOfDay(new Date(input.from)),
      to: endOfDay(new Date(input.to)),
      label: "Custom range",
    };
  }
  return {
    from: startOfMonth(ref),
    to: endOfMonth(ref),
    label: "This month",
  };
}

export type CampaignMetricsInput = {
  leads: number;
  purchases: number;
  amountSpentPaise: number;
  results?: number;
  /** Campaign-level product / sale price (paise). */
  productPricePaise?: number | null;
};

export type ClientFinancialInput = {
  /** Price / value the client earns per sale (paise). Used when a campaign has no product price. */
  revenuePerSalePaise: number | null;
  /** Override sale count; null = use campaign purchases. */
  manualSalesCount: number | null;
  /** Optional fixed total revenue (legacy). Used only if per-sale is unset. */
  revenuePaise: number | null;
  expensePaise: number | null;
};

export type PortfolioTotals = {
  adSpendPaise: number;
  leads: number;
  /** Effective sales used for revenue (manual or campaign purchases). */
  purchases: number;
  campaignPurchases: number;
  results: number;
  costPerLeadPaise: number | null;
  costPerPurchasePaise: number | null;
  revenuePaise: number | null;
  otherExpensePaise: number;
  profitPaise: number | null;
  roiPercent: number | null;
  /** True only when per-sale cost or fixed revenue is known. */
  profitAvailable: boolean;
  revenuePerSalePaise: number | null;
};

export function sumCampaigns(campaigns: CampaignMetricsInput[]): {
  adSpendPaise: number;
  leads: number;
  purchases: number;
  results: number;
} {
  return campaigns.reduce(
    (acc, c) => ({
      adSpendPaise: acc.adSpendPaise + (c.amountSpentPaise || 0),
      leads: acc.leads + (c.leads || 0),
      purchases: acc.purchases + (c.purchases || 0),
      results: acc.results + (c.results ?? c.leads + c.purchases),
    }),
    { adSpendPaise: 0, leads: 0, purchases: 0, results: 0 },
  );
}

function effectiveProductPricePaise(
  campaign: CampaignMetricsInput,
  clientPerSalePaise: number | null,
): number | null {
  if (campaign.productPricePaise != null && campaign.productPricePaise > 0) {
    return campaign.productPricePaise;
  }
  if (clientPerSalePaise != null && clientPerSalePaise > 0) {
    return clientPerSalePaise;
  }
  return null;
}

/**
 * Revenue from campaigns when every sale has a known product price
 * (campaign price, else client per-sale). Never invents numbers.
 */
export function computeCampaignRevenuePaise(
  campaigns: CampaignMetricsInput[],
  clientPerSalePaise: number | null,
): number | null {
  let revenue = 0;
  let sawSale = false;

  for (const c of campaigns) {
    const purchases = Math.max(0, c.purchases || 0);
    if (purchases <= 0) continue;
    sawSale = true;
    const price = effectiveProductPricePaise(c, clientPerSalePaise);
    if (price == null) return null;
    revenue += purchases * price;
  }

  if (sawSale) return revenue;

  // No sales yet — still "known" if a default price exists (revenue = 0).
  if (
    clientPerSalePaise != null &&
    clientPerSalePaise > 0
  ) {
    return 0;
  }
  if (
    campaigns.some(
      (c) => c.productPricePaise != null && c.productPricePaise > 0,
    )
  ) {
    return 0;
  }
  return null;
}

/**
 * Revenue/profit only when product cost (per-sale) or fixed revenue is known.
 * Never invents numbers — otherwise callers should show “Not mentioned”.
 */
export function computePortfolioTotals(
  campaigns: CampaignMetricsInput[],
  financials: ClientFinancialInput,
): PortfolioTotals {
  const summed = sumCampaigns(campaigns);
  const otherExpensePaise = financials.expensePaise ?? 0;
  const salesCount =
    financials.manualSalesCount != null
      ? Math.max(0, financials.manualSalesCount)
      : summed.purchases;

  const clientPerSale =
    financials.revenuePerSalePaise != null &&
    financials.revenuePerSalePaise > 0
      ? financials.revenuePerSalePaise
      : null;

  let revenuePaise: number | null = null;

  if (financials.manualSalesCount != null && clientPerSale != null) {
    // Manual sales override still needs a single known price (client-level).
    revenuePaise = salesCount * clientPerSale;
  } else if (financials.manualSalesCount == null) {
    revenuePaise = computeCampaignRevenuePaise(campaigns, clientPerSale);
  } else if (financials.revenuePaise != null) {
    revenuePaise = financials.revenuePaise;
  }

  if (revenuePaise == null && financials.revenuePaise != null) {
    revenuePaise = financials.revenuePaise;
  }

  const profitAvailable = revenuePaise != null;
  const profitPaise = profitAvailable
    ? revenuePaise! - summed.adSpendPaise - otherExpensePaise
    : null;
  const roiPercent =
    profitAvailable && summed.adSpendPaise > 0
      ? Math.round((profitPaise! / summed.adSpendPaise) * 1000) / 10
      : null;

  return {
    adSpendPaise: summed.adSpendPaise,
    leads: summed.leads,
    purchases: salesCount,
    campaignPurchases: summed.purchases,
    results: summed.results,
    costPerLeadPaise:
      summed.leads > 0 ? Math.round(summed.adSpendPaise / summed.leads) : null,
    costPerPurchasePaise:
      salesCount > 0 ? Math.round(summed.adSpendPaise / salesCount) : null,
    revenuePaise,
    otherExpensePaise,
    profitPaise,
    roiPercent,
    profitAvailable,
    revenuePerSalePaise: financials.revenuePerSalePaise,
  };
}

/** Per-campaign revenue in paise when a product price is known. */
export function campaignRevenuePaise(
  campaign: CampaignMetricsInput,
  clientPerSalePaise: number | null,
): number | null {
  const purchases = Math.max(0, campaign.purchases || 0);
  const price = effectiveProductPricePaise(campaign, clientPerSalePaise);
  if (price == null) return null;
  return purchases * price;
}

export function formatMoneyOrDash(paise: number | null | undefined) {
  if (paise == null) return "—";
  return formatINR(paise);
}

export function campaignOverlapsRange(
  startDate: Date,
  endDate: Date,
  range: DateRange,
) {
  if (!range.from || !range.to) return true;
  return startDate <= range.to && endDate >= range.from;
}

export function lastNDaysBuckets(n: number, ref = new Date()) {
  const days: { key: string; from: Date; to: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = subDays(ref, i);
    days.push({
      key: d.toISOString().slice(0, 10),
      from: startOfDay(d),
      to: endOfDay(d),
    });
  }
  return days;
}
