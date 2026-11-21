import Link from "next/link";
import { ReactNode } from "react";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { AppLogo } from "@/components/AppLogo";
import { ProductMock } from "@/components/landing/product-mocks";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type AuthShellProps = {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div
      className={`${body.className} grid min-h-screen bg-white lg:grid-cols-2`}
    >
      {/* Left — testimonial + product */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col">
        <div className="auth-panel-glow absolute inset-0" aria-hidden />
        <div className="auth-panel-grid absolute inset-0" aria-hidden />

        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 xl:px-14">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={36} priority className="ring-1 ring-slate-200/80" />
            <span
              className={`${display.className} text-lg font-bold tracking-tight text-slate-950`}
            >
              WPC CRM
            </span>
          </Link>

          <div className="mx-auto max-w-lg py-10">
            <p className="text-5xl leading-none text-slate-300">&ldquo;</p>
            <h2
              className={`${display.className} mt-2 text-3xl font-bold leading-snug tracking-tight text-slate-950 xl:text-[2rem]`}
            >
              Leads lived in WhatsApp. Follow-ups lived in someone&apos;s
              memory.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Now the whole team sees the pipeline, cash and campaigns in one
              dashboard — so nothing cools off between customers.
            </p>
            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f46e5] text-xs font-bold text-white">
                  WPC
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Local business owners
                  </p>
                  <p className="text-xs text-slate-500">Salons · Clinics · Gyms</p>
                </div>
              </div>
              <span className="text-sm text-slate-400">2025</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <ProductMock
              kind="dashboard"
              compact
              className="rounded-t-2xl rounded-b-none shadow-[0_25px_60px_-20px_rgba(79,70,229,0.35)]"
            />
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <AppLogo size={48} priority className="mb-5 ring-1 ring-slate-200" />
            <h1
              className={`${display.className} text-3xl font-bold tracking-tight text-slate-950`}
            >
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-xs leading-5 text-slate-400 lg:text-left">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-slate-600 underline underline-offset-2"
            >
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-slate-600 underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-4 text-center text-sm text-slate-500 lg:text-left">
            Need help?{" "}
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com"}`}
              className="font-semibold text-slate-800 underline underline-offset-2"
            >
              {process.env.NEXT_PUBLIC_HELP_EMAIL ||
                "webproductcreator@gmail.com"}
            </a>
            {" · "}
            <a
              href={`https://wa.me/${(process.env.NEXT_PUBLIC_HELP_WHATSAPP || "").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 underline underline-offset-2"
            >
              WhatsApp
            </a>
          </p>
        </div>

        {/* Mobile brand strip */}
        <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <AppLogo size={28} />
          <span className={`${display.className} text-sm font-bold`}>WPC CRM</span>
        </div>
      </main>
    </div>
  );
}
