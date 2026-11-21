import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import { formatINR } from "@/lib/money";
import { changePlan, startDodoCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import {
  FREE_FEATURE_LABELS,
  PAID_FEATURE_LABELS,
  PLAN_DEFS,
} from "@/lib/plans";
import {
  appBaseUrl,
  dodoConfigured,
  dodoProductsMapped,
  getDodoEnvironment,
} from "@/lib/dodo";

export default async function BillingPage() {
  const ctx = await requireTenant();
  const [limits, plans, contactCount] = await Promise.all([
    getBusinessPlanLimits(ctx.businessId),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ pricePaise: "asc" }, { intervalMonths: "asc" }],
    }),
    prisma.contact.count({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
  ]);

  const free = plans.find((p) => p.code === PLAN_DEFS.free_trial.code);
  const yearly =
    plans.find((p) => p.code === PLAN_DEFS.paid_yearly.code) ??
    (await prisma.plan.findUnique({
      where: { code: PLAN_DEFS.paid_yearly.code },
    }));
  const isOwner = ctx.role === "OWNER";
  const dodoReady =
    dodoConfigured() && Boolean(process.env.DODO_PRODUCT_PAID_YEARLY?.trim());
  const webhookUrl = `${appBaseUrl()}/api/billing/dodo/webhook`;
  const onPro = limits.isPaid;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Start free. Upgrade when you need more.
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Current: {limits.planName}
          {limits.onTrial && limits.trialDaysLeft != null
            ? ` · ${limits.trialDaysLeft}d trial left`
            : limits.trialExpired
              ? " · trial ended"
              : ""}
          {" · "}
          {contactCount}/{limits.maxContacts} contacts
        </p>
      </div>

      {!dodoReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Dodo Payments setup</p>
          <p className="mt-1">
            Add to <code className="rounded bg-white px-1">.env</code> then
            restart:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs">
            <li>DODO_PAYMENTS_API_KEY=…</li>
            <li>DODO_PAYMENTS_ENVIRONMENT=test_mode</li>
            <li>DODO_PRODUCT_PAID_YEARLY=pdt_… (₹1,749/yr product)</li>
            <li>DODO_PAYMENTS_WEBHOOK_KEY=…</li>
          </ul>
          <p className="mt-2 break-all text-xs">Webhook: {webhookUrl}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Payments via Dodo ·{" "}
          {getDodoEnvironment() === "live_mode" ? "Live" : "Test"} mode
          {dodoProductsMapped() ? "" : ""}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {free && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xl font-semibold text-zinc-950">Free</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              ₹0{" "}
              <span className="text-base font-normal text-zinc-500">
                forever
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Plus a 7-day Pro trial.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-zinc-700">
              {FREE_FEATURE_LABELS.map((label) => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <form action={changePlan} className="mt-6">
              <input type="hidden" name="planCode" value={free.code} />
              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={!isOwner || (!onPro && limits.planCode === free.code)}
              >
                {!onPro ? "Current plan" : "Switch to Free"}
              </Button>
            </form>
          </div>
        )}

        {yearly && (
          <div className="flex flex-col rounded-2xl border-2 border-emerald-800 bg-white p-6 shadow-sm">
            <p className="text-xl font-semibold text-zinc-950">Pro</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatINR(PLAN_DEFS.paid_yearly.pricePaise)}{" "}
              <span className="text-base font-normal text-zinc-500">
                a year
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              About ₹{Math.round(1749 / 365)} a day · yearly only
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-zinc-700">
              {PAID_FEATURE_LABELS.map((label) => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <form action={startDodoCheckout} className="mt-6">
              <input type="hidden" name="planCode" value={yearly.code} />
              <Button
                type="submit"
                className="w-full bg-emerald-800 hover:bg-emerald-900"
                disabled={!isOwner || !dodoReady || onPro}
              >
                {onPro ? "Current · Pro" : "Upgrade to Pro"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
