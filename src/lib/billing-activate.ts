import { prisma } from "@/lib/prisma";

/** Activate / switch a business subscription after a successful Razorpay payment. */
export async function activateBusinessPlan(input: {
  businessId: string;
  planCode: string;
  razorpaySubscriptionId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) {
  const plan = await prisma.plan.findUnique({
    where: { code: input.planCode },
  });
  if (!plan || (!plan.active && plan.pricePaise > 0)) {
    // Allow activating known paid codes even if briefly inactive in edge cases
    if (!plan) throw new Error(`Plan not found: ${input.planCode}`);
  }
  if (plan.pricePaise <= 0) {
    throw new Error("Free plans are no longer available");
  }

  const periodStart = input.periodStart ?? new Date();
  let periodEnd = input.periodEnd ?? null;
  if (!periodEnd) {
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + plan.intervalMonths);
  }

  const existing = await prisma.subscription.findFirst({
    where: { businessId: input.businessId },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    planId: plan.id,
    status: "ACTIVE" as const,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    ...(input.razorpaySubscriptionId != null
      ? { razorpaySubscriptionId: input.razorpaySubscriptionId }
      : {}),
  };

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscription.create({
    data: {
      businessId: input.businessId,
      ...data,
    },
  });
}
