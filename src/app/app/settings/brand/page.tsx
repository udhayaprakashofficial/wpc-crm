import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { saveBrandKit } from "@/app/actions/brand";
import { BusinessLogo } from "@/components/BusinessLogo";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function BrandKitPage() {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return (
      <div>
        <PageHeader title="Brand kit" />
        <p className="text-sm text-zinc-500">Only owners/managers can edit branding.</p>
      </div>
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Brand kit"
        actions={
          <Link href="/app/settings">
            <Button variant="secondary">Settings</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Logo and business details appear on invoices, payslips, and the app
        sidebar.
      </p>

      <div className="sp-card sp-shadow mb-5 flex items-center gap-4 p-5">
        <BusinessLogo src={business.logoUrl} name={business.name} size="xl" />
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{business.name}</p>
          <p className="text-sm text-zinc-500">
            {business.logoUrl ? "Logo ready for invoices" : "No logo yet — upload below"}
          </p>
        </div>
      </div>

      <form action={saveBrandKit} className="sp-card sp-shadow space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Business name
          </label>
          <Input name="name" required defaultValue={business.name} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Upload logo
          </label>
          <Input
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
          />
          <p className="mt-1 text-xs text-zinc-400">PNG, JPG, WEBP or SVG · max 2MB</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Or logo URL
          </label>
          <Input
            name="logoUrl"
            type="url"
            placeholder="https://…"
            defaultValue={
              business.logoUrl?.startsWith("/uploads/")
                ? ""
                : (business.logoUrl ?? "")
            }
          />
        </div>

        {business.logoUrl && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="removeLogo"
              className="h-4 w-4 rounded border-zinc-300"
            />
            Remove current logo
          </label>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Phone
          </label>
          <Input name="phone" defaultValue={business.phone ?? ""} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <Input name="email" type="email" defaultValue={business.email ?? ""} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            GSTIN
          </label>
          <Input name="gstNumber" defaultValue={business.gstNumber ?? ""} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Address
          </label>
          <Textarea
            name="address"
            rows={3}
            defaultValue={business.address ?? ""}
            placeholder="Shown on invoices"
          />
        </div>

        <Button type="submit" className="w-full">
          Save brand kit
        </Button>
      </form>
    </div>
  );
}
