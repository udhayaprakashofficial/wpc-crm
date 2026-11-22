import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_DURATION } from "@/lib/session";

/** Cookie helpers only — keep free of Prisma so auth routes build without DB. */

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION,
};

/** Attach session cookie to a Route Handler response (preferred in API routes). */
export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, cookieOptions);
  return response;
}

export function clearSessionCookieOn(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}

/** For Server Actions / pages that mutate cookies via next/headers. */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, cookieOptions);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export async function readSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
