"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { runScheduledAutomations } from "@/lib/automation-runner";

export async function toggleAutomation(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");
  const id = String(formData.get("id") || "");
  const enabled = formData.get("enabled") === "true";

  await prisma.automation.updateMany({
    where: { id, businessId: ctx.businessId },
    data: { enabled },
  });

  revalidatePath("/app/settings/automations");
}

export async function ensureDefaultAutomations() {
  const ctx = await requireTenant();
  const defaults = [
    {
      key: "new_lead_followup",
      name: "WhatsApp: follow-up for new leads",
    },
    { key: "new_lead_assign", name: "Auto-assign new leads" },
    {
      key: "invoice_overdue",
      name: "WhatsApp: overdue invoice reminder",
    },
    {
      key: "inactive_customer",
      name: "WhatsApp: we miss you (60 days)",
    },
    { key: "birthday_greeting", name: "WhatsApp: birthday greeting" },
    {
      key: "appointment_reminder",
      name: "WhatsApp: appointment confirmation",
    },
  ];

  for (const d of defaults) {
    await prisma.automation.upsert({
      where: {
        businessId_key: { businessId: ctx.businessId, key: d.key },
      },
      update: { name: d.name, enabled: false }, // automations coming soon
      create: {
        businessId: ctx.businessId,
        key: d.key,
        name: d.name,
        enabled: false,
      },
    });
  }
}

export async function runAutomationsNow() {
  const ctx = await requireTenant();
  if (ctx.role === "STAFF") throw new Error("No permission");
  // Gated — do not fire WhatsApp automations yet
  void runScheduledAutomations;
  void ctx;
  revalidatePath("/app/settings/automations");
  return { birthdays: 0, inactive: 0, errors: 0, comingSoon: true as const };
}
