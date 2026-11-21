import Link from "next/link";
import { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen bg-[#0b0f14]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.25),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.18),transparent_35%)]" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-2.5">
          <AppLogo size={36} className="rounded-xl ring-1 ring-white/10" priority />
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            WPC CRM
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
