import { OnboardingForm } from "@/components/onboarding-form";
import { AppLogo } from "@/components/AppLogo";

export const metadata = { title: "Set up your business · WPC CRM" };

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f14] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_40%)]" />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2.5">
          <AppLogo size={32} className="rounded-lg ring-1 ring-white/10" priority />
          <p className="font-bold text-white">WPC CRM</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Step 1 of 1
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            Set up your business
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Takes under a minute. We&apos;ll pre-fill pipeline stages and
            categories for your industry. Don&apos;t see yours? Pick Other.
          </p>

          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
