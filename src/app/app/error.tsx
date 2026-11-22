"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">
        This screen couldn’t load
      </h1>
      <p className="text-sm text-zinc-600">
        Something went wrong while opening this page. Try again, or go back to
        Home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/app"
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
