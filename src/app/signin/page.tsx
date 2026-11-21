import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = {
  title: "Sign in · WPC CRM",
  description: "Sign in to your WPC CRM account",
};

export default function SigninPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue managing your pipeline."
    >
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-slate-100" />}>
        <AuthForm mode="signin" />
      </Suspense>
    </AuthShell>
  );
}
