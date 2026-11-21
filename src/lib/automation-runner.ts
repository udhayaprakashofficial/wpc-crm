import { prisma } from "@/lib/prisma";
import {
  getWhatsAppConfig,
  isWhatsAppReady,
  renderTemplateBody,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

/** WhatsApp automations are gated until the feature ships. */
export const WHATSAPP_AUTOMATIONS_ENABLED = false;

async function isAutomationOn(businessId: string, key: string) {
  if (!WHATSAPP_AUTOMATIONS_ENABLED) return false;
  const row = await prisma.automation.findUnique({
    where: { businessId_key: { businessId, key } },
  });
  return !!row?.enabled;
}

async function findTemplate(
  businessId: string,
  names: string[],
  category?: string,
) {
  for (const name of names) {
    const t = await prisma.messageTemplate.findFirst({
      where: {
        businessId,
        active: true,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (t) return t;
  }
  if (category) {
    return prisma.messageTemplate.findFirst({
      where: { businessId, active: true, category },
      orderBy: { createdAt: "asc" },
    });
  }
  return null;
}

async function deliverAutomatedMessage(input: {
  businessId: string;
  contactId: string;
  phone: string;
  contactName: string;
  body: string;
  templateId?: string | null;
  waTemplateName?: string | null;
  templateParams?: string[];
  userId?: string | null;
}) {
  const config = await getWhatsAppConfig(input.businessId);
  let status = "queued";
  let externalId: string | null = null;
  let errorNote: string | null = null;

  if (isWhatsAppReady(config) && config) {
    const result = await sendWhatsAppMessage({
      config,
      to: input.phone,
      body: input.body,
      waTemplateName: input.waTemplateName,
      templateParams: input.templateParams,
    });
    if (result.ok) {
      status = "sent";
      externalId = result.externalId;
    } else if (result.status === "skipped") {
      status = "queued";
      errorNote = result.error;
    } else {
      status = "failed";
      errorNote = result.error;
    }
  }

  const message = await prisma.message.create({
    data: {
      businessId: input.businessId,
      contactId: input.contactId,
      templateId: input.templateId ?? null,
      direction: "OUTBOUND",
      channel: "whatsapp",
      body: errorNote ? `${input.body}\n\n[send: ${errorNote}]` : input.body,
      status,
      externalId,
      sentById: input.userId ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      businessId: input.businessId,
      contactId: input.contactId,
      type: "MESSAGE",
      body: `WhatsApp auto (${status}): ${input.body.slice(0, 100)}`,
      createdById: input.userId ?? null,
    },
  });

  await prisma.contact.update({
    where: { id: input.contactId },
    data: { lastActivityAt: new Date() },
  });

  return message;
}

/** New lead → WhatsApp follow-up + optional task already handled elsewhere. */
export async function runNewLeadFollowup(input: {
  businessId: string;
  contactId: string;
  contactName: string;
  phone: string;
  userId?: string | null;
}) {
  if (!(await isAutomationOn(input.businessId, "new_lead_followup"))) return;

  const template =
    (await findTemplate(input.businessId, [
      "New lead follow-up",
      "Welcome",
      "Quote sent",
    ])) ??
    (await findTemplate(input.businessId, [], "sales"));

  const body = renderTemplateBody(
    template?.body ||
      "Hi {{name}}, thanks for reaching out! We'll get back to you shortly.",
    { name: input.contactName },
  );

  await deliverAutomatedMessage({
    businessId: input.businessId,
    contactId: input.contactId,
    phone: input.phone,
    contactName: input.contactName,
    body,
    templateId: template?.id,
    waTemplateName: template?.waTemplateName,
    templateParams: [input.contactName],
    userId: input.userId,
  });
}

/** Appointment booked → confirmation WhatsApp. */
export async function runAppointmentReminder(input: {
  businessId: string;
  contactId: string;
  contactName: string;
  phone: string;
  title: string;
  startsAt: Date;
  userId?: string | null;
}) {
  if (!(await isAutomationOn(input.businessId, "appointment_reminder"))) {
    return;
  }

  const template = await findTemplate(input.businessId, [
    "Appointment reminder",
    "Appointment confirmation",
  ]);

  const when = input.startsAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  const body = renderTemplateBody(
    template?.body ||
      "Hi {{name}}, reminder: {{title}} on {{when}}. See you soon!",
    {
      name: input.contactName,
      title: input.title,
      when,
    },
  );

  await deliverAutomatedMessage({
    businessId: input.businessId,
    contactId: input.contactId,
    phone: input.phone,
    contactName: input.contactName,
    body,
    templateId: template?.id,
    waTemplateName: template?.waTemplateName,
    templateParams: [input.contactName, input.title, when],
    userId: input.userId,
  });
}

/** Invoice flipped to OVERDUE → payment reminder. */
export async function runInvoiceOverdueReminder(input: {
  businessId: string;
  contactId: string;
  contactName: string;
  phone: string;
  invoiceNumber: string;
  userId?: string | null;
}) {
  if (!(await isAutomationOn(input.businessId, "invoice_overdue"))) return;

  const template = await findTemplate(
    input.businessId,
    ["Payment reminder", "Overdue invoice"],
    "finance",
  );

  const body = renderTemplateBody(
    template?.body ||
      "Hi {{name}}, gentle reminder that invoice {{invoice}} is due. Thank you!",
    {
      name: input.contactName,
      invoice: input.invoiceNumber,
    },
  );

  await deliverAutomatedMessage({
    businessId: input.businessId,
    contactId: input.contactId,
    phone: input.phone,
    contactName: input.contactName,
    body,
    templateId: template?.id,
    waTemplateName: template?.waTemplateName,
    templateParams: [input.contactName, input.invoiceNumber],
    userId: input.userId,
  });
}

/** Batch jobs: birthdays today + inactive 60+ days. */
export async function runScheduledAutomations(businessId: string) {
  const results = { birthdays: 0, inactive: 0, errors: 0 };

  if (await isAutomationOn(businessId, "birthday_greeting")) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const contacts = await prisma.$queryRaw<
      { id: string; name: string; phone: string }[]
    >`
      SELECT id, name, phone FROM "Contact"
      WHERE "businessId" = ${businessId}
        AND "deletedAt" IS NULL
        AND birthday IS NOT NULL
        AND EXTRACT(MONTH FROM birthday) = ${month}
        AND EXTRACT(DAY FROM birthday) = ${day}
      LIMIT 100
    `;

    const template = await findTemplate(
      businessId,
      ["Birthday wish", "Birthday greeting"],
      "engagement",
    );

    for (const c of contacts) {
      try {
        const body = renderTemplateBody(
          template?.body ||
            "Happy Birthday {{name}}! Wishing you a wonderful year ahead.",
          { name: c.name },
        );
        await deliverAutomatedMessage({
          businessId,
          contactId: c.id,
          phone: c.phone,
          contactName: c.name,
          body,
          templateId: template?.id,
          waTemplateName: template?.waTemplateName,
          templateParams: [c.name],
        });
        results.birthdays += 1;
      } catch {
        results.errors += 1;
      }
    }
  }

  if (await isAutomationOn(businessId, "inactive_customer")) {
    const { inactiveCustomerWhere } = await import("@/lib/winback");
    const contacts = await prisma.contact.findMany({
      where: inactiveCustomerWhere(businessId),
      take: 50,
      orderBy: { lastActivityAt: "asc" },
    });

    const template = await findTemplate(businessId, [
      "We miss you",
      "Win back",
      "Inactive customer",
    ]);

    for (const c of contacts) {
      try {
        const body = renderTemplateBody(
          template?.body ||
            "Hi {{name}}, it's been a while! We'd love to see you again — reply anytime.",
          { name: c.name },
        );
        await deliverAutomatedMessage({
          businessId,
          contactId: c.id,
          phone: c.phone,
          contactName: c.name,
          body,
          templateId: template?.id,
          waTemplateName: template?.waTemplateName,
          templateParams: [c.name],
        });
        results.inactive += 1;
      } catch {
        results.errors += 1;
      }
    }
  }

  return results;
}
