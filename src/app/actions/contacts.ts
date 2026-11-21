"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  assigneeFilter,
  contactVisibilityFilter,
  requireTenant,
  writeAudit,
} from "@/lib/tenant";
import { contactSchema } from "@/lib/validations";
import {
  assertCanDeleteContacts,
  assertContactLimit,
} from "@/lib/plan-limits";
import { rupeesToPaise } from "@/lib/money";
import { revalidatePortfolioGraph } from "@/lib/revalidate-crm";

function normalizePhone(phone: string) {
  return phone.replace(/[\s\-]/g, "");
}

export async function createContact(formData: FormData) {
  const ctx = await requireTenant();
  await assertContactLimit(ctx.businessId);
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    source: formData.get("source") || "OTHER",
    notes: formData.get("notes") || "",
    assignedToId: formData.get("assignedToId") || "",
    createFollowUp: formData.get("createFollowUp") === "on",
    followUpAt: formData.get("followUpAt") || "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  const phone = normalizePhone(data.phone);

  const duplicate = await prisma.contact.findFirst({
    where: {
      businessId: ctx.businessId,
      phone,
      deletedAt: null,
    },
  });
  if (duplicate) {
    throw new Error(
      `A contact with this phone already exists (${duplicate.name}).`,
    );
  }

  const assignedToId =
    data.assignedToId ||
    (ctx.role === "STAFF" ? ctx.user.id : ctx.user.id);

  const newStage = await prisma.pipelineStage.findFirst({
    where: { businessId: ctx.businessId },
    orderBy: { position: "asc" },
  });

  const contact = await prisma.contact.create({
    data: {
      businessId: ctx.businessId,
      name: data.name,
      phone,
      email: data.email || null,
      source: data.source,
      notes: data.notes || null,
      assignedToId,
      lastActivityAt: new Date(),
      activities: {
        create: {
          businessId: ctx.businessId,
          type: "SYSTEM",
          body: "Lead created",
          createdById: ctx.user.id,
        },
      },
      ...(newStage
        ? {
            deals: {
              create: {
                businessId: ctx.businessId,
                stageId: newStage.id,
                title: `${data.name} — opportunity`,
                assignedToId,
                position: 0,
              },
            },
          }
        : {}),
      ...(data.createFollowUp && data.followUpAt
        ? {
            tasks: {
              create: {
                businessId: ctx.businessId,
                title: `Follow up with ${data.name}`,
                dueAt: new Date(data.followUpAt),
                assignedToId,
              },
            },
          }
        : {}),
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "Contact",
    entityId: contact.id,
    after: { name: contact.name, phone: contact.phone },
  });

  // Fire-and-forget WhatsApp automation (new lead follow-up)
  void import("@/lib/automation-runner")
    .then(({ runNewLeadFollowup }) =>
      runNewLeadFollowup({
        businessId: ctx.businessId,
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        userId: ctx.user.id,
      }),
    )
    .catch(() => undefined);

  revalidatePath("/app/contacts");
  revalidatePath("/app/pipeline");
  redirect(`/app/contacts/${contact.id}`);
}

export async function convertToCustomer(contactId: string) {
  const ctx = await requireTenant();
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      businessId: ctx.businessId,
      deletedAt: null,
      ...contactVisibilityFilter(ctx),
    },
  });
  if (!contact) return { error: "Contact not found" };

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      type: "CUSTOMER",
      convertedAt: new Date(),
      lastActivityAt: new Date(),
      activities: {
        create: {
          businessId: ctx.businessId,
          type: "STATUS_CHANGE",
          body: "Converted to customer",
          createdById: ctx.user.id,
        },
      },
    },
  });

  revalidatePath(`/app/contacts/${contactId}`);
  // Collect portfolio details next
  redirect(`/app/contacts/${contactId}/convert`);
}

/** Convert lead → customer (if needed) and create linked Portfolio client. */
export async function convertLeadToCustomerAndPortfolio(formData: FormData) {
  const ctx = await requireTenant();
  const contactId = String(formData.get("contactId") || "");
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      businessId: ctx.businessId,
      deletedAt: null,
      ...contactVisibilityFilter(ctx),
    },
  });
  if (!contact) throw new Error("Contact not found");

  const name = String(formData.get("name") || "").trim() || contact.name;
  const statusRaw = String(formData.get("status") || "CURRENT");
  const status = statusRaw === "COMPLETED" ? "COMPLETED" : "CURRENT";
  const businessDetails =
    String(formData.get("businessDetails") || "").trim() || null;
  const services = String(formData.get("services") || "").trim() || null;
  if (!businessDetails || !services) {
    throw new Error("Business details and services are required");
  }

  const perSaleRaw = String(formData.get("revenuePerSaleRupees") || "").trim();
  const expenseRaw = String(formData.get("expenseRupees") || "").trim();

  if (contact.type !== "CUSTOMER") {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        type: "CUSTOMER",
        convertedAt: new Date(),
        lastActivityAt: new Date(),
        activities: {
          create: {
            businessId: ctx.businessId,
            type: "STATUS_CHANGE",
            body: "Converted to customer · added to portfolio",
            createdById: ctx.user.id,
          },
        },
      },
    });
  }

  const existing = await prisma.portfolioClient.findFirst({
    where: {
      businessId: ctx.businessId,
      contactId: contact.id,
      deletedAt: null,
    },
  });

  let portfolioId = existing?.id;
  if (!existing) {
    const created = await prisma.portfolioClient.create({
      data: {
        businessId: ctx.businessId,
        contactId: contact.id,
        name,
        status,
        businessDetails,
        services,
        industry: String(formData.get("industry") || "").trim() || null,
        website: String(formData.get("website") || "").trim() || null,
        workHistory: String(formData.get("workHistory") || "").trim() || null,
        achievements: String(formData.get("achievements") || "").trim() || null,
        revenuePerSalePaise:
          perSaleRaw === "" ? null : rupeesToPaise(perSaleRaw),
        expensePaise: expenseRaw === "" ? null : rupeesToPaise(expenseRaw),
        startedAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    portfolioId = created.id;
    await writeAudit({
      businessId: ctx.businessId,
      userId: ctx.user.id,
      action: "CREATE",
      entityType: "PortfolioClient",
      entityId: created.id,
      after: { name, contactId: contact.id },
    });
  }

  revalidatePortfolioGraph({
    clientId: portfolioId,
    contactId,
  });
  redirect(`/app/portfolio?clientId=${portfolioId}`);
}

export async function softDeleteContact(contactId: string) {
  const ctx = await requireTenant();
  await assertCanDeleteContacts(ctx.businessId);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!contact) return { error: "Not found" };

  await prisma.contact.update({
    where: { id: contactId },
    data: { deletedAt: new Date() },
  });
  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "DELETE",
    entityType: "Contact",
    entityId: contactId,
    before: contact,
  });
  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

/**
 * Log a win-back outreach: activity + optional follow-up task + refresh lastActivityAt
 * so the customer leaves the inactive list.
 */
export async function logWinBackOutreach(formData: FormData) {
  const ctx = await requireTenant();
  const contactId = String(formData.get("contactId") || "");
  const channel = String(formData.get("channel") || "whatsapp").toLowerCase();
  const note = String(formData.get("note") || "").trim();
  const scheduleFollowUp = formData.get("scheduleFollowUp") !== "off";

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      businessId: ctx.businessId,
      deletedAt: null,
      ...assigneeFilter(ctx),
    },
  });
  if (!contact) throw new Error("Contact not found");
  if (contact.type !== "CUSTOMER") {
    throw new Error("Win-back is for customers only");
  }

  const channelLabel =
    channel === "call" ? "Call" : channel === "visit" ? "Visit" : "WhatsApp";
  const body =
    note ||
    `Win-back outreach via ${channelLabel}. Reached out after inactivity.`;

  await prisma.$transaction([
    prisma.activity.create({
      data: {
        businessId: ctx.businessId,
        contactId: contact.id,
        type: channel === "call" ? "CALL" : channel === "visit" ? "VISIT" : "MESSAGE",
        body,
        createdById: ctx.user.id,
      },
    }),
    prisma.contact.update({
      where: { id: contact.id },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  if (scheduleFollowUp) {
    const openTask = await prisma.task.findFirst({
      where: {
        businessId: ctx.businessId,
        contactId: contact.id,
        status: "OPEN",
        deletedAt: null,
        title: { contains: "Win-back", mode: "insensitive" },
      },
    });
    if (!openTask) {
      await prisma.task.create({
        data: {
          businessId: ctx.businessId,
          contactId: contact.id,
          title: `Win-back follow-up: ${contact.name}`,
          dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          assignedToId: contact.assignedToId ?? ctx.user.id,
          priority: "HIGH",
        },
      });
    }
  }

  revalidatePath("/app/contacts");
  revalidatePath(`/app/contacts/${contactId}`);
  revalidatePath("/app");
  revalidatePath("/app/tasks");
  return { ok: true as const };
}
