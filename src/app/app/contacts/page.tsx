import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { ArrowUpRight, Bolt, Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  assigneeFilter,
  contactVisibilityFilter,
  requireTenant,
} from "@/lib/tenant";
import type { LeadSource, Prisma } from "@/generated/prisma/client";
import {
  daysInactive,
  inactiveCustomerWhere,
  WINBACK_INACTIVE_DAYS,
} from "@/lib/winback";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PromoBanner } from "@/components/ui/promo-banner";
import { PillTabs } from "@/components/ui/pill-tabs";
import { ContactsToolbar } from "@/components/contacts/contacts-toolbar";
import { WinBackActions } from "@/components/contacts/winback-actions";
import { Button } from "@/components/ui/button";

async function SegmentsView() {
  const ctx = await requireTenant();
  const base = {
    businessId: ctx.businessId,
    deletedAt: null,
    ...contactVisibilityFilter(ctx),
  };

  const [all, customers, leads, inactive] = await Promise.all([
    prisma.contact.count({ where: base }),
    prisma.contact.count({ where: { ...base, type: "CUSTOMER" } }),
    prisma.contact.count({ where: { ...base, type: "LEAD" } }),
    prisma.contact.count({
      where: inactiveCustomerWhere(ctx.businessId, assigneeFilter(ctx)),
    }),
  ]);

  const newest = await prisma.contact.findFirst({
    where: base,
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true, createdAt: true },
  });

  const segments = [
    {
      name: "All contacts",
      contacts: all,
      href: "/app/contacts?tab=contacts",
      tag: "Dynamic",
    },
    {
      name: "Customers",
      contacts: customers,
      href: "/app/contacts?tab=contacts&segment=customers",
      tag: "Dynamic",
    },
    {
      name: "Open leads",
      contacts: leads,
      href: "/app/contacts?tab=contacts&segment=leads",
      tag: "Dynamic",
    },
    {
      name: `Inactive ${WINBACK_INACTIVE_DAYS}+ days`,
      contacts: inactive,
      href: "/app/contacts?tab=contacts&segment=inactive",
      tag: "Win-back",
    },
  ];

  return (
    <div className="sp-card sp-shadow overflow-hidden">
      <div className="hidden grid-cols-[1.4fr_0.6fr_0.7fr_1.1fr_1.1fr_48px] gap-3 border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid">
        <span>Segments</span>
        <span>Contacts</span>
        <span>Campaigns</span>
        <span>Last updated</span>
        <span>Created on</span>
        <span />
      </div>
      <ul>
        {segments.map((seg) => (
          <li
            key={seg.name}
            className="grid grid-cols-1 gap-2 border-b border-zinc-100 px-5 py-4 last:border-0 md:grid-cols-[1.4fr_0.6fr_0.7fr_1.1fr_1.1fr_48px] md:items-center md:gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Bolt className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-zinc-900">{seg.name}</p>
                <span className="mt-1 inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                  {seg.tag}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-700 md:text-center">{seg.contacts}</p>
            <p className="text-sm text-zinc-500 md:text-center">0</p>
            <p className="text-sm text-zinc-500">
              {newest?.updatedAt
                ? format(newest.updatedAt, "hh:mm a, dd MMM yyyy")
                : "—"}
            </p>
            <p className="text-sm text-zinc-500">
              {newest?.createdAt
                ? format(newest.createdAt, "hh:mm a, dd MMM yyyy")
                : "—"}
            </p>
            <div className="flex justify-end">
              <Link
                href={seg.href}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function ContactsList({
  q,
  segment,
  type,
  source,
  sort,
}: {
  q?: string;
  segment?: string;
  type?: string;
  source?: string;
  sort?: string;
}) {
  const ctx = await requireTenant();
  // Leads are shared with the whole team; customers stay assignee-scoped for staff.
  const visibility = contactVisibilityFilter(ctx);
  const ownCustomers = assigneeFilter(ctx);

  const searchWhere: Prisma.ContactWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const sourceFilter: Prisma.ContactWhereInput =
    source &&
    [
      "WALK_IN",
      "INSTAGRAM",
      "FACEBOOK_AD",
      "GOOGLE",
      "WEBSITE",
      "REFERRAL",
      "WHATSAPP",
      "OTHER",
    ].includes(source)
      ? { source: source as LeadSource }
      : {};

  const orderBy: Prisma.ContactOrderByWithRelationInput =
    sort === "name_asc"
      ? { name: "asc" }
      : sort === "name_desc"
        ? { name: "desc" }
        : sort === "created_desc"
          ? { createdAt: "desc" }
          : sort === "activity_desc" || segment === "inactive"
            ? { lastActivityAt: "asc" }
            : { updatedAt: "desc" };

  let where: Prisma.ContactWhereInput;
  if (segment === "inactive") {
    where = inactiveCustomerWhere(ctx.businessId, {
      ...ownCustomers,
      ...sourceFilter,
      ...(searchWhere ?? {}),
    });
  } else {
    const typeWhere =
      segment === "customers"
        ? { type: "CUSTOMER" as const }
        : segment === "leads"
          ? { type: "LEAD" as const }
          : type === "LEAD" || type === "CUSTOMER"
            ? { type: type as "LEAD" | "CUSTOMER" }
            : {};
    where = {
      businessId: ctx.businessId,
      deletedAt: null,
      ...visibility,
      ...typeWhere,
      ...sourceFilter,
      ...(searchWhere ?? {}),
    };
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy,
    take: 100,
    include: { assignedTo: { select: { name: true } } },
  });

  if (contacts.length === 0) {
    return (
      <EmptyState
        title={
          segment === "inactive"
            ? "No win-back customers right now"
            : "No contacts yet"
        }
        description={
          segment === "inactive"
            ? `No customers have been quiet for ${WINBACK_INACTIVE_DAYS}+ days. Nice work staying in touch.`
            : "Add a lead with name and phone. Your list lives here — not on personal phones."
        }
        action={
          segment === "inactive" ? undefined : (
            <div className="flex gap-2">
              <Link href="/app/contacts/new">
                <Button>+ Lead</Button>
              </Link>
              <Link href="/app/contacts/import">
                <Button variant="secondary">Import</Button>
              </Link>
            </div>
          )
        }
      />
    );
  }

  if (segment === "inactive") {
    return (
      <div className="sp-card sp-shadow overflow-hidden">
        <div className="border-b border-violet-100 bg-violet-50 px-5 py-3 text-sm text-violet-950">
          <p className="font-semibold">Win-back list</p>
          <p className="mt-0.5 text-violet-900/80">
            Customers quiet for {WINBACK_INACTIVE_DAYS}+ days. Reach out, then
            we log it and schedule a follow-up — they leave this list once
            contacted.
          </p>
        </div>
        <ul>
          {contacts.map((c) => {
            const days = daysInactive(c);
            return (
              <li
                key={c.id}
                className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/app/contacts/${c.id}`} className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{c.name}</p>
                  <p className="text-sm text-zinc-500">
                    {c.phone}
                    {c.assignedTo?.name ? ` · ${c.assignedTo.name}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-medium text-violet-700">
                    Quiet for {days} day{days === 1 ? "" : "s"}
                    {c.lastActivityAt
                      ? ` · last ${format(c.lastActivityAt, "dd MMM yyyy")}`
                      : " · no activity logged yet"}
                  </p>
                </Link>
                <WinBackActions
                  contactId={c.id}
                  name={c.name}
                  phone={c.phone}
                  compact
                />
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="sp-card sp-shadow overflow-hidden">
      <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.7fr_48px] gap-3 border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid">
        <span>Contact</span>
        <span>Phone / Email</span>
        <span>Assignee</span>
        <span>Type</span>
        <span />
      </div>
      <ul>
        {contacts.map((c) => (
          <li key={c.id} className="border-b border-zinc-100 last:border-0">
            <Link
              href={`/app/contacts/${c.id}`}
              className="grid grid-cols-1 gap-1 px-5 py-4 hover:bg-zinc-50 md:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_48px] md:items-center md:gap-3"
            >
              <div>
                <p className="font-semibold text-zinc-900">{c.name}</p>
                {c.lastActivityAt ? (
                  <p className="text-xs text-zinc-400">
                    Last active {format(c.lastActivityAt, "dd MMM yyyy")}
                  </p>
                ) : null}
              </div>
              <div className="text-sm text-zinc-500">
                <p>{c.phone}</p>
                {c.email ? <p className="truncate">{c.email}</p> : null}
              </div>
              <p className="text-sm text-zinc-500">
                {c.assignedTo?.name ?? "Unassigned"}
              </p>
              <span className="inline-flex w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {c.type === "CUSTOMER" ? "Customer" : "Lead"}
              </span>
              <span className="hidden justify-end md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    segment?: string;
    type?: string;
    source?: string;
    sort?: string;
  }>;
}) {
  const { q, tab, segment, type, source, sort } = await searchParams;
  const activeTab =
    tab === "contacts" || segment || type || source || sort || q
      ? "contacts"
      : "segments";

  const ctx = await requireTenant();
  const total = await prisma.contact.count({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...contactVisibilityFilter(ctx),
    },
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        actions={
          <Link href="/app/contacts/new">
            <Button>+ Lead</Button>
          </Link>
        }
      />

      <PromoBanner
        title="Your customer list belongs to the business"
        description="Staff phones lose numbers when people leave. Keep every lead and customer here."
        href="/app/contacts/import"
        cta="Import CSV"
        icons={
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-blue-600">
            <Shield className="h-5 w-5" />
          </div>
        }
      />

      <PillTabs
        items={[
          {
            href: "/app/contacts",
            label: "Segments (4)",
            active: activeTab === "segments",
          },
          {
            href: "/app/contacts?tab=contacts",
            label: `All Contacts (${total})`,
            active: activeTab === "contacts" && !segment,
          },
          {
            href: "/app/contacts?tab=contacts&segment=inactive",
            label: "Win-back",
            active: segment === "inactive",
          },
        ]}
      />

      {activeTab === "contacts" ? (
        <Suspense fallback={<div className="mb-4 h-10 animate-pulse rounded-xl bg-white" />}>
          <ContactsToolbar />
        </Suspense>
      ) : null}

      <Suspense
        fallback={<div className="h-48 animate-pulse rounded-2xl bg-white" />}
      >
        {activeTab === "segments" ? (
          <SegmentsView />
        ) : (
          <ContactsList
            q={q}
            segment={segment}
            type={type}
            source={source}
            sort={sort}
          />
        )}
      </Suspense>
    </div>
  );
}
