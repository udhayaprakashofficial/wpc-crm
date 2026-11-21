import Razorpay from "razorpay";
import crypto from "crypto";
import { PLAN_DEFS } from "@/lib/plans";

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function razorpayConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() &&
      process.env.RAZORPAY_KEY_SECRET?.trim(),
  );
}

export function razorpayKeyId() {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    ""
  );
}

export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  return new Razorpay({ key_id, key_secret });
}

/** Map plan codes → Razorpay Plan ids (env first, then Plan.razorpayPlanId). */
export function envRazorpayPlanId(planCode: string): string | null {
  if (planCode === PLAN_DEFS.paid_monthly.code) {
    return process.env.RAZORPAY_PLAN_MONTHLY?.trim() || null;
  }
  if (planCode === PLAN_DEFS.paid_yearly.code) {
    return process.env.RAZORPAY_PLAN_YEARLY?.trim() || null;
  }
  return null;
}

export function razorpayPlansMapped() {
  return Boolean(
    process.env.RAZORPAY_PLAN_MONTHLY?.trim() &&
      process.env.RAZORPAY_PLAN_YEARLY?.trim(),
  );
}

export function razorpayPlanMappedFor(planCode: string) {
  return Boolean(envRazorpayPlanId(planCode));
}

/** Billing cycles to create on Razorpay (long-running; cancel anytime). */
export function totalCountForPlan(intervalMonths: number) {
  if (intervalMonths >= 12) return 20; // ~20 years
  return 120; // ~10 years monthly
}

/** Standard Checkout: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) */
export function verifyOrderPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const body = `${input.orderId}|${input.paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(input.signature, "hex"),
    );
  } catch {
    return expected === input.signature;
  }
}

/** Subscription Checkout: HMAC-SHA256(payment_id + "|" + subscription_id) */
export function verifySubscriptionPaymentSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const body = `${input.paymentId}|${input.subscriptionId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expected === input.signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
