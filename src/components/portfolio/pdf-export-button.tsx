"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";

export type PortfolioPdfPayload = {
  agencyName: string;
  client: {
    name: string;
    businessDetails: string | null;
    industry: string | null;
    website: string | null;
    services: string | null;
    workHistory: string | null;
    achievements: string | null;
    status: string;
  };
  periodLabel: string;
  totals: {
    adSpendPaise: number;
    leads: number;
    purchases: number;
    costPerLeadPaise: number | null;
    costPerPurchasePaise: number | null;
    revenuePaise: number | null;
    profitPaise: number | null;
    profitAvailable: boolean;
    roiPercent: number | null;
  };
  campaigns: {
    name: string;
    startDate: string;
    endDate: string;
    leads: number;
    purchases: number;
    amountSpentPaise: number;
  }[];
};

export function PdfExportButton({ payload }: { payload: PortfolioPdfPayload }) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      let y = margin;

      doc.setFontSize(18);
      doc.setTextColor(24, 24, 27);
      doc.text("Client Portfolio", margin, y);
      y += 22;
      doc.setFontSize(11);
      doc.setTextColor(82, 82, 91);
      doc.text(`Prepared by ${payload.agencyName}`, margin, y);
      y += 16;
      doc.text(`Period: ${payload.periodLabel}`, margin, y);
      y += 28;

      doc.setFontSize(14);
      doc.setTextColor(24, 24, 27);
      doc.text(payload.client.name, margin, y);
      y += 18;
      doc.setFontSize(10);
      doc.setTextColor(63, 63, 70);

      const overview = [
        payload.client.industry ? `Industry: ${payload.client.industry}` : null,
        payload.client.website ? `Website: ${payload.client.website}` : null,
        payload.client.status === "COMPLETED" ? "Engagement: Completed" : "Engagement: Current",
        payload.client.businessDetails,
      ]
        .filter(Boolean)
        .join("\n");

      const overviewLines = doc.splitTextToSize(overview || "—", 500);
      doc.text(overviewLines, margin, y);
      y += overviewLines.length * 13 + 16;

      if (payload.client.services) {
        doc.setFontSize(12);
        doc.setTextColor(24, 24, 27);
        doc.text("Services provided", margin, y);
        y += 14;
        doc.setFontSize(10);
        doc.setTextColor(63, 63, 70);
        const lines = doc.splitTextToSize(payload.client.services, 500);
        doc.text(lines, margin, y);
        y += lines.length * 13 + 14;
      }

      if (payload.client.achievements) {
        doc.setFontSize(12);
        doc.setTextColor(24, 24, 27);
        doc.text("Key results", margin, y);
        y += 14;
        doc.setFontSize(10);
        doc.setTextColor(63, 63, 70);
        const lines = doc.splitTextToSize(payload.client.achievements, 500);
        doc.text(lines, margin, y);
        y += lines.length * 13 + 14;
      }

      doc.setFontSize(12);
      doc.setTextColor(24, 24, 27);
      doc.text("Performance summary", margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Ad spend", formatINR(payload.totals.adSpendPaise)],
          ["Leads", String(payload.totals.leads)],
          ["Purchases / conversions", String(payload.totals.purchases)],
          [
            "Cost per lead",
            payload.totals.costPerLeadPaise != null
              ? formatINR(payload.totals.costPerLeadPaise)
              : "—",
          ],
          [
            "Cost per purchase",
            payload.totals.costPerPurchasePaise != null
              ? formatINR(payload.totals.costPerPurchasePaise)
              : "—",
          ],
          [
            "Revenue",
            payload.totals.profitAvailable && payload.totals.revenuePaise != null
              ? formatINR(payload.totals.revenuePaise)
              : "Not mentioned",
          ],
          [
            "Profit",
            payload.totals.profitAvailable && payload.totals.profitPaise != null
              ? formatINR(payload.totals.profitPaise)
              : "Not mentioned",
          ],
          [
            "ROI",
            payload.totals.roiPercent != null
              ? `${payload.totals.roiPercent}%`
              : "Not mentioned",
          ],
        ],
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: margin, right: margin },
      });

      // @ts-expect-error lastAutoTable injected by plugin
      y = (doc.lastAutoTable?.finalY ?? y) + 24;

      doc.setFontSize(12);
      doc.setTextColor(24, 24, 27);
      doc.text("Campaign details", margin, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Campaign", "Dates", "Leads", "Purchases", "Spend"]],
        body: payload.campaigns.map((c) => [
          c.name,
          `${c.startDate} – ${c.endDate}`,
          String(c.leads),
          String(c.purchases),
          formatINR(c.amountSpentPaise),
        ]),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [24, 24, 27] },
        margin: { left: margin, right: margin },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(161, 161, 170);
        doc.text(
          "Client-facing summary · Confidential internal data excluded",
          margin,
          820,
        );
      }

      doc.save(
        `${payload.client.name.replace(/[^\w\-]+/g, "_")}_portfolio.pdf`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={exportPdf}
      disabled={busy}
    >
      <Download className="h-4 w-4" />
      {busy ? "Preparing PDF…" : "Export PDF"}
    </Button>
  );
}
