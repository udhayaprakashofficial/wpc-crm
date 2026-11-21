import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { createInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewInvoicePage() {
  const ctx = await requireTenant();
  const [contacts, business] = await Promise.all([
    prisma.contact.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        type: true,
      },
    }),
    prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { phone: true },
    }),
  ]);

  const bizPhone = (business.phone || "").replace(/\D/g, "").slice(-10);
  const due = new Date();
  due.setDate(due.getDate() + 7);

  const customers = contacts.filter((c) => c.type === "CUSTOMER");
  const leads = contacts.filter((c) => c.type === "LEAD");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader
        title="New invoice / quote"
        actions={
          <Link href="/app/finance/invoices">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <p className="-mt-3 text-sm text-zinc-500">
        <strong>Bill to</strong> must be your customer (or lead) — not your own
        business number.
      </p>

      <form
        action={createInvoice}
        className="space-y-4 rounded-2xl border bg-white p-5"
      >
        <label className="block space-y-2 text-sm font-medium">
          Bill to customer
          <Select name="contactId" required defaultValue="">
            <option value="" disabled>
              Select customer / lead
            </option>
            {customers.length > 0 && (
              <optgroup label="Customers">
                {customers.map((c) => {
                  const sameAsBiz =
                    bizPhone &&
                    c.phone.replace(/\D/g, "").slice(-10) === bizPhone;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                      {sameAsBiz ? " (your number — pick a customer)" : ""}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {leads.length > 0 && (
              <optgroup label="Leads">
                {leads.map((c) => {
                  const sameAsBiz =
                    bizPhone &&
                    c.phone.replace(/\D/g, "").slice(-10) === bizPhone;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                      {sameAsBiz ? " (your number — pick a customer)" : ""}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </Select>
        </label>

        {contacts.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No contacts yet.{" "}
            <Link href="/app/contacts/new" className="font-semibold underline">
              Add a customer
            </Link>{" "}
            first, then create the invoice.
          </p>
        )}

        <label className="block space-y-2 text-sm font-medium">
          Description
          <Input name="description" required defaultValue="Service" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2 text-sm font-medium">
            Qty
            <Input name="quantity" type="number" min={1} defaultValue={1} />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Unit ₹
            <Input
              name="unitRupees"
              type="number"
              min={1}
              required
              placeholder="1000"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2 text-sm font-medium">
            GST %
            <Input name="taxRatePct" type="number" defaultValue={18} />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Discount ₹
            <Input name="discountRupees" type="number" defaultValue={0} />
          </label>
        </div>
        <label className="block space-y-2 text-sm font-medium">
          Due date
          <Input
            name="dueDate"
            type="date"
            defaultValue={due.toISOString().slice(0, 10)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="asQuote" className="h-4 w-4" />
          Save as quote
        </label>
        <Button type="submit" className="w-full" size="lg">
          Create for customer
        </Button>
      </form>
    </div>
  );
}
