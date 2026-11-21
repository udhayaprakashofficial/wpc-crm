import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { PLAN_DEFS } from "@/lib/plans";
import { BillingPlans } from "@/components/billing/billing-plans";

export default async function BillingPage() {
  const ctx = await requireTenant();
  const [limits, monthly, yearly, contactCount] = await Promise.all([
    getBusinessPlanLimits(ctx.businessId),
    prisma.plan.findUnique({ where: { code: PLAN_DEFS.paid_monthly.code } }),
    prisma.plan.findUnique({ where: { code: PLAN_DEFS.paid_yearly.code } }),
    prisma.contact.count({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
  ]);

  return (
    <BillingPlans
      limits={limits}
      isOwner={ctx.role === "OWNER"}
      contactCount={contactCount}
      monthlyActive={!!monthly?.active}
      yearlyActive={!!yearly?.active}
    />
  );
}
