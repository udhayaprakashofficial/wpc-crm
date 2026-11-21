"use client";

import { useTransition } from "react";
import { logWinBackOutreach } from "@/app/actions/contacts";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_WINBACK_MESSAGE } from "@/lib/winback";

export function WinBackActions({
  contactId,
  name,
  phone,
  compact = false,
}: {
  contactId: string;
  name: string;
  phone: string;
  compact?: boolean;
}) {
  const { showSuccess } = useToast();
  const [pending, start] = useTransition();
  const firstName = name.split(" ")[0] || name;
  const wa = `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
    DEFAULT_WINBACK_MESSAGE(firstName),
  )}`;
  const tel = `tel:${phone}`;

  function run(channel: "whatsapp" | "call", openHref?: string) {
    start(async () => {
      const fd = new FormData();
      fd.set("contactId", contactId);
      fd.set("channel", channel);
      fd.set("scheduleFollowUp", "on");
      await logWinBackOutreach(fd);
      showSuccess(
        channel === "call"
          ? "Call logged · follow-up scheduled"
          : "WhatsApp outreach logged · follow-up scheduled",
      );
      if (openHref) window.open(openHref, "_blank", "noopener,noreferrer");
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("whatsapp", wa)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          WhatsApp
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("call", tel)}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50"
        >
          Call
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run("whatsapp", wa)}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Logging…" : "WhatsApp win-back"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("call", tel)}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Log call
      </button>
      <a
        href={`/app/tasks/new?contactId=${contactId}`}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold"
      >
        Schedule follow-up
      </a>
    </div>
  );
}
