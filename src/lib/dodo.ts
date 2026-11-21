import DodoPayments from "dodopayments";
import { PLAN_DEFS } from "@/lib/plans";

export type DodoEnvironment = "test_mode" | "live_mode";

export function dodoConfigured() {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY?.trim());
}

export function getDodoEnvironment(): DodoEnvironment {
  const raw = (process.env.DODO_PAYMENTS_ENVIRONMENT || "").trim().toLowerCase();
  if (raw === "live" || raw === "live_mode" || raw === "production") {
    return "live_mode";
  }
  // Prefer test when key prefix says so
  const key = process.env.DODO_PAYMENTS_API_KEY || "";
  if (key.startsWith("dodo_live_")) return "live_mode";
  return "test_mode";
}

export function getDodoClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!bearerToken) {
    throw new Error(
      "DODO_PAYMENTS_API_KEY is missing. Add it to your .env file.",
    );
  }
  return new DodoPayments({
    bearerToken,
    environment: getDodoEnvironment(),
  });
}

/** Map our plan codes → Dodo product ids (env first, then Plan.dodoProductId). */
export function envProductIdForPlan(planCode: string): string | null {
  if (planCode === PLAN_DEFS.paid_yearly.code) {
    return process.env.DODO_PRODUCT_PAID_YEARLY?.trim() || null;
  }
  // Legacy monthly product env (unused in UI)
  if (planCode === PLAN_DEFS.paid_monthly.code) {
    return process.env.DODO_PRODUCT_PAID_MONTHLY?.trim() || null;
  }
  return null;
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function dodoProductsMapped() {
  return Boolean(process.env.DODO_PRODUCT_PAID_YEARLY?.trim());
}
