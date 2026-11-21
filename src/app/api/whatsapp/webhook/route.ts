import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Meta webhook verification (subscribe). */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const envOk = process.env.WHATSAPP_VERIFY_TOKEN === token;
  const business = envOk
    ? null
    : await prisma.business.findFirst({
        where: { deletedAt: null, waVerifyToken: token },
        select: { id: true },
      });

  if (!envOk && !business) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

type WaChange = {
  value?: {
    metadata?: { phone_number_id?: string };
    messages?: {
      from?: string;
      id?: string;
      timestamp?: string;
      type?: string;
      text?: { body?: string };
    }[];
    statuses?: {
      id?: string;
      status?: string;
      recipient_id?: string;
    }[];
  };
};

/** Inbound messages + delivery status updates. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    entry?: { changes?: WaChange[] }[];
  } | null;

  if (!body?.entry) {
    return NextResponse.json({ ok: true });
  }

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      let business = phoneNumberId
        ? await prisma.business.findFirst({
            where: { deletedAt: null, waPhoneNumberId: phoneNumberId },
          })
        : null;
      if (
        !business &&
        phoneNumberId &&
        process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId
      ) {
        business = await prisma.business.findFirst({
          where: { deletedAt: null, waEnabled: true },
          orderBy: { createdAt: "asc" },
        });
      }

      if (!business) continue;

      for (const status of value.statuses || []) {
        if (!status.id || !status.status) continue;
        await prisma.message.updateMany({
          where: {
            businessId: business.id,
            externalId: status.id,
          },
          data: {
            status:
              status.status === "read"
                ? "read"
                : status.status === "delivered"
                  ? "delivered"
                  : status.status === "failed"
                    ? "failed"
                    : status.status === "sent"
                      ? "sent"
                      : status.status,
          },
        });
      }

      for (const msg of value.messages || []) {
        if (!msg.from || !msg.id) continue;
        const text =
          msg.text?.body ||
          (msg.type && msg.type !== "text"
            ? `[${msg.type} message]`
            : "");
        if (!text) continue;

        const digits = msg.from.replace(/\D/g, "");
        const local10 = digits.length > 10 ? digits.slice(-10) : digits;

        const contact = await prisma.contact.findFirst({
          where: {
            businessId: business.id,
            deletedAt: null,
            OR: [
              { phone: digits },
              { phone: local10 },
              { phone: { endsWith: local10 } },
            ],
          },
        });

        if (!contact) continue;

        const existing = await prisma.message.findFirst({
          where: { businessId: business.id, externalId: msg.id },
        });
        if (existing) continue;

        await prisma.message.create({
          data: {
            businessId: business.id,
            contactId: contact.id,
            direction: "INBOUND",
            channel: "whatsapp",
            body: text,
            status: "received",
            externalId: msg.id,
          },
        });

        await prisma.activity.create({
          data: {
            businessId: business.id,
            contactId: contact.id,
            type: "MESSAGE",
            body: `WhatsApp in: ${text.slice(0, 120)}`,
          },
        });

        await prisma.contact.update({
          where: { id: contact.id },
          data: { lastActivityAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
