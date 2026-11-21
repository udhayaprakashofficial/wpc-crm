import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") redirect("/app/settings/billing");

  const params = await searchParams;
  const ok =
    (params.status || "").toLowerCase() === "succeeded" ||
    (params.status || "").toLowerCase() === "active";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Payment" />
      <div className="sp-card sp-shadow p-6 text-center">
        <p
          className={`text-lg font-semibold ${
            ok ? "text-emerald-700" : "text-zinc-900"
          }`}
        >
          {ok ? "You're subscribed" : "Thanks"}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          {ok
            ? "Payment successful via Razorpay. Your plan is active — cancel anytime from Billing."
            : "If you paid, your plan will activate once Razorpay confirms the subscription."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/app">
            <Button type="button">Open dashboard</Button>
          </Link>
          <Link href="/app/settings/billing">
            <Button type="button" variant="secondary">
              Billing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
