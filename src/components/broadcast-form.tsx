"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function BroadcastForm({
  templates,
  action,
  apiReady,
  customerCount,
  leadCount,
}: {
  templates: { id: string; name: string }[];
  apiReady: boolean;
  customerCount: number;
  leadCount: number;
  action: (formData: FormData) => Promise<{
    ok?: true;
    sent?: number;
    failed?: number;
    queued?: number;
    total?: number;
  }>;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [segment, setSegment] = useState("customers");

  const audience =
    segment === "customers" ? customerCount : leadCount;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await action(fd);
          setMsg(
            apiReady
              ? `Sent to ${res.sent ?? 0} · failed ${res.failed ?? 0} · of ${res.total ?? 0}`
              : `Queued for ${res.queued ?? res.total ?? 0} customers (connect API to send live)`,
          );
        });
      }}
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Template
        </label>
        <Select name="templateId" required>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Send to
        </label>
        <Select
          name="segment"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="customers">
            Customers ({customerCount})
          </option>
          <option value="leads">Leads ({leadCount})</option>
        </Select>
        <p className="mt-1.5 text-xs text-zinc-500">
          Goes to each contact&apos;s phone — not your login number.
        </p>
      </div>

      {apiReady ? (
        <input type="hidden" name="sendLive" value="true" />
      ) : (
        <input type="hidden" name="sendLive" value="false" />
      )}

      <div
        className={`rounded-xl px-3.5 py-3 text-sm ${
          apiReady
            ? "bg-emerald-50 text-emerald-900"
            : "bg-zinc-50 text-zinc-600"
        }`}
      >
        {apiReady
          ? `Ready — will send live to ~${audience} contacts`
          : `API not connected — will queue only. Connect under API settings.`}
      </div>

      <Button type="submit" className="w-full" disabled={pending || audience === 0}>
        {pending
          ? "Working…"
          : apiReady
            ? `Send to ${audience} customers`
            : `Queue for ${audience} contacts`}
      </Button>
      {msg && <p className="text-center text-sm text-zinc-600">{msg}</p>}
    </form>
  );
}
