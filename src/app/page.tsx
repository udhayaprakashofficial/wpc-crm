import { Suspense } from "react";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

const landingDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["500", "600", "700"],
});

const landingBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "WPC CRM — Run Your Entire Business From One Place",
  description:
    "All-in-one business management CRM for leads, clients, campaigns, follow-ups, revenue goals and team — from Web Product Creator.",
};

async function LandingWithSession() {
  const session = await getSession();
  return <LandingPage session={session} />;
}

export default function Home() {
  return (
    <div
      className={`${landingDisplay.variable} ${landingBody.variable} font-[family-name:var(--font-landing-body)]`}
    >
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-slate-400">
            Loading…
          </div>
        }
      >
        <LandingWithSession />
      </Suspense>
    </div>
  );
}
