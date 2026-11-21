import Link from "next/link";
import { FAQ_ITEMS } from "@/components/landing/faq-data";
import { LegalShell } from "@/components/landing/legal-shell";

export const metadata = {
  title: "FAQ · WPC CRM",
  description: "Frequently asked questions about WPC CRM pricing, features, and billing.",
};

export default function FaqPage() {
  return (
    <LegalShell title="Frequently asked questions" updated="22 November 2026">
      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none font-[family-name:var(--font-landing-display)] text-base font-semibold text-slate-950 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                {item.q}
                <span className="mt-0.5 text-slate-400 transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Still stuck?{" "}
        <Link href="/#pricing" className="font-semibold underline underline-offset-2">
          See pricing
        </Link>{" "}
        or email support from the box below.
      </p>
    </LegalShell>
  );
}
