import { prisma } from "@/lib/prisma";

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export type WhatsAppConfig = {
  businessId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string | null;
  defaultCountryCode: string;
  enabled: boolean;
};

export type SendResult =
  | { ok: true; externalId: string; status: "sent" }
  | { ok: false; status: "failed" | "skipped"; error: string };

/** Digits only; prepend India 91 when local 10-digit mobile. */
export function normalizeWaPhone(
  raw: string,
  defaultCountryCode = "91",
): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && defaultCountryCode) {
    digits = `${defaultCountryCode}${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function renderTemplateBody(
  body: string,
  vars: Record<string, string>,
) {
  let out = body;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export async function getWhatsAppConfig(
  businessId: string,
): Promise<WhatsAppConfig | null> {
  // Raw SQL avoids stale PrismaClient DMMF after schema adds (hot reload).
  const rows = await prisma.$queryRaw<
    {
      id: string;
      waEnabled: boolean;
      waPhoneNumberId: string | null;
      waAccessToken: string | null;
      waVerifyToken: string | null;
      waDefaultCountryCode: string;
    }[]
  >`
    SELECT id, "waEnabled", "waPhoneNumberId", "waAccessToken",
           "waVerifyToken", "waDefaultCountryCode"
    FROM "Business"
    WHERE id = ${businessId} AND "deletedAt" IS NULL
    LIMIT 1
  `;
  const business = rows[0];
  if (!business) return null;

  // Per-business credentials; env vars fill gaps only when sending is enabled
  const phoneNumberId =
    business.waPhoneNumberId ||
    (business.waEnabled ? process.env.WHATSAPP_PHONE_NUMBER_ID || "" : "");
  const accessToken =
    business.waAccessToken ||
    (business.waEnabled ? process.env.WHATSAPP_ACCESS_TOKEN || "" : "");
  const verifyToken =
    business.waVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN || null;

  if (!business.waEnabled || !phoneNumberId || !accessToken) return null;

  return {
    businessId: business.id,
    phoneNumberId,
    accessToken,
    verifyToken,
    defaultCountryCode: business.waDefaultCountryCode || "91",
    enabled: true,
  };
}

export function isWhatsAppReady(config: WhatsAppConfig | null) {
  return !!(config?.enabled && config.phoneNumberId && config.accessToken);
}

async function graphSend(
  config: WhatsAppConfig,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        ...payload,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        status: "failed",
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }
    const externalId = data.messages?.[0]?.id || "";
    return { ok: true, externalId, status: "sent" };
  } catch (e) {
    return {
      ok: false,
      status: "failed",
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Free-form text (only works inside 24h customer care window). */
export async function sendWhatsAppText(input: {
  config: WhatsAppConfig;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (!isWhatsAppReady(input.config)) {
    return { ok: false, status: "skipped", error: "WhatsApp not configured" };
  }
  const to = normalizeWaPhone(input.to, input.config.defaultCountryCode);
  if (!to) {
    return { ok: false, status: "failed", error: "Invalid phone number" };
  }
  return graphSend(input.config, {
    to,
    type: "text",
    text: { preview_url: false, body: input.body.slice(0, 4096) },
  });
}

/**
 * Approved Meta template. Use outside the 24h window.
 * `waTemplateName` must match the name in Meta Business Manager.
 */
export async function sendWhatsAppTemplate(input: {
  config: WhatsAppConfig;
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<SendResult> {
  if (!isWhatsAppReady(input.config)) {
    return { ok: false, status: "skipped", error: "WhatsApp not configured" };
  }
  const to = normalizeWaPhone(input.to, input.config.defaultCountryCode);
  if (!to) {
    return { ok: false, status: "failed", error: "Invalid phone number" };
  }

  const components =
    input.bodyParams && input.bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: input.bodyParams.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined;

  return graphSend(input.config, {
    to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode || "en" },
      ...(components ? { components } : {}),
    },
  });
}

/** Prefer Meta template when set; otherwise free-form text. */
export async function sendWhatsAppMessage(input: {
  config: WhatsAppConfig;
  to: string;
  body: string;
  waTemplateName?: string | null;
  templateParams?: string[];
}): Promise<SendResult> {
  if (input.waTemplateName) {
    return sendWhatsAppTemplate({
      config: input.config,
      to: input.to,
      templateName: input.waTemplateName,
      bodyParams: input.templateParams,
    });
  }
  return sendWhatsAppText({
    config: input.config,
    to: input.to,
    body: input.body,
  });
}
