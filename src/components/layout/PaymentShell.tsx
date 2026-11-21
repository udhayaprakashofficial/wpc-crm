import Link from "next/link";
import { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";
import { SignOutButton } from "@/components/SignOutButton";

/** Minimal chrome for unpaid workspaces — pay before the full CRM. */
export function PaymentShell({
  businessName,
  children,
}: {
  businessName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f4f5f7]">
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/pay" className="flex items-center gap-2.5">
            <AppLogo size={28} className="ring-1 ring-zinc-200" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                WPC CRM
              </p>
              <p className="truncate text-sm font-semibold text-zinc-900">
                {businessName}
              </p>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
