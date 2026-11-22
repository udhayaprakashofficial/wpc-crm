import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/session";

type Claims = {
  businessId?: string | null;
};

async function readSession(request: NextRequest): Promise<Claims | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return {
      businessId:
        typeof payload.businessId === "string" ? payload.businessId : null,
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);
  const authenticated = !!session;

  if (pathname.startsWith("/app") && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/app") && authenticated && !session.businessId) {
    const url = request.nextUrl.clone();
    url.pathname = "/pay";
    return NextResponse.redirect(url);
  }

  // Allow /signin even with a cookie so users can recover from stale sessions
  // (cookie may reference an old DB). AuthForm / requireTenant will clear it.

  if (pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = authenticated ? "/pay" : "/signin";
    return NextResponse.redirect(url);
  }

  if (
    (pathname === "/pay" || pathname.startsWith("/pay/")) &&
    !authenticated
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/signin",
    "/signup",
    "/onboarding",
    "/pay",
    "/pay/:path*",
  ],
};
