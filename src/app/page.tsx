import Link from "next/link";
import { Suspense } from "react";
import { AppLogo } from "@/components/AppLogo";
import { getSession } from "@/lib/auth";

async function HomeActions() {
  const session = await getSession();
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <AppLogo size={32} priority />
          <p className="text-lg font-bold tracking-tight text-zinc-900">
            WPC CRM
          </p>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-20 pt-10 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          For salons, clinics, gyms & local shops
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
          WPC CRM
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
          Leads, follow-ups, pipeline, expenses and goals — built for Indian
          small businesses. Mobile-first, under 10 seconds per screen.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/signin"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800"
          >
            Create account → onboarding
          </Link>
        </div>
        {session ? (
          <p className="mt-4 text-sm text-zinc-500">
            Signed in as {session.email}.{" "}
            <Link href="/app" className="font-semibold text-blue-600">
              Open dashboard
            </Link>
          </p>
        ) : null}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f5f7]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.12),transparent_40%),radial-gradient(circle_at_85%_90%,rgba(139,92,246,0.1),transparent_35%)]" />
      <div className="relative">
        <Suspense fallback={<div className="p-10">Loading…</div>}>
          <HomeActions />
        </Suspense>
      </div>
    </div>
  );
}
