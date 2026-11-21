"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { activateBusinessPlan } from "@/lib/billing-activate";
import {
  appBaseUrl,
  dodoConfigured,
  envProductIdForPlan,
  getDodoClient,
} from "@/lib/dodo";
/** Downgrade / select Free locally (no payment). */
export async function changePlan(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") throw new Error("Only owners can change plans");

  const planCode = String(formData.get("planCode") || "");
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) throw new Error("Plan not found");

  // Paid plans must go through Dodo checkout
  if (plan.pricePaise > 0) {
    throw new Error("Use Pay with Dodo for paid plans");
  }

  await activateBusinessPlan({
    businessId: ctx.businessId,
    planCode: plan.code,
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
}

/** Start Dodo hosted checkout for a paid plan. */
export async function startDodoCheckout(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") throw new Error("Only owners can upgrade");

  const planCode = String(formData.get("planCode") || "");
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active || plan.pricePaise <= 0) {
    throw new Error("Invalid paid plan");
  }

  if (!dodoConfigured()) {
    throw new Error(
      "Dodo Payments is not configured. Add DODO_PAYMENTS_API_KEY to .env",
    );
  }

  const productId =
    plan.dodoProductId?.trim() || envProductIdForPlan(plan.code);
  if (!productId) {
    throw new Error(
      `Missing Dodo product id for ${plan.code}. Set DODO_PRODUCT_PAID_YEARLY in .env (or Plan.dodoProductId).`,
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: { name: true, email: true, phone: true },
  });

  const client = getDodoClient();
  const returnUrl = `${appBaseUrl()}/app/settings/billing/success`;

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: ctx.user.email,
      name: ctx.user.name || business.name,
      ...(business.phone ? { phone_number: business.phone } : {}),
    },
    return_url: returnUrl,
    metadata: {
      businessId: ctx.businessId,
      planCode: plan.code,
      userId: ctx.user.id,
    },
  });

  // Remember checkout attempt on current subscription row (if any)
  const existing = await prisma.subscription.findFirst({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
  });
  if (existing && session.session_id) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { dodoCheckoutSessionId: session.session_id },
    });
  }

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL");
  }

  redirect(session.checkout_url);
}
