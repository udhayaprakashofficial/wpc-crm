import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { provisionDefaultWorkspace } from "@/lib/provision-workspace";
import { signinSchema } from "@/lib/validations";

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
    await setSessionCookie(token);

    let needsPayment = true;
    if (membership?.businessId) {
      const limits = await getBusinessPlanLimits(membership.businessId);
      needsPayment = !limits.isPaid;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        needsOnboarding: false,
        needsPayment,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
