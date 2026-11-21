import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, SESSION_DURATION } from "@/lib/session";
import type { Role } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  businessId: string | null;
  role: Role | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    businessId: user.businessId,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  // Expire with the same attributes used at set — bare delete can leave the cookie.
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      id: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "User",
      email: payload.email,
      businessId:
        typeof payload.businessId === "string" ? payload.businessId : null,
      role:
        payload.role === "OWNER" ||
        payload.role === "MANAGER" ||
        payload.role === "STAFF" ||
        payload.role === "ACCOUNTANT"
          ? payload.role
          : null,
    };
  } catch {
    return null;
  }
}

export async function refreshSessionForUser(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const session: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      businessId: null,
      role: null,
    };
    const token = await createSessionToken(session);
    await setSessionCookie(token);
    return session;
  }

  const session: SessionUser = {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    businessId: membership.businessId,
    role: membership.role,
  };
  const token = await createSessionToken(session);
  await setSessionCookie(token);
  return session;
}
