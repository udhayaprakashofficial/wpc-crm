import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { applySessionCookie } from "@/lib/session-cookie";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { provisionDefaultWorkspace } from "@/lib/provision-workspace";
import { signinSchema } from "@/lib/validations";

function errorText(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? error.cause.message
        : typeof error.cause === "string"
          ? error.cause
          : "";
    const meta = (error as unknown as { meta?: { message?: string } }).meta;
    const nested = typeof meta?.message === "string" ? meta.message : "";
    return [error.message, cause, nested].filter(Boolean).join(" | ");
  }
  return String(error);
}

function configErrorMessage(error: unknown): string | null {
  const msg = errorText(error);
  if (/AUTH_SECRET is not set/i.test(msg)) {
    return "Server misconfigured (AUTH_SECRET). Add it in your host env and redeploy.";
  }
  if (/DATABASE_URL is not set/i.test(msg)) {
    return "Server misconfigured (DATABASE_URL). Add it in your host env and redeploy.";
  }
  if (
    /password authentication failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH|EHOSTUNREACH|connection.*refused|too many clients|MaxClients|Timeout|Can't reach database|P1001|P1017|Tenant or user not found|self-signed certificate/i.test(
      msg,
    )
  ) {
    return "Cannot reach the database from this host. On Vercel use the Supabase Transaction pooler URL (port 6543, host aws-*-*.pooler.supabase.com), not the direct db.*.supabase.co host.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    let membership = await prisma.membership.findFirst({
      where: { userId: user.id, isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      const workspace = await provisionDefaultWorkspace({
        userId: user.id,
        ownerName: user.name,
      });
      membership = await prisma.membership.findFirst({
        where: {
          userId: user.id,
          businessId: workspace.businessId,
          deletedAt: null,
        },
      });
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      businessId: membership?.businessId ?? null,
      role: membership?.role ?? null,
    });

    let needsPayment = true;
    if (membership?.businessId) {
      const limits = await getBusinessPlanLimits(membership.businessId);
      needsPayment = !limits.isPaid;
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        needsOnboarding: false,
        needsPayment,
      },
    });
    return applySessionCookie(response, token);
  } catch (error) {
    console.error("Signin error:", error);
    const configError = configErrorMessage(error);
    return NextResponse.json(
      {
        error: configError ?? "Something went wrong. Please try again.",
        detail: errorText(error).slice(0, 300) || undefined,
      },
      { status: 500 },
    );
  }
}
