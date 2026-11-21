import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = {
  title: "Sign up · WPC CRM",
  description: "Create your WPC CRM account",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up access to manage contacts, deals, and follow-ups."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-100" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
