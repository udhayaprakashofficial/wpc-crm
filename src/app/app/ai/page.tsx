import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireTenant } from "@/lib/tenant";

const upcoming = [
  "WhatsApp follow-up drafts in your tone",
  "Lead scores from activity & source",
  "Weekly business summary you can share",
];

export default async function AiAssistPage() {
  await requireTenant();

  return (
    <div>
      <PageHeader title="WPC AI" />
      <p className="-mt-3 mb-6 text-sm text-zinc-500">
        Smart help for follow-ups, leads, and weekly reviews.
      </p>

      <div className="sp-card sp-shadow overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#0b0f14] via-[#111827] to-[#1e3a8a] px-6 py-12 text-center text-white sm:px-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Sparkles className="h-7 w-7 text-blue-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Coming soon
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            WPC AI
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-300">
            We&apos;re building AI that drafts messages, ranks leads, and
            summarises your week — tuned for Indian local businesses.
          </p>
        </div>

        <ul className="divide-y divide-zinc-100">
          {upcoming.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 px-5 py-4 text-sm text-zinc-700"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              {item}
            </li>
          ))}
        </ul>

        <p className="border-t border-zinc-100 px-5 py-4 text-center text-xs text-zinc-400">
          You&apos;ll see it here as soon as it&apos;s ready. No setup needed.
        </p>
      </div>
    </div>
  );
}
