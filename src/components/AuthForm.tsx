"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

type AuthMode = "signin" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const nextPath = searchParams.get("next") || "/app";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);

      const response = await fetch(
        isSignup ? "/api/auth/signup" : "/api/auth/signin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isSignup ? { name, email, password } : { email, password },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (data.user?.needsPayment !== false) {
        window.location.href = "/pay";
        return;
      }
      window.location.href = nextPath.startsWith("/app") ? nextPath : "/app";
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {isSignup ? (
        <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-slate-700">
          Full name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Enter your full name"
            className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-slate-700">
        Email account
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="Enter your email"
          className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-left text-sm font-medium text-slate-700">
        Password
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignup ? 8 : 1}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={
              isSignup ? "Create your password" : "Enter your password"
            }
            className="h-11 rounded-xl border-slate-200 bg-white px-3.5 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </label>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-[#0f172a] text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60"
      >
        {loading
          ? isSignup
            ? "Creating…"
            : "Signing in…"
          : isSignup
            ? "Create Account"
            : "Sign In"}
      </button>
    </form>
  );
}

export function AuthModeLink({ mode }: { mode: AuthMode }) {
  if (mode === "signup") {
    return (
      <>
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-semibold text-slate-900 underline underline-offset-2"
        >
          Login
        </Link>
      </>
    );
  }
  return (
    <>
      New here?{" "}
      <Link
        href="/signup"
        className="font-semibold text-slate-900 underline underline-offset-2"
      >
        Create account
      </Link>
    </>
  );
}
