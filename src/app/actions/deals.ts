"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { dealMoveSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/money";
import { touchContactActivity } from "@/lib/contact-activity";
import { revalidateDealGraph } from "@/lib/revalidate-crm";

export async function createDeal(formData: FormData) {
  const ctx = await requireTenant();

  const contactId = String(formData.get("contactId") || "");
  const title = String(formData.get("title") || "").trim();
  const valuePaise = rupeesToPaise(Number(formData.get("valueRupees") || 0));
  let stageId = String(formData.get("stageId") || "");

  if (!contactId || !title) {
    return { error: "Contact and title are required" };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!contact) return { error: "Contact not found" };

  if (!stageId) {
    const first = await prisma.pipelineStage.findFirst({
      where: {
        businessId: ctx.businessId,
        isWon: false,
        isLost: false,
      },
      orderBy: { position: "asc" },
    });
    if (!first) return { error: "No pipeline stages configured" };
    stageId = first.id;
  } else {
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        businessId: ctx.businessId,
        isWon: false,
        isLost: false,
      },
    });
    if (!stage) return { error: "Invalid stage" };
  }

  const maxPos = await prisma.deal.aggregate({
    where: { businessId: ctx.businessId, stageId, deletedAt: null },
    _max: { position: true },
  });

  const deal = await prisma.deal.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      stageId,
      title,
      valuePaise,
      assignedToId: contact.assignedToId ?? ctx.user.id,
      position: (maxPos._max.position ?? 0) + 1,
      activities: {
        create: {
          businessId: ctx.businessId,
          contactId,
          type: "NOTE",
          body: `Deal created: ${title}`,
          createdById: ctx.user.id,
        },
      },
    },
  });

  await touchContactActivity(contactId);
  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "Deal",
    entityId: deal.id,
    after: { title, stageId, valuePaise },
  });

  // Auto follow-up so quote/price asks don't disappear
  await prisma.task.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      dealId: deal.id,
      title: `Follow up: ${title}`,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority: "MEDIUM",
      assignedToId: contact.assignedToId ?? ctx.user.id,
    },
  });

  revalidatePath("/app/pipeline");
  revalidatePath("/app");
  revalidatePath(`/app/contacts/${contactId}`);
  return { ok: true, id: deal.id };
}

export async function moveDeal(input: {
  dealId: string;
  stageId: string;
  lostReason?: string;
}) {
  const ctx = await requireTenant();
  const parsed = dealMoveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const deal = await prisma.deal.findFirst({
    where: {
      id: parsed.data.dealId,
      businessId: ctx.businessId,
      deletedAt: null,
    },
    include: { stage: true, contact: true },
  });
  if (!deal) return { error: "Deal not found" };

  const stage = await prisma.pipelineStage.findFirst({
    where: { id: parsed.data.stageId, businessId: ctx.businessId },
  });
  if (!stage) return { error: "Stage not found" };

  if (stage.isLost && !parsed.data.lostReason?.trim()) {
    return { error: "Lost reason is required" };
  }

  const status = stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN";

  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: stage.id,
      status,
      lostReason: stage.isLost ? parsed.data.lostReason : null,
      wonAt: stage.isWon ? new Date() : null,
      lostAt: stage.isLost ? new Date() : null,
      activities: {
        create: {
          businessId: ctx.businessId,
          contactId: deal.contactId,
          type: "STATUS_CHANGE",
          body: `Moved to ${stage.name}${
            stage.isLost ? ` (${parsed.data.lostReason})` : ""
          }`,
          createdById: ctx.user.id,
        },
      },
    },
  });

  if (stage.isWon) {
    await prisma.contact.update({
      where: { id: deal.contactId },
      data: {
        type: "CUSTOMER",
        convertedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  } else {
    await prisma.contact.update({
      where: { id: deal.contactId },
      data: { lastActivityAt: new Date() },
    });
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "UPDATE",
    entityType: "Deal",
    entityId: deal.id,
    before: { stageId: deal.stageId, status: deal.status },
    after: { stageId: updated.stageId, status: updated.status },
  });

  revalidateDealGraph({ contactId: deal.contactId });

  if (stage.isWon) {
    const linked = await prisma.portfolioClient.findFirst({
      where: {
        businessId: ctx.businessId,
        contactId: deal.contactId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!linked) {
      return {
        ok: true as const,
        needsPortfolio: true as const,
        contactId: deal.contactId,
      };
    }
  }

  return { ok: true as const };
}
