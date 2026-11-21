import { Suspense } from "react";
import { AuthForm, AuthModeLink } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = {
  title: "Sign in · WPC CRM",
  description: "Sign in to your WPC CRM account",
};

export default function SigninPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle={<AuthModeLink mode="signin" />}
    >
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        }
      >
        <AuthForm mode="signin" />
      </Suspense>
    </AuthShell>
  );
}
