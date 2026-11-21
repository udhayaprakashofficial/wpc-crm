import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR, formatINRPrecise } from "@/lib/money";
import { recordPayment, convertQuoteToInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PrintButton } from "@/components/PrintButton";
import { BusinessLogo } from "@/components/BusinessLogo";

function customerWaDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

async function InvoiceDetail({ id }: { id: string }) {
  const ctx = await requireTenant();
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
    include: { contact: true, items: true, business: true },
  });
  if (!invoice) notFound();

  const balance = invoice.totalPaise - invoice.amountPaidPaise;
  const isQuote = invoice.notes === "Quote";
  const biz = invoice.business;
  const customer = invoice.contact;
  const customerPhone = customerWaDigits(customer.phone);
  const waHref =
    customerPhone.length === 10
      ? `https://wa.me/91${customerPhone}?text=${encodeURIComponent(
          `Hi ${customer.name},\n\n${isQuote ? "Quote" : "Invoice"} ${invoice.number} from ${biz.name}.\nAmount: ${formatINR(invoice.totalPaise)}\nBalance: ${formatINR(balance)}\n\nThank you!`,
        )}`
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border bg-white p-5 print:border-0">
        {/* Seller = your business */}
        <div className="flex justify-between gap-4 border-b border-zinc-100 pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <BusinessLogo src={biz.logoUrl} name={biz.name} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                From
              </p>
              <p className="text-lg font-bold tracking-tight text-zinc-950">
                {biz.name}
              </p>
              {biz.address && (
                <p className="mt-0.5 whitespace-pre-line text-xs text-zinc-500">
                  {biz.address}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                {[biz.phone, biz.email].filter(Boolean).join(" · ")}
              </p>
              {biz.gstNumber && (
                <p className="text-xs text-zinc-500">GSTIN {biz.gstNumber}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {isQuote ? "Quote" : "Invoice"}
            </p>
            <h2 className="text-xl font-semibold text-zinc-950">
              {invoice.number}
            </h2>
            <p className="mt-1 font-semibold text-zinc-700">{invoice.status}</p>
            <p className="text-zinc-500">
              {format(invoice.issueDate, "dd MMM yyyy")}
            </p>
            {invoice.dueDate && (
              <p className="text-xs text-zinc-400">
                Due {format(invoice.dueDate, "dd MMM yyyy")}
              </p>
            )}
          </div>
        </div>

        {!biz.logoUrl && (
          <p className="mt-3 text-xs text-zinc-400 print:hidden">
            Add your logo in{" "}
            <Link
              href="/app/settings/brand"
              className="font-semibold text-blue-600"
            >
              Brand kit
            </Link>
          </p>
        )}

        {/* Buyer = customer only */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Bill to (customer)
            </p>
            <p className="mt-1 text-base font-bold text-zinc-950">
              {customer.name}
            </p>
            <p className="mt-1 font-medium text-zinc-800">{customer.phone}</p>
            {customer.email && (
              <p className="text-zinc-600">{customer.email}</p>
            )}
            {customer.address && (
              <p className="mt-1 whitespace-pre-line text-xs text-zinc-500">
                {customer.address}
              </p>
            )}
            <p className="mt-2 text-[11px] text-zinc-500">
              {customer.type === "CUSTOMER" ? "Customer" : "Lead"} ·{" "}
              <Link
                href={`/app/contacts/${customer.id}`}
                className="font-semibold text-blue-600 print:hidden"
              >
                View contact
              </Link>
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Reminder
            </p>
            <p className="mt-1 leading-5">
              This bill is for <strong>{customer.name}</strong> only. WhatsApp
              share opens a chat with their number ({customer.phone}), not your
              business login.
            </p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2">{item.description}</td>
                <td>{item.quantity}</td>
                <td>{formatINRPrecise(item.unitPaise)}</td>
                <td className="text-right">
                  {formatINRPrecise(item.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 text-sm">
          <Row
            label="Subtotal"
            value={formatINRPrecise(invoice.subtotalPaise)}
          />
          <Row label="GST" value={formatINRPrecise(invoice.taxPaise)} />
          <Row
            label="Discount"
            value={formatINRPrecise(invoice.discountPaise)}
          />
          <Row label="Total" value={formatINR(invoice.totalPaise)} bold />
          <Row label="Paid" value={formatINR(invoice.amountPaidPaise)} />
          <Row label="Balance" value={formatINR(balance)} bold />
        </div>

        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              WhatsApp customer ({customer.name})
            </a>
          ) : (
            <span className="rounded-xl bg-zinc-100 px-4 py-2 text-sm text-zinc-500">
              Add a valid customer phone to share
            </span>
          )}
          {isQuote && (
            <form
              action={async () => {
                "use server";
                await convertQuoteToInvoice(invoice.id);
              }}
            >
              <Button type="submit" variant="secondary">
                Convert to invoice
              </Button>
            </form>
          )}
        </div>
      </div>

      {balance > 0 && !isQuote && (
        <form
          action={recordPayment}
          className="space-y-3 rounded-2xl border bg-white p-5 print:hidden"
        >
          <h3 className="font-semibold">Record payment</h3>
          <p className="text-xs text-zinc-500">
            Payment from customer: {customer.name}
          </p>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <Input
            name="amountRupees"
            type="number"
            step="0.01"
            required
            defaultValue={(balance / 100).toFixed(2)}
          />
          <Select name="paymentMode" defaultValue="UPI">
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
            <option value="CHEQUE">Cheque</option>
          </Select>
          <Button type="submit" className="w-full">
            Save payment
          </Button>
        </form>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-semibold text-base" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <InvoiceDetail id={id} />
    </Suspense>
  );
}
