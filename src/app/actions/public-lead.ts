"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusinessPlanLimits } from "@/lib/plan-limits";
import {
  enabledFields,
  parseLeadFormConfig,
  type LeadFormField,
} from "@/lib/lead-form";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

function normalizePhone(phone: string) {
  return phone.replace(/[\s\-()]/g, "");
}

function readAnswers(formData: FormData, fields: LeadFormField[]) {
  const responses: Record<string, string> = {};
  let name = "";
  let phone = "";
  let email = "";
  let message = "";
  const errors: string[] = [];

  for (const field of fields) {
    if (!field.enabled) continue;
    const raw = String(formData.get(`field_${field.key}`) ?? "").trim();
    if (field.required && !raw) {
      errors.push(`${field.label} is required`);
      continue;
    }
    if (!raw) continue;

    if (field.key === "name") name = raw;
    else if (field.key === "phone") phone = normalizePhone(raw);
    else if (field.key === "email") {
      if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        errors.push("Enter a valid email");
      } else {
        email = raw;
      }
    } else if (field.key === "message") message = raw;
    else responses[field.label] = raw;
  }

  if (name.length < 2) errors.push("Name is required");
  if (phone.length < 8) errors.push("Phone is required");

  return { name, phone, email, message, responses, errors };
}

function responsesToNotes(
  message: string,
  responses: Record<string, string>,
) {
  const parts: string[] = [];
  if (message) parts.push(message);
  for (const [label, value] of Object.entries(responses)) {
    parts.push(`${label}: ${value}`);
  }
  return parts.length ? parts.join("\n") : null;
}

export async function submitPublicLead(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const business = await prisma.business.findFirst({
    where: {
      publicFormSlug: slug,
      deletedAt: null,
      suspendedAt: null,
      leadFormEnabled: true,
    },
    include: {
      memberships: {
        where: {
          isActive: true,
          deletedAt: null,
          role: { in: ["OWNER", "MANAGER", "STAFF"] },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      pipelineStages: {
        where: { isWon: false, isLost: false },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });

  if (!business) throw new Error("Form not found");

  const config = parseLeadFormConfig(business.leadFormConfig);
  const fields = enabledFields(config);
  const { name, phone, email, message, responses, errors } = readAnswers(
    formData,
    fields,
  );

  if (errors.length) {
    throw new Error(errors[0]);
  }

  const notes = responsesToNotes(message, responses);
  const formResponses = {
    ...(message ? { Message: message } : {}),
    ...responses,
  } as Prisma.InputJsonValue;

  const existing = await prisma.contact.findFirst({
    where: { businessId: business.id, phone, deletedAt: null },
  });

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        email: email || existing.email,
        notes: notes
          ? existing.notes
            ? `${existing.notes}\n\n— Form update —\n${notes}`
            : notes
          : existing.notes,
        formResponses,
        lastActivityAt: new Date(),
        activities: {
          create: {
            businessId: business.id,
            type: "SYSTEM",
            body: "Submitted the lead capture form again",
          },
        },
      },
    });
    revalidatePath("/app/contacts");
    revalidatePath(`/app/contacts/${existing.id}`);
    revalidatePath("/app");
    redirect(`/f/${slug}/thanks`);
  }

  const limits = await getBusinessPlanLimits(business.id);
  const contactCount = await prisma.contact.count({
    where: { businessId: business.id, deletedAt: null },
  });
  if (contactCount >= limits.maxContacts) {
    redirect(`/f/${slug}/thanks`);
  }

  const assigneeId = business.memberships[0]?.userId;
  const stageId = business.pipelineStages[0]?.id;

  const contact = await prisma.contact.create({
    data: {
      businessId: business.id,
      type: "LEAD",
      name,
      phone,
      email: email || null,
      source: "WEBSITE",
      sourceDetail: "Lead capture form",
      notes,
      formResponses,
      assignedToId: assigneeId,
      lastActivityAt: new Date(),
      activities: {
        create: {
          businessId: business.id,
          type: "SYSTEM",
          body: "Lead captured from public form",
        },
      },
      ...(assigneeId
        ? {
            tasks: {
              create: {
                businessId: business.id,
                title: `Call new website lead: ${name}`,
                dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                assignedToId: assigneeId,
                priority: "HIGH",
              },
            },
          }
        : {}),
      ...(stageId && assigneeId
        ? {
            deals: {
              create: {
                businessId: business.id,
                stageId,
                title: `${name} — website form`,
                assignedToId: assigneeId,
              },
            },
          }
        : {}),
    },
  });

  void import("@/lib/automation-runner")
    .then(({ runNewLeadFollowup }) =>
      runNewLeadFollowup({
        businessId: business.id,
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
      }),
    )
    .catch(() => undefined);

  revalidatePath("/app/contacts");
  revalidatePath("/app");
  revalidatePath("/app/pipeline");
  revalidatePath("/app/tasks");
  redirect(`/f/${slug}/thanks`);
}
