"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { activateBusinessPlan } from "@/lib/billing-activate";
import {
  getRazorpayClient,
  razorpayConfigured,
  razorpayKeyId,
  resolveRazorpayPlanId,
  totalCountForPlan,
  verifySubscriptionPaymentSignature,
} from "@/lib/razorpay";

export type RazorpayCheckoutPayload = {
  keyId: string;
  subscriptionId: string;
  planCode: string;
  planName: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
};

/** Create a Razorpay subscription and return checkout payload for the client. */
export async function createRazorpaySubscription(
  planCode: string,
): Promise<RazorpayCheckoutPayload> {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") throw new Error("Only owners can subscribe");

  if (!razorpayConfigured()) {
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active || plan.pricePaise <= 0) {
    throw new Error("Invalid paid plan");
  }

  const rzPlanId = resolveRazorpayPlanId(plan.code, plan.razorpayPlanId);
  if (!rzPlanId) {
    throw new Error(
      `Missing Razorpay plan id for ${plan.code}. Set RAZORPAY_PLAN_MONTHLY / RAZORPAY_PLAN_YEARLY.`,
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: { name: true, email: true },
  });

  const client = getRazorpayClient();
  let subscription: { id: string };
  try {
    subscription = await client.subscriptions.create({
      plan_id: rzPlanId,
      total_count: totalCountForPlan(plan.intervalMonths),
      quantity: 1,
      customer_notify: true,
      notes: {
        businessId: ctx.businessId,
        planCode: plan.code,
        userId: ctx.user.id,
      },
    });
  } catch (e) {
    const description =
      e && typeof e === "object" && "error" in e
        ? String(
            (e as { error?: { description?: string } }).error?.description ||
              "",
          )
        : e instanceof Error
          ? e.message
          : "Could not create subscription";
    throw new Error(
      description ||
        "Could not create Razorpay subscription. Check plan_id matches your API keys.",
    );
  }

  const existing = await prisma.subscription.findFirst({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { razorpaySubscriptionId: subscription.id },
    });
  } else {
    await prisma.subscription.create({
      data: {
        businessId: ctx.businessId,
        planId: plan.id,
        status: "PAST_DUE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        razorpaySubscriptionId: subscription.id,
      },
    });
  }

  return {
    keyId: razorpayKeyId(),
    subscriptionId: subscription.id,
    planCode: plan.code,
    planName: plan.name,
    businessName: business.name,
    customerName: ctx.user.name || business.name,
    customerEmail: ctx.user.email,
  };
}

/** Verify Checkout signature and activate the plan. */
export async function verifyRazorpaySubscription(input: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  planCode: string;
}) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") throw new Error("Only owners can subscribe");

  const ok = verifySubscriptionPaymentSignature({
    paymentId: input.razorpay_payment_id,
    subscriptionId: input.razorpay_subscription_id,
    signature: input.razorpay_signature,
  });
  if (!ok) throw new Error("Payment signature verification failed");

  await activateBusinessPlan({
    businessId: ctx.businessId,
    planCode: input.planCode,
    razorpaySubscriptionId: input.razorpay_subscription_id,
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/pay");
  revalidatePath("/app");
  return { ok: true as const };
}

/** Cancel at period end (Cancel anytime). */
export async function cancelSubscriptionAtPeriodEnd() {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") throw new Error("Only owners can cancel");

  const sub = await prisma.subscription.findFirst({
    where: { businessId: ctx.businessId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) throw new Error("No active subscription");

  if (sub.razorpaySubscriptionId && razorpayConfigured()) {
    const client = getRazorpayClient();
    await client.subscriptions.cancel(sub.razorpaySubscriptionId, true);
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/pay");
  revalidatePath("/app");
}
