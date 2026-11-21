import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignImportForm } from "@/components/portfolio/campaign-import-form";
import { Button } from "@/components/ui/button";
import {
  getBusinessPlanLimits,
  hasFeature,
} from "@/lib/plan-limits";

export default async function PortfolioImportPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const ctx = await requireTenant();
  const limits = await getBusinessPlanLimits(ctx.businessId);
  if (!hasFeature(limits, "portfolioImport")) {
    redirect("/pay");
  }

  const clients = await prisma.portfolioClient.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Import campaigns"
        actions={
          <Link href="/app/portfolio">
            <Button type="button" variant="secondary">
              Back to portfolio
            </Button>
          </Link>
        }
      />
      <CampaignImportForm
        clients={clients}
        defaultClientId={clientId}
      />
    </div>
  );
}
