"use client";

export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white print:hidden"
    >
      {label}
    </button>
  );
}
