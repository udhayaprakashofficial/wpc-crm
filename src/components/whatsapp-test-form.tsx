"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WhatsAppTestForm({
  action,
}: {
  action: (
    formData: FormData,
  ) => Promise<{ ok?: true; externalId?: string; error?: string }>;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="sp-card sp-shadow space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await action(fd);
          if (res.error) setErr(res.error);
          else setMsg(`Sent · id ${res.externalId || "ok"}`);
        });
      }}
    >
      <h3 className="font-semibold text-zinc-900">Send test message</h3>
      <Input
        name="to"
        placeholder="Phone e.g. 9876543210"
        required
      />
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send test"}
      </Button>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
