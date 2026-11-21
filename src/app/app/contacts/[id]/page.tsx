import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { contactVisibilityFilter, requireTenant } from "@/lib/tenant";
import { softDeleteContact } from "@/app/actions/contacts";
import { logOutboundMessage } from "@/app/actions/messages";
import { formatINR } from "@/lib/money";
import { invoiceBalance } from "@/lib/receivables";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { daysInactive, isInactiveCustomer } from "@/lib/winback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { WinBackActions } from "@/components/contacts/winback-actions";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const limits = await getBusinessPlanLimits(ctx.businessId);
  const [contact, portfolioClient] = await Promise.all([
    prisma.contact.findFirst({
      where: {
        id,
        businessId: ctx.businessId,
        deletedAt: null,
        ...contactVisibilityFilter(ctx),
      },
      include: {
        assignedTo: true,
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
        deals: { where: { deletedAt: null }, include: { stage: true } },
        tasks: {
          where: { status: "OPEN", deletedAt: null },
          orderBy: { dueAt: "asc" },
        },
        invoices: {
          where: {
            deletedAt: null,
            status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
            OR: [{ notes: null }, { notes: { not: "Quote" } }],
          },
          orderBy: { issueDate: "desc" },
          take: 10,
        },
      },
    }),
    prisma.portfolioClient.findFirst({
      where: {
        businessId: ctx.businessId,
        contactId: id,
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (!contact) notFound();

  const wa = `https://wa.me/91${contact.phone.replace(/\D/g, "").slice(-10)}`;
  const tel = `tel:${contact.phone}`;
  const isInactive = isInactiveCustomer(contact);
  const quietDays = daysInactive(contact);
  const owed = contact.invoices.reduce(
    (sum, inv) => sum + invoiceBalance(inv),
    0,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={contact.name} />

      <div className="sp-card sp-shadow mb-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {contact.type}
              {isInactive ? " · Inactive" : ""}
            </p>
            <p className="mt-1 text-zinc-600">{contact.phone}</p>
            {contact.email && (
              <p className="text-sm text-zinc-500">{contact.email}</p>
            )}
            {contact.lastActivityAt && (
              <p className="mt-2 text-xs text-zinc-400">
                Last active {format(contact.lastActivityAt, "dd MMM yyyy")}
              </p>
            )}
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            {contact.source.replaceAll("_", " ")}
          </span>
        </div>

        {contact.formResponses &&
        typeof contact.formResponses === "object" &&
        !Array.isArray(contact.formResponses) &&
        Object.keys(contact.formResponses as Record<string, unknown>).length >
          0 ? (
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Form answers
            </p>
            <dl className="mt-2 space-y-1.5 text-sm">
              {Object.entries(
                contact.formResponses as Record<string, unknown>,
              ).map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="shrink-0 text-zinc-500">{label}</dt>
                  <dd className="font-medium text-zinc-900">
                    {String(value ?? "")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {contact.notes ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600">
            {contact.notes}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={tel}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Call
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            WhatsApp
          </a>
          <Link
            href={`/app/tasks/new?contactId=${contact.id}`}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold"
          >
            + Follow-up
          </Link>
          {contact.type === "LEAD" && (
            <Link href={`/app/contacts/${contact.id}/convert`}>
              <Button type="button" variant="secondary">
                Convert to customer
              </Button>
            </Link>
          )}
          {contact.type === "CUSTOMER" && portfolioClient && (
            <Link href={`/app/portfolio?clientId=${portfolioClient.id}`}>
              <Button type="button" variant="secondary">
                View portfolio
              </Button>
            </Link>
          )}
          {limits.canDeleteContacts ? (
            <form
              action={async () => {
                "use server";
                await softDeleteContact(contact.id);
              }}
            >
              <Button type="submit" variant="danger">
                Delete
              </Button>
            </form>
          ) : (
            <Link
              href="/app/settings/billing"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500"
            >
              Delete · Paid
            </Link>
          )}
        </div>
      </div>

      {contact.type === "CUSTOMER" && !portfolioClient && (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-semibold">Add this customer to Portfolio</p>
          <p className="mt-1 text-blue-900/80">
            They’re a client now — fill client details so campaigns and results
            show under Portfolio.
          </p>
          <Link
            href={`/app/contacts/${contact.id}/convert`}
            className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Add client details
          </Link>
        </div>
      )}

      {owed > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            Owes {formatINR(owed)} across {contact.invoices.length} invoice
            {contact.invoices.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1">
            {contact.invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/app/finance/invoices/${inv.id}`}
                  className="font-medium underline"
                >
                  {inv.number}
                </Link>{" "}
                · {formatINR(invoiceBalance(inv))} · {inv.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isInactive && (
        <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="font-semibold text-zinc-900">Win this customer back</p>
          <p className="mt-1 text-sm text-zinc-600">
            Quiet for {quietDays} day{quietDays === 1 ? "" : "s"}. Reach out —
            we&apos;ll log the outreach, schedule a follow-up, and remove them
            from the Win-back list.
          </p>
          <div className="mt-3">
            <WinBackActions
              contactId={contact.id}
              name={contact.name}
              phone={contact.phone}
            />
          </div>
        </div>
      )}

      <form
        action={logOutboundMessage}
        className="sp-card sp-shadow mb-5 space-y-3 p-4"
      >
        <h3 className="text-sm font-semibold text-zinc-900">
          WhatsApp message
        </h3>
        <p className="text-xs text-zinc-500">
          Log only, or send live via Cloud API when configured.
        </p>
        <input type="hidden" name="contactId" value={contact.id} />
        <Textarea name="body" required placeholder="Message…" />
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="sendLive"
            value="true"
            className="h-4 w-4 rounded border-zinc-300"
          />
          Send via WhatsApp API
        </label>
        <Button type="submit" variant="secondary" className="w-full">
          Save / send
        </Button>
      </form>

      {contact.tasks.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Open follow-ups
          </h3>
          <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
            {contact.tasks.map((t) => (
              <li key={t.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-zinc-900">{t.title}</p>
                <p className="text-zinc-500">
                  Due {format(t.dueAt, "dd MMM, h:mm a")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Deals
        </h3>
        {contact.deals.length === 0 ? (
          <p className="sp-card px-4 py-3 text-sm text-zinc-500">No deals yet</p>
        ) : (
          <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
            {contact.deals.map((d) => (
              <li key={d.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-zinc-900">{d.title}</p>
                <p className="text-zinc-500">{d.stage.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Timeline
        </h3>
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {contact.activities.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">No activity yet</li>
          ) : (
            contact.activities.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">{a.body}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {a.type} · {format(a.createdAt, "dd MMM yyyy, h:mm a")}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
