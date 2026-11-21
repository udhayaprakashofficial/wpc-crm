"use client";

import { Info } from "lucide-react";

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="ml-1 inline-flex rounded-full text-zinc-400 hover:text-zinc-700"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-zinc-900 px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
