import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  envRazorpayPlanId,
  getRazorpayClient,
  razorpayConfigured,
  razorpayKeyId,
  totalCountForPlan,
} from "@/lib/razorpay";
import { PLAN_DEFS } from "@/lib/plans";

const PAID_CODES: ReadonlySet<string> = new Set([
  PLAN_DEFS.paid_monthly.code,
  PLAN_DEFS.paid_yearly.code,
]);

function razorpayErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error
      ? error.message
      : "Failed to create subscription";
  }
  const e = error as {
    message?: string;
    statusCode?: number;
    error?: { description?: string; code?: string; reason?: string };
  };
  const description =
    e.error?.description || e.error?.reason || e.error?.code || e.message;
  if (
    e.statusCode === 401 ||
    /authentication failed/i.test(description || "")
  ) {
    return "Razorpay authentication failed. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET match the plan ids.";
  }
  return description || "Failed to create subscription";
}

export async function POST(request: Request) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        },
        { status: 401 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let businessId = session.businessId;
    if (!businessId || session.role !== "OWNER") {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: session.id,
          role: "OWNER",
          isActive: true,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });
      businessId = membership?.businessId ?? null;
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
        { error: "Only owners can start checkout" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      planCode?: string;
    } | null;
    const planCode = body?.planCode?.trim();
    if (!planCode || !PAID_CODES.has(planCode)) {
      return NextResponse.json(
        { error: "Invalid plan. Use paid_monthly or paid_yearly." },
        { status: 400 },
      );
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan || !plan.active || plan.pricePaise <= 0) {
      return NextResponse.json({ error: "Plan unavailable" }, { status: 400 });
    }

    const rzPlanId =
      plan.razorpayPlanId?.trim() || envRazorpayPlanId(plan.code);
    if (!rzPlanId) {
      return NextResponse.json(
        {
          error: `Missing Razorpay plan id for ${plan.code}`,
          code: "missing_plan_id",
        },
        { status: 400 },
      );
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true },
    });

    const client = getRazorpayClient();
    const subscription = await client.subscriptions.create({
      plan_id: rzPlanId,
      total_count: totalCountForPlan(plan.intervalMonths),
      quantity: 1,
      customer_notify: true,
      notes: {
        businessId,
        planCode: plan.code,
        userId: session.id,
      },
    });

    const existing = await prisma.subscription.findFirst({
      where: { businessId },
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
          businessId,
          planId: plan.id,
          status: "PAST_DUE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          razorpaySubscriptionId: subscription.id,
        },
      });
    }

    return NextResponse.json({
      keyId: razorpayKeyId(),
      subscriptionId: subscription.id,
      planCode: plan.code,
      planName: plan.name,
      businessName: business.name,
      customerName: session.name || business.name,
      customerEmail: session.email,
    });
  } catch (error) {
    console.error("create-subscription error:", error);
    return NextResponse.json(
      { error: razorpayErrorMessage(error) },
      { status: 500 },
    );
  }
}
