import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioClientForm } from "@/components/portfolio/client-form";
import { Button } from "@/components/ui/button";
import {
  getBusinessPlanLimits,
  hasFeature,
} from "@/lib/plan-limits";

export default async function NewPortfolioClientPage() {
  const ctx = await requireTenant();
  const limits = await getBusinessPlanLimits(ctx.businessId);
  if (!hasFeature(limits, "portfolioWrite")) {
    redirect("/pay");
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add portfolio client"
        actions={
          <Link href="/app/portfolio">
            <Button type="button" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      <PortfolioClientForm />
    </div>
  );
}
