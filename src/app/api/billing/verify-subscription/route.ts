import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { activateBusinessPlan } from "@/lib/billing-activate";
import {
  razorpayConfigured,
  verifySubscriptionPaymentSignature,
} from "@/lib/razorpay";
import { PLAN_DEFS } from "@/lib/plans";

const PAID_CODES: ReadonlySet<string> = new Set([
  PLAN_DEFS.paid_monthly.code,
  PLAN_DEFS.paid_yearly.code,
]);

export async function POST(request: Request) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json(
        { error: "Razorpay is not configured" },
        { status: 401 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let businessId = session.businessId;
    if (!businessId) {
      const owned = await prisma.membership.findFirst({
        where: {
          userId: session.id,
          role: "OWNER",
          isActive: true,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });
      businessId = owned?.businessId ?? null;
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "No workspace found. Sign out and sign in again." },
        { status: 401 },
      );
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.id,
        businessId,
        isActive: true,
        deletedAt: null,
      },
    });
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can verify payment" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      razorpay_payment_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
      planCode?: string;
    } | null;

    const paymentId = body?.razorpay_payment_id?.trim();
    const subscriptionId = body?.razorpay_subscription_id?.trim();
    const signature = body?.razorpay_signature?.trim();
    const planCode = body?.planCode?.trim();

    if (!paymentId || !subscriptionId || !signature) {
      return NextResponse.json(
        {
          error:
            "Missing razorpay_payment_id, razorpay_subscription_id, or razorpay_signature",
        },
        { status: 400 },
      );
    }

    if (!planCode || !PAID_CODES.has(planCode)) {
      return NextResponse.json({ error: "Invalid planCode" }, { status: 400 });
    }

    const ok = verifySubscriptionPaymentSignature({
      paymentId,
      subscriptionId,
      signature,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Payment signature verification failed", paid: false },
        { status: 400 },
      );
    }

    await activateBusinessPlan({
      businessId,
      planCode,
      razorpaySubscriptionId: subscriptionId,
    });

    revalidatePath("/pay");
    revalidatePath("/app");
    revalidatePath("/app/settings/billing");

    return NextResponse.json({
      success: true,
      paid: true,
      planCode,
      subscription_id: subscriptionId,
      payment_id: paymentId,
    });
  } catch (error) {
    console.error("verify-subscription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
        paid: false,
      },
      { status: 500 },
    );
  }
}
