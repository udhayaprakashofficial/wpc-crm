import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, refreshSessionForUser } from "@/lib/auth";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { PLAN_DEFS } from "@/lib/plans";
import { provisionDefaultWorkspace } from "@/lib/provision-workspace";
import { PaymentShell } from "@/components/layout/PaymentShell";
import { BillingPlans } from "@/components/billing/billing-plans";

export const instant = false;

export default async function PayPage() {
  const session = await getSession();
  if (!session) redirect("/signin?next=/pay");

  let businessId = session.businessId;
  let role = session.role;

  if (!businessId) {
    const workspace = await provisionDefaultWorkspace({
      userId: session.id,
      ownerName: session.name,
    });
    businessId = workspace.businessId;
    role = "OWNER";
    await refreshSessionForUser(session.id);
  }

  const [business, limits, monthly, yearly, contactCount] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true },
    }),
    getBusinessPlanLimits(businessId),
    prisma.plan.findUnique({ where: { code: PLAN_DEFS.paid_monthly.code } }),
    prisma.plan.findUnique({ where: { code: PLAN_DEFS.paid_yearly.code } }),
    prisma.contact.count({
      where: { businessId, deletedAt: null },
    }),
  ]);

  if (limits.isPaid) redirect("/app");

  return (
    <PaymentShell businessName={business.name}>
      <BillingPlans
        limits={limits}
        isOwner={role === "OWNER"}
        contactCount={contactCount}
        monthlyActive={!!monthly?.active}
        yearlyActive={!!yearly?.active}
        title="Complete payment to continue"
        subtitle="Pick Monthly or Yearly — then you’ll land in your dashboard."
      />
    </PaymentShell>
  );
}
