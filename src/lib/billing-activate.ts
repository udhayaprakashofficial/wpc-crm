import { prisma } from "@/lib/prisma";

/** Activate / switch a business subscription after a successful Dodo payment. */
export async function activateBusinessPlan(input: {
  businessId: string;
  planCode: string;
  dodoSubscriptionId?: string | null;
  dodoCustomerId?: string | null;
  dodoCheckoutSessionId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) {
  const plan = await prisma.plan.findUnique({
    where: { code: input.planCode },
  });
  if (!plan || !plan.active) {
    throw new Error(`Plan not found: ${input.planCode}`);
  }

  const periodStart = input.periodStart ?? new Date();
  let periodEnd = input.periodEnd ?? null;
  if (!periodEnd) {
    periodEnd = new Date(periodStart);
    if (plan.pricePaise === 0) {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + plan.intervalMonths);
    }
  }

  const existing = await prisma.subscription.findFirst({
    where: { businessId: input.businessId },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    planId: plan.id,
    status: plan.pricePaise === 0 ? ("TRIALING" as const) : ("ACTIVE" as const),
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    ...(input.dodoSubscriptionId != null
      ? { dodoSubscriptionId: input.dodoSubscriptionId }
      : {}),
    ...(input.dodoCustomerId != null
      ? { dodoCustomerId: input.dodoCustomerId }
      : {}),
    ...(input.dodoCheckoutSessionId != null
      ? { dodoCheckoutSessionId: input.dodoCheckoutSessionId }
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
