import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppLogo } from "@/components/AppLogo";
import { SignOutButton } from "@/components/SignOutButton";
import { PurchasePixel } from "@/components/billing/purchase-pixel";

export const metadata = {
  title: "Payment successful · WPC CRM",
  description: "Your WPC CRM subscription is active.",
};

export const instant = false;

/**
 * Stable conversion URL for ad pixels (e.g. Facebook / Meta).
 * After Razorpay success, users land here, then open the CRM.
 */
export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/signin?next=/pay/success");

  const params = await searchParams;
  const plan = (params.plan || "").trim();

  return (
    <div className="min-h-dvh bg-[#f4f5f7]">
      <PurchasePixel plan={plan || undefined} />
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/pay/success" className="flex items-center gap-2.5">
            <AppLogo size={28} className="ring-1 ring-zinc-200" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                WPC CRM
              </p>
              <p className="truncate text-sm font-semibold text-zinc-900">
                Payment successful
              </p>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          aria-hidden
        >
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-zinc-950">
          You&apos;re subscribed
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          Payment received. Your WPC CRM plan is active
          {plan === "paid_yearly"
            ? " (Yearly)"
            : plan === "paid_monthly"
              ? " (Monthly)"
              : ""}
          . Open the dashboard to start managing leads, pipeline, and payments.
        </p>

        <Link
          href="/app"
          className="mt-8 inline-flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-[#4f46e5] px-6 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-[#4338ca]"
        >
          Access CRM
        </Link>

        <p className="mt-4 text-sm text-zinc-500">
          Need help?{" "}
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com"}`}
            className="font-medium text-zinc-800 underline underline-offset-2"
          >
            {process.env.NEXT_PUBLIC_HELP_EMAIL ||
              "webproductcreator@gmail.com"}
          </a>
        </p>
      </main>
    </div>
  );
}
