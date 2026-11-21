import Link from "next/link";
import { Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ensureDefaultAutomations } from "@/app/actions/automations";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

const upcoming = [
  "New lead follow-up WhatsApp",
  "Appointment confirmation",
  "Overdue invoice reminder",
  "Birthday greeting",
  "Win-back after 60 days inactive",
];

export default async function AutomationsPage() {
  const ctx = await requireTenant();
  await ensureDefaultAutomations();

  const automations = await prisma.automation.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Automations"
        actions={
          <Link href="/app/messages">
            <Button variant="secondary">WhatsApp send</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Auto WhatsApp rules — coming soon. Manual send &amp; invoice share
        still work under WhatsApp.
      </p>

      <div className="sp-card sp-shadow mb-5 overflow-hidden">
        <div className="bg-gradient-to-br from-[#0b0f14] via-[#111827] to-[#1e3a8a] px-6 py-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Zap className="h-6 w-6 text-blue-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Coming soon
          </p>
          <h2 className="mt-2 text-xl font-bold">WhatsApp automations</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
            Rules that message customers for you. Manual broadcasts and
            invoice WhatsApp share are available now.
          </p>
        </div>
        <ul className="divide-y divide-zinc-100">
          {upcoming.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-zinc-700"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Planned rules
      </h3>
      <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden opacity-70">
        {automations.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 px-5 py-4"
          >
            <div>
              <p className="font-semibold text-zinc-900">{a.name}</p>
              <p className="text-xs text-zinc-500">{a.key}</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
              Soon
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
