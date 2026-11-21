"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import {
  getWhatsAppConfig,
  isWhatsAppReady,
  sendWhatsAppText,
} from "@/lib/whatsapp";

export async function saveWhatsAppSettings(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const enabled = formData.get("waEnabled") === "on";
  const phoneNumberId = String(formData.get("waPhoneNumberId") || "").trim();
  const accessTokenRaw = String(formData.get("waAccessToken") || "").trim();
  const verifyToken = String(formData.get("waVerifyToken") || "").trim();
  const country = String(formData.get("waDefaultCountryCode") || "91")
    .replace(/\D/g, "")
    .slice(0, 3) || "91";

  const existing = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: { waAccessToken: true },
  });

  // Keep previous token if the form left the masked field blank
  const accessToken =
    !accessTokenRaw || accessTokenRaw === "••••••••"
      ? existing.waAccessToken
      : accessTokenRaw;

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      waEnabled: enabled,
      waPhoneNumberId: phoneNumberId || null,
      waAccessToken: accessToken || null,
      waVerifyToken: verifyToken || null,
      waDefaultCountryCode: country,
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "UPDATE",
    entityType: "BusinessWhatsApp",
    entityId: ctx.businessId,
    after: {
      waEnabled: enabled,
      waPhoneNumberId: phoneNumberId || null,
      hasToken: !!accessToken,
    },
  });

  revalidatePath("/app/settings/whatsapp");
  revalidatePath("/app/messages");
  revalidatePath("/app/settings");
}

export async function sendWhatsAppTest(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return { error: "No permission" };
  }

  const to = String(formData.get("to") || "").trim();
  if (!to) return { error: "Enter a phone number" };

  const config = await getWhatsAppConfig(ctx.businessId);
  if (!isWhatsAppReady(config) || !config) {
    return {
      error:
        "Save Phone Number ID + Access Token and turn WhatsApp on first.",
    };
  }

  const result = await sendWhatsAppText({
    config,
    to,
    body: `Test from WPC CRM (${new Date().toLocaleString("en-IN")}). Your WhatsApp API is connected.`,
  });

  if (!result.ok) return { error: result.error };
  return { ok: true as const, externalId: result.externalId };
}
