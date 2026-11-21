"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireContactInTenant,
  requireTenant,
  writeAudit,
} from "@/lib/tenant";
import { taskSchema } from "@/lib/validations";
import { touchContactActivity } from "@/lib/contact-activity";

export async function createTask(formData: FormData) {
  const ctx = await requireTenant();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    note: formData.get("note") || "",
    dueAt: formData.get("dueAt"),
    contactId: formData.get("contactId") || "",
    dealId: formData.get("dealId") || "",
    priority: formData.get("priority") || "MEDIUM",
    assignedToId: formData.get("assignedToId") || "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  if (data.contactId) {
    await requireContactInTenant(ctx.businessId, data.contactId);
  }
  const task = await prisma.task.create({
    data: {
      businessId: ctx.businessId,
      title: data.title,
      note: data.note || null,
      dueAt: new Date(data.dueAt),
      priority: data.priority,
      assignedToId: data.assignedToId || ctx.user.id,
      contactId: data.contactId || null,
      dealId: data.dealId || null,
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    after: { title: task.title, dueAt: task.dueAt },
  });

  revalidatePath("/app");
  revalidatePath("/app/tasks");
  redirect("/app/tasks");
}

export async function completeTask(formData: FormData) {
  const ctx = await requireTenant();
  const taskId = String(formData.get("taskId") || "");
  const outcomeNote = String(formData.get("outcomeNote") || "");
  const nextFollowUpAt = String(formData.get("nextFollowUpAt") || "");

  const task = await prisma.task.findFirst({
    where: { id: taskId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "DONE",
      outcomeNote: outcomeNote || null,
      completedAt: new Date(),
    },
  });

  if (nextFollowUpAt) {
    await prisma.task.create({
      data: {
        businessId: ctx.businessId,
        title: `Next: ${task.title}`,
        dueAt: new Date(nextFollowUpAt),
        assignedToId: task.assignedToId,
        contactId: task.contactId,
        dealId: task.dealId,
        note: outcomeNote || null,
      },
    });
  }

  if (task.contactId) {
    await prisma.activity.create({
      data: {
        businessId: ctx.businessId,
        contactId: task.contactId,
        dealId: task.dealId,
        type: "NOTE",
        body: outcomeNote
          ? `Follow-up done: ${outcomeNote}`
          : "Follow-up marked done",
        createdById: ctx.user.id,
      },
    });
    await touchContactActivity(task.contactId);
  }

  revalidatePath("/app");
  revalidatePath("/app/tasks");
}
