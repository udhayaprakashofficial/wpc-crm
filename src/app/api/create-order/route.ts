import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getRazorpayClient,
  razorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";
import { PLAN_DEFS } from "@/lib/plans";

const PAID_CODES = new Set([
  PLAN_DEFS.paid_monthly.code,
  PLAN_DEFS.paid_yearly.code,
]);

function razorpayErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : "Failed to create order";
  }
  const e = error as {
    message?: string;
    statusCode?: number;
    error?: { description?: string; code?: string; reason?: string };
  };
  const description =
    e.error?.description || e.error?.reason || e.error?.code || e.message;
  if (e.statusCode === 401 || /authentication failed/i.test(description || "")) {
    return "Razorpay authentication failed. Regenerate API keys in Razorpay Dashboard → Account & Settings → API Keys, then update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env and restart the server.";
  }
  return description || "Failed to create order";
}

export async function POST(request: Request) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
        },
        { status: 401 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer JWT businessId; fall back to any active ownership (stale cookies)
    let businessId = session.businessId;
    let role = session.role;

    if (!businessId || role !== "OWNER") {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: session.id,
          isActive: true,
          deletedAt: null,
          ...(role === "OWNER" || !businessId ? {} : { role: "OWNER" }),
        },
        orderBy: { createdAt: "asc" },
      });
      if (membership) {
        businessId = membership.businessId;
        role = membership.role;
      }
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
      currency?: string;
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

    const amount = plan.pricePaise;
    if (amount < 100) {
      return NextResponse.json(
        { error: "Amount must be at least 100 paise" },
        { status: 400 },
      );
    }

    const currency = (body?.currency || "INR").toUpperCase();
    const receipt = `wpc_${businessId.slice(-8)}_${Date.now()}`
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 40);

    const client = getRazorpayClient();
    const order = await client.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        businessId,
        planCode: plan.code,
        userId: session.id,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayKeyId(),
      planCode: plan.code,
      planName: plan.name,
      customerName: session.name,
      customerEmail: session.email,
    });
  } catch (error) {
    console.error("create-order error:", error);
    const message = razorpayErrorMessage(error);
    const status = /authentication failed|not configured/i.test(message)
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
