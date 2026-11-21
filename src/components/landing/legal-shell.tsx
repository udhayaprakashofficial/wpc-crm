import Link from "next/link";
import { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";

const HELP_EMAIL =
  process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfbfe] text-[#0b1220]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-3xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <span className="font-[family-name:var(--font-landing-display)] text-[1.05rem] font-bold tracking-tight">
              WPC CRM
            </span>
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
          Legal
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-7 text-slate-700">
          {children}
        </div>
        <p className="mt-12 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          Questions? Email{" "}
          <a
            href={`mailto:${HELP_EMAIL}`}
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            {HELP_EMAIL}
          </a>
        </p>
      </main>
    </div>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight text-slate-950">
      {children}
    </h2>
  );
}
