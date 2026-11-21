import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { LeadFormBuilder } from "@/components/settings/lead-form-builder";
import { parseLeadFormConfig } from "@/lib/lead-form";

export default async function LeadFormSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireTenant();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: {
      name: true,
      publicFormSlug: true,
      leadFormEnabled: true,
      leadFormTitle: true,
      leadFormSubtitle: true,
      leadFormConfig: true,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const slug = business.publicFormSlug || "your-business";
  const formUrl = `${base}/f/${slug}`;
  const config = parseLeadFormConfig(business.leadFormConfig);

  return (
    <div>
      <PageHeader
        title="Lead capture form"
        actions={
          <Link
            href="/app/settings"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Settings
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Build the form your way. Anyone who submits is saved as a lead on your
        Contacts page.
      </p>

      {params.saved ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Lead form saved. Share your link to start capturing leads.
        </p>
      ) : null}

      <LeadFormBuilder
        businessName={business.name}
        initial={{
          enabled: business.leadFormEnabled,
          title: business.leadFormTitle || "",
          subtitle: business.leadFormSubtitle || "",
          publicFormSlug: business.publicFormSlug || "",
          formUrl,
          fields: config.fields,
        }}
      />
    </div>
  );
}
