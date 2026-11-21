"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireContactInTenant, requireTenant } from "@/lib/tenant";

export async function createAppointment(formData: FormData) {
  const ctx = await requireTenant();
  const contactId = String(formData.get("contactId") || "");
  const title = String(formData.get("title") || "").trim();
  const startsAt = String(formData.get("startsAt") || "");
  const durationMins = Number(formData.get("durationMins") || 60);
  const serviceName = String(formData.get("serviceName") || "") || null;
  const assignedToId = String(formData.get("assignedToId") || "") || ctx.user.id;

  if (!contactId || !title || !startsAt) throw new Error("Missing fields");
  await requireContactInTenant(ctx.businessId, contactId);

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const appt = await prisma.appointment.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      title,
      serviceName,
      startsAt: start,
      endsAt: end,
      assignedToId,
      status: "BOOKED",
    },
  });

  await prisma.activity.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      type: "SYSTEM",
      body: `Appointment booked: ${title}`,
      createdById: ctx.user.id,
    },
  });

  await prisma.task.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      title: `Reminder: ${title}`,
      dueAt: new Date(start.getTime() - 2 * 60 * 60 * 1000),
      assignedToId,
      note: "Auto reminder 2h before appointment",
    },
  });

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, businessId: ctx.businessId, deletedAt: null },
  });
  if (contact) {
    void import("@/lib/automation-runner")
      .then(({ runAppointmentReminder }) =>
        runAppointmentReminder({
          businessId: ctx.businessId,
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          title,
          startsAt: start,
          userId: ctx.user.id,
        }),
      )
      .catch(() => undefined);
  }

  revalidatePath("/app/appointments");
  redirect(`/app/appointments?highlight=${appt.id}`);
}

export async function updateAppointmentStatus(formData: FormData) {
  const ctx = await requireTenant();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as
    | "BOOKED"
    | "COMPLETED"
    | "NO_SHOW"
    | "CANCELLED";

  const appt = await prisma.appointment.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
  });
  if (!appt) throw new Error("Not found");

  await prisma.appointment.update({
    where: { id },
    data: { status },
  });

  if (status === "COMPLETED") {
    await prisma.activity.create({
      data: {
        businessId: ctx.businessId,
        contactId: appt.contactId,
        type: "VISIT",
        body: `Appointment completed: ${appt.title}`,
        createdById: ctx.user.id,
      },
    });
  }

  revalidatePath("/app/appointments");
}
