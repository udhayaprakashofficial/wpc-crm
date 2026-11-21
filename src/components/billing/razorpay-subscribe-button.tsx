"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRazorpaySubscription,
  verifyRazorpaySubscription,
} from "@/app/actions/billing";
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

/**
 * Razorpay Subscription Checkout — auto-renews each billing cycle.
 * Falls back to Standard Orders if no Razorpay plan_id is mapped.
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payWithSubscription() {
    const payload = await createRazorpaySubscription(planCode);
    if (!window.Razorpay) throw new Error("Could not load Razorpay Checkout");

    const rzp = new window.Razorpay({
      key: payload.keyId,
      subscription_id: payload.subscriptionId,
      name: "WPC CRM",
      description: `${payload.planName} · auto-renews`,
      prefill: {
        name: payload.customerName,
        email: payload.customerEmail,
      },
      notes: {
        planCode: payload.planCode,
        businessName: payload.businessName,
      },
      theme: { color: "#4f46e5" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await verifyRazorpaySubscription({
            ...response,
            planCode: payload.planCode,
          });
          router.push(
            `/pay/success?plan=${encodeURIComponent(payload.planCode)}`,
          );
          router.refresh();
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
    const order = (await createRes.json()) as {
      order_id?: string;
      amount?: number;
      currency?: string;
      key_id?: string;
      planCode?: string;
      planName?: string;
      customerName?: string;
      customerEmail?: string;
      error?: string;
    };
    if (!createRes.ok) {
      throw new Error(order.error || "Could not create order");
    }
    if (!window.Razorpay) throw new Error("Could not load Razorpay Checkout");

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "WPC CRM",
      description: `${order.planName} plan`,
      order_id: order.order_id,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
      },
      notes: { planCode: order.planCode },
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
              planCode: order.planCode,
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
            router.push(
              `/pay/success?plan=${encodeURIComponent(order.planCode || planCode)}`,
            );
            router.refresh();
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
        // No plan_id mapped → one-time order fallback
        if (/missing razorpay plan|plan id/i.test(msg)) {
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
        onClick={handleClick}
      >
        {loading ? "Opening Razorpay…" : label}
      </Button>
      {error ? (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
