"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "signin" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      if (isSignup || data.user?.needsOnboarding) {
        window.location.href = "/onboarding";
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      {isSignup && (
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Full name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Jordan Lee"
          />
        </label>
      )}
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Email
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@business.com"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Password
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isSignup ? 8 : 1}
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
        />
      </label>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} size="lg">
        {loading
          ? isSignup
            ? "Creating…"
            : "Signing in…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-blue-600">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-blue-600">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
