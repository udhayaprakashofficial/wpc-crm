import { differenceInCalendarDays, format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import { getFyBounds } from "@/lib/fy";
import {
  AssignStaffTargetForm,
  UpdateGoalForm,
} from "@/components/goals/goal-forms";
import { PageHeader } from "@/components/ui/page-header";

export default async function GoalsPage() {
  const ctx = await requireTenant();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });
  const { fyYear, start, end } = getFyBounds(business.fyStartMonth);
  const canEdit = ctx.role === "OWNER" || ctx.role === "MANAGER";

  const [goal, income, members] = await Promise.all([
    prisma.goal.findFirst({
      where: {
        businessId: ctx.businessId,
        type: "REVENUE",
        period: "YEAR",
        fyYear,
        deletedAt: null,
      },
      include: {
        assignments: { include: { user: true } },
        revisions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: start, lt: end },
      },
      _sum: { amountPaise: true },
    }),
    prisma.membership.findMany({
      where: { businessId: ctx.businessId, isActive: true, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const now = new Date();
  const target = goal?.targetPaise ?? business.yearlyRevenueGoalPaise ?? 0;
  const actual = income._sum.amountPaise ?? 0;
  const pct =
    target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  const remaining = Math.max(0, target - actual);
  const monthsLeft = Math.max(
    1,
    (end.getFullYear() - now.getFullYear()) * 12 +
      (end.getMonth() - now.getMonth()),
  );
  const neededPerMonth = Math.round(remaining / monthsLeft);

  const fyDaysTotal = Math.max(1, differenceInCalendarDays(end, start));
  const fyDaysElapsed = Math.max(
    1,
    Math.min(fyDaysTotal, differenceInCalendarDays(now, start) + 1),
  );
  const projected = Math.round((actual / fyDaysElapsed) * fyDaysTotal);
  const onPace = target > 0 && actual > 0 && projected >= target;

  let statusLabel = "Set a yearly target to get started";
  let statusTone = "text-zinc-600";
  if (target > 0 && actual === 0) {
    statusLabel = "Record sales to see progress against this goal";
    statusTone = "text-zinc-600";
  } else if (target > 0 && remaining === 0) {
    statusLabel = "Goal reached — well done";
    statusTone = "text-emerald-700";
  } else if (onPace) {
    statusLabel = "On pace to hit this year’s goal";
    statusTone = "text-emerald-700";
  } else if (target > 0 && actual > 0) {
    statusLabel = `Need about ${formatINR(neededPerMonth)} / month to finish`;
    statusTone = "text-amber-700";
  }

  const fyLabel = `${format(start, "MMM yyyy")} – ${format(subDays(end, 1), "MMM yyyy")}`;

  return (
    <div>
      <PageHeader title="Goals" />

      {/* Hero: one clear picture */}
      <section className="sp-card sp-shadow mb-5 overflow-hidden">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white px-5 py-5">
          <p className="text-sm font-medium text-zinc-500">
            Yearly revenue · {fyLabel}
          </p>

          {target > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-4xl font-bold tracking-tight text-zinc-950">
                  {formatINR(actual)}
                </p>
                <p className="pb-1 text-base text-zinc-500">
                  of {formatINR(target)}
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    remaining === 0
                      ? "bg-emerald-500"
                      : onPace
                        ? "bg-blue-600"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.max(pct, actual > 0 ? 2 : 0)}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-sm font-medium ${statusTone}`}>
                  {statusLabel}
                </p>
                <p className="text-sm text-zinc-500">{pct}% done</p>
              </div>

              {remaining > 0 && (
                <p className="mt-3 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">
                    {formatINR(remaining)}
                  </span>{" "}
                  left · ~{monthsLeft} month{monthsLeft === 1 ? "" : "s"} in the
                  year
                </p>
              )}
            </>
          ) : (
            <div className="mt-3">
              <p className="text-2xl font-bold text-zinc-950">No goal yet</p>
              <p className={`mt-1 text-sm ${statusTone}`}>{statusLabel}</p>
            </div>
          )}
        </div>
      </section>

      {/* Team targets */}
      {goal && goal.assignments.length > 0 && (
        <section className="sp-card sp-shadow mb-5 p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Team targets
          </h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {goal.assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium text-zinc-800">{a.user.name}</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {formatINR(a.targetPaise ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canEdit && (
        <UpdateGoalForm
          fyYear={fyYear}
          targetRupees={target ? String(target / 100) : ""}
          hasTarget={target > 0}
        />
      )}

      {canEdit && goal && (
        <AssignStaffTargetForm
          goalId={goal.id}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
          }))}
        />
      )}

      {goal && goal.revisions.length > 1 && (
        <section className="px-1 pb-2">
          <h2 className="text-sm font-medium text-zinc-500">Earlier targets</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-500">
            {goal.revisions.slice(1).map((r) => (
              <li key={r.id}>
                {formatINR(r.targetPaise ?? 0)}
                {r.note ? ` · ${r.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
