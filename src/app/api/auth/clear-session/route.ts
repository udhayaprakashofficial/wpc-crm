import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-cookie";

/** Clears session cookie, then sends the user to sign-in. */
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.search = "";
  return NextResponse.redirect(url);
}
