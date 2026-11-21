import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { assigneeFilter, requireTenant } from "@/lib/tenant";
import { completeTask } from "@/app/actions/tasks";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function TasksPage() {
  const ctx = await requireTenant();
  const tasks = await prisma.task.findMany({
    where: {
      businessId: ctx.businessId,
      status: "OPEN",
      deletedAt: null,
      ...assigneeFilter(ctx),
    },
    include: { contact: true },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        actions={
          <Link href="/app/tasks/new">
            <Button>+ Follow-up</Button>
          </Link>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          title="No open follow-ups"
          description="Create a reminder when you talk to a lead."
          action={
            <Link href="/app/tasks/new">
              <Button>+ Follow-up</Button>
            </Link>
          }
        />
      ) : (
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {tasks.map((task) => (
            <li key={task.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{task.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Due {format(task.dueAt, "dd MMM, h:mm a")}
                    {task.contact ? ` · ${task.contact.name}` : ""}
                  </p>
                </div>
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Done
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
