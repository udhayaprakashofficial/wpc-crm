import { prisma } from "@/lib/prisma";
import { activateBusinessPlan } from "@/lib/billing-activate";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  if (process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    console.warn(
      "[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verify (dev only)",
    );
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: Record<string, unknown> };
      payment?: { entity?: Record<string, unknown> };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type = event.event || "";
  const subEntity = event.payload?.subscription?.entity;
  if (!subEntity) {
    return Response.json({ ok: true, skipped: true });
  }

  const subscriptionId = String(subEntity.id || "");
  const notes = (subEntity.notes || {}) as Record<string, string>;
  const businessId = notes.businessId || "";
  const planCode = notes.planCode || "";

  try {
    if (
      type === "subscription.activated" ||
      type === "subscription.charged" ||
      type === "subscription.authenticated"
    ) {
      if (businessId && planCode) {
        const start = subEntity.current_start
          ? new Date(Number(subEntity.current_start) * 1000)
          : new Date();
        const end = subEntity.current_end
          ? new Date(Number(subEntity.current_end) * 1000)
          : null;
        await activateBusinessPlan({
          businessId,
          planCode,
          razorpaySubscriptionId: subscriptionId,
          periodStart: start,
          periodEnd: end && !Number.isNaN(end.getTime()) ? end : null,
        });
        revalidatePath("/app/settings/billing");
        revalidatePath("/pay");
        revalidatePath("/app");
      }
    }

    if (type === "subscription.cancelled" || type === "subscription.completed") {
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: subscriptionId },
          data: {
            status: "CANCELLED",
            cancelAtPeriodEnd: false,
          },
        });
        revalidatePath("/app/settings/billing");
        revalidatePath("/pay");
        revalidatePath("/app");
      }
    }

    if (type === "subscription.halted" || type === "subscription.pending") {
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" },
        });
      }
    }
  } catch (e) {
    console.error("[razorpay webhook] handler error", type, e);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ ok: true });
}
