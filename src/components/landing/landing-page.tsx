import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckSquare,
  IndianRupee,
  Megaphone,
  MessageCircle,
  Users,
  ArrowRight,
  Check,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import type { SessionUser } from "@/lib/auth";
import { FAQ_ITEMS } from "@/components/landing/faq-data";
import {
  ProductMock,
  type MockKind,
} from "@/components/landing/product-mocks";

export function LandingPage({ session }: { session: SessionUser | null }) {
  return (
    <div className="landing min-h-screen overflow-x-hidden bg-[#fbfbfe] text-[#0b1220]">
      <Header session={session} />
      <Hero />
      <Problem />
      <Features />
      <DashboardShowcase />
      <PricingCta />
      <FaqSection />
      <SiteFooter />
    </div>
  );
}

function Header({ session }: { session: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={32} priority />
          <span className="font-[family-name:var(--font-landing-display)] text-[1.05rem] font-bold tracking-tight">
            WPC CRM
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="transition hover:text-slate-950">
            Features
          </a>
          <a href="#dashboard" className="transition hover:text-slate-950">
            Dashboard
          </a>
          <a href="#pricing" className="transition hover:text-slate-950">
            Pricing
          </a>
          <a href="#faq" className="transition hover:text-slate-950">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2.5">
          {session ? (
            <Link
              href="/app"
              className="rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-[#4338ca]"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-[#4338ca]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="landing-hero-glow" aria-hidden />
      <div className="landing-dot-grid" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-0 pt-16 text-center sm:px-8 sm:pt-20 lg:pt-24">
        <p className="landing-reveal inline-flex items-center rounded-full border border-indigo-100 bg-white/90 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f46e5] shadow-sm">
          The all-in-one business management CRM
        </p>

        <h1 className="landing-reveal-delay mx-auto mt-6 max-w-4xl font-[family-name:var(--font-landing-display)] text-[clamp(2.5rem,6.5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em] text-slate-950">
          Run Your Entire Business From{" "}
          <span className="landing-accent-text">One Place.</span>
        </h1>

        <p className="landing-reveal-delay-2 mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Manage leads, clients, campaigns, follow-ups, revenue goals and your
          team — all from one simple dashboard. No messy spreadsheets. No missed
          opportunities. Just complete control over your business.
        </p>

        <div className="landing-reveal-delay-2 mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4f46e5] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-[#4338ca]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Explore Features
          </a>
        </div>

        <p className="mt-5 text-sm text-slate-500">
          From your first lead to your next business milestone — without
          switching tools.
        </p>

        <div className="landing-dashboard-wrap relative mx-auto mt-14 max-w-5xl sm:mt-16">
          <div className="overflow-hidden rounded-t-2xl border border-b-0 border-slate-200/90 bg-white shadow-[0_0_0_1px_rgba(79,70,229,0.06),0_25px_80px_-20px_rgba(79,70,229,0.35),0_20px_40px_-24px_rgba(15,23,42,0.2)]">
            <ProductMock kind="dashboard" className="rounded-none border-0 shadow-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const problems = [
    "Leads getting lost in WhatsApp conversations.",
    "Forgetting to follow up with potential clients.",
    "Client information scattered across spreadsheets.",
    "No clear visibility into campaign performance.",
    "Not knowing whether the business is reaching its revenue goals.",
    "Managing staff and salaries separately.",
  ];

  return (
    <section className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Your Business Is Growing.{" "}
            <span className="text-slate-400">
              Your Management Shouldn&apos;t Be Messy.
            </span>
          </h2>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2">
          {problems.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-[#fbfbfe] px-5 py-4 text-left text-sm leading-6 text-slate-700 shadow-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-500">
                !
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-12 max-w-2xl text-center font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          You don&apos;t need more tools. You need{" "}
          <span className="landing-accent-text">one place</span> that connects
          everything.
        </p>
      </div>
    </section>
  );
}

const FEATURES: {
  n: string;
  title: string;
  tagline: string;
  body: string;
  icon: typeof Users;
  mock: MockKind;
}[] = [
  {
    n: "01",
    title: "Lead Management",
    tagline: "Never miss an opportunity.",
    body: "Capture, organise and track every lead. Manage lead status, assign follow-ups and move prospects through your sales pipeline.",
    icon: Users,
    mock: "leads",
  },
  {
    n: "02",
    title: "Client & Portfolio Management",
    tagline: "Every client. Every project. Organised.",
    body: "Maintain client profiles, project information, work history, portfolios and ongoing activities in one place.",
    icon: BriefcaseBusiness,
    mock: "portfolio",
  },
  {
    n: "03",
    title: "Follow-up Management",
    tagline: "The right follow-up can win the next client.",
    body: "Track upcoming follow-ups, pending tasks and client communication. Stay on top of every opportunity.",
    icon: CheckSquare,
    mock: "followups",
  },
  {
    n: "04",
    title: "WhatsApp Integration",
    tagline: "Connect with clients faster.",
    body: "Quickly redirect to WhatsApp from lead and client profiles to start conversations without searching for phone numbers.",
    icon: MessageCircle,
    mock: "whatsapp",
  },
  {
    n: "05",
    title: "Campaign Management",
    tagline: "All your client campaigns. One dashboard.",
    body: "Monitor campaign details, client-wise campaign performance, progress and business results from one centralised place.",
    icon: Megaphone,
    mock: "portfolio",
  },
  {
    n: "06",
    title: "Business & Team Management",
    tagline: "Take control of your business operations.",
    body: "Set annual revenue targets, monitor monthly income, manage staff details and maintain salary records.",
    icon: IndianRupee,
    mock: "finance",
  },
];

function Features() {
  return (
    <section id="features" className="border-t border-slate-200/80 bg-[#f6f7fb] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Core features
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Everything You Need to Run Your Business.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.n}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(79,70,229,0.08),0_24px_48px_-20px_rgba(79,70,229,0.28)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-slate-100 bg-[#f4f5f7]">
                <div className="absolute inset-0 origin-top scale-[0.92] sm:scale-100">
                  <ProductMock
                    kind={f.mock}
                    className="min-h-full rounded-none border-0 shadow-none"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#4f46e5]">
                    <f.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="font-[family-name:var(--font-landing-display)] text-xs font-semibold tracking-[0.14em] text-slate-400">
                    {f.n}
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight text-slate-950">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#4f46e5]">
                  {f.tagline}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardShowcase() {
  return (
    <section id="dashboard" className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            One dashboard. Complete visibility.
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Know What&apos;s Happening in Your Business.{" "}
            <span className="landing-accent-text">At a Glance.</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Leads, follow-ups, cash, goals and campaign performance — the numbers
            that matter, without opening five different apps.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.45)]">
          <ProductMock kind="dashboard" className="rounded-none border-0 shadow-none" />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Total leads & active clients in one view",
            "Monthly revenue and FY goal pace",
            "Pending follow-ups before they go cold",
            "Campaign spend, leads and CPL",
            "Outstanding invoices & win-back lists",
            "Team access by module",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4f46e5]" strokeWidth={2.5} />
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <MockCard
            kind="pipeline"
            title="Pipeline"
            caption="Move deals from new to won without losing context between shifts."
          />
          <MockCard
            kind="portfolio"
            title="Campaigns & portfolio"
            caption="Client-wise campaign performance with real spend, leads and profit when price is known."
          />
        </div>
      </div>
    </section>
  );
}

function MockCard({
  kind,
  title,
  caption,
}: {
  kind: MockKind;
  title: string;
  caption: string;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f4f5f7]">
        <ProductMock kind={kind} className="min-h-full rounded-none border-0 shadow-none" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#f4f5f7] to-transparent" />
      </div>
      <figcaption className="border-t border-slate-100 px-5 py-4 text-left">
        <p className="font-[family-name:var(--font-landing-display)] text-base font-semibold text-slate-950">
          {title}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{caption}</p>
      </figcaption>
    </figure>
  );
}

function PricingCta() {
  return (
    <section id="pricing" className="relative overflow-hidden border-t border-slate-200/80 bg-[#0b1220] py-20 text-white sm:py-28">
      <div className="landing-cta-glow" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight sm:text-5xl">
          Simple pricing. Cancel anytime.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/65">
          Monthly ₹399 · Yearly ₹3,990 (2 months free). Full CRM access on both
          plans.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const preview = FAQ_ITEMS.slice(0, 6);
  return (
    <section id="faq" className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            FAQ
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Pricing, billing, team access, and how WPC CRM works.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {preview.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-slate-200 bg-[#fbfbfe] px-5 py-4 open:bg-white open:shadow-sm"
            >
              <summary className="cursor-pointer list-none font-[family-name:var(--font-landing-display)] text-base font-semibold text-slate-950 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  {item.q}
                  <span className="mt-0.5 shrink-0 text-slate-400 transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-600">
          <Link
            href="/faq"
            className="font-semibold text-[#4f46e5] underline underline-offset-2"
          >
            View all FAQs
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="font-semibold text-slate-800 underline underline-offset-2"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/terms"
            className="font-semibold text-slate-800 underline underline-offset-2"
          >
            Terms
          </Link>
        </p>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <AppLogo size={28} />
            <span className="font-[family-name:var(--font-landing-display)] text-base font-bold">
              WPC CRM
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            The all-in-one business management CRM for Indian local businesses —
            leads, clients, campaigns, follow-ups, revenue and team in one place.
          </p>
        </div>
        <div className="flex gap-12 text-sm">
          <div>
            <p className="font-semibold text-slate-900">Product</p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <a href="#features" className="hover:text-slate-950">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-950">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-slate-950">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Legal</p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <Link href="/privacy" className="hover:text-slate-950">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-950">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-slate-950">
                  All FAQs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Support</p>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <Link href="/signin" className="hover:text-slate-950">
                  Sign in
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com"}`}
                  className="hover:text-slate-950"
                >
                  {process.env.NEXT_PUBLIC_HELP_EMAIL ||
                    "webproductcreator@gmail.com"}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm text-slate-500 sm:px-8">
          © {new Date().getFullYear()} Web Product Creator · WPC CRM ·{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-slate-800"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-slate-800"
          >
            Terms
          </Link>
          {" · "}
          <Link
            href="/faq"
            className="underline underline-offset-2 hover:text-slate-800"
          >
            FAQ
          </Link>
        </p>
      </div>
    </footer>
  );
}
