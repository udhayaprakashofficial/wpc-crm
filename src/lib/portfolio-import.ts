import { createHash } from "crypto";
import * as XLSX from "xlsx";
import { rupeesToPaise } from "@/lib/money";

export type ParsedCampaignRow = {
  clientName: string;
  campaignName: string;
  platform: string | null;
  externalCampaignId: string | null;
  startDate: Date;
  endDate: Date;
  leads: number;
  purchases: number;
  results: number;
  amountSpentPaise: number;
  impressions: number;
  reach: number;
  costPerResultPaise: number | null;
  dedupeKey: string;
};

const HEADER_ALIASES: Record<string, string[]> = {
  clientName: [
    "client",
    "client name",
    "client_name",
    "account name",
    "account",
    "advertiser",
    "business",
  ],
  campaignName: [
    "campaign",
    "campaign name",
    "campaign_name",
    "ad set name",
    "adset name",
    "ad name",
  ],
  platform: ["platform", "channel", "source", "network"],
  externalCampaignId: [
    "campaign id",
    "campaign_id",
    "ad campaign id",
    "id",
  ],
  startDate: [
    "start",
    "start date",
    "start_date",
    "reporting starts",
    "date start",
    "from",
  ],
  endDate: [
    "end",
    "end date",
    "end_date",
    "reporting ends",
    "date stop",
    "to",
  ],
  leads: ["leads", "lead", "results: leads", "on-facebook leads", "form leads"],
  purchases: [
    "purchases",
    "purchase",
    "conversions",
    "orders",
    "website purchases",
  ],
  results: ["results", "result", "actions", "outcomes"],
  amountSpent: [
    "amount spent",
    "spend",
    "spent",
    "cost",
    "amount spent (inr)",
    "total spend",
    "ad spend",
  ],
  impressions: ["impressions", "impr", "imps"],
  reach: ["reach", "unique reach"],
  costPerResult: [
    "cost per result",
    "cost per lead",
    "cpl",
    "cpr",
    "cost/result",
  ],
};

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function findCol(headers: string[], keys: string[]) {
  const normalized = headers.map(normHeader);
  for (const key of keys) {
    const i = normalized.indexOf(key);
    if (i >= 0) return i;
  }
  for (const key of keys) {
    const i = normalized.findIndex(
      (h) => h.includes(key) || key.includes(h),
    );
    if (i >= 0) return i;
  }
  return -1;
}

function toNumber(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return 0;
  const s = String(raw).replace(/[₹$,\s]/g, "").replace(/inr/gi, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toDate(raw: unknown): Date | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + raw * 86400000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function makeDedupeKey(input: {
  clientName: string;
  campaignName: string;
  startDate: Date;
  endDate: Date;
  externalCampaignId?: string | null;
}) {
  const base = [
    input.clientName.trim().toLowerCase(),
    input.campaignName.trim().toLowerCase(),
    dateKey(input.startDate),
    dateKey(input.endDate),
    (input.externalCampaignId || "").trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(base).digest("hex").slice(0, 40);
}

export function parseCampaignWorkbook(
  buffer: ArrayBuffer | Buffer,
  defaultClientName?: string,
): ParsedCampaignRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
    sheet,
    { header: 1, defval: "", raw: true },
  ) as unknown[][];

  if (rows.length < 2) return [];

  const headerRow = (rows[0] as unknown[]).map((c) => String(c ?? ""));
  const cols = {
    clientName: findCol(headerRow, HEADER_ALIASES.clientName),
    campaignName: findCol(headerRow, HEADER_ALIASES.campaignName),
    platform: findCol(headerRow, HEADER_ALIASES.platform),
    externalCampaignId: findCol(headerRow, HEADER_ALIASES.externalCampaignId),
    startDate: findCol(headerRow, HEADER_ALIASES.startDate),
    endDate: findCol(headerRow, HEADER_ALIASES.endDate),
    leads: findCol(headerRow, HEADER_ALIASES.leads),
    purchases: findCol(headerRow, HEADER_ALIASES.purchases),
    results: findCol(headerRow, HEADER_ALIASES.results),
    amountSpent: findCol(headerRow, HEADER_ALIASES.amountSpent),
    impressions: findCol(headerRow, HEADER_ALIASES.impressions),
    reach: findCol(headerRow, HEADER_ALIASES.reach),
    costPerResult: findCol(headerRow, HEADER_ALIASES.costPerResult),
  };

  if (cols.campaignName < 0) {
    throw new Error(
      "Could not find a Campaign Name column. Include headers like “Campaign name”.",
    );
  }

  const out: ParsedCampaignRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every((c) => c === "" || c == null)) continue;

    const campaignName = String(row[cols.campaignName] ?? "").trim();
    if (!campaignName) continue;

    const clientName = (
      cols.clientName >= 0
        ? String(row[cols.clientName] ?? "").trim()
        : ""
    ) || defaultClientName?.trim() || "";

    if (!clientName) {
      throw new Error(
        `Row ${i + 1}: missing client name. Add a Client column or pick a client before import.`,
      );
    }

    let startDate = cols.startDate >= 0 ? toDate(row[cols.startDate]) : null;
    let endDate = cols.endDate >= 0 ? toDate(row[cols.endDate]) : null;
    if (!startDate && !endDate) {
      startDate = new Date();
      endDate = startDate;
    } else if (startDate && !endDate) {
      endDate = startDate;
    } else if (!startDate && endDate) {
      startDate = endDate;
    }
    if (!startDate || !endDate) continue;

    const leads = cols.leads >= 0 ? Math.round(toNumber(row[cols.leads])) : 0;
    const purchases =
      cols.purchases >= 0 ? Math.round(toNumber(row[cols.purchases])) : 0;
    const results =
      cols.results >= 0 ? Math.round(toNumber(row[cols.results])) : leads || purchases;
    const spentRupees =
      cols.amountSpent >= 0 ? toNumber(row[cols.amountSpent]) : 0;
    const amountSpentPaise = rupeesToPaise(spentRupees);
    const impressions =
      cols.impressions >= 0 ? Math.round(toNumber(row[cols.impressions])) : 0;
    const reach = cols.reach >= 0 ? Math.round(toNumber(row[cols.reach])) : 0;
    const cprRupees =
      cols.costPerResult >= 0 ? toNumber(row[cols.costPerResult]) : 0;
    const costPerResultPaise =
      cprRupees > 0
        ? rupeesToPaise(cprRupees)
        : results > 0
          ? Math.round(amountSpentPaise / results)
          : null;

    const externalCampaignId =
      cols.externalCampaignId >= 0
        ? String(row[cols.externalCampaignId] ?? "").trim() || null
        : null;
    const platform =
      cols.platform >= 0
        ? String(row[cols.platform] ?? "").trim() || null
        : null;

    out.push({
      clientName,
      campaignName,
      platform,
      externalCampaignId,
      startDate,
      endDate,
      leads,
      purchases,
      results,
      amountSpentPaise,
      impressions,
      reach,
      costPerResultPaise,
      dedupeKey: makeDedupeKey({
        clientName,
        campaignName,
        startDate,
        endDate,
        externalCampaignId,
      }),
    });
  }

  return out;
}
