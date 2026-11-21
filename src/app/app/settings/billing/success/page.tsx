import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";
import { activateBusinessPlan } from "@/lib/billing-activate";
import { getDodoClient } from "@/lib/dodo";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    subscription_id?: string;
    payment_id?: string;
  }>;
}) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") redirect("/app/settings/billing");

  const params = await searchParams;
  const status = (params.status || "").toLowerCase();
  const subscriptionId = params.subscription_id || "";
  let activated = false;
  let message =
    status === "succeeded" || status === "active"
      ? "Payment received. Your plan will update in a moment."
      : "Checkout finished. If you paid, your plan updates when Dodo confirms.";

  if (
    (status === "succeeded" || status === "active") &&
    subscriptionId &&
    process.env.DODO_PAYMENTS_API_KEY
  ) {
    try {
      const client = getDodoClient();
      const sub = await client.subscriptions.retrieve(subscriptionId);
      const meta = (sub.metadata || {}) as Record<string, string>;
      const businessId = meta.businessId || ctx.businessId;
      const planCode = meta.planCode;
      const customerId = sub.customer?.customer_id || null;
      const periodStart = sub.previous_billing_date
        ? new Date(sub.previous_billing_date)
        : new Date();
      const periodEnd = sub.next_billing_date
        ? new Date(sub.next_billing_date)
        : null;

      if (businessId === ctx.businessId && planCode) {
        await activateBusinessPlan({
          businessId,
          planCode,
          dodoSubscriptionId: subscriptionId,
          dodoCustomerId: customerId,
          periodStart,
          periodEnd:
            periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
        });
        activated = true;
        message = "Payment successful — Paid plan is active.";
        revalidatePath("/app/settings/billing");
        revalidatePath("/app");
      }
    } catch (e) {
      console.warn("[billing success] could not sync subscription yet", e);
      message =
        "Payment received. Waiting for Dodo webhook to finish activating your plan.";
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Payment" />
      <div className="sp-card sp-shadow p-6 text-center">
        <p
          className={`text-lg font-semibold ${
            activated ? "text-emerald-700" : "text-zinc-900"
          }`}
        >
          {activated ? "You're upgraded" : "Thanks"}
        </p>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        {params.payment_id ? (
          <p className="mt-3 text-xs text-zinc-400">
            Payment ref: {params.payment_id}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/app/settings/billing">
            <Button type="button">Back to billing</Button>
          </Link>
          <Link href="/app">
            <Button type="button" variant="secondary">
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
