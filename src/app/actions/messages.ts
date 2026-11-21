"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireContactInTenant, requireTenant } from "@/lib/tenant";
import { draftFollowUpMessage } from "@/lib/ai";
import {
  getWhatsAppConfig,
  isWhatsAppReady,
  renderTemplateBody,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export async function logOutboundMessage(formData: FormData) {
  const ctx = await requireTenant();

  const contactId = String(formData.get("contactId") || "");
  const body = String(formData.get("body") || "").trim();
  const templateId = String(formData.get("templateId") || "") || null;
  const sendLive = formData.get("sendLive") === "on" || formData.get("sendLive") === "true";
  if (!contactId || !body) throw new Error("Message required");
  const contact = await requireContactInTenant(ctx.businessId, contactId);

  let status = "logged";
  let externalId: string | null = null;
  let sendError: string | null = null;

  if (sendLive) {
    const config = await getWhatsAppConfig(ctx.businessId);
    if (isWhatsAppReady(config) && config) {
      const result = await sendWhatsAppMessage({
        config,
        to: contact.phone,
        body,
      });
      if (result.ok) {
        status = "sent";
        externalId = result.externalId;
      } else {
        status = "failed";
        sendError = result.error;
      }
    } else {
      status = "failed";
      sendError = "WhatsApp API not configured";
    }
  }

  await prisma.message.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      templateId,
      direction: "OUTBOUND",
      channel: "whatsapp",
      body: sendError ? `${body}\n\n[send: ${sendError}]` : body,
      status,
      externalId,
      sentById: ctx.user.id,
    },
  });

  await prisma.activity.create({
    data: {
      businessId: ctx.businessId,
      contactId,
      type: "MESSAGE",
      body: `WhatsApp (${status}): ${body.slice(0, 120)}`,
      createdById: ctx.user.id,
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastActivityAt: new Date() },
  });

  revalidatePath(`/app/contacts/${contactId}`);
  revalidatePath("/app/messages");
}

export async function broadcastTemplate(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");

  const templateId = String(formData.get("templateId") || "");
  const segment = String(formData.get("segment") || "customers");
  const sendLive = formData.get("sendLive") === "true";

  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, businessId: ctx.businessId },
  });
  if (!template) throw new Error("Template not found");

  const contacts = await prisma.contact.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...(segment === "customers" ? { type: "CUSTOMER" } : { type: "LEAD" }),
    },
    take: 200,
  });

  const config = await getWhatsAppConfig(ctx.businessId);
  const canSend = sendLive && isWhatsAppReady(config);

  let sent = 0;
  let failed = 0;
  let queued = 0;

  for (const c of contacts) {
    const body = renderTemplateBody(template.body, {
      name: c.name,
      invoice: "",
    });

    let status = "queued";
    let externalId: string | null = null;
    let note: string | null = null;

    if (canSend && config) {
      const result = await sendWhatsAppMessage({
        config,
        to: c.phone,
        body,
        waTemplateName: template.waTemplateName,
        templateParams: [c.name],
      });
      if (result.ok) {
        status = "sent";
        externalId = result.externalId;
        sent += 1;
      } else {
        status = "failed";
        note = result.error;
        failed += 1;
      }
    } else {
      queued += 1;
    }

    await prisma.message.create({
      data: {
        businessId: ctx.businessId,
        contactId: c.id,
        templateId: template.id,
        direction: "OUTBOUND",
        channel: "whatsapp",
        body: note ? `${body}\n\n[send: ${note}]` : body,
        status,
        externalId,
        sentById: ctx.user.id,
      },
    });

    await prisma.contact.update({
      where: { id: c.id },
      data: { lastActivityAt: new Date() },
    });
  }

  revalidatePath("/app/messages");
  return { ok: true as const, sent, failed, queued, total: contacts.length };
}

export async function generateDraft(formData: FormData) {
  const contactName = String(formData.get("contactName") || "there");
  const context = String(formData.get("context") || "");
  return {
    draft: draftFollowUpMessage({ contactName, context }),
  };
}
