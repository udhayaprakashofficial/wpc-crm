"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignOutButton({
  variant = "header",
  className,
}: {
  variant?: "header" | "sidebar" | "settings";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  function handleSignOut() {
    setLoading(true);
    // Route handler clears the session cookie, then redirects to /signin.
    window.location.href = "/api/auth/clear-session";
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className={cn(
          "mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-60",
          className,
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>{loading ? "Signing out…" : "Sign out"}</span>
      </button>
    );
  }

  if (variant === "settings") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className={cn(
          "rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60",
          className,
        )}
      >
        {loading ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60",
        className,
      )}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
