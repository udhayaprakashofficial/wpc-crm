import { NextResponse } from "next/server";
import { clearSessionCookieOn } from "@/lib/session-cookie";

export async function POST() {
  const response = NextResponse.json(
    { message: "Signed out successfully" },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
  return clearSessionCookieOn(response);
}
