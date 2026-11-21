import { Suspense } from "react";
import { AuthForm, AuthModeLink } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = {
  title: "Sign up · WPC CRM",
  description: "Create your WPC CRM account",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Get Started Now"
      subtitle={<AuthModeLink mode="signup" />}
    >
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        }
      >
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
