import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword } from "@/lib/auth";
import { applySessionCookie } from "@/lib/session-cookie";
import { provisionDefaultWorkspace } from "@/lib/provision-workspace";
import { signupSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    const workspace = await provisionDefaultWorkspace({
      userId: user.id,
      ownerName: user.name,
    });

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      businessId: workspace.businessId,
      role: "OWNER",
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          needsOnboarding: false,
          needsPayment: true,
        },
      },
      { status: 201 },
    );
    return applySessionCookie(response, token);
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
