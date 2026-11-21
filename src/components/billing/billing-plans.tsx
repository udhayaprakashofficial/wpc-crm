import { formatINR } from "@/lib/money";
import {
  cancelSubscriptionAtPeriodEnd,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import {
  PAID_FEATURE_LABELS,
  PLAN_DEFS,
  MONTHLY_PRICE_PAISE,
  YEARLY_PRICE_PAISE,
} from "@/lib/plans";
import { razorpayConfigured } from "@/lib/razorpay";
import { RazorpaySubscribeButton } from "@/components/billing/razorpay-subscribe-button";
import type { PlanLimits } from "@/lib/plan-limits";

export function BillingPlans({
  limits,
  isOwner,
  contactCount,
  monthlyActive,
  yearlyActive,
  title,
  subtitle,
}: {
  limits: PlanLimits;
  isOwner: boolean;
  contactCount: number;
  monthlyActive: boolean;
  yearlyActive: boolean;
  title?: string;
  subtitle?: string;
}) {
  const razorpayReady = razorpayConfigured();
  const onPaid = limits.isPaid;
  const currentCode = onPaid ? limits.planCode : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          {title ??
            (limits.isPaid ? "Billing" : "Complete payment to continue")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {subtitle ??
            (limits.isPaid
              ? `Current: ${limits.planName}${
                  limits.cancelAtPeriodEnd && limits.currentPeriodEnd
                    ? ` · cancels ${limits.currentPeriodEnd.toLocaleDateString("en-IN")}`
                    : ""
                } · ${contactCount}/${limits.maxContacts} contacts`
              : "Pick Monthly or Yearly — then you’ll land in your dashboard.")}
        </p>
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Cancel anytime.
        </p>
      </div>

      {!razorpayReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Razorpay setup</p>
          <p className="mt-1">
            Add to <code className="rounded bg-white px-1">.env</code> then
            restart:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs">
            <li>RAZORPAY_KEY_ID=rzp_…</li>
            <li>RAZORPAY_KEY_SECRET=…</li>
            <li>NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_… (same key id)</li>
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Razorpay Subscriptions · auto-renews each cycle · cancel anytime.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xl font-semibold text-zinc-950">Monthly</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatINR(MONTHLY_PRICE_PAISE)}{" "}
            <span className="text-base font-normal text-zinc-500">/ month</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Billed every month · Cancel anytime
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-zinc-700">
            {PAID_FEATURE_LABELS.map((label) => (
              <li key={label} className="flex gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {currentCode === PLAN_DEFS.paid_monthly.code ? (
              <Button type="button" className="w-full" variant="secondary" disabled>
                Current · Monthly
              </Button>
            ) : (
              <RazorpaySubscribeButton
                planCode={PLAN_DEFS.paid_monthly.code}
                label="Pay Monthly"
                className="w-full"
                disabled={!isOwner || !razorpayReady || !monthlyActive}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border-2 border-indigo-600 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Best value · 2 months free
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-950">Yearly</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatINR(YEARLY_PRICE_PAISE)}{" "}
            <span className="text-base font-normal text-zinc-500">/ year</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            About {formatINR(Math.round(YEARLY_PRICE_PAISE / 12))} / month
            effective · Cancel anytime
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-zinc-700">
            {PAID_FEATURE_LABELS.map((label) => (
              <li key={label} className="flex gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {currentCode === PLAN_DEFS.paid_yearly.code ? (
              <Button
                type="button"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled
              >
                Current · Yearly
              </Button>
            ) : (
              <RazorpaySubscribeButton
                planCode={PLAN_DEFS.paid_yearly.code}
                label="Pay Yearly"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!isOwner || !razorpayReady || !yearlyActive}
              />
            )}
          </div>
        </div>
      </div>

      {onPaid && isOwner && !limits.cancelAtPeriodEnd ? (
        <form
          action={async () => {
            "use server";
            await cancelSubscriptionAtPeriodEnd();
          }}
          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="text-sm text-zinc-700">
            Need to leave? Cancel anytime — access stays until the end of your
            current billing period.
          </p>
          <Button type="submit" variant="secondary" className="mt-3">
            Cancel at period end
          </Button>
        </form>
      ) : null}
    </div>
  );
}
