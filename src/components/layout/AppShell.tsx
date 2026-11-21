import Link from "next/link";
import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { QuickAddFab } from "@/components/layout/QuickAddFab";
import { ModulePathGuard } from "@/components/layout/module-path-guard";
import { SignOutButton } from "@/components/SignOutButton";
import { ToastProvider } from "@/components/ui/toast";
import { AppLogo } from "@/components/AppLogo";
import type { CrmModuleKey } from "@/lib/modules";

export function AppShell({
  businessName,
  businessLogoUrl,
  userName,
  modules,
  planLocked,
  trialDaysLeft,
  children,
}: {
  businessName: string;
  businessLogoUrl?: string | null;
  userName: string;
  modules: CrmModuleKey[];
  planLocked?: boolean;
  trialDaysLeft?: number | null;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-[#f4f5f7]">
        <ModulePathGuard modules={modules} />
        <Sidebar
          businessName={businessName}
          businessLogoUrl={businessLogoUrl}
          userName={userName}
          modules={modules}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              {businessLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessLogoUrl}
                  alt=""
                  className="h-8 w-8 rounded-lg object-contain ring-1 ring-zinc-200"
                />
              ) : (
                <AppLogo size={32} className="ring-1 ring-zinc-200" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  WPC CRM
                </p>
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {businessName}
                </p>
              </div>
            </div>
            <SignOutButton />
          </header>

          {planLocked ? (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950 md:px-8">
              Trial ended — Free forever: 25 contacts, pipeline, portfolio view
              only.{" "}
              <Link
                href="/app/settings/billing"
                className="font-semibold underline"
              >
                Upgrade to Pro · ₹1,749/yr
              </Link>
            </div>
          ) : trialDaysLeft != null && trialDaysLeft > 0 ? (
            <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900 md:px-8">
              Pro trial · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}{" "}
              left.{" "}
              <Link
                href="/app/settings/billing"
                className="font-semibold underline"
              >
                See Pro yearly
              </Link>
            </div>
          ) : null}

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-28 md:px-8 md:py-7 md:pb-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>

        <BottomNav modules={modules} />
        <QuickAddFab modules={modules} />
      </div>
    </ToastProvider>
  );
}
