"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type SubscriptionPayload = {
  keyId: string;
  subscriptionId: string;
  planCode: string;
  planName: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
};

type OrderPayload = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  planCode: string;
  planName: string;
  customerName: string;
  customerEmail: string;
};

/**
 * Razorpay Subscription Checkout — auto-renews each billing cycle.
 * Falls back to Standard Orders if no Razorpay plan_id is mapped.
 * Uses fetch APIs (not Server Actions) so production shows real errors.
 */
export function RazorpaySubscribeButton({
  planCode,
  label,
  className,
  disabled,
}: {
  planCode: string;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToSuccess(code: string) {
    // Full navigation avoids stale RSC / Server Action digests after payment.
    window.location.href = `/pay/success?plan=${encodeURIComponent(code)}`;
  }

  async function payWithSubscription() {
    const res = await fetch("/api/billing/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    const data = (await res.json()) as SubscriptionPayload & {
      error?: string;
      code?: string;
    };
    if (!res.ok) {
      const err = new Error(data.error || "Could not create subscription");
      (err as Error & { code?: string }).code = data.code;
      throw err;
    }
    if (!window.Razorpay) throw new Error("Could not load Razorpay Checkout");

    const rzp = new window.Razorpay({
      key: data.keyId,
      subscription_id: data.subscriptionId,
      name: "WPC CRM",
      description: `${data.planName} · auto-renews`,
      prefill: {
        name: data.customerName,
        email: data.customerEmail,
      },
      notes: {
        planCode: data.planCode,
        businessName: data.businessName,
      },
      theme: { color: "#4f46e5" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/billing/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              planCode: data.planCode,
            }),
          });
          const verifyData = (await verifyRes.json()) as {
            error?: string;
            success?: boolean;
          };
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(
              verifyData.error || "Payment signature verification failed",
            );
          }
          goToSuccess(data.planCode);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not verify payment");
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          setError("Payment cancelled");
        },
      },
    });

    rzp.on("payment.failed", (response: unknown) => {
      const failed = response as {
        error?: { description?: string; reason?: string };
      };
      setError(
        failed.error?.description ||
          failed.error?.reason ||
          "Payment failed. Please try again.",
      );
      setLoading(false);
    });

    rzp.open();
  }

  async function payWithOrder() {
    const createRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    const order = (await createRes.json()) as Partial<OrderPayload> & {
      error?: string;
    };
    if (!createRes.ok) {
      throw new Error(order.error || "Could not create order");
    }
    if (
      !order.order_id ||
      !order.key_id ||
      order.amount == null ||
      !order.currency
    ) {
      throw new Error("Invalid order response from server");
    }
    if (!window.Razorpay) throw new Error("Could not load Razorpay Checkout");

    const resolvedPlan = order.planCode || planCode;

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "WPC CRM",
      description: `${order.planName || "WPC CRM"} plan`,
      order_id: order.order_id,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
      },
      notes: { planCode: resolvedPlan },
      theme: { color: "#4f46e5" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              planCode: resolvedPlan,
            }),
          });
          const verifyData = (await verifyRes.json()) as {
            error?: string;
            success?: boolean;
          };
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(
              verifyData.error || "Payment signature verification failed",
            );
          }
          goToSuccess(resolvedPlan);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not verify payment");
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          setError("Payment cancelled");
        },
      },
    });

    rzp.on("payment.failed", (response: unknown) => {
      const failed = response as {
        error?: { description?: string; reason?: string };
      };
      setError(
        failed.error?.description ||
          failed.error?.reason ||
          "Payment failed. Please try again.",
      );
      setLoading(false);
    });

    rzp.open();
  }

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout");
      }
      try {
        await payWithSubscription();
      } catch (subErr) {
        const msg = subErr instanceof Error ? subErr.message : String(subErr);
        const code = (subErr as Error & { code?: string }).code;
        // No plan_id mapped → one-time order fallback
        if (
          code === "missing_plan_id" ||
          /missing razorpay plan|plan id/i.test(msg)
        ) {
          await payWithOrder();
          return;
        }
        throw subErr;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        className={className}
        disabled={disabled || loading}
        onClick={() => {
          void handleClick();
        }}
      >
        {loading ? "Opening Razorpay…" : label}
      </Button>
      {error ? (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
