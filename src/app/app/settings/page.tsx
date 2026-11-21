import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { LOCALES } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SettingsPage() {
  const ctx = await requireTenant();
  const [business, limits] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: ctx.businessId } }),
    getBusinessPlanLimits(ctx.businessId),
  ]);

  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/f/${business.publicFormSlug}`;

  const links = [
    { href: "/app/settings/brand", label: "Brand kit (logo & details)" },
    {
      href: "/app/settings/lead-form",
      label: "Lead capture form (customize & share)",
    },
    { href: "/app/settings/team", label: "Team members (CRM logins)" },
    { href: "/app/staff", label: "Staff & salary" },
    { href: "/app/supplies", label: "Supplies (import / export)" },
    { href: "/app/settings/whatsapp", label: "WhatsApp API" },
    { href: "/app/settings/billing", label: "Billing & plans" },
    {
      href: "/app/settings/automations",
      label: "Automations (WhatsApp — coming soon)",
    },
  ];

  return (
    <div>
      <PageHeader title="Settings" />

      <section className="sp-card sp-shadow mb-4 p-5">
        <div className="flex items-start gap-4">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="h-14 w-14 rounded-xl object-contain ring-1 ring-zinc-200"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              {business.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-900">Business</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <Row label="Name" value={business.name} />
              <Row label="Industry" value={business.industry} />
              <Row label="FY start" value={String(business.fyStartMonth)} />
              <Row label="GST" value={business.gstNumber || "—"} />
              <Row label="Plan" value={limits.planName} />
            </dl>
            <Link
              href="/app/settings/brand"
              className="mt-3 inline-block text-sm font-semibold text-blue-600"
            >
              Edit brand kit →
            </Link>
          </div>
        </div>
      </section>

      <section className="sp-card sp-shadow mb-4 p-5">
        <h3 className="font-semibold text-zinc-900">Lead capture form</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Share with anyone — submissions land on your Leads page as{" "}
          <span className="font-medium text-zinc-700">{business.name}</span>.
        </p>
        <p className="mt-2 break-all text-sm font-medium text-blue-600">
          {formUrl}
        </p>
        <Link
          href="/app/settings/lead-form"
          className="mt-3 inline-block text-sm font-semibold text-blue-600"
        >
          Customize questions & fields →
        </Link>
      </section>

      <section className="sp-card sp-shadow mb-4 p-5">
        <h3 className="font-semibold text-zinc-900">Language (i18n ready)</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Dictionary keys exist for {LOCALES.map((l) => l.label).join(", ")}. UI
          locale switch coming next.
        </p>
      </section>

      <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block px-5 py-4 font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>

      <section className="sp-card sp-shadow mt-4 flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="font-semibold text-zinc-900">Account</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as {ctx.user.email}
          </p>
        </div>
        <SignOutButton variant="settings" />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
