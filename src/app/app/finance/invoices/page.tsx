import Link from "next/link";
import { format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canViewFinance } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import {
  getOutstandingInvoices,
  invoiceBalance,
  syncOverdueInvoices,
} from "@/lib/receivables";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Button } from "@/components/ui/button";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab =
    tab === "dues" ? "dues" : tab === "quotes" ? "quotes" : "all";

  const ctx = await requireTenant();
  if (!canViewFinance(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  await syncOverdueInvoices(ctx.businessId);

  const [allInvoices, dues, quotes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        OR: [{ notes: null }, { notes: { not: "Quote" } }],
      },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getOutstandingInvoices(ctx.businessId, 50),
    prisma.invoice.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        notes: "Quote",
      },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const staleCutoff = subDays(new Date(), 7);
  const duesTotal = dues.reduce((s, i) => s + i.balancePaise, 0);

  return (
    <div>
      <PageHeader
        title="Invoices & quotes"
        actions={
          <Link href="/app/finance/invoices/new">
            <Button>+ Invoice</Button>
          </Link>
        }
      />

      <PillTabs
        items={[
          {
            href: "/app/finance/invoices",
            label: `Invoices (${allInvoices.length})`,
            active: activeTab === "all",
          },
          {
            href: "/app/finance/invoices?tab=dues",
            label: `They owe you (${dues.length})`,
            active: activeTab === "dues",
          },
          {
            href: "/app/finance/invoices?tab=quotes",
            label: `Quotes (${quotes.length})`,
            active: activeTab === "quotes",
          },
        ]}
      />

      {activeTab === "dues" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">{formatINR(duesTotal)}</span> still
          unpaid across {dues.length} invoice
          {dues.length === 1 ? "" : "s"}. Don&apos;t forget to collect.
        </div>
      )}

      {activeTab === "quotes" && (
        <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Quotes older than 7 days need a follow-up — customers who ask for
          price often disappear without one.
        </div>
      )}

      {activeTab === "dues" ? (
        <InvoiceTable
          rows={dues.map((inv) => ({
            id: inv.id,
            number: inv.number,
            contactName: inv.contact.name,
            status: inv.status,
            date: inv.dueDate ?? inv.issueDate,
            dateLabel: inv.dueDate ? "Due" : "Issued",
            amount: inv.balancePaise,
            amountTone: inv.status === "OVERDUE" ? "warn" : "default",
            badge:
              inv.status === "OVERDUE"
                ? "Overdue"
                : inv.status === "PARTIAL"
                  ? "Partial"
                  : "Unpaid",
          }))}
          empty="No one owes you right now."
        />
      ) : activeTab === "quotes" ? (
        <InvoiceTable
          rows={quotes.map((inv) => ({
            id: inv.id,
            number: inv.number,
            contactName: inv.contact.name,
            status: inv.status,
            date: inv.issueDate,
            dateLabel: "Sent",
            amount: inv.totalPaise,
            amountTone: "default" as const,
            badge:
              inv.issueDate < staleCutoff ? "Needs follow-up" : "Open",
          }))}
          empty="No quotes yet. Create one when a customer asks for price."
        />
      ) : (
        <InvoiceTable
          rows={allInvoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            contactName: inv.contact.name,
            status: inv.status,
            date: inv.issueDate,
            dateLabel: "Issued",
            amount: invoiceBalance(inv) || inv.totalPaise,
            amountTone:
              inv.status === "OVERDUE" || inv.status === "PARTIAL"
                ? ("warn" as const)
                : ("default" as const),
            badge: inv.status,
          }))}
          empty="No invoices yet."
        />
      )}
    </div>
  );
}

function InvoiceTable({
  rows,
  empty,
}: {
  rows: {
    id: string;
    number: string;
    contactName: string;
    status: string;
    date: Date;
    dateLabel: string;
    amount: number;
    amountTone: "warn" | "default";
    badge: string;
  }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="sp-card px-5 py-8 text-sm text-zinc-500">{empty}</div>
    );
  }

  return (
    <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/app/finance/invoices/${row.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50"
          >
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">
                {row.number} · {row.contactName}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {row.dateLabel} {format(row.date, "dd MMM yyyy")}
                <span className="ml-2 inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  {row.badge}
                </span>
              </p>
            </div>
            <p
              className={`shrink-0 font-semibold ${
                row.amountTone === "warn"
                  ? "text-amber-700"
                  : "text-zinc-900"
              }`}
            >
              {formatINR(row.amount)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
