import { Webhook } from "standardwebhooks";
import { prisma } from "@/lib/prisma";
import { activateBusinessPlan } from "@/lib/billing-activate";
import { envProductIdForPlan } from "@/lib/dodo";
import { PLAN_DEFS } from "@/lib/plans";
import { revalidatePath } from "next/cache";

type DodoEvent = {
  type?: string;
  data?: Record<string, unknown>;
};

function asString(v: unknown) {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function metadataOf(data: Record<string, unknown> | undefined) {
  const meta = data?.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {} as Record<string, unknown>;
  }
  return meta as Record<string, unknown>;
}

async function planCodeFromProductId(productId: string) {
  if (!productId) return null;
  const byDb = await prisma.plan.findFirst({
    where: { dodoProductId: productId, active: true },
    select: { code: true },
  });
  if (byDb) return byDb.code;

  if (productId === process.env.DODO_PRODUCT_PAID_YEARLY?.trim()) {
    return PLAN_DEFS.paid_yearly.code;
  }
  if (productId === process.env.DODO_PRODUCT_PAID_MONTHLY?.trim()) {
    return PLAN_DEFS.paid_monthly.code;
  }
  if (envProductIdForPlan(PLAN_DEFS.paid_yearly.code) === productId) {
    return PLAN_DEFS.paid_yearly.code;
  }
  return null;
}

function productIdFromPayload(data: Record<string, unknown>) {
  const direct = asString(data.product_id);
  if (direct) return direct;
  const cart = data.product_cart;
  if (Array.isArray(cart) && cart[0] && typeof cart[0] === "object") {
    return asString((cart[0] as Record<string, unknown>).product_id);
  }
  return "";
}

async function handleActivation(data: Record<string, unknown>) {
  const meta = metadataOf(data);
  const businessId =
    asString(meta.businessId) || asString(meta.business_id);
  let planCode = asString(meta.planCode) || asString(meta.plan_code);

  const productId = productIdFromPayload(data);
  if (!planCode && productId) {
    planCode = (await planCodeFromProductId(productId)) || "";
  }

  if (!businessId || !planCode) {
    console.warn("[dodo webhook] missing businessId/planCode", {
      businessId,
      planCode,
      productId,
      meta,
    });
    return;
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: { id: true },
  });
  if (!business) {
    console.warn("[dodo webhook] unknown business", businessId);
    return;
  }

  const periodStart = data.current_period_start
    ? new Date(asString(data.current_period_start))
    : data.created_at
      ? new Date(asString(data.created_at))
      : null;
  const periodEnd = data.current_period_end
    ? new Date(asString(data.current_period_end))
    : data.next_billing_date
      ? new Date(asString(data.next_billing_date))
      : null;

  await activateBusinessPlan({
    businessId,
    planCode,
    dodoSubscriptionId:
      asString(data.subscription_id) || asString(data.subscriptionId) || null,
    dodoCustomerId:
      asString(data.customer_id) || asString(data.customerId) || null,
    periodStart:
      periodStart && !Number.isNaN(periodStart.getTime()) ? periodStart : null,
    periodEnd:
      periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
}

async function handleCancelledOrPastDue(
  data: Record<string, unknown>,
  status: "CANCELLED" | "PAST_DUE",
) {
  const subscriptionId = asString(data.subscription_id);
  if (!subscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { dodoSubscriptionId: subscriptionId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status },
  });
  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
}

export async function POST(request: Request) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const rawBody = await request.text();

  if (secret) {
    try {
      const webhook = new Webhook(secret);
      await webhook.verify(rawBody, {
        "webhook-id": request.headers.get("webhook-id") ?? "",
        "webhook-signature": request.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      });
    } catch (e) {
      console.error("[dodo webhook] signature failed", e);
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    console.warn(
      "[dodo webhook] DODO_PAYMENTS_WEBHOOK_KEY not set — skipping verify (dev only)",
    );
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody) as DodoEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type = asString(event.type);
  const data =
    event.data && typeof event.data === "object"
      ? event.data
      : ({} as Record<string, unknown>);

  try {
    switch (type) {
      case "subscription.active":
      case "subscription.renewed":
      case "payment.succeeded":
        await handleActivation(data);
        break;
      case "subscription.cancelled":
      case "subscription.expired":
        await handleCancelledOrPastDue(data, "CANCELLED");
        break;
      case "subscription.past_due":
      case "subscription.on_hold":
        await handleCancelledOrPastDue(data, "PAST_DUE");
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("[dodo webhook] handler error", type, e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
