import Link from "next/link";
import { format } from "date-fns";
import { MessageCircle, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { broadcastTemplate } from "@/app/actions/messages";
import { getWhatsAppConfig, isWhatsAppReady } from "@/lib/whatsapp";
import { PageHeader } from "@/components/ui/page-header";
import { BroadcastForm } from "@/components/broadcast-form";

export default async function MessagesPage() {
  const ctx = await requireTenant();
  const [messages, templates, config, customerCount, leadCount] =
    await Promise.all([
      prisma.message.findMany({
        where: {
          businessId: ctx.businessId,
          contact: { deletedAt: null },
        },
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.messageTemplate.findMany({
        where: { businessId: ctx.businessId, active: true },
      }),
      getWhatsAppConfig(ctx.businessId),
      prisma.contact.count({
        where: {
          businessId: ctx.businessId,
          deletedAt: null,
          type: "CUSTOMER",
        },
      }),
      prisma.contact.count({
        where: {
          businessId: ctx.businessId,
          deletedAt: null,
          type: "LEAD",
        },
      }),
    ]);

  const apiReady = isWhatsAppReady(config);
  const sent = messages.filter((m) =>
    ["sent", "delivered", "read"].includes(m.status),
  ).length;
  const queued = messages.filter((m) =>
    ["queued", "logged"].includes(m.status),
  ).length;
  const failed = messages.filter((m) => m.status === "failed").length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="WhatsApp"
        actions={
          <Link
            href="/app/settings/whatsapp"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <Settings2 className="h-4 w-4" />
            API
          </Link>
        }
      />
      <p className="-mt-3 mb-6 text-sm text-zinc-500">
        Message your customers — invoices, quotes, and broadcasts.
      </p>

      {/* Status strip */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Sent" value={sent} tone="emerald" />
        <Stat label="Queued" value={queued} tone="zinc" />
        <Stat label="Failed" value={failed} tone="red" />
      </div>

      <div
        className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
          apiReady
            ? "border border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border border-zinc-200 bg-white text-zinc-700"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            apiReady ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {apiReady ? "Cloud API connected" : "Cloud API not connected"}
          </p>
          <p className="text-xs opacity-80">
            {apiReady
              ? "Broadcasts send live to customer phones."
              : "You can still queue messages and share invoices via WhatsApp."}
          </p>
        </div>
        {!apiReady && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
            Coming soon
          </span>
        )}
      </div>

      {(ctx.role === "OWNER" || ctx.role === "MANAGER") && (
        <section className="sp-card sp-shadow mb-5 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Broadcast</h3>
              <p className="text-xs text-zinc-500">
                Template message to many customers at once
              </p>
            </div>
          </div>
          <div className="p-5">
            {templates.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No templates yet — they&apos;re created when you set up the
                business.
              </p>
            ) : (
              <BroadcastForm
                templates={templates}
                action={broadcastTemplate}
                apiReady={apiReady}
                customerCount={customerCount}
                leadCount={leadCount}
              />
            )}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-end justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Recent to customers
          </h3>
          <Link
            href="/app/settings/automations"
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600"
          >
            Automations soon
          </Link>
        </div>

        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {messages.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500">
              No customer messages yet. Broadcast above or share an invoice.
            </li>
          ) : (
            messages.map((m) => (
              <li key={m.id} className="flex gap-3 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
                  {m.contact.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">
                        {m.contact.name}
                      </p>
                      <p className="text-xs text-zinc-400">{m.contact.phone}</p>
                    </div>
                    <StatusBadge status={m.status} direction={m.direction} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">
                    {m.body.split("\n\n[send:")[0]}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {format(m.createdAt, "dd MMM, h:mm a")}
                    {m.direction === "INBOUND" ? " · reply" : " · outbound"}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "zinc" | "red";
}) {
  const tones = {
    emerald: "text-emerald-700",
    zinc: "text-zinc-800",
    red: "text-red-700",
  };
  return (
    <div className="sp-card sp-shadow px-4 py-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  direction,
}: {
  status: string;
  direction: string;
}) {
  const tone =
    status === "sent" || status === "delivered" || status === "read"
      ? "bg-emerald-50 text-emerald-800"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : status === "received" || direction === "INBOUND"
          ? "bg-blue-50 text-blue-800"
          : "bg-zinc-100 text-zinc-600";
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}
