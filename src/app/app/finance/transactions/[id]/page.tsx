import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();

  const tx = await prisma.transaction.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
    include: {
      category: true,
      contact: { select: { id: true, name: true, phone: true, email: true } },
      invoice: { select: { id: true, number: true } },
      vendor: { select: { id: true, name: true } },
    },
  });

  if (!tx) notFound();

  const isIncome = tx.type === "INCOME";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={isIncome ? "Income" : "Expense"} />

      <div className="sp-card sp-shadow p-5">
        <p
          className={`text-3xl font-bold tracking-tight ${
            isIncome ? "text-emerald-600" : "text-zinc-900"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatINR(tx.amountPaise)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {format(tx.occurredAt, "dd MMM yyyy · hh:mm a")}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <Row
            label="Customer"
            value={
              tx.contact ? (
                <Link
                  href={`/app/contacts/${tx.contact.id}`}
                  className="font-medium text-blue-600"
                >
                  {tx.contact.name}
                  {tx.contact.phone ? ` · ${tx.contact.phone}` : ""}
                </Link>
              ) : (
                "Walk-in"
              )
            }
          />
          <Row label="Category" value={tx.category?.name ?? "—"} />
          <Row label="Payment mode" value={tx.paymentMode} />
          <Row label="Note" value={tx.note || "—"} />
          {tx.vendor && <Row label="Vendor" value={tx.vendor.name} />}
          {tx.invoice && (
            <Row
              label="Invoice"
              value={
                <Link
                  href={`/app/finance/invoices/${tx.invoice.id}`}
                  className="font-medium text-blue-600"
                >
                  {tx.invoice.number}
                </Link>
              }
            />
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {tx.invoice && (
            <Link href={`/app/finance/invoices/${tx.invoice.id}`}>
              <Button type="button">Open invoice</Button>
            </Link>
          )}
          <Link href="/app/finance">
            <Button type="button" variant="secondary">
              Back to payments
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
