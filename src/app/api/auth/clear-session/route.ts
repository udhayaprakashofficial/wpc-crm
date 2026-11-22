import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookieOn } from "@/lib/session-cookie";

/** Clears session cookie, then sends the user to sign-in. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.search = "";
  return clearSessionCookieOn(NextResponse.redirect(url));
}
