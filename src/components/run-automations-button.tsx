"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function RunAutomationsButton({
  action,
}: {
  action: () => Promise<{
    birthdays: number;
    inactive: number;
    errors: number;
  }>;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const res = await action();
            setMsg(
              `Ran — birthdays ${res.birthdays}, win-back ${res.inactive}, errors ${res.errors}`,
            );
          });
        }}
      >
        {pending ? "Running…" : "Run birthday & win-back now"}
      </Button>
      {msg && <p className="text-sm text-zinc-600">{msg}</p>}
    </div>
  );
}
