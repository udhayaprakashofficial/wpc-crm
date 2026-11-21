import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioClientForm } from "@/components/portfolio/client-form";
import { Button } from "@/components/ui/button";
import { softDeletePortfolioClient } from "@/app/actions/portfolio";
import {
  getBusinessPlanLimits,
  hasFeature,
} from "@/lib/plan-limits";

export default async function EditPortfolioClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const limits = await getBusinessPlanLimits(ctx.businessId);
  if (!hasFeature(limits, "portfolioWrite")) {
    redirect("/pay");
  }
  const client = await prisma.portfolioClient.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
  });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Edit client"
        actions={
          <Link href={`/app/portfolio?clientId=${client.id}`}>
            <Button type="button" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      <PortfolioClientForm initial={client} />
      {(ctx.role === "OWNER" || ctx.role === "MANAGER") && (
        <form
          action={async () => {
            "use server";
            await softDeletePortfolioClient(client.id);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="danger" className="w-full">
            Remove client
          </Button>
        </form>
      )}
    </div>
  );
}
