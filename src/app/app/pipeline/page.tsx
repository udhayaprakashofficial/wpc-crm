import { Suspense } from "react";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  contactVisibilityFilter,
  dealVisibilityFilter,
  requireTenant,
} from "@/lib/tenant";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PageHeader } from "@/components/ui/page-header";

async function Board() {
  const ctx = await requireTenant();
  const recentCutoff = subDays(new Date(), 60);

  const [stages, openDeals, closedDeals, contacts] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { position: "asc" },
    }),
    prisma.deal.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        status: "OPEN",
        ...dealVisibilityFilter(ctx),
      },
      include: {
        contact: { select: { name: true, phone: true } },
      },
      orderBy: { position: "asc" },
    }),
    // Keep Won / Lost columns useful — recent closed deals
    prisma.deal.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        status: { in: ["WON", "LOST"] },
        AND: [
          {
            OR: [
              { wonAt: { gte: recentCutoff } },
              { lostAt: { gte: recentCutoff } },
              { updatedAt: { gte: recentCutoff } },
            ],
          },
          dealVisibilityFilter(ctx),
        ],
      },
      include: {
        contact: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.contact.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        ...contactVisibilityFilter(ctx),
      },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const deals = [...openDeals, ...closedDeals];

  return (
    <PipelineBoard
      stages={stages.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        isLost: s.isLost,
        isWon: s.isWon,
      }))}
      deals={deals.map((d) => ({
        id: d.id,
        title: d.title,
        valuePaise: d.valuePaise,
        stageId: d.stageId,
        status: d.status,
        contact: d.contact,
      }))}
      contacts={contacts}
    />
  );
}

export default function PipelinePage() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <PageHeader title="Pipeline" />
      <p className="-mt-3 mb-4 text-sm text-zinc-500">
        Track every lead from New → Quote → Won. Scroll sideways to see all
        stages. Lost deals need a reason.
      </p>
      <Suspense
        fallback={
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        }
      >
        <Board />
      </Suspense>
    </div>
  );
}
